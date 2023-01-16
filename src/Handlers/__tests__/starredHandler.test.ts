import { SwitcherPlusSettings } from 'src/settings';
import { mock, MockProxy, mockReset } from 'jest-mock-extended';
import { Handler, StarredHandler, STARRED_PLUGIN_ID } from 'src/Handlers';
import { InputInfo } from 'src/switcherPlus';
import { Mode, StarredSuggestion, SuggestionType } from 'src/types';
import {
  makeFuzzyMatch,
  makePreparedQuery,
  starredTrigger,
  makeFileStarredItem,
  makeSearchStarredItem,
  makeLeaf,
  makeStarredSuggestion,
} from '@fixtures';
import {
  App,
  fuzzySearch,
  InstalledPlugin,
  InternalPlugins,
  prepareQuery,
  StarredPluginInstance,
  Workspace,
  Vault,
  TFile,
  FileStarredItem,
  StarredPluginItem,
} from 'obsidian';
import { filenameFromPath, isFileStarredItem, stripMDExtensionFromPath } from 'src/utils';

const expectedStarredFileTitle = 'file 1';

function makeStarredPluginInstall(): MockProxy<InstalledPlugin> {
  const mockInstance = mock<StarredPluginInstance>({
    id: STARRED_PLUGIN_ID,
    items: [
      makeFileStarredItem(),
      makeFileStarredItem(expectedStarredFileTitle),
      makeSearchStarredItem(),
    ],
  });

  return mock<InstalledPlugin>({
    enabled: true,
    instance: mockInstance,
  });
}

function makeInternalPluginList(
  starredPlugin: MockProxy<InstalledPlugin>,
): MockProxy<InternalPlugins> {
  const mockPlugins = mock<Record<string, InstalledPlugin>>({
    starred: starredPlugin,
  });

  const mockInternalPlugins = mock<InternalPlugins>({ plugins: mockPlugins });

  mockInternalPlugins.getPluginById
    .calledWith(STARRED_PLUGIN_ID)
    .mockReturnValue(mockPlugins[STARRED_PLUGIN_ID]);

  return mockInternalPlugins;
}

describe('starredHandler', () => {
  let settings: SwitcherPlusSettings;
  let mockWorkspace: MockProxy<Workspace>;
  let mockVault: MockProxy<Vault>;
  let mockApp: MockProxy<App>;
  let mockInternalPlugins: MockProxy<InternalPlugins>;
  let mockPluginInstance: MockProxy<StarredPluginInstance>;
  let sut: StarredHandler;

  beforeAll(() => {
    const pluginInstall = makeStarredPluginInstall();
    mockPluginInstance = pluginInstall.instance as StarredPluginInstance;
    mockInternalPlugins = makeInternalPluginList(pluginInstall);

    mockWorkspace = mock<Workspace>();
    mockVault = mock<Vault>();
    mockApp = mock<App>({
      workspace: mockWorkspace,
      vault: mockVault,
      internalPlugins: mockInternalPlugins,
    });

    settings = new SwitcherPlusSettings(null);
    jest.spyOn(settings, 'starredListCommand', 'get').mockReturnValue(starredTrigger);

    sut = new StarredHandler(mockApp, settings);
  });

  describe('commandString', () => {
    it('should return starredListCommand trigger', () => {
      expect(sut.commandString).toBe(starredTrigger);
    });
  });

  describe('validateCommand', () => {
    const filterText = 'foo';
    const inputText = `${starredTrigger}${filterText}`;
    const startIndex = starredTrigger.length;

    it('should validate parsed input with starred plugin enabled', () => {
      const inputInfo = new InputInfo(inputText);

      sut.validateCommand(inputInfo, startIndex, filterText, null, null);

      expect(inputInfo.mode).toBe(Mode.StarredList);

      const starredCmd = inputInfo.parsedCommand();
      expect(starredCmd.parsedInput).toBe(filterText);
      expect(starredCmd.isValidated).toBe(true);
      expect(mockApp.internalPlugins.getPluginById).toHaveBeenCalledWith(
        STARRED_PLUGIN_ID,
      );
    });

    it('should not validate parsed input with starred plugin disabled', () => {
      mockInternalPlugins.getPluginById.mockReturnValueOnce({
        enabled: false,
        instance: null,
      });

      const inputInfo = new InputInfo(inputText);

      sut.validateCommand(inputInfo, startIndex, filterText, null, null);
      expect(inputInfo.mode).toBe(Mode.Standard);

      const starredCmd = inputInfo.parsedCommand();
      expect(starredCmd.parsedInput).toBe(null);
      expect(starredCmd.isValidated).toBe(false);
      expect(mockInternalPlugins.getPluginById).toHaveBeenCalledWith(STARRED_PLUGIN_ID);
    });
  });

  describe('getSuggestions', () => {
    let expectedStarredPaths: string[];

    beforeAll(() => {
      expectedStarredPaths = mockPluginInstance.items
        .filter((v): v is FileStarredItem => isFileStarredItem(v))
        .map((v) => v.path);

      mockVault.getAbstractFileByPath.mockImplementation((path) => {
        let file: TFile = null;

        if (expectedStarredPaths.includes(path)) {
          file = new TFile();
          file.extension = 'md';
          file.path = path;
          file.basename = filenameFromPath(stripMDExtensionFromPath(file));
        }

        return file;
      });
    });

    afterAll(() => {
      mockReset(mockVault);
    });

    test('with falsy input, it should return an empty array', () => {
      const results = sut.getSuggestions(null);

      expect(results).toBeInstanceOf(Array);
      expect(results).toHaveLength(0);
    });

    test('that StarredSuggestion have a file property to enable interop with other plugins (like HoverEditor)', () => {
      const inputInfo = new InputInfo(starredTrigger);
      const results = sut.getSuggestions(inputInfo);

      const fileSuggs = results.filter((v) => isFileStarredItem(v.item));

      expect(fileSuggs.every((v) => v.file !== null)).toBe(true);
    });

    test('with default settings, it should return suggestions for files that have been starred', () => {
      const inputInfo = new InputInfo(starredTrigger);
      const results = sut.getSuggestions(inputInfo);

      const resultStarredPaths = new Set(
        results.map((sugg) => (sugg.item as FileStarredItem).path),
      );

      expect(results).toBeInstanceOf(Array);
      expect(results).toHaveLength(expectedStarredPaths.length);

      expect(expectedStarredPaths.every((item) => resultStarredPaths.has(item))).toBe(
        true,
      );

      expect(results.every((sugg) => sugg.type === SuggestionType.StarredList)).toBe(
        true,
      );
      expect(mockInternalPlugins.getPluginById).toHaveBeenCalledWith(STARRED_PLUGIN_ID);
      expect(results.every((sugg) => sugg.item.type === 'file')).toBe(true);
    });

    test('with filter search term, it should return only matching suggestions for starred mode', () => {
      const filterText = expectedStarredFileTitle;

      const expectedItem = mockPluginInstance.items.find((v): v is FileStarredItem => {
        return isFileStarredItem(v) && v.title === filterText;
      });

      const mockPrepareQuery = jest.mocked<typeof prepareQuery>(prepareQuery);
      mockPrepareQuery.mockReturnValueOnce(makePreparedQuery(filterText));

      const mockFuzzySearch = jest.mocked<typeof fuzzySearch>(fuzzySearch);

      mockFuzzySearch.mockImplementation((_q, text: string) => {
        const match = makeFuzzyMatch();
        return text.startsWith(filterText) ? match : null;
      });

      const inputInfo = new InputInfo(`${starredTrigger}${filterText}`);
      const results = sut.getSuggestions(inputInfo);

      expect(results).toBeInstanceOf(Array);
      expect(results).toHaveLength(1);

      const onlyResult = results[0];
      expect(onlyResult).toHaveProperty('type', SuggestionType.StarredList);
      expect((onlyResult.item as FileStarredItem).path).toBe(expectedItem.path);

      expect(mockFuzzySearch).toHaveBeenCalled();
      expect(mockPrepareQuery).toHaveBeenCalled();
      expect(mockInternalPlugins.getPluginById).toHaveBeenCalled();

      mockFuzzySearch.mockReset();
    });
  });

  describe('renderSuggestion', () => {
    it('should not throw an error with a null suggestion', () => {
      expect(() => sut.renderSuggestion(null, null)).not.toThrow();
    });

    it('should render a suggestion with match offsets', () => {
      const mockParentEl = mock<HTMLElement>();
      const item = mockPluginInstance.items.find((v): v is FileStarredItem =>
        isFileStarredItem(v),
      );

      const sugg = makeStarredSuggestion(item, new TFile());

      const renderAsFileInfoPanelSpy = jest
        .spyOn(Handler.prototype, 'renderAsFileInfoPanel')
        .mockReturnValueOnce(null);

      sut.renderSuggestion(sugg, mockParentEl);

      expect(renderAsFileInfoPanelSpy).toHaveBeenCalledWith(
        mockParentEl,
        ['qsp-suggestion-starred'],
        null,
        sugg.file,
        sugg.matchType,
        sugg.match,
      );

      renderAsFileInfoPanelSpy.mockRestore();
    });
  });

  describe('onChooseSuggestion', () => {
    let sugg: MockProxy<StarredSuggestion>;
    const mockEvt = mock<MouseEvent>();

    beforeAll(() => {
      const item = mockPluginInstance.items.find((v): v is FileStarredItem =>
        isFileStarredItem(v),
      );

      const fileContainerLeaf = makeLeaf();
      fileContainerLeaf.openFile.mockResolvedValueOnce();
      mockWorkspace.getLeaf.mockReturnValue(fileContainerLeaf);

      sugg = mock<StarredSuggestion>({ item, file: new TFile() });
    });

    it('should not throw an error with a null suggestion', () => {
      expect(() => sut.onChooseSuggestion(null, null)).not.toThrow();
    });

    it('should open a new leaf for the chosen suggestion', () => {
      const navigateToLeafOrOpenFileSpy = jest.spyOn(
        Handler.prototype,
        'navigateToLeafOrOpenFile',
      );

      sut.onChooseSuggestion(sugg, mockEvt);

      expect(navigateToLeafOrOpenFileSpy).toHaveBeenCalledWith(
        mockEvt,
        sugg.file,
        expect.any(String),
      );

      navigateToLeafOrOpenFileSpy.mockRestore();
    });
  });

  describe('getTFileByPath', () => {
    it('should return TFile object for path that exists', () => {
      const file = new TFile();

      mockVault.getAbstractFileByPath.calledWith(file.path).mockReturnValueOnce(file);

      const result = sut.getTFileByPath(file.path);

      expect(result).toBe(file);
      expect(mockVault.getAbstractFileByPath).toHaveBeenCalledWith(file.path);
    });

    it('should return return null for a path that does not exist', () => {
      const file = new TFile();

      mockVault.getAbstractFileByPath.calledWith(file.path).mockReturnValueOnce(null);

      const result = sut.getTFileByPath(file.path);

      expect(result).toBe(null);
      expect(mockVault.getAbstractFileByPath).toHaveBeenCalledWith(file.path);
    });
  });

  describe('getItems', () => {
    let oldItems: StarredPluginItem[];

    beforeAll(() => {
      oldItems = mockPluginInstance.items;
    });

    afterAll(() => {
      mockPluginInstance.items = oldItems;
    });

    it('should always use the file basename instead of the starred item title property', () => {
      const file = new TFile();

      const starredItem = makeFileStarredItem('starredItemTitle', file.path);
      mockPluginInstance.items = [starredItem];

      mockVault.getAbstractFileByPath.calledWith(file.path).mockReturnValueOnce(file);

      const results = sut.getItems();
      const resultItem = results[0].item;

      expect(results).toHaveLength(1);
      expect(resultItem.title).toBe(file.basename);
      expect(mockVault.getAbstractFileByPath).toHaveBeenCalledWith(file.path);
    });

    it('should not return items for starred items where the source file does not exist', () => {
      const file = new TFile();

      mockVault.getAbstractFileByPath.calledWith(file.path).mockReturnValueOnce(null);

      const starredItem = makeFileStarredItem('starredItemTitle', file.path);
      mockPluginInstance.items = [starredItem];

      const results = sut.getItems();

      expect(results).toHaveLength(0);
      expect(mockVault.getAbstractFileByPath).toHaveBeenCalledWith(file.path);
    });
  });
});
