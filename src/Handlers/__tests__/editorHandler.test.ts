jest.mock('src/utils/panelUtils', () => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const actual = jest.requireActual('src/utils/panelUtils');

  return {
    ...actual,
    activateLeaf: jest.fn(),
  };
});

import { SwitcherPlusSettings } from 'src/settings';
import { Mode, EditorSuggestion } from 'src/types';
import { InputInfo } from 'src/switcherPlus';
import {
  WorkspaceLeaf,
  PreparedQuery,
  prepareQuery,
  fuzzySearch,
  App,
  Workspace,
  renderResults,
} from 'obsidian';
import {
  rootSplitEditorFixtures,
  leftSplitEditorFixtures,
  rightSplitEditorFixtures,
  editorTrigger,
  makeFuzzyMatch,
  makePreparedQueryEmpty,
} from '@fixtures';
import { EditorHandler } from 'src/Handlers';
import { activateLeaf } from 'src/utils';

describe('editorHandler', () => {
  let settings: SwitcherPlusSettings;
  let app: App;
  let workspace: Workspace;
  let sut: EditorHandler;

  beforeAll(() => {
    app = new App();
    settings = new SwitcherPlusSettings(null);
    sut = new EditorHandler(app, settings);
    ({ workspace } = app);

    jest.spyOn(settings, 'editorListCommand', 'get').mockReturnValue(editorTrigger);
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

      sut.validateCommand(inputInfo, startIndex, filterText);
      expect(inputInfo.mode).toBe(Mode.EditorList);

      const { editorCmd } = inputInfo;
      expect(editorCmd.parsedInput).toBe(filterText);
      expect(editorCmd.isValidated).toBe(true);
    });
  });

  describe('getSuggestions', () => {
    const rootFixture = rootSplitEditorFixtures[0];
    const leftFixture = leftSplitEditorFixtures[0];
    const rightFixture = rightSplitEditorFixtures[0];
    let rootSplitLeaf: WorkspaceLeaf;
    let leftSplitLeaf: WorkspaceLeaf;
    let rightSplitLeaf: WorkspaceLeaf;
    let rootSplitGetRootSpy: jest.SpyInstance;
    let leftSplitGetRootSpy: jest.SpyInstance;
    let rightSplitGetRootSpy: jest.SpyInstance;
    let rootSplitGetDisplayTextSpy: jest.SpyInstance;
    let leftSplitGetDisplayTextSpy: jest.SpyInstance;
    let rightSplitGetDisplayTextSpy: jest.SpyInstance;
    let iterateAllLeavesSpy: jest.SpyInstance;
    let mockPrepareQuery: jest.MockedFunction<typeof prepareQuery>;
    let mockFuzzySearch: jest.MockedFunction<typeof fuzzySearch>;

    beforeAll(() => {
      rootSplitLeaf = new WorkspaceLeaf();
      leftSplitLeaf = new WorkspaceLeaf();
      rightSplitLeaf = new WorkspaceLeaf();

      rootSplitGetRootSpy = jest
        .spyOn(rootSplitLeaf, 'getRoot')
        .mockReturnValue(workspace.rootSplit);
      leftSplitGetRootSpy = jest
        .spyOn(leftSplitLeaf, 'getRoot')
        .mockReturnValue(workspace.leftSplit);
      rightSplitGetRootSpy = jest
        .spyOn(rightSplitLeaf, 'getRoot')
        .mockReturnValue(workspace.rightSplit);

      rootSplitGetDisplayTextSpy = jest
        .spyOn(rootSplitLeaf, 'getDisplayText')
        .mockReturnValue(rootFixture.displayText);
      leftSplitGetDisplayTextSpy = jest
        .spyOn(leftSplitLeaf, 'getDisplayText')
        .mockReturnValue(leftFixture.displayText);
      rightSplitGetDisplayTextSpy = jest
        .spyOn(rightSplitLeaf, 'getDisplayText')
        .mockReturnValue(rightFixture.displayText);

      iterateAllLeavesSpy = jest
        .spyOn(workspace, 'iterateAllLeaves')
        .mockImplementation((callback: (leaf: WorkspaceLeaf) => void) => {
          const leaves = [rootSplitLeaf, leftSplitLeaf, rightSplitLeaf];
          leaves.forEach((leaf) => callback(leaf));
        });

      mockPrepareQuery = prepareQuery as jest.MockedFunction<typeof prepareQuery>;
      mockPrepareQuery.mockReturnValue(makePreparedQueryEmpty());
      mockFuzzySearch = fuzzySearch as jest.MockedFunction<typeof fuzzySearch>;
    });

    test('with falsy input, it should return an empty array', () => {
      const results = sut.getSuggestions(null);

      expect(results).not.toBeNull();
      expect(results).toBeInstanceOf(Array);
      expect(results).toHaveLength(0);
    });

    test('with default settings, it should return suggestions for editor mode', () => {
      const inputInfo = new InputInfo(editorTrigger, Mode.EditorList);
      const results = sut.getSuggestions(inputInfo);

      expect(results).not.toBeNull();
      expect(results).toBeInstanceOf(Array);
      expect(results).toHaveLength(3);

      const resultLeaves = new Set(results.map((sugg: EditorSuggestion) => sugg.item));
      expect(resultLeaves.has(rootSplitLeaf)).toBe(true);
      expect(resultLeaves.has(leftSplitLeaf)).toBe(true);
      expect(resultLeaves.has(rightSplitLeaf)).toBe(true);
      expect(results.every((sugg) => sugg.type === 'editor')).toBe(true);

      expect(mockPrepareQuery).toHaveBeenCalled();
      expect(iterateAllLeavesSpy).toHaveBeenCalled();
      expect(rootSplitGetRootSpy).toHaveBeenCalled();
      expect(leftSplitGetRootSpy).toHaveBeenCalled();
      expect(rightSplitGetRootSpy).toHaveBeenCalled();
    });

    test('with filter search term, it should return only matching suggestions for editor mode', () => {
      mockPrepareQuery.mockReturnValueOnce(rootFixture.prepQuery);

      mockFuzzySearch.mockImplementation((_q: PreparedQuery, text: string) => {
        return text === rootFixture.displayText ? rootFixture.fuzzyMatch : null;
      });

      const inputInfo = new InputInfo(rootFixture.inputText, Mode.EditorList);
      const results = sut.getSuggestions(inputInfo);

      expect(results).not.toBeNull();
      expect(results).toBeInstanceOf(Array);
      expect(results).toHaveLength(1);

      const resultLeaves = new Set(results.map((sugg: EditorSuggestion) => sugg.item));
      expect(resultLeaves.has(rootSplitLeaf)).toBe(true);
      expect(resultLeaves.has(leftSplitLeaf)).toBe(false);
      expect(resultLeaves.has(rightSplitLeaf)).toBe(false);
      expect(results[0]).toHaveProperty('type', 'editor');

      expect(mockPrepareQuery).toHaveBeenCalled();
      expect(mockFuzzySearch).toHaveBeenCalled();
      expect(iterateAllLeavesSpy).toHaveBeenCalled();
      expect(rootSplitGetRootSpy).toHaveBeenCalled();
      expect(leftSplitGetRootSpy).toHaveBeenCalled();
      expect(rightSplitGetRootSpy).toHaveBeenCalled();
      expect(rootSplitGetDisplayTextSpy).toHaveBeenCalled();
      expect(leftSplitGetDisplayTextSpy).toHaveBeenCalled();
      expect(rightSplitGetDisplayTextSpy).toHaveBeenCalled();

      mockFuzzySearch.mockRestore();
    });

    test('with INCLUDED side view type, it should return included side panel editor suggestions for editor mode', () => {
      const includeViewType = 'foo';
      const includeViewTypesSpy = jest
        .spyOn(settings, 'includeSidePanelViewTypes', 'get')
        .mockReturnValue([includeViewType]);

      const getViewTypeSpy = jest
        .spyOn(leftSplitLeaf.view, 'getViewType')
        .mockReturnValue(includeViewType);

      const inputInfo = new InputInfo(editorTrigger, Mode.EditorList);
      const results = sut.getSuggestions(inputInfo);

      expect(results).not.toBeNull();
      expect(results).toBeInstanceOf(Array);
      expect(results).toHaveLength(2);

      const resultLeaves = new Set(results.map((sugg: EditorSuggestion) => sugg.item));
      expect(resultLeaves.has(rootSplitLeaf)).toBe(true);
      expect(resultLeaves.has(leftSplitLeaf)).toBe(true);
      expect(resultLeaves.has(rightSplitLeaf)).toBe(false);
      expect(results.every((sugg) => sugg.type === 'editor')).toBe(true);

      expect(includeViewTypesSpy).toHaveBeenCalled();
      expect(getViewTypeSpy).toHaveBeenCalled();
      expect(mockPrepareQuery).toHaveBeenCalled();
      expect(iterateAllLeavesSpy).toHaveBeenCalled();
      expect(rootSplitGetRootSpy).toHaveBeenCalled();
      expect(leftSplitGetRootSpy).toHaveBeenCalled();
      expect(rightSplitGetRootSpy).toHaveBeenCalled();

      includeViewTypesSpy.mockRestore();
      getViewTypeSpy.mockRestore();
    });

    test('with EXCLUDED main view type, it should not return excluded main panel editor suggestions for editor mode', () => {
      const excludeViewType = 'foo';
      const excludeViewTypesSpy = jest
        .spyOn(settings, 'excludeViewTypes', 'get')
        .mockReturnValue([excludeViewType]);

      const getViewTypeSpy = jest
        .spyOn(rootSplitLeaf.view, 'getViewType')
        .mockReturnValue(excludeViewType);

      const inputInfo = new InputInfo(editorTrigger, Mode.EditorList);
      const results = sut.getSuggestions(inputInfo);

      expect(results).not.toBeNull();
      expect(results).toBeInstanceOf(Array);
      expect(results).toHaveLength(2);

      const resultLeaves = new Set(results.map((sugg: EditorSuggestion) => sugg.item));
      expect(resultLeaves.has(rootSplitLeaf)).toBe(false);
      expect(resultLeaves.has(leftSplitLeaf)).toBe(true);
      expect(resultLeaves.has(rightSplitLeaf)).toBe(true);
      expect(results.every((sugg) => sugg.type === 'editor')).toBe(true);

      expect(excludeViewTypesSpy).toHaveBeenCalled();
      expect(getViewTypeSpy).toHaveBeenCalled();
      expect(mockPrepareQuery).toHaveBeenCalled();
      expect(iterateAllLeavesSpy).toHaveBeenCalled();
      expect(rootSplitGetRootSpy).toHaveBeenCalled();
      expect(leftSplitGetRootSpy).toHaveBeenCalled();
      expect(rightSplitGetRootSpy).toHaveBeenCalled();

      excludeViewTypesSpy.mockRestore();
      getViewTypeSpy.mockRestore();
    });
  });

  describe('renderSuggestion', () => {
    it('should not throw an error with a null suggestion', () => {
      expect(() => sut.renderSuggestion(null, null)).not.toThrow();
    });

    it('should render a suggestion with match offsets', () => {
      const leaf = new WorkspaceLeaf();
      const displayText = 'foo';
      const mockRenderResults = renderResults as jest.MockedFunction<
        typeof renderResults
      >;

      const leafGetDisplayTextSpy = jest
        .spyOn(leaf, 'getDisplayText')
        .mockReturnValue(displayText);

      const sugg: EditorSuggestion = {
        type: 'editor',
        item: leaf,
        match: makeFuzzyMatch(),
      };

      sut.renderSuggestion(sugg, null);

      expect(mockRenderResults).toHaveBeenCalledWith(null, displayText, sugg.match);
      expect(leafGetDisplayTextSpy).toHaveBeenCalled();

      mockRenderResults.mockRestore();
      leafGetDisplayTextSpy.mockRestore();
    });
  });

  describe('onChooseSuggestion', () => {
    it('should not throw an error with a null suggestion', () => {
      expect(() => sut.onChooseSuggestion(null)).not.toThrow();
    });

    it('should activate the selected leaf', () => {
      const leaf = new WorkspaceLeaf();
      const sugg: EditorSuggestion = {
        type: 'editor',
        item: leaf,
        match: makeFuzzyMatch(),
      };

      sut.onChooseSuggestion(sugg);

      expect(activateLeaf).toHaveBeenCalledWith(workspace, sugg.item, false);
    });
  });
});
