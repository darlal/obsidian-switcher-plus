import { SwitcherPlusSettings } from 'src/settings';
import { mock, MockProxy, mockReset } from 'jest-mock-extended';
import { StarredHandler, STARRED_PLUGIN_ID } from 'src/Handlers';
import { InputInfo } from 'src/switcherPlus';
import { Mode, StarredSuggestion } from 'src/types';
import {
  makeFuzzyMatch,
  makePreparedQuery,
  starredTrigger,
  makeFileStarredItem,
  makeSearchStarredItem,
} from '@fixtures';
import {
  App,
  fuzzySearch,
  InstalledPlugin,
  InternalPlugins,
  prepareQuery,
  renderResults,
  StarredPluginInstance,
  Workspace,
  Vault,
  TFile,
  FileStarredItem,
  Keymap,
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
  let mockSettings: MockProxy<SwitcherPlusSettings>;
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

    mockSettings = mock<SwitcherPlusSettings>({
      starredListCommand: starredTrigger,
    });

    sut = new StarredHandler(mockApp, mockSettings);
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

      expect(results.every((sugg) => sugg.type === 'starred')).toBe(true);
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
      expect(onlyResult).toHaveProperty('type', 'starred');
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
      const mockRenderResults = jest.mocked<typeof renderResults>(renderResults);

      const match = makeFuzzyMatch();
      const item = mockPluginInstance.items.find((v): v is FileStarredItem =>
        isFileStarredItem(v),
      );

      const sugg = mock<StarredSuggestion>({ item, match });
      sut.renderSuggestion(sugg, mockParentEl);

      expect(mockRenderResults).toHaveBeenCalledWith(mockParentEl, item.title, match);
    });
  });

  describe('onChooseSuggestion', () => {
    let sugg: MockProxy<StarredSuggestion>;
    const evt = mock<MouseEvent>();
    const mockKeymap = jest.mocked<typeof Keymap>(Keymap);

    beforeAll(() => {
      const item = mockPluginInstance.items.find((v): v is FileStarredItem =>
        isFileStarredItem(v),
      );

      sugg = mock<StarredSuggestion>({ item });
    });

    it('should not throw an error with a null suggestion', () => {
      expect(() => sut.onChooseSuggestion(null, null)).not.toThrow();
    });

    it('should open a new leaf for the chosen suggestion', () => {
      const isModDown = true;
      mockKeymap.isModEvent.mockReturnValueOnce(isModDown);
      mockWorkspace.openLinkText.mockResolvedValueOnce();

      sut.onChooseSuggestion(sugg, evt);

      expect(mockKeymap.isModEvent).toHaveBeenCalledWith(evt);
      expect(mockWorkspace.openLinkText).toHaveBeenCalledWith(
        (sugg.item as FileStarredItem).path,
        '',
        isModDown,
        expect.objectContaining({ active: true }),
      );
    });

    it('should catch errors while opening new workspaceLeaf and log it to the console', () => {
      // Promise used to trigger the error condition
      const openLinkTextPromise = Promise.resolve();

      mockWorkspace.openLinkText.mockImplementation(() => {
        // throw to simulate openLinkText() failing. This happens first
        return openLinkTextPromise.then(() => {
          throw new Error('openLinkText() unit test mock error');
        });
      });

      // Promise used to track the call to console.log
      let consoleLogPromiseResolveFn: (value: void | PromiseLike<void>) => void;
      const consoleLogPromise = new Promise<void>((resolve, _reject) => {
        consoleLogPromiseResolveFn = resolve;
      });

      const consoleLogSpy = jest
        .spyOn(console, 'log')
        .mockImplementation((message: string) => {
          if (message.startsWith('Switcher++: unable to open file')) {
            // resolve the consoleLogPromise. This happens second and will allow
            // allPromises to resolve itself
            consoleLogPromiseResolveFn();
          }
        });

      // wait for the other promises to resolve before this promise can resolve
      const allPromises = Promise.all([openLinkTextPromise, consoleLogPromise]);

      mockKeymap.isModEvent.mockReturnValueOnce(false);

      // internally calls openLinkText(), which the spy will cause to fail, and then
      // will call console.log
      sut.onChooseSuggestion(sugg, evt);

      // when all the promises are resolved check expectations and clean up
      return allPromises.finally(() => {
        expect(mockWorkspace.openLinkText).toHaveBeenCalled();
        expect(consoleLogSpy).toHaveBeenCalled();

        mockWorkspace.openLinkText.mockReset();
        consoleLogSpy.mockRestore();
      });
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
      expect(mockVault.getAbstractFileByPath).toBeCalledWith(file.path);
    });

    it('should not return items for starred items where the source file does not exist', () => {
      const file = new TFile();

      mockVault.getAbstractFileByPath.calledWith(file.path).mockReturnValueOnce(null);

      const starredItem = makeFileStarredItem('starredItemTitle', file.path);
      mockPluginInstance.items = [starredItem];

      const results = sut.getItems();

      expect(results).toHaveLength(0);
      expect(mockVault.getAbstractFileByPath).toBeCalledWith(file.path);
    });
  });
});
