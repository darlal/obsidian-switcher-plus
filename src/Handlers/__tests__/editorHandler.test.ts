import { SwitcherPlusSettings } from 'src/settings';
import { Mode, EditorSuggestion, SuggestionType, SearchQuery } from 'src/types';
import { InputInfo } from 'src/switcherPlus';
import {
  WorkspaceLeaf,
  App,
  Workspace,
  View,
  WorkspaceItem,
  WorkspaceSplit,
  MetadataCache,
  TFile,
} from 'obsidian';
import {
  rootSplitEditorFixtures,
  leftSplitEditorFixtures,
  rightSplitEditorFixtures,
  editorTrigger,
  makeLeaf,
  makeEditorSuggestion,
  makeHeading,
  makeFuzzyMatch,
} from '@fixtures';
import { EditorHandler, Handler } from 'src/Handlers';
import { mock, mockFn, MockProxy } from 'jest-mock-extended';
import { Searcher } from 'src/search';

function makeLeafWithRoot(text: string, root: WorkspaceItem): MockProxy<WorkspaceLeaf> {
  const mockLeaf = makeLeaf();

  mockLeaf.getDisplayText.mockImplementation(() => text);
  mockLeaf.getRoot.mockImplementation(() => root);

  return mockLeaf;
}

describe('editorHandler', () => {
  let settings: SwitcherPlusSettings;
  let mockApp: MockProxy<App>;
  let mockWorkspace: MockProxy<Workspace>;
  let sut: EditorHandler;

  beforeAll(() => {
    mockWorkspace = mock<Workspace>({
      rootSplit: mock<WorkspaceSplit>(),
      leftSplit: mock<WorkspaceSplit>(),
      rightSplit: mock<WorkspaceSplit>(),
      revealLeaf: mockFn().mockResolvedValue(null),
    });

    settings = new SwitcherPlusSettings(null);
    mockApp = mock<App>({
      workspace: mockWorkspace,
      metadataCache: mock<MetadataCache>(),
    });

    jest.spyOn(settings, 'editorListCommand', 'get').mockReturnValue(editorTrigger);

    sut = new EditorHandler(mockApp, settings);
  });

  describe('getCommandString', () => {
    it('should return editorListCommand trigger', () => {
      expect(sut.getCommandString()).toBe(editorTrigger);
    });
  });

  describe('validateCommand', () => {
    let inputText: string;
    let startIndex: number;
    const filterText = 'foo';

    beforeAll(() => {
      inputText = `${editorTrigger}${filterText}`;
      startIndex = editorTrigger.length;
    });

    it('should validate parsed input', () => {
      const inputInfo = new InputInfo(inputText);

      sut.validateCommand(inputInfo, startIndex, filterText, null, null);
      expect(inputInfo.mode).toBe(Mode.EditorList);

      const editorCmd = inputInfo.parsedCommand();
      expect(editorCmd.parsedInput).toBe(filterText);
      expect(editorCmd.isValidated).toBe(true);
    });
  });

  describe('getSuggestions', () => {
    const rootFixture = rootSplitEditorFixtures[0];
    const leftFixture = leftSplitEditorFixtures[0];
    const rightFixture = rightSplitEditorFixtures[0];
    let mockRootSplitLeaf: MockProxy<WorkspaceLeaf>;
    let mockLeftSplitLeaf: MockProxy<WorkspaceLeaf>;
    let mockRightSplitLeaf: MockProxy<WorkspaceLeaf>;

    beforeAll(() => {
      mockWorkspace.iterateAllLeaves.mockImplementation(
        (callback: (leaf: WorkspaceLeaf) => void) => {
          const leaves = [mockRootSplitLeaf, mockLeftSplitLeaf, mockRightSplitLeaf];
          leaves.forEach((leaf) => callback(leaf));
        },
      );
    });

    beforeEach(() => {
      mockRootSplitLeaf = makeLeafWithRoot(
        rootFixture.displayText,
        mockWorkspace.rootSplit,
      );
      mockLeftSplitLeaf = makeLeafWithRoot(
        leftFixture.displayText,
        mockWorkspace.leftSplit,
      );
      mockRightSplitLeaf = makeLeafWithRoot(
        rightFixture.displayText,
        mockWorkspace.rightSplit,
      );
    });

    test('with falsy input, it should return an empty array', () => {
      const results = sut.getSuggestions(null);

      expect(results).not.toBeNull();
      expect(results).toBeInstanceOf(Array);
      expect(results).toHaveLength(0);
    });

    test('that EditorSuggestion have a file property to enable interop with other plugins (like HoverEditor)', () => {
      const inputInfo = new InputInfo(null, Mode.EditorList);
      const results = sut.getSuggestions(inputInfo);

      expect(results.every((v) => v.file !== null)).toBe(true);
    });

    test('with default settings, it should return suggestions for editor mode', () => {
      const inputInfo = new InputInfo(null, Mode.EditorList);
      const results = sut.getSuggestions(inputInfo);

      expect(results).toHaveLength(3);

      const resultLeaves = new Set(results.map((sugg: EditorSuggestion) => sugg.item));
      expect(resultLeaves.has(mockRootSplitLeaf)).toBe(true);
      expect(resultLeaves.has(mockLeftSplitLeaf)).toBe(true);
      expect(resultLeaves.has(mockRightSplitLeaf)).toBe(true);
      expect(results.every((sugg) => sugg.type === SuggestionType.EditorList)).toBe(true);

      expect(mockWorkspace.iterateAllLeaves).toHaveBeenCalled();
      expect(mockRootSplitLeaf.getRoot).toHaveBeenCalled();
      expect(mockLeftSplitLeaf.getRoot).toHaveBeenCalled();
      expect(mockRightSplitLeaf.getRoot).toHaveBeenCalled();
    });

    test('with filter search term, it should return only matching suggestions for editor mode', () => {
      const filterText = rootFixture.displayText;
      const inputInfo = new InputInfo(null, Mode.EditorList);
      const parsedInputQuerySpy = jest
        .spyOn(inputInfo, 'parsedInputQuery', 'get')
        .mockReturnValue(mock<SearchQuery>({ hasSearchTerm: true, query: filterText }));

      const searchSpy = jest
        .spyOn(Searcher.prototype, 'executeSearch')
        .mockImplementation((text) => {
          return text === filterText ? makeFuzzyMatch() : null;
        });

      const results = sut.getSuggestions(inputInfo);
      expect(results).toHaveLength(1);

      const resultLeaves = new Set(results.map((sugg: EditorSuggestion) => sugg.item));
      expect(resultLeaves.has(mockRootSplitLeaf)).toBe(true);
      expect(resultLeaves.has(mockLeftSplitLeaf)).toBe(false);
      expect(resultLeaves.has(mockRightSplitLeaf)).toBe(false);
      expect(results[0]).toHaveProperty('type', SuggestionType.EditorList);

      expect(mockWorkspace.iterateAllLeaves).toHaveBeenCalled();
      expect(mockRootSplitLeaf.getRoot).toHaveBeenCalled();
      expect(mockLeftSplitLeaf.getRoot).toHaveBeenCalled();
      expect(mockRightSplitLeaf.getRoot).toHaveBeenCalled();
      expect(mockRootSplitLeaf.getDisplayText).toHaveBeenCalled();
      expect(mockLeftSplitLeaf.getDisplayText).toHaveBeenCalled();
      expect(mockRightSplitLeaf.getDisplayText).toHaveBeenCalled();

      searchSpy.mockRestore();
      parsedInputQuerySpy.mockRestore();
    });

    test('with INCLUDED side view type, it should return included side panel editor suggestions for editor mode', () => {
      const includeViewType = 'foo';
      const includeViewTypesSpy = jest
        .spyOn(settings, 'includeSidePanelViewTypes', 'get')
        .mockReturnValue([includeViewType]);

      const mockView = mockLeftSplitLeaf.view as MockProxy<View>;
      mockView.getViewType.mockReturnValue(includeViewType);

      const inputInfo = new InputInfo(null, Mode.EditorList);
      const results = sut.getSuggestions(inputInfo);

      expect(results).toHaveLength(2);

      const resultLeaves = new Set(results.map((sugg: EditorSuggestion) => sugg.item));
      expect(resultLeaves.has(mockRootSplitLeaf)).toBe(true);
      expect(resultLeaves.has(mockLeftSplitLeaf)).toBe(true);
      expect(resultLeaves.has(mockRightSplitLeaf)).toBe(false);
      expect(results.every((sugg) => sugg.type === SuggestionType.EditorList)).toBe(true);

      expect(includeViewTypesSpy).toHaveBeenCalled();
      expect(mockView.getViewType).toHaveBeenCalled();
      expect(mockWorkspace.iterateAllLeaves).toHaveBeenCalled();
      expect(mockRootSplitLeaf.getRoot).toHaveBeenCalled();
      expect(mockLeftSplitLeaf.getRoot).toHaveBeenCalled();
      expect(mockRightSplitLeaf.getRoot).toHaveBeenCalled();

      includeViewTypesSpy.mockRestore();
    });

    test('with EXCLUDED main view type, it should not return excluded main panel editor suggestions for editor mode', () => {
      const excludeViewType = 'foo';
      const excludeViewTypesSpy = jest
        .spyOn(settings, 'excludeViewTypes', 'get')
        .mockReturnValue([excludeViewType]);

      const mockView = mockRootSplitLeaf.view as MockProxy<View>;
      mockView.getViewType.mockReturnValue(excludeViewType);

      const inputInfo = new InputInfo(null, Mode.EditorList);
      const results = sut.getSuggestions(inputInfo);

      expect(results).toHaveLength(2);

      const resultLeaves = new Set(results.map((sugg: EditorSuggestion) => sugg.item));
      expect(resultLeaves.has(mockRootSplitLeaf)).toBe(false);
      expect(resultLeaves.has(mockLeftSplitLeaf)).toBe(true);
      expect(resultLeaves.has(mockRightSplitLeaf)).toBe(true);
      expect(results.every((sugg) => sugg.type === SuggestionType.EditorList)).toBe(true);

      expect(excludeViewTypesSpy).toHaveBeenCalled();
      expect(mockView.getViewType).toHaveBeenCalled();
      expect(mockWorkspace.iterateAllLeaves).toHaveBeenCalled();
      expect(mockRootSplitLeaf.getRoot).toHaveBeenCalled();
      expect(mockLeftSplitLeaf.getRoot).toHaveBeenCalled();
      expect(mockRightSplitLeaf.getRoot).toHaveBeenCalled();

      excludeViewTypesSpy.mockRestore();
    });
  });

  describe('getPreferredTitle', () => {
    test('with preferredSourceForTitle as H1, it should return the first heading', () => {
      const file = new TFile();
      const expectedText = 'expected';
      const mockLeaf = mock<WorkspaceLeaf>({
        getDisplayText: () => file.basename,
        view: mock<View>({
          file,
        }),
      });

      const getFirstH1Spy = jest
        .spyOn(EditorHandler, 'getFirstH1')
        .mockReturnValueOnce(makeHeading(expectedText, 0));

      const result = sut.getPreferredTitle(mockLeaf, 'H1');

      expect(result).toBe(expectedText);

      getFirstH1Spy.mockRestore();
    });

    test('with preferredSourceForTitle as Default, it should return the the leaf display text', () => {
      const file = new TFile();
      const mockLeaf = mock<WorkspaceLeaf>({
        getDisplayText: () => file.basename,
        view: mock<View>({
          file,
        }),
      });

      const result = sut.getPreferredTitle(mockLeaf, 'Default');

      expect(result).toBe(file.basename);
    });
  });

  describe('renderSuggestion', () => {
    it('should not throw an error with a null suggestion', () => {
      expect(() => sut.renderSuggestion(null, null)).not.toThrow();
    });

    it('should render a suggestion with match offsets', () => {
      const preferredTitle = 'foo';
      const mockLeaf = makeLeafWithRoot(preferredTitle, null);
      const mockParentEl = mock<HTMLElement>();
      const sugg = makeEditorSuggestion(mockLeaf);
      sugg.preferredTitle = preferredTitle;
      const renderAsFileInfoPanelSpy = jest
        .spyOn(Handler.prototype, 'renderAsFileInfoPanel')
        .mockReturnValueOnce(null);

      sut.renderSuggestion(sugg, mockParentEl);

      expect(renderAsFileInfoPanelSpy).toHaveBeenCalledWith(
        mockParentEl,
        ['qsp-suggestion-editor'],
        preferredTitle,
        sugg.file,
        sugg.matchType,
        sugg.match,
        true,
      );

      renderAsFileInfoPanelSpy.mockRestore();
    });
  });

  describe('onChooseSuggestion', () => {
    beforeAll(() => {
      const fileContainerLeaf = makeLeaf();
      fileContainerLeaf.openFile.mockResolvedValueOnce();
      mockWorkspace.getLeaf.mockReturnValueOnce(fileContainerLeaf);
    });

    it('should not throw an error with a null suggestion', () => {
      expect(() => sut.onChooseSuggestion(null, null)).not.toThrow();
    });

    it('should activate the selected leaf', () => {
      const mockEvt = mock<KeyboardEvent>();
      const mockLeaf = makeLeafWithRoot(null, null);
      const navigateToLeafOrOpenFileSpy = jest.spyOn(
        Handler.prototype,
        'navigateToLeafOrOpenFile',
      );

      const sugg = makeEditorSuggestion(mockLeaf);

      sut.onChooseSuggestion(sugg, mockEvt);

      expect(navigateToLeafOrOpenFileSpy).toHaveBeenCalledWith(
        mockEvt,
        sugg.file,
        expect.any(String),
        null,
        mockLeaf,
        null,
        true,
      );

      navigateToLeafOrOpenFileSpy.mockRestore();
    });
  });
});
