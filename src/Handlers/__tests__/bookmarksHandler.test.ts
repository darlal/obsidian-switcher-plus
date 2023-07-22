import { SwitcherPlusSettings } from 'src/settings';
import { mock, MockProxy, mockReset } from 'jest-mock-extended';
import { BookmarksHandler, BOOKMARKS_PLUGIN_ID } from 'src/Handlers';
import { InputInfo } from 'src/switcherPlus';
import { Mode, SuggestionType } from 'src/types';
import {
  makeFuzzyMatch,
  makePreparedQuery,
  bookmarksTrigger,
  makeBookmarksPluginFolderItem,
  makeBookmarksPluginFileItem,
  makeBookmarksPluginGroupItem,
  makeBookmarksPluginSearchItem,
  makeHeading,
} from '@fixtures';
import {
  App,
  fuzzySearch,
  InstalledPlugin,
  InternalPlugins,
  prepareQuery,
  Workspace,
  Vault,
  TFile,
  MetadataCache,
  BookmarksPluginInstance,
  BookmarksPluginItem,
  BookmarksPluginFileItem,
} from 'obsidian';
import { filenameFromPath, stripMDExtensionFromPath } from 'src/utils';

const expectedBookmarkedFileTitle = 'file 1';
const expectedBookmarkedItems: BookmarksPluginItem[] = [];
const expectedBookmarkedFilePaths: string[] = [];

function makeBookmarksPluginInstall(): MockProxy<InstalledPlugin> {
  const mockInstance = mock<BookmarksPluginInstance>({
    id: BOOKMARKS_PLUGIN_ID,
    items: [
      makeBookmarksPluginFolderItem(),
      makeBookmarksPluginFileItem({ title: expectedBookmarkedFileTitle }),
      makeBookmarksPluginGroupItem(),
    ],
  });

  mockInstance.getItemTitle.mockImplementation((bookmark) => bookmark.title);

  mockInstance.items.forEach((v) => {
    // Note: Nested bookmark groups are not expected in the list
    if (BookmarksHandler.isBookmarksPluginGroupItem(v)) {
      expectedBookmarkedItems.push(...v.items);
    } else {
      expectedBookmarkedItems.push(v);
    }
  });

  expectedBookmarkedItems.forEach((v) => {
    if (BookmarksHandler.isBookmarksPluginFileItem(v)) {
      expectedBookmarkedFilePaths.push(v.path);
    }
  });

  return mock<InstalledPlugin>({
    enabled: true,
    instance: mockInstance,
  });
}

function makeInternalPluginList(
  bookmarksPlugin: MockProxy<InstalledPlugin>,
): MockProxy<InternalPlugins> {
  const mockPlugins = mock<Record<string, InstalledPlugin>>({
    bookmarks: bookmarksPlugin,
  });

  const mockInternalPlugins = mock<InternalPlugins>({ plugins: mockPlugins });

  mockInternalPlugins.getEnabledPluginById
    .calledWith(BOOKMARKS_PLUGIN_ID)
    .mockReturnValue(mockPlugins[BOOKMARKS_PLUGIN_ID].instance);

  return mockInternalPlugins;
}

describe('bookmarksHandler', () => {
  let settings: MockProxy<SwitcherPlusSettings>;
  let mockWorkspace: MockProxy<Workspace>;
  let mockVault: MockProxy<Vault>;
  let mockApp: MockProxy<App>;
  let mockInternalPlugins: MockProxy<InternalPlugins>;
  let mockPluginInstance: MockProxy<BookmarksPluginInstance>;
  let sut: BookmarksHandler;

  beforeAll(() => {
    const pluginInstall = makeBookmarksPluginInstall();
    mockPluginInstance = pluginInstall.instance as MockProxy<BookmarksPluginInstance>;
    mockInternalPlugins = makeInternalPluginList(pluginInstall);

    mockWorkspace = mock<Workspace>();
    mockVault = mock<Vault>();
    mockApp = mock<App>({
      workspace: mockWorkspace,
      vault: mockVault,
      internalPlugins: mockInternalPlugins,
      metadataCache: mock<MetadataCache>(),
    });

    settings = mock<SwitcherPlusSettings>({
      preferredSourceForTitle: 'Default',
      bookmarksListCommand: bookmarksTrigger,
    });

    sut = new BookmarksHandler(mockApp, settings);
  });

  test('renderSuggestion() should return false', () => {
    expect(sut.renderSuggestion(null, null)).toBe(false);
  });

  test('onChooseSuggestion() should return false', () => {
    expect(sut.onChooseSuggestion(null, null)).toBe(false);
  });

  describe('getCommandString', () => {
    it('should return bookmarksListCommand trigger for Bookmarks', () => {
      expect(sut.getCommandString()).toBe(bookmarksTrigger);
    });
  });

  describe('validateCommand', () => {
    const filterText = 'foo';
    const inputText = `${bookmarksTrigger}${filterText}`;
    const startIndex = bookmarksTrigger.length;

    it('should validate parsed input with bookmarks plugin enabled', () => {
      const inputInfo = new InputInfo(inputText);

      sut.validateCommand(inputInfo, startIndex, filterText, null, null);

      expect(inputInfo.mode).toBe(Mode.BookmarksList);

      const cmd = inputInfo.parsedCommand();
      expect(cmd.parsedInput).toBe(filterText);
      expect(cmd.isValidated).toBe(true);
      expect(mockApp.internalPlugins.getEnabledPluginById).toHaveBeenCalledWith(
        BOOKMARKS_PLUGIN_ID,
      );
    });

    it('should not validate parsed input with bookmarks plugin disabled', () => {
      mockInternalPlugins.getEnabledPluginById.mockReturnValueOnce(null);

      const inputInfo = new InputInfo(inputText);

      sut.validateCommand(inputInfo, startIndex, filterText, null, null);
      expect(inputInfo.mode).toBe(Mode.Standard);

      const cmd = inputInfo.parsedCommand();
      expect(cmd.parsedInput).toBe(null);
      expect(cmd.isValidated).toBe(false);
    });
  });

  describe('getSuggestions', () => {
    beforeAll(() => {
      mockVault.getAbstractFileByPath.mockImplementation((path) => {
        let file: TFile = null;

        if (expectedBookmarkedFilePaths.includes(path)) {
          file = new TFile();
          file.extension = 'md';
          file.path = path;
          file.basename = filenameFromPath(stripMDExtensionFromPath(file));
        }

        return file;
      });
    });

    afterEach(() => {
      mockInternalPlugins.getEnabledPluginById.mockClear();
    });

    afterAll(() => {
      mockReset(mockVault);
    });

    test('with falsy input, it should return an empty array', () => {
      const results = sut.getSuggestions(null);

      expect(results).toBeInstanceOf(Array);
      expect(results).toHaveLength(0);
    });

    test('that BookmarksSuggestion have a file property to enable interop with other plugins (like HoverEditor)', () => {
      const inputInfo = new InputInfo(bookmarksTrigger);
      const results = sut.getSuggestions(inputInfo);

      const suggs = results.filter((v) =>
        BookmarksHandler.isBookmarksPluginFileItem(v.item),
      );

      expect(suggs.every((v) => v.file !== null)).toBe(true);
    });

    test('with default settings, it should return suggestions for files that have been bookmarked', () => {
      const inputInfo = new InputInfo(bookmarksTrigger);
      const results = sut.getSuggestions(inputInfo);

      const paths = results
        .filter((v) => BookmarksHandler.isBookmarksPluginFileItem(v.item))
        .map((v) => (v.item as BookmarksPluginFileItem).path);
      const resultBookmarkedPaths = new Set(paths);

      expect(results).toBeInstanceOf(Array);
      expect(results).toHaveLength(expectedBookmarkedItems.length);

      expect(
        expectedBookmarkedFilePaths.every((item) => resultBookmarkedPaths.has(item)),
      ).toBe(true);

      expect(results.every((sugg) => sugg.type === SuggestionType.Bookmark)).toBe(true);
      expect(mockInternalPlugins.getEnabledPluginById).toHaveBeenCalledWith(
        BOOKMARKS_PLUGIN_ID,
      );
    });

    test('with filter search term, it should return only matching suggestions for bookmarks mode', () => {
      const filterText = expectedBookmarkedFileTitle;

      const expectedItem = expectedBookmarkedItems.find(
        (v): v is BookmarksPluginFileItem =>
          BookmarksHandler.isBookmarksPluginFileItem(v) && v.title === filterText,
      );

      const mockPrepareQuery = jest.mocked<typeof prepareQuery>(prepareQuery);
      mockPrepareQuery.mockReturnValueOnce(makePreparedQuery(filterText));

      const mockFuzzySearch = jest.mocked<typeof fuzzySearch>(fuzzySearch);

      mockFuzzySearch.mockImplementation((_q, text: string) => {
        return text === filterText ? makeFuzzyMatch() : null;
      });

      const inputInfo = new InputInfo(`${bookmarksTrigger}${filterText}`);
      const results = sut.getSuggestions(inputInfo);

      expect(results).toHaveLength(1);

      const onlyResult = results[0];
      expect(onlyResult).toHaveProperty('type', SuggestionType.Bookmark);
      expect((onlyResult.item as BookmarksPluginFileItem).path).toBe(expectedItem.path);

      expect(mockFuzzySearch).toHaveBeenCalled();
      expect(mockPrepareQuery).toHaveBeenCalled();
      expect(mockInternalPlugins.getEnabledPluginById).toHaveBeenCalledWith(
        BOOKMARKS_PLUGIN_ID,
      );

      mockFuzzySearch.mockReset();
    });
  });

  describe('getItems', () => {
    let oldItems: BookmarksPluginItem[];

    beforeAll(() => {
      oldItems = mockPluginInstance.items;
    });

    afterAll(() => {
      mockPluginInstance.items = oldItems;
    });

    it('should traverse nested bookmark groups and return only the non-group leaf bookmarks', () => {
      const leafBookmark = makeBookmarksPluginSearchItem();
      const childGroup = makeBookmarksPluginGroupItem({
        title: 'childGroup',
        items: [leafBookmark],
      });
      const parentGroup = makeBookmarksPluginGroupItem({
        title: 'parentGroup',
        items: [childGroup],
      });

      mockPluginInstance.items = [parentGroup];

      const results = sut.getItems(null);

      expect(results).toHaveLength(1);

      const resultBookmarkItem = results[0].item;
      expect(resultBookmarkItem).toBe(leafBookmark);
    });

    it('should contain a file property for bookmarks that point to a file', () => {
      const leafBookmark = expectedBookmarkedItems.find((v) =>
        BookmarksHandler.isBookmarksPluginFileItem(v),
      ) as BookmarksPluginFileItem;
      mockPluginInstance.items = [leafBookmark];

      const tFile = new TFile();
      tFile.path = leafBookmark.path;
      mockVault.getAbstractFileByPath
        .calledWith(leafBookmark.path)
        .mockReturnValueOnce(tFile);

      const results = sut.getItems(null);

      expect(results).toHaveLength(1);
      expect(results[0].file).toBe(tFile);

      mockReset(mockVault);
    });
  });

  describe('getPreferredTitle', () => {
    test('with preferredSourceForTitle as H1, it should return the first heading for file bookmarks', () => {
      const file = new TFile();
      const titleText = 'expected title';
      const mockBookmarkItem = mock<BookmarksPluginItem>();
      const mockPluginInstance = mock<BookmarksPluginInstance>({
        getItemTitle: () => 'filename#heading',
      });

      const getFirstH1Spy = jest
        .spyOn(sut, 'getFirstH1')
        .mockReturnValueOnce(makeHeading(titleText, 0));

      const result = sut.getPreferredTitle(
        mockPluginInstance,
        mockBookmarkItem,
        file,
        'H1',
      );

      expect(result).toBe(`${titleText}#heading`);

      getFirstH1Spy.mockRestore();
    });

    test('with preferredSourceForTitle as H1, it should return item title for a bookmark containing a file without an H1', () => {
      const file = new TFile();
      const titleText = 'filename#heading';
      const mockBookmarkItem = mock<BookmarksPluginItem>();
      const mockPluginInstance = mock<BookmarksPluginInstance>({
        getItemTitle: () => titleText,
      });

      const getFirstH1Spy = jest.spyOn(sut, 'getFirstH1').mockReturnValueOnce(null);

      const result = sut.getPreferredTitle(
        mockPluginInstance,
        mockBookmarkItem,
        file,
        'H1',
      );

      expect(result).toBe(titleText);

      getFirstH1Spy.mockRestore();
    });
  });
});
