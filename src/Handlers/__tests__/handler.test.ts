import {
  App,
  Editor,
  MarkdownView,
  TFile,
  WorkspaceLeaf,
  EditorPosition,
  Workspace,
  MetadataCache,
  HeadingCache,
  Loc,
  Pos,
  Platform,
  WorkspaceSplit,
  View,
  TFolder,
  setIcon,
  normalizePath,
  Vault,
  Keymap,
  renderResults,
  fuzzySearch,
  TAbstractFile,
  FileView,
  SearchMatchPart,
} from 'obsidian';
import {
  defaultOpenViewState,
  makeLeaf,
  makeEditorSuggestion,
  makeFuzzyMatch,
  makePreparedQuery,
  makeFileSuggestion,
  makeHeadingSuggestion,
} from '@fixtures';
import {
  AnySuggestion,
  MatchType,
  Mode,
  PathDisplayFormat,
  EditorSuggestion,
  Facet,
  FacetSettingsData,
  SessionOpts,
  BookmarksItemInfo,
} from 'src/types';
import { mock, mockClear, MockProxy, mockReset } from 'jest-mock-extended';
import { Handler } from '../handler';
import { SwitcherPlusSettings } from 'src/settings';
import { stripMDExtensionFromPath } from 'src/utils';
import { Chance } from 'chance';
import { InputInfo, ParsedCommand, WorkspaceEnvList } from 'src/switcherPlus';

const chance = new Chance();

class SUT extends Handler<AnySuggestion> {
  getCommandString(_sessionOpts?: SessionOpts): string {
    throw new Error('Method not implemented.');
  }
  validateCommand(
    _inputInfo: InputInfo,
    _index: number,
    _filterText: string,
    _activeSuggestion: AnySuggestion,
    _activeLeaf: WorkspaceLeaf,
  ): ParsedCommand {
    throw new Error('Method not implemented.');
  }
  getSuggestions(_inputInfo: InputInfo): AnySuggestion[] {
    throw new Error('Method not implemented.');
  }
  renderSuggestion(_sugg: AnySuggestion, _parentEl: HTMLElement): boolean {
    throw new Error('Method not implemented.');
  }
  onChooseSuggestion(_sugg: AnySuggestion, _evt: MouseEvent | KeyboardEvent): boolean {
    throw new Error('Method not implemented.');
  }
}

describe('Handler', () => {
  let mockApp: MockProxy<App>;
  let mockWorkspace: MockProxy<Workspace>;
  let mockMetadataCache: MockProxy<MetadataCache>;
  let mockVault: MockProxy<Vault>;
  let mockSettings: MockProxy<SwitcherPlusSettings>;
  let sut: SUT;

  beforeAll(() => {
    mockWorkspace = mock<Workspace>({
      rootSplit: mock<WorkspaceSplit>(),
      leftSplit: mock<WorkspaceSplit>(),
      rightSplit: mock<WorkspaceSplit>(),
    });

    mockMetadataCache = mock<MetadataCache>();
    mockVault = mock<Vault>();
    mockApp = mock<App>({
      workspace: mockWorkspace,
      metadataCache: mockMetadataCache,
      vault: mockVault,
    });

    mockSettings = mock<SwitcherPlusSettings>({
      excludeViewTypes: [],
      referenceViews: [],
      includeSidePanelViewTypes: [],
    });

    sut = new SUT(mockApp, mockSettings);
  });

  test('.reset should not throw', () => {
    expect(() => sut.reset()).not.toThrow();
  });

  test('.onNoResultsCreateAction should return false', () => {
    const result = sut.onNoResultsCreateAction(null, null);
    expect(result).toBeFalsy();
  });

  describe('getEditorInfo', () => {
    it('should return an object with falsy values for falsy input', () => {
      const result = sut.getEditorInfo(null);

      expect(result).toEqual(
        expect.objectContaining({
          isValidSource: false,
          leaf: null,
          file: null,
          suggestion: null,
          cursor: null,
        }),
      );
    });

    it('should return TargetInfo for a markdown WorkspaceLeaf', () => {
      const mockFile = new TFile();
      const mockCursorPos = mock<EditorPosition>();
      const mockView = mock<MarkdownView>({
        file: mockFile,
      });

      mockView.getViewType.mockReturnValueOnce('markdown');
      const getCursorPosSpy = jest.spyOn(sut, 'getCursorPosition');
      getCursorPosSpy.mockReturnValueOnce(mockCursorPos);

      const mockLeaf = mock<WorkspaceLeaf>({ view: mockView });

      const result = sut.getEditorInfo(mockLeaf);

      expect(mockView.getViewType).toHaveBeenCalled();
      expect(getCursorPosSpy).toHaveBeenCalledWith(mockView);
      expect(result).toEqual(
        expect.objectContaining({
          isValidSource: true,
          leaf: mockLeaf,
          file: mockFile,
          suggestion: null,
          cursor: mockCursorPos,
        }),
      );

      getCursorPosSpy.mockRestore();
    });
  });

  describe('getSuggestionInfo', () => {
    it('should return an object with falsy values for falsy input', () => {
      const result = sut.getSuggestionInfo(null);

      expect(result).toEqual(
        expect.objectContaining({
          isValidSource: false,
          leaf: null,
          file: null,
          suggestion: null,
          cursor: null,
        }),
      );
    });

    it('should return TargetInfo for EditorSuggestion using active workspace leaf', () => {
      const mockFile = new TFile();
      const mockCursorPos = mock<EditorPosition>();
      const mockView = mock<MarkdownView>({
        file: mockFile,
      });

      const getCursorPosSpy = jest
        .spyOn(sut, 'getCursorPosition')
        .mockReturnValueOnce(mockCursorPos);

      const mockLeaf = mock<WorkspaceLeaf>({ view: mockView });
      const sugg = makeEditorSuggestion(mockLeaf, mockFile);

      // set as active leaf
      const getActiveLeafSpy = jest
        .spyOn(sut, 'getActiveLeaf')
        .mockReturnValueOnce(mockLeaf);

      const result = sut.getSuggestionInfo(sugg);

      expect(getActiveLeafSpy).toHaveBeenCalled();
      expect(getCursorPosSpy).toHaveBeenCalledWith(mockView);
      expect(result).toEqual(
        expect.objectContaining({
          isValidSource: true,
          leaf: mockLeaf,
          file: mockFile,
          suggestion: sugg,
          cursor: mockCursorPos,
        }),
      );

      getCursorPosSpy.mockRestore();
      getActiveLeafSpy.mockRestore();
    });
  });

  describe('getCursorPosition', () => {
    let mockView: MockProxy<MarkdownView>;
    let mockEditor: MockProxy<Editor>;

    beforeAll(() => {
      mockEditor = mock<Editor>();
      mockView = mock<MarkdownView>({
        editor: mockEditor,
      });
    });

    it('should not throw on falsy input', () => {
      let result;

      expect(() => {
        result = sut.getCursorPosition(null);
      }).not.toThrow();

      expect(result).toBe(null);
    });

    it('should return null for view type that is not markdown', () => {
      mockView.getViewType.mockReturnValueOnce('not markdown');
      const result = sut.getCursorPosition(mockView);

      expect(result).toBe(null);
      expect(mockView.getViewType).toHaveBeenCalled();
    });

    it('should return null for view that is in preview mode', () => {
      mockView.getViewType.mockReturnValueOnce('markdown');
      mockView.getMode.mockReturnValueOnce('preview');

      const result = sut.getCursorPosition(mockView);

      expect(result).toBe(null);
      expect(mockView.getMode).toHaveBeenCalled();
    });

    it('should return cursor position for markdown view that is not in preview mode', () => {
      const mockCursorPos = mock<EditorPosition>();

      mockView.getViewType.mockReturnValueOnce('markdown');
      mockView.getMode.mockReturnValueOnce('source');
      mockEditor.getCursor.mockReturnValueOnce(mockCursorPos);

      const result = sut.getCursorPosition(mockView);

      expect(result).toBe(mockCursorPos);
      expect(mockView.getViewType).toHaveBeenCalled();
      expect(mockView.getMode).toHaveBeenCalled();
      expect(mockEditor.getCursor).toHaveBeenCalledWith('head');
    });
  });

  describe('getTitleText', () => {
    it('should return file path for file without H1', () => {
      const mockFile = new TFile();

      const result = sut.getTitleText(mockFile);

      expect(result).toBe(stripMDExtensionFromPath(mockFile));
    });

    it('should return H1 text for file with H1', () => {
      const mockFile = new TFile();
      const headingText = 'h1 heading text';
      const mockHeading = mock<HeadingCache>({ heading: headingText, level: 1 });

      mockMetadataCache.getFileCache
        .calledWith(mockFile)
        .mockReturnValueOnce({ headings: [mockHeading] });

      const result = sut.getTitleText(mockFile);

      expect(mockMetadataCache.getFileCache).toHaveBeenCalledWith(mockFile);
      expect(result).toBe(headingText);
    });
  });

  describe('getFirstH1', () => {
    let mockH1: MockProxy<HeadingCache>;
    let mockH2: MockProxy<HeadingCache>;

    beforeAll(() => {
      mockH1 = mock<HeadingCache>({
        level: 1,
        position: mock<Pos>({
          start: mock<Loc>({ line: 5 }),
        }),
      });

      mockH2 = mock<HeadingCache>({
        level: 2,
        position: mock<Pos>({
          start: mock<Loc>({ line: 10 }),
        }),
      });
    });

    it('should return null if there is no fileCache available', () => {
      const mockFile = new TFile();
      mockMetadataCache.getFileCache.calledWith(mockFile).mockReturnValueOnce(null);

      const result = sut.getFirstH1(mockFile);

      expect(result).toBe(null);
      expect(mockMetadataCache.getFileCache).toHaveBeenCalledWith(mockFile);
    });

    it('should return null if there are no headings', () => {
      const mockFile = new TFile();
      mockMetadataCache.getFileCache
        .calledWith(mockFile)
        .mockReturnValueOnce({ headings: [] });

      const result = sut.getFirstH1(mockFile);

      expect(result).toBe(null);
      expect(mockMetadataCache.getFileCache).toHaveBeenCalledWith(mockFile);
    });

    it('should return the H1 when there is only one', () => {
      const mockFile = new TFile();
      mockMetadataCache.getFileCache
        .calledWith(mockFile)
        .mockReturnValueOnce({ headings: [mockH1, mockH2] });

      const result = sut.getFirstH1(mockFile);

      expect(mockMetadataCache.getFileCache).toHaveBeenCalledWith(mockFile);
      expect(result).toBe(mockH1);
    });

    it('should return the first H1 when there is more than one regardless of position in headings list', () => {
      const mockFile = new TFile();
      const mockH1Mid = mock<HeadingCache>({
        level: 1,
        position: mock<Pos>({
          start: mock<Loc>({ line: 7 }),
        }),
      });

      const mockH1Last = mock<HeadingCache>({
        level: 1,
        position: mock<Pos>({
          start: mock<Loc>({ line: 15 }),
        }),
      });

      mockMetadataCache.getFileCache
        .calledWith(mockFile)
        .mockReturnValueOnce({ headings: [mockH2, mockH1Mid, mockH1, mockH1Last] });

      const result = sut.getFirstH1(mockFile);

      expect(mockMetadataCache.getFileCache).toHaveBeenCalledWith(mockFile);
      expect(result).toBe(mockH1);
    });

    it('should return the first H1 even when it appears after other lower level headings', () => {
      const mockFile = new TFile();
      const mockH3First = mock<HeadingCache>({
        level: 3,
        position: mock<Pos>({
          start: mock<Loc>({ line: 1 }),
        }),
      });

      mockMetadataCache.getFileCache
        .calledWith(mockFile)
        .mockReturnValueOnce({ headings: [mockH1, mockH2, mockH3First] });

      const result = sut.getFirstH1(mockFile);

      expect(mockMetadataCache.getFileCache).toHaveBeenCalledWith(mockFile);
      expect(result).toBe(mockH1);
    });
  });

  describe('applyTabCreationPreferences', () => {
    let mockPlatform: MockProxy<typeof Platform>;

    beforeAll(() => {
      mockPlatform = jest.mocked<typeof Platform>(Platform);
    });

    test('with onOpenPreferNewTab enabled it should return true', () => {
      const navType = false;
      mockSettings.onOpenPreferNewTab = true;

      const result = sut.applyTabCreationPreferences(navType);

      expect(result).toBe(true);

      mockReset(mockSettings);
    });

    test('with isAlreadyOpen enabled it should return false', () => {
      const navType = false;
      const isAlreadyOpen = true;
      mockSettings.onOpenPreferNewTab = true;

      const result = sut.applyTabCreationPreferences(navType, isAlreadyOpen);

      expect(result).toBe(false);

      mockReset(mockSettings);
    });

    test('with navType enabled it should return true', () => {
      const navType = true;
      mockSettings.onOpenPreferNewTab = false;

      const result = sut.applyTabCreationPreferences(navType);

      expect(result).toBe(true);

      mockReset(mockSettings);
    });

    test('with navType, and isAlreadyOpen enabled it should return true', () => {
      const navType = true;
      const isAlreadyOpen = true;
      mockSettings.onOpenPreferNewTab = false;

      const result = sut.applyTabCreationPreferences(navType, isAlreadyOpen);

      expect(result).toBe(true);

      mockReset(mockSettings);
    });

    test('with onOpenPreferNewTab and navType enabled it should return true', () => {
      const navType = true;
      mockSettings.onOpenPreferNewTab = true;

      const result = sut.applyTabCreationPreferences(navType);

      expect(result).toBe(true);

      mockReset(mockSettings);
    });

    test('with onOpenPreferNewTab, navType, isAlreadyOpen enabled it should return true', () => {
      const navType = true;
      const isAlreadyOpen = true;
      mockSettings.onOpenPreferNewTab = true;

      const result = sut.applyTabCreationPreferences(navType, isAlreadyOpen);

      expect(result).toBe(true);

      mockReset(mockSettings);
    });

    test('with onOpenPreferNewTab enabled, and in Symbol mode, it should return true. This overrides all symbol mode new pane settings', () => {
      const navType = false;
      const isAlreadyOpen = false;
      mockSettings.onOpenPreferNewTab = true;

      const result = sut.applyTabCreationPreferences(
        navType,
        isAlreadyOpen,
        Mode.SymbolList,
      );

      expect(result).toBe(true);

      mockReset(mockSettings);
    });

    test('with onOpenPreferNewTab enabled and navType true, and in Symbol mode, it should return true. This overrides all symbol mode new pane settings', () => {
      const navType = true;
      const isAlreadyOpen = false;
      mockSettings.onOpenPreferNewTab = true;

      const result = sut.applyTabCreationPreferences(
        navType,
        isAlreadyOpen,
        Mode.SymbolList,
      );

      expect(result).toBe(true);

      mockReset(mockSettings);
    });

    test('with onOpenPreferNewTab, navType, isAlreadyOpen enabled, and in Symbol mode, it should return true. This overrides all symbol mode new pane settings', () => {
      const navType = true;
      const isAlreadyOpen = true;
      mockSettings.onOpenPreferNewTab = true;

      const result = sut.applyTabCreationPreferences(
        navType,
        isAlreadyOpen,
        Mode.SymbolList,
      );

      expect(result).toBe(true);

      mockReset(mockSettings);
    });

    test('with alwaysNewTabForSymbols enabled, and in Symbol mode, it should return true.', () => {
      const navType = false;
      const isAlreadyOpen = false;
      mockSettings.onOpenPreferNewTab = false;
      mockSettings.alwaysNewTabForSymbols = true;

      const result = sut.applyTabCreationPreferences(
        navType,
        isAlreadyOpen,
        Mode.SymbolList,
      );

      expect(result).toBe(true);

      mockReset(mockSettings);
    });

    test('with navType enabled, and in Symbol mode, it should return true.', () => {
      const navType = true;
      const isAlreadyOpen = true;
      mockSettings.onOpenPreferNewTab = false;
      mockSettings.alwaysNewTabForSymbols = false;

      const result = sut.applyTabCreationPreferences(
        navType,
        isAlreadyOpen,
        Mode.SymbolList,
      );

      expect(result).toBe(true);

      mockReset(mockSettings);
    });

    test('with useActiveTabForSymbolsOnMobile enabled, and in Symbol mode, it should return false.', () => {
      const navType = false;
      const isAlreadyOpen = true;
      mockSettings.onOpenPreferNewTab = false;
      mockSettings.alwaysNewTabForSymbols = true;
      mockSettings.useActiveTabForSymbolsOnMobile = true;
      mockPlatform.isMobile = true;

      const result = sut.applyTabCreationPreferences(
        navType,
        isAlreadyOpen,
        Mode.SymbolList,
      );

      expect(result).toBe(false);

      mockReset(mockSettings);
    });

    test('with useActiveTabForSymbolsOnMobile disabled, and in Symbol mode, it should return true.', () => {
      const navType = false;
      const isAlreadyOpen = false;
      mockSettings.onOpenPreferNewTab = false;
      mockSettings.alwaysNewTabForSymbols = true;
      mockSettings.useActiveTabForSymbolsOnMobile = false;
      mockPlatform.isMobile = true;

      const result = sut.applyTabCreationPreferences(
        navType,
        isAlreadyOpen,
        Mode.SymbolList,
      );

      expect(result).toBe(true);

      mockReset(mockSettings);
    });
  });

  describe('isMainPanelLeaf', () => {
    const mockLeaf = makeLeaf();

    it('should return true for main panel leaf', () => {
      mockLeaf.getRoot.mockReturnValueOnce(mockWorkspace.rootSplit);

      const result = sut.isMainPanelLeaf(mockLeaf);

      expect(result).toBe(true);
      expect(mockLeaf.getRoot).toHaveBeenCalled();
    });

    it('should return false for side panel leaf', () => {
      mockLeaf.getRoot.mockReturnValueOnce(mockWorkspace.leftSplit);

      const result = sut.isMainPanelLeaf(mockLeaf);

      expect(result).toBe(false);
      expect(mockLeaf.getRoot).toHaveBeenCalled();
    });
  });

  describe('activateLeaf', () => {
    const mockLeaf = makeLeaf();
    const mockView = mockLeaf.view as MockProxy<View>;

    it('should activate main panel leaf', () => {
      mockLeaf.getRoot.mockReturnValueOnce(mockWorkspace.rootSplit);

      sut.activateLeaf(mockLeaf);

      expect(mockLeaf.getRoot).toHaveBeenCalled();
      expect(mockWorkspace.setActiveLeaf).toHaveBeenCalledWith(mockLeaf, { focus: true });
      expect(mockView.setEphemeralState).toHaveBeenCalled();
    });

    it('should activate side panel leaf', () => {
      mockLeaf.getRoot.mockReturnValueOnce(mockWorkspace.rightSplit);

      sut.activateLeaf(mockLeaf);

      expect(mockLeaf.getRoot).toHaveBeenCalled();
      expect(mockWorkspace.setActiveLeaf).toHaveBeenCalledWith(mockLeaf, { focus: true });
      expect(mockView.setEphemeralState).toHaveBeenCalled();
      expect(mockWorkspace.revealLeaf).toHaveBeenCalledWith(mockLeaf);
    });
  });

  describe('getOpenLeaves', () => {
    let mockLeaf1: MockProxy<WorkspaceLeaf>;
    let mockLeaf2: MockProxy<WorkspaceLeaf>;
    let mockLeaf3: MockProxy<WorkspaceLeaf>;

    beforeAll(() => {
      mockLeaf1 = makeLeaf();
      mockLeaf2 = makeLeaf();
      mockLeaf3 = makeLeaf();
    });

    it('should return all leaves', () => {
      const excludeMainViewTypes = ['exclude'];
      const includeSideViewTypes = ['include'];

      mockLeaf1.getRoot.mockReturnValueOnce(mockWorkspace.rootSplit);

      mockLeaf2.getRoot.mockReturnValueOnce(mockWorkspace.rootSplit);
      (mockLeaf2.view as MockProxy<View>).getViewType.mockReturnValueOnce(
        excludeMainViewTypes[0],
      );

      mockLeaf3.getRoot.mockReturnValueOnce(mockWorkspace.rightSplit);
      (mockLeaf3.view as MockProxy<View>).getViewType.mockReturnValueOnce(
        includeSideViewTypes[0],
      );

      mockWorkspace.iterateAllLeaves.mockImplementationOnce((callback) => {
        const leaves = [mockLeaf1, mockLeaf2, mockLeaf3];
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        leaves.forEach((l) => callback(l));
      });

      const results = sut.getOpenLeaves(excludeMainViewTypes, includeSideViewTypes);

      expect(results).toHaveLength(2);
      expect(results).toContain(mockLeaf1);
      expect(results).not.toContain(mockLeaf2);
      expect(results).toContain(mockLeaf3);
      expect(mockWorkspace.iterateAllLeaves).toHaveBeenCalled();
    });

    test('with orderByAccessTime enabled, it should return leaves in reverse activeTime order', () => {
      mockLeaf1.activeTime = 1;
      mockLeaf2.activeTime = 2;
      mockLeaf3.activeTime = 3;

      mockLeaf1.getRoot.mockReturnValueOnce(mockWorkspace.rootSplit);
      mockLeaf2.getRoot.mockReturnValueOnce(mockWorkspace.rootSplit);
      mockLeaf3.getRoot.mockReturnValueOnce(mockWorkspace.rootSplit);

      mockWorkspace.iterateAllLeaves.mockImplementationOnce((callback) => {
        const leaves = [mockLeaf2, mockLeaf3, mockLeaf1];
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        leaves.forEach((leaf) => callback(leaf));
      });

      const results = sut.getOpenLeaves([], [], { orderByAccessTime: true });

      expect(results).toHaveLength(3);
      expect(results[0]).toBe(mockLeaf3);
      expect(results[1]).toBe(mockLeaf2);
      expect(results[2]).toBe(mockLeaf1);
    });

    test('with orderByAccessTime enabled, it should rank null or undefined times lowest', () => {
      mockLeaf1.activeTime = 1;
      mockLeaf2.activeTime = 2;
      mockLeaf3.activeTime = undefined;

      mockLeaf1.getRoot.mockReturnValueOnce(mockWorkspace.rootSplit);
      mockLeaf2.getRoot.mockReturnValueOnce(mockWorkspace.rootSplit);
      mockLeaf3.getRoot.mockReturnValueOnce(mockWorkspace.rootSplit);

      mockWorkspace.iterateAllLeaves.mockImplementationOnce((callback) => {
        const leaves = [mockLeaf1, mockLeaf3, mockLeaf2];
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        leaves.forEach((leaf) => callback(leaf));
      });

      const results = sut.getOpenLeaves([], [], { orderByAccessTime: true });

      expect(results).toHaveLength(3);
      expect(results[0]).toBe(mockLeaf2);
      expect(results[1]).toBe(mockLeaf1);
      expect(results[2]).toBe(mockLeaf3);
    });
  });

  describe('navigateToLeafOrOpenFile', () => {
    it('should log errors to the console', async () => {
      const errorMsg = 'navigateToLeafOrOpenFile unit test error';
      const rejectedPromise = Promise.reject(errorMsg);
      const consoleLogSpy = jest.spyOn(console, 'log').mockReturnValueOnce();

      const navigateToLeafOrOpenFileAsyncSpy = jest
        .spyOn(Handler.prototype, 'navigateToLeafOrOpenFileAsync')
        .mockReturnValueOnce(rejectedPromise);

      sut.navigateToLeafOrOpenFile(null, null, errorMsg);

      try {
        await rejectedPromise;
      } catch (e) {
        /* noop */
      }

      expect(consoleLogSpy).toHaveBeenCalledWith(
        `Switcher++: error navigating to open file. ${errorMsg}`,
        errorMsg,
      );

      navigateToLeafOrOpenFileAsyncSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });
  });

  describe('openFileInLeaf', () => {
    it('should load a file in an existing leaf', async () => {
      const navType = false;
      const mockLeaf = makeLeaf();
      const mockFile = new TFile();
      const openState = { active: true };

      mockLeaf.openFile.mockResolvedValueOnce();
      mockWorkspace.getLeaf.mockReturnValueOnce(mockLeaf);

      await sut.openFileInLeaf(mockFile, navType, openState);

      expect(mockWorkspace.getLeaf).toHaveBeenCalledWith(navType);
      expect(mockLeaf.openFile).toHaveBeenCalledWith(mockFile, openState);
    });

    it('should load a file in a new leaf using navType "tab"', async () => {
      const navType = 'tab';
      const mockLeaf = makeLeaf();
      const mockFile = new TFile();
      const openState = { active: true };

      mockLeaf.openFile.mockResolvedValueOnce();
      mockWorkspace.getLeaf.mockReturnValueOnce(mockLeaf);

      await sut.openFileInLeaf(mockFile, navType, openState);

      expect(mockWorkspace.getLeaf).toHaveBeenCalledWith(navType);
      expect(mockLeaf.openFile).toHaveBeenCalledWith(mockFile, openState);
    });

    it('should load a file in a new leaf using navType "true"', async () => {
      const navType = true;
      const mockLeaf = makeLeaf();
      const mockFile = new TFile();
      const openState = { active: true };

      mockLeaf.openFile.mockResolvedValueOnce();
      mockWorkspace.getLeaf.mockReturnValueOnce(mockLeaf);

      await sut.openFileInLeaf(mockFile, navType, openState);

      expect(mockWorkspace.getLeaf).toHaveBeenCalledWith(navType);
      expect(mockLeaf.openFile).toHaveBeenCalledWith(mockFile, openState);
    });

    it('should load a file in a new split using navType "split"', async () => {
      const navType = 'split';
      const mockLeaf = makeLeaf();
      const mockFile = new TFile();
      const openState = { active: true };

      mockLeaf.openFile.mockResolvedValueOnce();
      mockWorkspace.getLeaf.mockReturnValueOnce(mockLeaf);

      await sut.openFileInLeaf(mockFile, navType, openState, 'horizontal');

      expect(mockWorkspace.getLeaf).toHaveBeenCalledWith(navType, 'horizontal');
      expect(mockLeaf.openFile).toHaveBeenCalledWith(mockFile, openState);
    });

    it('should load a file in a popout window', async () => {
      const navType = 'window';
      const mockLeaf = makeLeaf();
      const mockFile = new TFile();
      const openState = { active: true };

      mockLeaf.openFile.mockResolvedValueOnce();
      mockWorkspace.getLeaf.mockReturnValueOnce(mockLeaf);

      await sut.openFileInLeaf(mockFile, navType, openState);

      expect(mockWorkspace.getLeaf).toHaveBeenCalledWith(navType);
      expect(mockLeaf.openFile).toHaveBeenCalledWith(mockFile, openState);
    });
  });

  describe('extractTabNavigationType', () => {
    const mockKeymap = jest.mocked<typeof Keymap>(Keymap);
    it('should navigate to a new vertical split', () => {
      const mockEvt = mock<KeyboardEvent>({
        key: '\\',
        shiftKey: false,
      });

      mockKeymap.isModEvent.mockReturnValueOnce('tab');

      const { navType, splitDirection } = sut.extractTabNavigationType(mockEvt);

      expect(navType).toBe('split');
      expect(splitDirection).toBe('vertical');
    });

    it('should navigate to a new horizontal split', () => {
      const mockEvt = mock<KeyboardEvent>({
        key: '\\',
        shiftKey: true,
      });

      mockKeymap.isModEvent.mockReturnValueOnce('tab');

      const { navType, splitDirection } = sut.extractTabNavigationType(mockEvt, true);

      expect(navType).toBe('split');
      expect(splitDirection).toBe('horizontal');
    });

    it('should navigate to a new Popout window with isModEvent true', () => {
      const mockEvt = mock<KeyboardEvent>({
        key: 'o',
        shiftKey: false,
      });

      mockKeymap.isModEvent.mockReturnValueOnce(true);

      const { navType, splitDirection } = sut.extractTabNavigationType(mockEvt, false);

      expect(navType).toBe('window');
      expect(splitDirection).toBe('vertical');
    });

    it('should navigate to a new Popout window with isModEvent "tab"', () => {
      const mockEvt = mock<KeyboardEvent>({
        key: 'o',
        shiftKey: false,
      });

      mockKeymap.isModEvent.mockReturnValueOnce('tab');

      const { navType, splitDirection } = sut.extractTabNavigationType(mockEvt, true);

      expect(navType).toBe('window');
      expect(splitDirection).toBe('vertical');
    });

    it('should navigate to a new leaf "tab"', () => {
      const navTypeTab = 'tab';
      const mockEvt = mock<KeyboardEvent>({ shiftKey: false });
      mockKeymap.isModEvent.mockReturnValueOnce(navTypeTab);

      const { navType, splitDirection } = sut.extractTabNavigationType(mockEvt, false);

      expect(navType).toBe(navTypeTab);
      expect(splitDirection).toBe('vertical');
    });

    it('should navigate to an existing leaf "tab"', () => {
      const mockEvt = mock<KeyboardEvent>({ shiftKey: false });
      mockKeymap.isModEvent.mockReturnValueOnce(false);

      const { navType, splitDirection } = sut.extractTabNavigationType(mockEvt, false);

      expect(navType).toBe(false);
      expect(splitDirection).toBe('vertical');
    });
  });

  describe('activateLeafOrOpenFile', () => {
    let openFileInLeafSpy: jest.SpyInstance;
    let activateLeafSpy: jest.SpyInstance;

    beforeAll(() => {
      activateLeafSpy = jest.spyOn(Handler.prototype, 'activateLeaf');
      openFileInLeafSpy = jest
        .spyOn(Handler.prototype, 'openFileInLeaf')
        .mockResolvedValue();
    });

    beforeEach(() => {
      openFileInLeafSpy.mockClear();
      activateLeafSpy.mockReset();
    });

    afterAll(() => {
      openFileInLeafSpy.mockRestore();
      activateLeafSpy.mockRestore();
    });

    it('should open the file', async () => {
      const file = new TFile();
      const navType = false;

      await sut.activateLeafOrOpenFile(navType, file);

      expect(openFileInLeafSpy).toHaveBeenCalledWith(
        file,
        navType,
        defaultOpenViewState,
        undefined,
      );
    });

    it('should open the file in a new leaf "tab"', async () => {
      const file = new TFile();
      const navType = true;

      await sut.activateLeafOrOpenFile(navType, file);

      expect(openFileInLeafSpy).toHaveBeenCalledWith(
        file,
        navType,
        defaultOpenViewState,
        undefined,
      );
    });

    test('with existing leaf and navType false, it should activate the existing leaf', async () => {
      const file = new TFile();
      const navType = false;
      const leaf = makeLeaf();

      await sut.activateLeafOrOpenFile(navType, file, leaf);

      expect(openFileInLeafSpy).not.toHaveBeenCalled();
      expect(activateLeafSpy).toHaveBeenCalledWith(leaf, defaultOpenViewState.eState);
    });

    test('with existing leaf and navType true (new tab), it should create a new leaf "tab"', async () => {
      const file = new TFile();
      const navType = true;
      const leaf = makeLeaf();

      await sut.activateLeafOrOpenFile(navType, file, leaf);

      expect(activateLeafSpy).not.toHaveBeenCalled();
      expect(openFileInLeafSpy).toHaveBeenCalledWith(
        file,
        navType,
        defaultOpenViewState,
        undefined,
      );
    });

    it('should use the default OpenViewState when a falsy value is passed in for opening files', async () => {
      const file = new TFile();
      const navType = false;

      await sut.activateLeafOrOpenFile(navType, file);

      expect(openFileInLeafSpy).toHaveBeenCalledWith(
        file,
        navType,
        defaultOpenViewState,
        undefined,
      );
    });
  });

  describe('findMatchingLeaf', () => {
    const refViewType = 'backlink';
    let mockLeaf: MockProxy<WorkspaceLeaf>;
    let mockView: jest.MockedObject<View>;
    let getActiveLeafSpy: jest.SpyInstance;

    beforeAll(() => {
      mockSettings.referenceViews.push(refViewType);
      mockLeaf = makeLeaf();
      mockView = jest.mocked<View>(mockLeaf.view);

      getActiveLeafSpy = jest.spyOn(sut, 'getActiveLeaf').mockReturnValue(mockLeaf);
    });

    afterAll(() => {
      getActiveLeafSpy.mockRestore();
      mockSettings.referenceViews.splice(
        mockSettings.referenceViews.indexOf(refViewType),
        1,
      );
    });

    it('should match a file in the active editor', () => {
      const mockFile = mockView.file;
      const getOpenLeavesSpy = jest.spyOn(sut, 'getOpenLeaves');

      const result = sut.findMatchingLeaf(mockFile);

      // not expected to be called because activeLeaf is prioritized first
      expect(getOpenLeavesSpy).not.toHaveBeenCalled();
      expect(mockView.getViewType).toHaveBeenCalled();
      expect(result.leaf).toEqual(mockLeaf);

      getOpenLeavesSpy.mockRestore();
    });

    it('should match using a reference WorkspaceLeaf as a source', () => {
      const mockFile = mockView.file;
      const mockRefLeaf = makeLeaf(mockFile);
      const mockRefView = jest.mocked<View>(mockRefLeaf.view);
      const getOpenLeavesSpy = jest
        .spyOn(sut, 'getOpenLeaves')
        .mockReturnValueOnce([mockLeaf, mockRefLeaf]);

      mockRefView.getViewType.mockReturnValue(refViewType);

      const result = sut.findMatchingLeaf(mockFile, mockRefLeaf, false);

      expect(mockRefView.getViewType).toHaveBeenCalled();
      expect(mockView.getViewType).toHaveBeenCalled();
      expect(result.leaf).toEqual(mockLeaf);

      getOpenLeavesSpy.mockRestore();
    });

    it('should not match any reference view types as target', () => {
      mockView.getViewType.mockReturnValueOnce(refViewType);

      const result = sut.findMatchingLeaf(mockView.file, null, false);

      expect(mockView.getViewType).toHaveBeenCalled();
      expect(result.leaf).toBeNull();
    });

    test('with includeReferenceViews enabled, it should match reference view types as a target', () => {
      mockView.getViewType.mockReturnValueOnce(refViewType);

      const result = sut.findMatchingLeaf(mockView.file, null, true);

      expect(mockView.getViewType).toHaveBeenCalled();
      expect(result.leaf).toBe(mockLeaf);
    });
  });

  describe('renderContent', () => {
    it('should render the primary content UI elements', () => {
      const content = chance.sentence();
      const results = makeFuzzyMatch();
      const offset = 10;
      const mockRenderResults = jest.mocked(renderResults);
      const mockTitleEl = mock<HTMLDivElement>();
      const mockContentEl = mock<HTMLDivElement>();
      mockContentEl.createDiv.mockReturnValue(mockTitleEl);

      const mockParentEl = mock<HTMLDivElement>();
      mockParentEl.createDiv.mockReturnValue(mockContentEl);

      sut.renderContent(mockParentEl, content, results, offset);

      expect(mockRenderResults).toHaveBeenCalledWith(
        mockTitleEl,
        content,
        results,
        offset,
      );
      expect(mockParentEl.createDiv).toHaveBeenCalledWith(
        expect.objectContaining({
          cls: ['suggestion-content', 'qsp-content'],
        }),
      );
      expect(mockContentEl.createDiv).toHaveBeenCalledWith(
        expect.objectContaining({
          cls: ['suggestion-title', 'qsp-title'],
        }),
      );
    });
  });

  describe('renderPath', () => {
    const mockSetIcon = jest.mocked(setIcon);
    let mockParentEl: MockProxy<HTMLElement>;
    let mockRootFile: TFile;
    let mockVaultRoot: MockProxy<TFolder>;

    beforeAll(() => {
      mockParentEl = mock<HTMLElement>();
      mockParentEl.createDiv.mockReturnValue(mock<HTMLDivElement>());
      mockVaultRoot = mock<TFolder>({
        isRoot: () => true,
        path: '/',
        name: '',
      });

      mockRootFile = new TFile();
      mockRootFile.parent = mockVaultRoot;
    });

    afterEach(() => {
      mockClear(mockParentEl);
      mockReset(mockSettings);
    });

    it('should not throw on falsy input', () => {
      expect(() => sut.renderPath(null, null)).not.toThrow();
    });

    test('with PathDisplayFormat.None, it should not render anything', () => {
      mockSettings.pathDisplayFormat = PathDisplayFormat.None;

      sut.renderPath(mockParentEl, mockRootFile);

      expect(mockParentEl.createDiv).not.toHaveBeenCalled();
      expect(mockParentEl.createSpan).not.toHaveBeenCalled();
      expect(mockSetIcon).not.toHaveBeenCalled();
    });

    test('with hidePathIfRoot enabled, it should not render anything', () => {
      mockSettings.pathDisplayFormat = PathDisplayFormat.Full;
      mockSettings.hidePathIfRoot = true;

      sut.renderPath(mockParentEl, mockRootFile);

      expect(mockParentEl.createDiv).not.toHaveBeenCalled();
      expect(mockParentEl.createSpan).not.toHaveBeenCalled();
      expect(mockSetIcon).not.toHaveBeenCalled();
    });

    it('should render path information', () => {
      const getDisplayTextSpy = jest.spyOn(Handler.prototype, 'getPathDisplayText');
      mockSettings.pathDisplayFormat = PathDisplayFormat.Full;
      mockSettings.hidePathIfRoot = false;
      mockVault.getRoot.mockReturnValueOnce(mockVaultRoot);

      sut.renderPath(mockParentEl, mockRootFile);

      expect(mockParentEl.createDiv).toHaveBeenCalled();
      expect(mockSetIcon).toHaveBeenCalled();
      expect(getDisplayTextSpy).toHaveBeenCalledWith(
        mockRootFile,
        mockSettings.pathDisplayFormat,
        undefined,
      );

      getDisplayTextSpy.mockRestore();
    });

    it('should override path display setting', () => {
      const getDisplayTextSpy = jest.spyOn(Handler.prototype, 'getPathDisplayText');
      mockSettings.pathDisplayFormat = PathDisplayFormat.Full;
      mockSettings.hidePathIfRoot = true;
      mockVault.getRoot.mockReturnValueOnce(mockVaultRoot);

      sut.renderPath(mockParentEl, mockRootFile, true, null, true);

      expect(mockParentEl.createDiv).toHaveBeenCalled();
      expect(mockSetIcon).toHaveBeenCalled();
      expect(getDisplayTextSpy).toHaveBeenCalledWith(
        mockRootFile,
        PathDisplayFormat.FolderPathFilenameOptional,
        true,
      );

      getDisplayTextSpy.mockRestore();
    });
  });

  describe('getPathDisplayText', () => {
    const mockNormalizePath = jest.mocked(normalizePath);
    let mockRootFile: TFile;
    let mockNestedFile: TFile;
    let mockVaultRoot: MockProxy<TFolder>;

    beforeAll(() => {
      mockVaultRoot = mock<TFolder>({
        isRoot: () => true,
        path: '/',
        name: '',
      });
      mockVault.getRoot.mockReturnValue(mockVaultRoot);

      mockRootFile = new TFile();
      mockRootFile.parent = mockVaultRoot;

      mockNestedFile = new TFile();
      mockNestedFile.parent = mock<TFolder>({
        name: 'parentFolderName',
        path: 'path/to/parentFolderName',
        isRoot: () => false,
      });
    });

    afterEach(() => {
      mockReset(mockSettings);
    });

    afterAll(() => {
      mockVault.getRoot.mockReset();
    });

    it('should not throw on falsy input', () => {
      expect(() => sut.getPathDisplayText(null, null)).not.toThrow();
    });

    test('with PathDisplayFormat.FolderWithFilename, it should return just the filename for a file a the root of the vault', () => {
      const result = sut.getPathDisplayText(
        mockRootFile,
        PathDisplayFormat.FolderWithFilename,
      );

      expect(result).toBe(mockRootFile.name);
    });

    test('with PathDisplayFormat.FolderWithFilename, it should return just the parentFolderName/filename for a nested file', () => {
      mockNormalizePath.mockImplementationOnce((path) => path);

      const result = sut.getPathDisplayText(
        mockNestedFile,
        PathDisplayFormat.FolderWithFilename,
      );

      expect(result).toBe(`${mockNestedFile.parent.name}/${mockNestedFile.name}`);
    });

    test('with PathDisplayFormat.FolderOnly, it should return just "/" for a file at the root of the vault', () => {
      const result = sut.getPathDisplayText(mockRootFile, PathDisplayFormat.FolderOnly);

      expect(result).toBe(mockRootFile.parent.path);
    });

    test('with PathDisplayFormat.FolderOnly, it should return just the parentFolderName for a nested file', () => {
      const result = sut.getPathDisplayText(mockNestedFile, PathDisplayFormat.FolderOnly);

      expect(result).toBe(mockNestedFile.parent.name);
    });

    test('with PathDisplayFormat.Full, it should return the file path', () => {
      const result = sut.getPathDisplayText(mockNestedFile, PathDisplayFormat.Full);

      expect(result).toBe(mockNestedFile.path);
    });

    test('with PathDisplayFormat.None, it should return an empty string', () => {
      const result = sut.getPathDisplayText(mockNestedFile, PathDisplayFormat.None);

      expect(result).toBe('');
    });

    test('with PathDisplayFormat.FolderPathFilenameOptional, it should return the file path', () => {
      const result = sut.getPathDisplayText(
        mockNestedFile,
        PathDisplayFormat.FolderPathFilenameOptional,
      );

      expect(result).toBe(mockNestedFile.path);
    });

    test('with PathDisplayFormat.FolderPathFilenameOptional and excludeOptionalFilename enabled, it should return the full parent folder path with trailing "/"', () => {
      const result = sut.getPathDisplayText(
        mockNestedFile,
        PathDisplayFormat.FolderPathFilenameOptional,
        true,
      );

      expect(result).toBe(mockNestedFile.parent.path + '/');
    });
  });

  describe('addClassesToSuggestionContainer', () => {
    it('should not throw on falsy input', () => {
      expect(() => sut.addClassesToSuggestionContainer(null, null)).not.toThrow();
    });

    it('should add the base and optional styles', () => {
      const mockEl = mock<HTMLElement>();
      const optionalStyles = ['test-style'];

      sut.addClassesToSuggestionContainer(mockEl, optionalStyles);

      expect(mockEl.addClasses).toHaveBeenCalledWith(
        expect.arrayContaining(['mod-complex', ...optionalStyles]),
      );
    });
  });

  describe('splitSearchMatchesAtBasename', () => {
    const filename = 'Pane layout II.md'.toLowerCase();
    const filepath = 'Obsidian Help/Panes/Pane layout II.md'.toLowerCase();
    const file = new TFile();
    file.name = filename;
    file.path = filepath;

    const matchPart: (query: string, offset?: number) => SearchMatchPart = (
      query,
      offset = 0,
    ) => {
      const start = filepath.indexOf(query, offset);
      const end = start + query.length;
      return [start, end];
    };

    it('should return matches for the path segment', () => {
      const query = 'help/pane';
      const matches = [matchPart(query)];

      const {
        pathMatch: { matches: pathMatches },
        basenameMatch,
      } = sut.splitSearchMatchesAtBasename(file, { matches, score: 0 });

      expect(basenameMatch).toBeNull();
      expect(pathMatches).toHaveLength(1);
      expect(filepath.slice(pathMatches[0][0], pathMatches[0][1])).toBe(query);
    });

    it('should return matches for the filename segment', () => {
      const query = 'layout';
      const matches = [matchPart(query)];

      const {
        pathMatch,
        basenameMatch: { matches: nameMatches },
      } = sut.splitSearchMatchesAtBasename(file, { matches, score: 0 });

      expect(pathMatch).toBeNull();
      expect(nameMatches).toHaveLength(1);
      expect(filename.slice(nameMatches[0][0], nameMatches[0][1])).toBe(query);
    });

    it('should return matches for both path and filename segments', () => {
      const matches = [matchPart('obsidian'), matchPart('layout')];

      const {
        pathMatch: { matches: pathMatches },
        basenameMatch: { matches: nameMatches },
      } = sut.splitSearchMatchesAtBasename(file, { matches, score: 0 });

      expect(pathMatches).toHaveLength(1);
      expect(filepath.slice(pathMatches[0][0], pathMatches[0][1])).toBe('obsidian');

      expect(nameMatches).toHaveLength(1);
      expect(filename.slice(nameMatches[0][0], nameMatches[0][1])).toBe('layout');
    });

    it('should return matches for both path and filename segments when a single match spans both segments', () => {
      const matches = [matchPart('panes/pane')];

      const {
        pathMatch: { matches: pathMatches },
        basenameMatch: { matches: nameMatches },
      } = sut.splitSearchMatchesAtBasename(file, { matches, score: 0 });

      expect(pathMatches).toHaveLength(1);
      expect(filepath.slice(pathMatches[0][0], pathMatches[0][1])).toBe('panes/');

      expect(nameMatches).toHaveLength(1);
      expect(filename.slice(nameMatches[0][0], nameMatches[0][1])).toBe('pane');
    });

    it('should return matches for both path and filename segments when there are multiple matches in each segment', () => {
      const matches = [
        matchPart('n hel'),
        matchPart('/', 8),
        matchPart('anes/p', 8),
        matchPart('n', 20),
        matchPart(' ', 20),
        matchPart('ayout', 20),
      ];

      const {
        pathMatch: { matches: pathMatches },
        basenameMatch: { matches: nameMatches },
      } = sut.splitSearchMatchesAtBasename(file, { matches, score: 0 });

      expect(pathMatches).toHaveLength(3);
      expect(filepath.slice(pathMatches[0][0], pathMatches[0][1])).toBe('n hel');
      expect(filepath.slice(pathMatches[1][0], pathMatches[1][1])).toBe('/');
      expect(filepath.slice(pathMatches[2][0], pathMatches[2][1])).toBe('anes/');

      expect(nameMatches).toHaveLength(4);
      expect(filename.slice(nameMatches[0][0], nameMatches[0][1])).toBe('p');
      expect(filename.slice(nameMatches[1][0], nameMatches[1][1])).toBe('n');
      expect(filename.slice(nameMatches[2][0], nameMatches[2][1])).toBe(' ');
      expect(filename.slice(nameMatches[3][0], nameMatches[3][1])).toBe('ayout');
    });
  });

  describe('fuzzySearchStrings', () => {
    it('should return result for primary string', () => {
      const filterText = 'primary';
      const match = makeFuzzyMatch();
      const mockFuzzySearch = jest
        .mocked<typeof fuzzySearch>(fuzzySearch)
        .mockImplementation((_q, text: string) => {
          return text === filterText ? match : null;
        });

      const result = sut.fuzzySearchStrings(null, filterText, chance.sentence());

      expect(result.isPrimary).toBe(true);
      expect(result.match).toBe(match);
      expect(mockFuzzySearch).toHaveBeenCalled();

      mockFuzzySearch.mockRestore();
    });

    it('should return result for secondary string with a downranked score', () => {
      const filterText = 'secondary';
      const match = makeFuzzyMatch();
      const initialScore = match.score;
      const mockFuzzySearch = jest
        .mocked<typeof fuzzySearch>(fuzzySearch)
        .mockImplementation((_q, text: string) => {
          return text === filterText ? match : null;
        });

      const result = sut.fuzzySearchStrings(null, chance.sentence(), filterText);

      expect(result.isPrimary).toBe(false);
      expect(result.match).toBe(match);
      expect(result.match.score).toBe(initialScore - 1);
      expect(mockFuzzySearch).toHaveBeenCalled();

      mockFuzzySearch.mockRestore();
    });
  });

  describe('fuzzySearchWithFallback', () => {
    const filterText = chance.word();
    const filepath = `path/to/${filterText}/${filterText} name.md`;
    const mockPrepQuery = makePreparedQuery(filterText);
    const match = makeFuzzyMatch();
    let mockFuzzySearch: jest.MockedFn<typeof fuzzySearch>;

    beforeAll(() => {
      mockFuzzySearch = jest
        .mocked<typeof fuzzySearch>(fuzzySearch)
        .mockImplementation((_q, text: string) => {
          return text === filterText || text === filepath ? match : null;
        });
    });

    afterAll(() => {
      mockFuzzySearch.mockRestore();
    });

    it('should match for primary string', () => {
      const result = sut.fuzzySearchWithFallback(mockPrepQuery, filterText);

      expect(result).toEqual(
        expect.objectContaining({
          matchType: MatchType.Primary,
          matchText: filterText,
          match,
        }),
      );
    });

    it('should match file basename', () => {
      const mockFile = new TFile();
      mockFile.basename = filterText;

      const result = sut.fuzzySearchWithFallback(mockPrepQuery, null, mockFile);

      expect(result).toEqual(
        expect.objectContaining({
          matchType: MatchType.Basename,
          matchText: filterText,
          match,
        }),
      );
    });

    it('should match file path', () => {
      const mockFile = new TFile();
      mockFile.path = filterText;

      const result = sut.fuzzySearchWithFallback(mockPrepQuery, null, mockFile);

      expect(result).toEqual(
        expect.objectContaining({
          matchType: MatchType.Path,
          matchText: mockFile.path,
          match,
        }),
      );
    });

    it("should partially match filepath and basename segments when there isn't a full basename match", () => {
      const mockFile = new TFile();
      mockFile.path = filepath;

      const result = sut.fuzzySearchWithFallback(mockPrepQuery, null, mockFile);

      expect(result).toEqual(
        expect.objectContaining({
          matchType: MatchType.Path,
          matchText: mockFile.path,
          match,
        }),
      );
    });
  });

  describe('renderAsFileInfoPanel', () => {
    const mockFile = new TFile();
    const parentElStyles = [chance.word()];
    const match = makeFuzzyMatch();
    const mockContentEl = mock<HTMLDivElement>();
    const mockParentEl = mock<HTMLElement>();
    let renderContentSpy: jest.SpyInstance;
    let renderPathSpy: jest.SpyInstance;

    beforeAll(() => {
      renderContentSpy = jest.spyOn(sut, 'renderContent');
      renderPathSpy = jest.spyOn(sut, 'renderPath');
    });

    afterAll(() => {
      renderContentSpy.mockRestore();
      renderPathSpy.mockRestore();
    });

    afterEach(() => {
      renderContentSpy.mockReset();
      renderPathSpy.mockReset();
    });

    it('should render a suggestion with primaryString match offsets', () => {
      const matchType = MatchType.Primary;
      const primaryString = chance.sentence();

      renderContentSpy.mockReturnValueOnce(mockContentEl);
      renderPathSpy.mockReturnValueOnce(null);

      sut.renderAsFileInfoPanel(
        mockParentEl,
        parentElStyles,
        primaryString,
        mockFile,
        matchType,
        match,
      );

      expect(renderContentSpy).toHaveBeenCalledWith(mockParentEl, primaryString, match);

      expect(mockParentEl.addClasses).toHaveBeenCalledWith(
        expect.arrayContaining(['mod-complex', ...parentElStyles]),
      );

      expect(renderPathSpy).toHaveBeenCalledWith(
        mockContentEl,
        mockFile,
        true,
        null,
        false,
      );
    });

    it('should render a suggestion with primaryString and no matches for primaryString', () => {
      const matchType = MatchType.None;
      const primaryString = chance.sentence();

      renderContentSpy.mockReturnValueOnce(mockContentEl);
      renderPathSpy.mockReturnValueOnce(null);

      sut.renderAsFileInfoPanel(
        mockParentEl,
        parentElStyles,
        primaryString,
        mockFile,
        matchType,
        match,
      );

      expect(renderContentSpy).toHaveBeenCalledWith(mockParentEl, primaryString, null);

      expect(mockParentEl.addClasses).toHaveBeenCalledWith(
        expect.arrayContaining(['mod-complex', ...parentElStyles]),
      );

      expect(renderPathSpy).toHaveBeenCalledWith(
        mockContentEl,
        mockFile,
        true,
        null,
        false,
      );
    });

    it('should render a suggestion with primaryString and match offsets for path', () => {
      const matchType = MatchType.Path;
      const primaryString = chance.sentence();

      renderContentSpy.mockReturnValueOnce(mockContentEl);
      renderPathSpy.mockReturnValueOnce(null);

      sut.renderAsFileInfoPanel(
        mockParentEl,
        parentElStyles,
        primaryString,
        mockFile,
        matchType,
        match,
      );

      expect(renderContentSpy).toHaveBeenCalledWith(mockParentEl, primaryString, null);

      expect(mockParentEl.addClasses).toHaveBeenCalledWith(
        expect.arrayContaining(['mod-complex', ...parentElStyles]),
      );

      expect(renderPathSpy).toHaveBeenCalledWith(
        mockContentEl,
        mockFile,
        true,
        match,
        true,
      );
    });

    it('should render a suggestion with basename match offsets', () => {
      const matchType = MatchType.Basename;

      renderContentSpy.mockReturnValueOnce(mockContentEl);
      renderPathSpy.mockReturnValueOnce(null);

      sut.renderAsFileInfoPanel(
        mockParentEl,
        parentElStyles,
        null,
        mockFile,
        matchType,
        match,
      );

      expect(renderContentSpy).toHaveBeenCalledWith(
        mockParentEl,
        mockFile.basename,
        match,
      );

      expect(mockParentEl.addClasses).toHaveBeenCalledWith(
        expect.arrayContaining(['mod-complex', ...parentElStyles]),
      );

      expect(renderPathSpy).toHaveBeenCalledWith(
        mockContentEl,
        mockFile,
        true,
        null,
        false,
      );
    });

    it('should render a suggestion with parent path match offsets', () => {
      const matchType = MatchType.Path;

      renderContentSpy.mockReturnValueOnce(mockContentEl);
      renderPathSpy.mockReturnValueOnce(null);

      sut.renderAsFileInfoPanel(
        mockParentEl,
        parentElStyles,
        null,
        mockFile,
        matchType,
        match,
      );

      expect(renderContentSpy).toHaveBeenCalledWith(
        mockParentEl,
        mockFile.basename,
        null,
      );

      expect(mockParentEl.addClasses).toHaveBeenCalledWith(
        expect.arrayContaining(['mod-complex', ...parentElStyles]),
      );

      expect(renderPathSpy).toHaveBeenCalledWith(
        mockContentEl,
        mockFile,
        true,
        match,
        true,
      );
    });
  });

  describe('renderOptionalIndicators', () => {
    const mockSetIcon = jest.mocked(setIcon);

    beforeEach(() => {
      mockSetIcon.mockClear();
    });

    it('should add a flair icon to an existing flair container', () => {
      const mockParentEl = mock<HTMLElement>();
      const mockFlairContainer = mock<HTMLDivElement>();
      const mockFlairEl = mock<HTMLSpanElement>();
      const sugg = makeFileSuggestion();
      sugg.isRecent = true;

      mockFlairContainer.createSpan.mockReturnValueOnce(mockFlairEl);

      const result = sut.renderOptionalIndicators(mockParentEl, sugg, mockFlairContainer);

      expect(result).toBe(mockFlairContainer);
      expect(mockParentEl.addClass).toHaveBeenCalledWith('qsp-recent-file');
      expect(mockSetIcon).toHaveBeenCalledWith(mockFlairEl, 'history');
    });

    it('should create flair container and add flair icon to it', () => {
      const mockParentEl = mock<HTMLElement>();
      const mockFlairContainer = mock<HTMLDivElement>();
      const mockFlairEl = mock<HTMLSpanElement>();
      const sugg = makeFileSuggestion();
      sugg.isOpenInEditor = true;

      mockParentEl.createDiv.mockReturnValueOnce(mockFlairContainer);
      mockFlairContainer.createSpan.mockReturnValueOnce(mockFlairEl);

      const result = sut.renderOptionalIndicators(mockParentEl, sugg, null);

      expect(result).toBe(mockFlairContainer);
      expect(mockParentEl.addClass).toHaveBeenCalledWith('qsp-open-editor');
      expect(mockSetIcon).toHaveBeenCalledWith(mockFlairEl, 'lucide-file-edit');
    });

    it('should not render icons with the showOptionalIndicatorIcons disabled', () => {
      mockSettings.showOptionalIndicatorIcons = false;
      const mockParentEl = mock<HTMLElement>();
      const mockFlairContainer = mock<HTMLDivElement>();
      mockParentEl.createDiv.mockReturnValueOnce(mockFlairContainer);

      const result = sut.renderOptionalIndicators(mockParentEl, null, null);

      expect(result).toBe(mockFlairContainer);
      expect(mockSetIcon).not.toHaveBeenCalled();

      mockSettings.showOptionalIndicatorIcons = true;
    });
  });

  describe('renderIndicator', () => {
    it('should render an SVG icon', () => {
      const mockFlairEl = mock<HTMLDivElement>();
      const mockFlairContainerEl = mock<HTMLDivElement>();
      mockFlairContainerEl.createSpan.mockReturnValueOnce(mockFlairEl);
      const mockSetIcon = jest.mocked(setIcon);

      const classes = [chance.word()];
      const iconName = chance.word();

      const result = sut.renderIndicator(mockFlairContainerEl, classes, iconName);

      expect(result).toBe(mockFlairEl);
      expect(mockFlairEl.addClass).toHaveBeenCalledWith('svg-icon');
      expect(mockSetIcon).toHaveBeenCalledWith(mockFlairEl, iconName);
      expect(mockFlairContainerEl.createSpan).toHaveBeenCalledWith(
        expect.objectContaining({ cls: ['suggestion-flair', ...classes] }),
      );
    });

    it('should render a text icon', () => {
      const mockFlairEl = mock<HTMLDivElement>();
      const mockFlairContainerEl = mock<HTMLDivElement>();
      mockFlairContainerEl.createSpan.mockReturnValueOnce(mockFlairEl);

      const classes = [chance.word()];
      const text = chance.word();

      const result = sut.renderIndicator(mockFlairContainerEl, classes, null, text);

      expect(result).toBe(mockFlairEl);
      expect(mockFlairEl.setText).toHaveBeenCalledWith(text);
      expect(mockFlairContainerEl.createSpan).toHaveBeenCalledWith(
        expect.objectContaining({ cls: ['suggestion-flair', ...classes] }),
      );
    });
  });

  describe('createFlairContainer', () => {
    it('should create a container with the appropriate css classes', () => {
      const mockDivEl = mock<HTMLDivElement>();
      const mockParentEl = mock<HTMLElement>();
      mockParentEl.createDiv.mockReturnValueOnce(mockDivEl);

      const result = sut.createFlairContainer(mockParentEl);

      expect(result).toBe(mockDivEl);
      expect(mockParentEl.createDiv).toHaveBeenCalledWith(
        expect.objectContaining({ cls: ['suggestion-aux', 'qsp-aux'] }),
      );
    });
  });

  describe('getTFileByPath', () => {
    it('returns a TFile by path', () => {
      const mockFile = new TFile();
      mockVault.getAbstractFileByPath
        .calledWith(mockFile.path)
        .mockReturnValueOnce(mockFile);

      const result = sut.getTFileByPath(mockFile.path);

      expect(result).toBe(mockFile);

      mockReset(mockVault);
    });

    it('returns null if a TFile is not found', () => {
      const abstractFile: TAbstractFile = {
        vault: mockVault,
        path: 'path/to/itemname',
        name: 'itemname',
        parent: mock<TFolder>(),
      };

      mockVault.getAbstractFileByPath
        .calledWith(abstractFile.path)
        .mockReturnValueOnce(abstractFile);

      const result = sut.getTFileByPath(abstractFile.path);

      expect(result).toBe(null);

      mockReset(mockVault);
    });
  });

  describe('applyMatchPriorityPreferences', () => {
    it('should not throw on falsy input', () => {
      const sugg = makeFileSuggestion();

      mockMetadataCache.isUserIgnored.mockReturnValue(false);

      expect(() => {
        sugg.file = null;
        sut.applyMatchPriorityPreferences(sugg);
      }).not.toThrow();

      expect(() => {
        sugg.match = null;
        sut.applyMatchPriorityPreferences(sugg);
      }).not.toThrow();

      expect(() => {
        sut.applyMatchPriorityPreferences(null);
      }).not.toThrow();

      mockMetadataCache.isUserIgnored.mockReset();
    });

    it('should downrank suggestions for file that are excluded by Obsidian exclude files setting', () => {
      const sugg = makeFileSuggestion(null, null, 0);

      mockMetadataCache.isUserIgnored
        .calledWith(sugg.file.path)
        .mockReturnValueOnce(true);

      const result = sut.applyMatchPriorityPreferences(sugg);

      // by default scores are downranked by -10
      expect(result.match.score).toBe(-10);
      expect(result.downranked).toBe(true);
      expect(mockMetadataCache.isUserIgnored).toHaveBeenCalledWith(sugg.file.path);

      mockMetadataCache.isUserIgnored.mockReset();
    });

    it('should not change score if setting is not a valid number', () => {
      const sugg = makeFileSuggestion(null, null, 0);
      sugg.isBookmarked = true;

      // eslint-disable-next-line
      // @ts-ignore
      mockSettings.matchPriorityAdjustments = { isBookmarked: '0NAN' };

      const result = sut.applyMatchPriorityPreferences(sugg);

      expect(result.match.score).toBe(0);

      mockReset(mockSettings);
    });

    it('should not change score if setting is not set', () => {
      const sugg = makeFileSuggestion(null, null, 0);

      mockSettings.matchPriorityAdjustments = null;

      const result = sut.applyMatchPriorityPreferences(sugg);

      expect(result.match.score).toBe(0);

      mockReset(mockSettings);
    });

    test.each([
      {
        score: 1000,
        factor: 0.5,
        expected: 1500,
        title: 'a positive factor should increase a positive score',
      },
      {
        score: -1000,
        factor: 0.5,
        expected: -500,
        title: 'a positive factor should increase a negative score',
      },
      {
        score: 1000,
        factor: -0.5,
        expected: 500,
        title: 'a negative factor should decrease a positive score',
      },
      {
        score: -1000,
        factor: -0.5,
        expected: -1500,
        title: 'a negative factor should decrease a negative score',
      },
    ])('$title', ({ score, factor, expected }) => {
      const sugg = makeFileSuggestion(null, null, score);
      sugg.isOpenInEditor = true;

      mockSettings.matchPriorityAdjustments = { isOpenInEditor: factor };

      const result = sut.applyMatchPriorityPreferences(sugg);

      expect(result.match.score).toBe(expected);

      mockReset(mockSettings);
    });

    it('should update score for suggestions that is open in an editor', () => {
      const sugg = makeFileSuggestion(null, null, -0.15);
      sugg.isOpenInEditor = true;

      mockSettings.matchPriorityAdjustments = { isOpenInEditor: 0.5 };

      const result = sut.applyMatchPriorityPreferences(sugg);

      expect(result.match.score).toBe(-0.075);

      mockReset(mockSettings);
    });

    it('should update score for bookmarked suggestions', () => {
      const sugg = makeFileSuggestion(null, null, -0.15);
      sugg.isBookmarked = true;

      mockSettings.matchPriorityAdjustments = { isBookmarked: 0.5 };

      const result = sut.applyMatchPriorityPreferences(sugg);

      expect(result.match.score).toBe(-0.075);

      mockReset(mockSettings);
    });

    it('should update score for recently open suggestions', () => {
      const sugg = makeFileSuggestion(null, null, -0.15);
      sugg.isRecent = true;

      mockSettings.matchPriorityAdjustments = { isRecent: 0.5 };

      const result = sut.applyMatchPriorityPreferences(sugg);

      expect(result.match.score).toBe(-0.075);

      mockReset(mockSettings);
    });

    it('should update score for heading suggestions', () => {
      const sugg = makeHeadingSuggestion(
        mock<HeadingCache>({ level: 2 }),
        null,
        null,
        -0.15,
      );

      mockSettings.matchPriorityAdjustments = { h2: 0.5 };

      const result = sut.applyMatchPriorityPreferences(sugg);

      expect(result.match.score).toBe(-0.075);

      mockReset(mockSettings);
    });
  });

  describe('updateWorkspaceEnvListStatus', () => {
    it('should not throw on falsy input', () => {
      const sugg: EditorSuggestion = null;
      const list: WorkspaceEnvList = null;
      expect(() => Handler.updateWorkspaceEnvListStatus(list, sugg)).not.toThrow();
    });

    it('should update WorkspaceListstatus', () => {
      const file = new TFile();
      const sugg = makeEditorSuggestion(null, file);
      const mockEnvList = mock<WorkspaceEnvList>();
      mockEnvList.openWorkspaceFiles = new Set<TFile>([file]);
      mockEnvList.mostRecentFiles = new Set<TFile>([file]);
      mockEnvList.fileBookmarks = new Map<TFile, BookmarksItemInfo>([[file, null]]);

      Handler.updateWorkspaceEnvListStatus(mockEnvList, sugg);

      expect(sugg).toEqual(
        expect.objectContaining({
          isOpenInEditor: true,
          isRecent: true,
          isBookmarked: true,
        }),
      );
    });
  });

  describe('renderFileCreationSuggestion', () => {
    it('should render a hint suggestion for creating new file', () => {
      const filename = chance.word();
      const mockParentEl = mock<HTMLElement>();
      const mockContentEl = mock<HTMLDivElement>();
      const mockFlairEl = mock<HTMLDivElement>();

      const renderContentSpy = jest
        .spyOn(sut, 'renderContent')
        .mockReturnValueOnce(mockContentEl);

      const createFlairContainerSpy = jest
        .spyOn(sut, 'createFlairContainer')
        .mockReturnValueOnce(mockFlairEl);

      sut.renderFileCreationSuggestion(mockParentEl, filename);

      expect(renderContentSpy).toHaveBeenCalledWith(mockParentEl, filename, null);

      expect(mockFlairEl.createSpan).toHaveBeenCalledWith(
        expect.objectContaining({
          cls: 'suggestion-hotkey',
          text: 'Enter to create',
        }),
      );

      renderContentSpy.mockRestore();
      createFlairContainerSpy.mockRestore();
    });
  });

  describe('createFile', () => {
    const viewState = { active: true };

    it('should call .openLinkText to create a new file', () => {
      const filename = chance.word();
      const mockEvt = mock<MouseEvent>();

      mockWorkspace.openLinkText.mockReturnValueOnce(Promise.resolve());

      sut.createFile(filename, mockEvt);

      expect(mockWorkspace.openLinkText).toHaveBeenCalledWith(
        filename,
        '',
        false,
        viewState,
      );

      mockWorkspace.openLinkText.mockReset();
    });

    it('should use the active view file path when available to create a new file', () => {
      const filename = chance.word();
      const mockEvt = mock<MouseEvent>();
      const file = new TFile();
      mockWorkspace.getActiveViewOfType.mockReturnValueOnce(mock<FileView>({ file }));

      mockWorkspace.openLinkText.mockReturnValueOnce(Promise.resolve());

      sut.createFile(filename, mockEvt);

      expect(mockWorkspace.openLinkText).toHaveBeenCalledWith(
        filename,
        file.path,
        false,
        viewState,
      );

      mockWorkspace.getActiveViewOfType.mockReset();
      mockWorkspace.openLinkText.mockReset();
    });

    it('should log any errors to the console while trying to create a new file', async () => {
      const filename = chance.word();
      const errorMsg = 'createFile Unit test error';
      const rejectedPromise = Promise.reject(errorMsg);
      const consoleLogSpy = jest.spyOn(console, 'log').mockReturnValueOnce();

      mockWorkspace.openLinkText.mockReturnValueOnce(rejectedPromise);

      sut.createFile(filename, null);

      try {
        await rejectedPromise;
      } catch (e) {
        /* noop */
      }

      expect(mockWorkspace.openLinkText).toHaveBeenCalledWith(
        filename,
        '',
        false,
        viewState,
      );

      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Switcher++: error creating new file. ',
        errorMsg,
      );

      mockWorkspace.openLinkText.mockReset();
      consoleLogSpy.mockRestore();
    });
  });

  describe('activateFacet', () => {
    test('withshouldResetActiveFacets disabled, it should save changes to active facet status', () => {
      const finalValue = true;
      const mockFacet = mock<Facet>({ isActive: false });
      mockSettings.quickFilters = mock<FacetSettingsData>({
        shouldResetActiveFacets: false,
      });

      sut.activateFacet([mockFacet], finalValue);

      expect(mockFacet.isActive).toBe(finalValue);
      expect(mockSettings.save).toHaveBeenCalledWith();
    });
  });
});
