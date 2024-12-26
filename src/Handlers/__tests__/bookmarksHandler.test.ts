import { SwitcherPlusSettings } from 'src/settings';
import { mock, MockProxy, mockReset } from 'jest-mock-extended';
import { BookmarksHandler, BOOKMARKS_PLUGIN_ID } from 'src/Handlers';
import { InputInfo } from 'src/switcherPlus';
import {
  BookmarksItemInfo,
  MatchType,
  Mode,
  SearchQuery,
  SuggestionType,
} from 'src/types';
import { Searcher } from 'src/search';
import {
  makeFuzzyMatch,
  bookmarksTrigger,
  makeBookmarksPluginFolderItem,
  makeBookmarksPluginFileItem,
  makeBookmarksPluginGroupItem,
  makeBookmarksPluginSearchItem,
  makeHeading,
  makeInputInfo,
  makeBookmarkedFileSuggestion,
} from '@fixtures';
import {
  App,
  InstalledPlugin,
  InternalPlugins,
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

  test('onChooseSuggestion() should open the associated file for FileBookmarks', () => {
    const sugg = makeBookmarkedFileSuggestion();
    const mockEvt = mock<KeyboardEvent>();

    const navigateSpy = jest
      .spyOn(BookmarksHandler.prototype, 'navigateToLeafOrOpenFile')
      .mockReturnValueOnce();

    sut.onChooseSuggestion(sugg, mockEvt);

    expect(navigateSpy).toHaveBeenCalledWith(mockEvt, sugg.file, expect.any(String));

    navigateSpy.mockRestore();
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
      mockVault.getFileByPath.mockImplementation((path) => {
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
      const inputInfo = new InputInfo(null, Mode.BookmarksList);
      const parsedInputQuerySpy = jest
        .spyOn(inputInfo, 'parsedInputQuery', 'get')
        .mockReturnValue(mock<SearchQuery>({ hasSearchTerm: true, query: null }));

      const filterText = expectedBookmarkedFileTitle;
      const searchSpy = jest
        .spyOn(Searcher.prototype, 'executeSearch')
        .mockImplementation((text) => {
          return text === filterText ? makeFuzzyMatch() : null;
        });

      const expectedItem = expectedBookmarkedItems.find(
        (v): v is BookmarksPluginFileItem =>
          BookmarksHandler.isBookmarksPluginFileItem(v) && v.title === filterText,
      );

      const results = sut.getSuggestions(inputInfo);

      expect(results).toHaveLength(1);
      expect(results[0]).toHaveProperty('type', SuggestionType.Bookmark);
      expect((results[0].item as BookmarksPluginFileItem).path).toBe(expectedItem.path);
      expect(mockInternalPlugins.getEnabledPluginById).toHaveBeenCalledWith(
        BOOKMARKS_PLUGIN_ID,
      );

      searchSpy.mockRestore();
      parsedInputQuerySpy.mockRestore();
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

      const { allBookmarks } = sut.getItems(null);

      expect(allBookmarks).toHaveLength(1);

      const resultBookmarkItem = allBookmarks[0].item;
      expect(resultBookmarkItem).toBe(leafBookmark);
    });

    it('should contain a file property for bookmarks that point to a file', () => {
      const leafBookmark = expectedBookmarkedItems.find((v) =>
        BookmarksHandler.isBookmarksPluginFileItem(v),
      ) as BookmarksPluginFileItem;
      mockPluginInstance.items = [leafBookmark];

      const tFile = new TFile();
      tFile.path = leafBookmark.path;
      mockVault.getFileByPath.calledWith(leafBookmark.path).mockReturnValueOnce(tFile);

      const { allBookmarks } = sut.getItems(null);

      expect(allBookmarks).toHaveLength(1);
      expect(allBookmarks[0].file).toBe(tFile);

      mockReset(mockVault);
    });

    it('should not return a bookmark item for file bookmarks where the file has been deleted', () => {
      const bookmarkItem = makeBookmarksPluginFileItem();
      mockPluginInstance.items = [bookmarkItem];

      const getFileByPathSpy = jest
        .spyOn(sut, 'getTFileByPath')
        .mockImplementationOnce((path) => {
          return path === bookmarkItem.path ? null : new TFile();
        });

      const { allBookmarks, fileBookmarks } = sut.getItems(null);

      expect(allBookmarks).toHaveLength(0);
      expect(fileBookmarks.size).toBe(0);

      getFileByPathSpy.mockRestore();
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

  describe('addPropertiesToStandardSuggestions', () => {
    const mockFile = new TFile();
    const inputInfo = makeInputInfo();
    inputInfo.currentWorkspaceEnvList.openWorkspaceFiles = new Set([mockFile]);
    inputInfo.currentWorkspaceEnvList.mostRecentFiles = new Set([mockFile]);
    inputInfo.currentWorkspaceEnvList.fileBookmarks = new Map<TFile, BookmarksItemInfo[]>(
      [[mockFile, []]],
    );

    it('should set extra properties on Bookmark suggestions', () => {
      const sugg = makeBookmarkedFileSuggestion({
        file: mockFile,
        bookmarkPath: mockFile.path,
        match: makeFuzzyMatch(),
      });

      // Note: purposefully unset the file property, because the core switcher does not provide a value for this property, unlike Files/Alias suggestions
      sugg.file = null;

      const getTFileByPathSpy = jest
        .spyOn(BookmarksHandler.prototype, 'getTFileByPath')
        .mockReturnValueOnce(mockFile);

      sut.addPropertiesToStandardSuggestions(inputInfo.currentWorkspaceEnvList, sugg);

      expect(sugg).toMatchObject({
        ...sugg,
        matchType: MatchType.Primary,
        matchText: mockFile.path,
        isOpenInEditor: true,
        isRecent: true,
        isBookmarked: true,
      });

      getTFileByPathSpy.mockRestore();
    });
  });
});
