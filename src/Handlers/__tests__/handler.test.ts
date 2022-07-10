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
} from 'obsidian';
import {
  defaultOpenViewState,
  makeLeaf,
  makeEditorSuggestion,
  makeFuzzyMatch,
} from '@fixtures';
import { AnySuggestion, EditorNavigationType, Mode, PathDisplayFormat } from 'src/types';
import { mock, mockClear, MockProxy, mockReset } from 'jest-mock-extended';
import { Handler } from '../handler';
import { SwitcherPlusSettings } from 'src/settings';
import { stripMDExtensionFromPath } from 'src/utils';
import { Chance } from 'chance';
import { InputInfo } from 'src/switcherPlus';

const chance = new Chance();

class SUT extends Handler<AnySuggestion> {
  validateCommand(
    _inputInfo: InputInfo,
    _index: number,
    _filterText: string,
    _activeSuggestion: AnySuggestion,
    _activeLeaf: WorkspaceLeaf,
  ): void {
    throw new Error('Method not implemented.');
  }
  getSuggestions(_inputInfo: InputInfo): AnySuggestion[] {
    throw new Error('Method not implemented.');
  }
  renderSuggestion(_sugg: AnySuggestion, _parentEl: HTMLElement): void {
    throw new Error('Method not implemented.');
  }
  onChooseSuggestion(_sugg: AnySuggestion, _evt: MouseEvent | KeyboardEvent): void {
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

  describe('commandString property', () => {
    it('should return null', () => {
      expect(sut.commandString).toBeNull();
    });
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

      const getCursorPosSpy = jest.spyOn(sut, 'getCursorPosition');
      getCursorPosSpy.mockReturnValueOnce(mockCursorPos);

      const mockLeaf = mock<WorkspaceLeaf>({ view: mockView });

      mockWorkspace.activeLeaf = mockLeaf; // <- set as active leaf

      const sugg = makeEditorSuggestion(mockLeaf, mockFile);

      const result = sut.getSuggestionInfo(sugg);

      expect(getCursorPosSpy).toHaveBeenCalledWith(mockView);
      expect(result).toEqual(
        expect.objectContaining({
          isValidSource: true,
          leaf: mockWorkspace.activeLeaf,
          file: mockFile,
          suggestion: sugg,
          cursor: mockCursorPos,
        }),
      );

      getCursorPosSpy.mockRestore();
      mockWorkspace.activeLeaf = null;
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

  describe('shouldCreateNewLeaf', () => {
    let mockPlatform: MockProxy<typeof Platform>;

    beforeAll(() => {
      mockPlatform = jest.mocked<typeof Platform>(Platform);
    });

    test('with onOpenPreferNewPane enabled it should return true', () => {
      const isModDown = false;
      mockSettings.onOpenPreferNewPane = true;

      const result = sut.shouldCreateNewLeaf(isModDown);

      expect(result).toBe(true);

      mockReset(mockSettings);
    });

    test('with isAlreadyOpen enabled it should return false', () => {
      const isModDown = false;
      const isAlreadyOpen = true;
      mockSettings.onOpenPreferNewPane = true;

      const result = sut.shouldCreateNewLeaf(isModDown, isAlreadyOpen);

      expect(result).toBe(false);

      mockReset(mockSettings);
    });

    test('with isModDown enabled it should return true', () => {
      const isModDown = true;
      mockSettings.onOpenPreferNewPane = false;

      const result = sut.shouldCreateNewLeaf(isModDown);

      expect(result).toBe(true);

      mockReset(mockSettings);
    });

    test('with isModDown, and isAlreadyOpen enabled it should return true', () => {
      const isModDown = true;
      const isAlreadyOpen = true;
      mockSettings.onOpenPreferNewPane = false;

      const result = sut.shouldCreateNewLeaf(isModDown, isAlreadyOpen);

      expect(result).toBe(true);

      mockReset(mockSettings);
    });

    test('with onOpenPreferNewPane and isModDown enabled it should return true', () => {
      const isModDown = true;
      mockSettings.onOpenPreferNewPane = true;

      const result = sut.shouldCreateNewLeaf(isModDown);

      expect(result).toBe(true);

      mockReset(mockSettings);
    });

    test('with onOpenPreferNewPane, isModDown, isAlreadyOpen enabled it should return true', () => {
      const isModDown = true;
      const isAlreadyOpen = true;
      mockSettings.onOpenPreferNewPane = true;

      const result = sut.shouldCreateNewLeaf(isModDown, isAlreadyOpen);

      expect(result).toBe(true);

      mockReset(mockSettings);
    });

    test('with onOpenPreferNewPane enabled, and in Symbol mode, it should return true. This overrides all symbol mode new pane settings', () => {
      const isModDown = false;
      const isAlreadyOpen = false;
      mockSettings.onOpenPreferNewPane = true;

      const result = sut.shouldCreateNewLeaf(isModDown, isAlreadyOpen, Mode.SymbolList);

      expect(result).toBe(true);

      mockReset(mockSettings);
    });

    test('with onOpenPreferNewPane and isModDown enabled, and in Symbol mode, it should return true. This overrides all symbol mode new pane settings', () => {
      const isModDown = true;
      const isAlreadyOpen = false;
      mockSettings.onOpenPreferNewPane = true;

      const result = sut.shouldCreateNewLeaf(isModDown, isAlreadyOpen, Mode.SymbolList);

      expect(result).toBe(true);

      mockReset(mockSettings);
    });

    test('with onOpenPreferNewPane, isModDown, isAlreadyOpen enabled, and in Symbol mode, it should return true. This overrides all symbol mode new pane settings', () => {
      const isModDown = true;
      const isAlreadyOpen = true;
      mockSettings.onOpenPreferNewPane = true;

      const result = sut.shouldCreateNewLeaf(isModDown, isAlreadyOpen, Mode.SymbolList);

      expect(result).toBe(true);

      mockReset(mockSettings);
    });

    test('with alwaysNewPaneForSymbols enabled, and in Symbol mode, it should return true.', () => {
      const isModDown = false;
      const isAlreadyOpen = false;
      mockSettings.onOpenPreferNewPane = false;
      mockSettings.alwaysNewPaneForSymbols = true;

      const result = sut.shouldCreateNewLeaf(isModDown, isAlreadyOpen, Mode.SymbolList);

      expect(result).toBe(true);

      mockReset(mockSettings);
    });

    test('with isModDown enabled, and in Symbol mode, it should return true.', () => {
      const isModDown = true;
      const isAlreadyOpen = true;
      mockSettings.onOpenPreferNewPane = false;
      mockSettings.alwaysNewPaneForSymbols = false;

      const result = sut.shouldCreateNewLeaf(isModDown, isAlreadyOpen, Mode.SymbolList);

      expect(result).toBe(true);

      mockReset(mockSettings);
    });

    test('with useActivePaneForSymbolsOnMobile enabled, and in Symbol mode, it should return false.', () => {
      const isModDown = false;
      const isAlreadyOpen = true;
      mockSettings.onOpenPreferNewPane = false;
      mockSettings.alwaysNewPaneForSymbols = true;
      mockSettings.useActivePaneForSymbolsOnMobile = true;
      mockPlatform.isMobile = true;

      const result = sut.shouldCreateNewLeaf(isModDown, isAlreadyOpen, Mode.SymbolList);

      expect(result).toBe(false);

      mockReset(mockSettings);
    });

    test('with useActivePaneForSymbolsOnMobile disabled, and in Symbol mode, it should return true.', () => {
      const isModDown = false;
      const isAlreadyOpen = false;
      mockSettings.onOpenPreferNewPane = false;
      mockSettings.alwaysNewPaneForSymbols = true;
      mockSettings.useActivePaneForSymbolsOnMobile = false;
      mockPlatform.isMobile = true;

      const result = sut.shouldCreateNewLeaf(isModDown, isAlreadyOpen, Mode.SymbolList);

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

      sut.activateLeaf(mockLeaf, true);

      expect(mockLeaf.getRoot).toHaveBeenCalled();
      expect(mockWorkspace.setActiveLeaf).toHaveBeenCalledWith(mockLeaf, true);
      expect(mockView.setEphemeralState).toHaveBeenCalled();
    });

    it('should activate side panel leaf', () => {
      mockLeaf.getRoot.mockReturnValueOnce(mockWorkspace.rightSplit);

      sut.activateLeaf(mockLeaf, true);

      expect(mockLeaf.getRoot).toHaveBeenCalled();
      expect(mockWorkspace.setActiveLeaf).toHaveBeenCalledWith(mockLeaf, true);
      expect(mockView.setEphemeralState).toHaveBeenCalled();
      expect(mockWorkspace.revealLeaf).toHaveBeenCalledWith(mockLeaf);
    });
  });

  describe('getOpenLeaves', () => {
    it('should return all leaves', () => {
      const excludeMainViewTypes = ['exclude'];
      const includeSideViewTypes = ['include'];

      const l1 = makeLeaf();
      l1.getRoot.mockReturnValue(mockWorkspace.rootSplit);

      const l2 = makeLeaf();
      l2.getRoot.mockReturnValue(mockWorkspace.rootSplit);
      (l2.view as MockProxy<View>).getViewType.mockReturnValue(excludeMainViewTypes[0]);

      const l3 = makeLeaf();
      l3.getRoot.mockReturnValue(mockWorkspace.rightSplit);
      (l3.view as MockProxy<View>).getViewType.mockReturnValue(includeSideViewTypes[0]);

      mockWorkspace.iterateAllLeaves.mockImplementation((callback) => {
        const leaves = [l1, l2, l3];
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        leaves.forEach((l) => callback(l));
      });

      const results = sut.getOpenLeaves(excludeMainViewTypes, includeSideViewTypes);

      expect(results).toHaveLength(2);
      expect(results).toContain(l1);
      expect(results).not.toContain(l2);
      expect(results).toContain(l3);
      expect(mockWorkspace.iterateAllLeaves).toHaveBeenCalled();
    });
  });

  describe('openFileInLeaf', () => {
    it('should log a message to the console if falsy values are passed in', () => {
      let logWasCalled = false;
      const consoleLogSpy = jest
        .spyOn(console, 'log')
        .mockImplementation((message: string) => {
          if (message.startsWith('Switcher++: error opening file. ')) {
            logWasCalled = true;
          }
        });

      sut.openFileInLeaf(null, EditorNavigationType.ReuseExistingLeaf);

      expect(logWasCalled).toBe(true);

      consoleLogSpy.mockRestore();
    });

    it('should log a message to the console if openFile fails', () => {
      const mockLeaf = makeLeaf();
      const mockFile = new TFile();
      const openState = { active: true };

      // Promise used to trigger the error condition
      const openFilePromise = Promise.resolve();

      mockWorkspace.getLeaf.mockReturnValueOnce(mockLeaf);

      mockLeaf.openFile.mockImplementationOnce((_file, _openState) => {
        // throw to simulate openFile() failing
        return openFilePromise.then(() => {
          throw new Error('openFile() unit test mock error');
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
          if (message.startsWith('Switcher++: error opening file. ')) {
            // resolve the consoleLogPromise. This allows allPromises to resolve itself
            consoleLogPromiseResolveFn();
          }
        });

      // wait for the other promises to resolve before this promise can resolve
      const allPromises = Promise.all([openFilePromise, consoleLogPromise]);

      sut.openFileInLeaf(mockFile, EditorNavigationType.ReuseExistingLeaf, openState);

      // when all the promises are resolved check expectations and clean up
      return allPromises.finally(() => {
        expect(mockLeaf.openFile).toHaveBeenCalledWith(mockFile, openState);
        expect(consoleLogSpy).toHaveBeenCalled();

        consoleLogSpy.mockRestore();
      });
    });

    it('should load a file in an existing leaf', () => {
      const mockLeaf = makeLeaf();
      const mockFile = new TFile();
      const openState = { active: true };

      mockLeaf.openFile.mockResolvedValueOnce();
      mockWorkspace.getLeaf.mockReturnValueOnce(mockLeaf);

      sut.openFileInLeaf(
        mockFile,
        EditorNavigationType.ReuseExistingLeaf,
        openState,
        'panelUtils unit test.',
      );

      expect(mockWorkspace.getLeaf).toHaveBeenCalledWith(false);
      expect(mockLeaf.openFile).toHaveBeenCalledWith(mockFile, openState);
    });

    it('should load a file in a new leaf', () => {
      const mockLeaf = makeLeaf();
      const mockFile = new TFile();
      const openState = { active: true };

      mockLeaf.openFile.mockResolvedValueOnce();
      mockWorkspace.getLeaf.mockReturnValueOnce(mockLeaf);

      sut.openFileInLeaf(
        mockFile,
        EditorNavigationType.NewLeaf,
        openState,
        'panelUtils unit test.',
      );

      expect(mockWorkspace.getLeaf).toHaveBeenCalledWith(true);
      expect(mockLeaf.openFile).toHaveBeenCalledWith(mockFile, openState);
    });

    it('should load a file in a popout window', () => {
      const mockLeaf = makeLeaf();
      const mockFile = new TFile();
      const openState = { active: true };

      mockLeaf.openFile.mockResolvedValueOnce();
      mockWorkspace.openPopoutLeaf.mockReturnValueOnce(mockLeaf);

      sut.openFileInLeaf(
        mockFile,
        EditorNavigationType.PopoutLeaf,
        openState,
        'panelUtils unit test.',
      );

      expect(mockWorkspace.openPopoutLeaf).toHaveBeenCalled();
      expect(mockLeaf.openFile).toHaveBeenCalledWith(mockFile, openState);
    });
  });

  describe('navigateToLeafOrOpenFile', () => {
    const mockKeymap = jest.mocked<typeof Keymap>(Keymap);
    const errContext = chance.sentence();
    let mockLeaf: MockProxy<WorkspaceLeaf>;
    let activateLeafOrOpenFileSpy: jest.SpyInstance;
    let mockFile: TFile;

    beforeAll(() => {
      activateLeafOrOpenFileSpy = jest.spyOn(Handler.prototype, 'activateLeafOrOpenFile');
      mockFile = new TFile();
      mockLeaf = makeLeaf();
    });

    beforeEach(() => {
      activateLeafOrOpenFileSpy.mockReset();
    });

    afterAll(() => {
      activateLeafOrOpenFileSpy.mockRestore();
    });

    it('should navigate to a new Popout window', () => {
      const mockEvt = mock<KeyboardEvent>({
        key: 'o',
      });

      mockKeymap.isModEvent.mockReturnValueOnce(true);

      sut.navigateToLeafOrOpenFile(
        mockEvt,
        mockFile,
        errContext,
        defaultOpenViewState,
        mockLeaf,
      );

      expect(activateLeafOrOpenFileSpy).toHaveBeenCalledWith(
        EditorNavigationType.PopoutLeaf,
        mockFile,
        errContext,
        mockLeaf,
        defaultOpenViewState,
      );
    });

    it('should navigate to a new leaf', () => {
      const mockEvt = mock<KeyboardEvent>();
      mockKeymap.isModEvent.mockReturnValueOnce(true);

      sut.navigateToLeafOrOpenFile(
        mockEvt,
        mockFile,
        errContext,
        defaultOpenViewState,
        mockLeaf,
      );

      expect(activateLeafOrOpenFileSpy).toHaveBeenCalledWith(
        EditorNavigationType.NewLeaf,
        mockFile,
        errContext,
        mockLeaf,
        defaultOpenViewState,
      );
    });

    it('should navigate to an existing leaf', () => {
      const mockEvt = mock<KeyboardEvent>();
      mockKeymap.isModEvent.mockReturnValueOnce(false);

      sut.navigateToLeafOrOpenFile(
        mockEvt,
        mockFile,
        errContext,
        defaultOpenViewState,
        mockLeaf,
      );

      expect(activateLeafOrOpenFileSpy).toHaveBeenCalledWith(
        EditorNavigationType.ReuseExistingLeaf,
        mockFile,
        errContext,
        mockLeaf,
        defaultOpenViewState,
      );
    });
  });

  describe('activateLeafOrOpenFile', () => {
    let openFileInLeafSpy: jest.SpyInstance;
    let activateLeafSpy: jest.SpyInstance;

    beforeAll(() => {
      openFileInLeafSpy = jest.spyOn(Handler.prototype, 'openFileInLeaf');
      activateLeafSpy = jest.spyOn(Handler.prototype, 'activateLeaf');
    });

    beforeEach(() => {
      openFileInLeafSpy.mockReset();
      activateLeafSpy.mockReset();
    });

    afterAll(() => {
      openFileInLeafSpy.mockRestore();
      activateLeafSpy.mockRestore();
    });

    it('should open the file', () => {
      const file = new TFile();
      const navType = EditorNavigationType.ReuseExistingLeaf;
      const errorContext = chance.sentence();

      sut.activateLeafOrOpenFile(navType, file, errorContext);

      expect(openFileInLeafSpy).toHaveBeenCalledWith(
        file,
        navType,
        defaultOpenViewState,
        errorContext,
      );
    });

    it('should open the file in a new leaf with EditorNavigationType.NewLeaf', () => {
      const file = new TFile();
      const navType = EditorNavigationType.NewLeaf;
      const errorContext = chance.sentence();

      sut.activateLeafOrOpenFile(navType, file, errorContext);

      expect(openFileInLeafSpy).toHaveBeenCalledWith(
        file,
        navType,
        defaultOpenViewState,
        errorContext,
      );
    });

    test('with existing leaf and EditorNavigationType.ReuseExistingLeaf, it should activate the existing leaf', () => {
      const file = new TFile();
      const navType = EditorNavigationType.ReuseExistingLeaf;
      const leaf = makeLeaf();

      sut.activateLeafOrOpenFile(navType, file, null, leaf);

      expect(openFileInLeafSpy).not.toHaveBeenCalled();
      expect(activateLeafSpy).toHaveBeenCalledWith(
        leaf,
        true,
        defaultOpenViewState.eState,
      );
    });

    test('with existing leaf and EditorNavigationType.NewLeaf, it should create a new leaf', () => {
      const file = new TFile();
      const navType = EditorNavigationType.NewLeaf;
      const leaf = makeLeaf();
      const errorContext = chance.sentence();

      sut.activateLeafOrOpenFile(navType, file, errorContext, leaf);

      expect(activateLeafSpy).not.toHaveBeenCalled();
      expect(openFileInLeafSpy).toBeCalledWith(
        file,
        navType,
        defaultOpenViewState,
        errorContext,
      );
    });

    it('should use the default OpenViewState when a falsy value is passed in for opening files', () => {
      const file = new TFile();
      const navType = EditorNavigationType.ReuseExistingLeaf;

      sut.activateLeafOrOpenFile(navType, file, null);

      expect(openFileInLeafSpy).toHaveBeenCalledWith(
        file,
        navType,
        defaultOpenViewState,
        null,
      );
    });
  });

  describe('findMatchingLeaf', () => {
    const refViewType = 'backlink';
    let mockLeaf: MockProxy<WorkspaceLeaf>;
    let mockView: jest.MockedObject<View>;

    beforeAll(() => {
      mockSettings.referenceViews.push(refViewType);
      mockLeaf = makeLeaf();
      mockView = jest.mocked<View>(mockLeaf.view);

      mockWorkspace.activeLeaf = mockLeaf;
    });

    afterAll(() => {
      mockSettings.referenceViews.splice(
        mockSettings.referenceViews.indexOf(refViewType),
        1,
      );
    });

    it('should match a file in the active editor', () => {
      const mockFile = mockView.file;
      const getOpenLeavesSpy = jest.spyOn(sut, 'getOpenLeaves');

      const result = sut.findMatchingLeaf(mockFile);

      // not expected to be called because workspace.activeLeaf is prioritized first
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

      expect(mockRenderResults).toBeCalledWith(mockTitleEl, content, results, offset);
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
});
