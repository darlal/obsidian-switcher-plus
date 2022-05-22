jest.mock('src/utils/panelUtils', () => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const actual = jest.requireActual('src/utils/panelUtils');

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
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
  View,
  WorkspaceItem,
  WorkspaceSplit,
  TFile,
  Keymap,
} from 'obsidian';
import {
  rootSplitEditorFixtures,
  leftSplitEditorFixtures,
  rightSplitEditorFixtures,
  editorTrigger,
  makeFuzzyMatch,
} from '@fixtures';
import { EditorHandler } from 'src/Handlers';
import { activateLeaf } from 'src/utils';
import { mock, MockProxy } from 'jest-mock-extended';

function makeLeaf(text: string, root: WorkspaceItem): MockProxy<WorkspaceLeaf> {
  const mockView = mock<View>({ file: new TFile() });
  mockView.getViewType.mockImplementation(() => 'markdown');

  const mockLeaf = mock<WorkspaceLeaf>({ view: mockView });
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
    });

    mockApp = mock<App>({ workspace: mockWorkspace });
    settings = new SwitcherPlusSettings(null);

    jest.spyOn(settings, 'editorListCommand', 'get').mockReturnValue(editorTrigger);

    sut = new EditorHandler(mockApp, settings);
  });

  describe('commandString', () => {
    it('should return editorListCommand trigger', () => {
      expect(sut.commandString).toBe(editorTrigger);
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
    const mockPrepareQuery = jest.mocked(prepareQuery);
    const mockFuzzySearch = jest.mocked(fuzzySearch);
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
      mockRootSplitLeaf = makeLeaf(rootFixture.displayText, mockWorkspace.rootSplit);
      mockLeftSplitLeaf = makeLeaf(leftFixture.displayText, mockWorkspace.leftSplit);
      mockRightSplitLeaf = makeLeaf(rightFixture.displayText, mockWorkspace.rightSplit);
    });

    test('with falsy input, it should return an empty array', () => {
      const results = sut.getSuggestions(null);

      expect(results).not.toBeNull();
      expect(results).toBeInstanceOf(Array);
      expect(results).toHaveLength(0);
    });

    test('that EditorSuggestion have a file property to enable interop with other plugins (like HoverEditor)', () => {
      const inputInfo = new InputInfo(editorTrigger);
      const results = sut.getSuggestions(inputInfo);

      expect(results.every((v) => v.file !== null)).toBe(true);
    });

    test('with default settings, it should return suggestions for editor mode', () => {
      const inputInfo = new InputInfo(editorTrigger, Mode.EditorList);
      const results = sut.getSuggestions(inputInfo);

      expect(results).not.toBeNull();
      expect(results).toBeInstanceOf(Array);
      expect(results).toHaveLength(3);

      const resultLeaves = new Set(results.map((sugg: EditorSuggestion) => sugg.item));
      expect(resultLeaves.has(mockRootSplitLeaf)).toBe(true);
      expect(resultLeaves.has(mockLeftSplitLeaf)).toBe(true);
      expect(resultLeaves.has(mockRightSplitLeaf)).toBe(true);
      expect(results.every((sugg) => sugg.type === 'editor')).toBe(true);

      expect(mockPrepareQuery).toHaveBeenCalled();
      expect(mockWorkspace.iterateAllLeaves).toHaveBeenCalled();
      expect(mockRootSplitLeaf.getRoot).toHaveBeenCalled();
      expect(mockLeftSplitLeaf.getRoot).toHaveBeenCalled();
      expect(mockRightSplitLeaf.getRoot).toHaveBeenCalled();
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
      expect(resultLeaves.has(mockRootSplitLeaf)).toBe(true);
      expect(resultLeaves.has(mockLeftSplitLeaf)).toBe(false);
      expect(resultLeaves.has(mockRightSplitLeaf)).toBe(false);
      expect(results[0]).toHaveProperty('type', 'editor');

      expect(mockPrepareQuery).toHaveBeenCalled();
      expect(mockFuzzySearch).toHaveBeenCalled();
      expect(mockWorkspace.iterateAllLeaves).toHaveBeenCalled();
      expect(mockRootSplitLeaf.getRoot).toHaveBeenCalled();
      expect(mockLeftSplitLeaf.getRoot).toHaveBeenCalled();
      expect(mockRightSplitLeaf.getRoot).toHaveBeenCalled();
      expect(mockRootSplitLeaf.getDisplayText).toHaveBeenCalled();
      expect(mockLeftSplitLeaf.getDisplayText).toHaveBeenCalled();
      expect(mockRightSplitLeaf.getDisplayText).toHaveBeenCalled();

      mockFuzzySearch.mockReset();
    });

    test('with INCLUDED side view type, it should return included side panel editor suggestions for editor mode', () => {
      const includeViewType = 'foo';
      const includeViewTypesSpy = jest
        .spyOn(settings, 'includeSidePanelViewTypes', 'get')
        .mockReturnValue([includeViewType]);

      const mockView = mockLeftSplitLeaf.view as MockProxy<View>;
      mockView.getViewType.mockReturnValue(includeViewType);

      const inputInfo = new InputInfo(editorTrigger, Mode.EditorList);
      const results = sut.getSuggestions(inputInfo);

      expect(results).not.toBeNull();
      expect(results).toBeInstanceOf(Array);
      expect(results).toHaveLength(2);

      const resultLeaves = new Set(results.map((sugg: EditorSuggestion) => sugg.item));
      expect(resultLeaves.has(mockRootSplitLeaf)).toBe(true);
      expect(resultLeaves.has(mockLeftSplitLeaf)).toBe(true);
      expect(resultLeaves.has(mockRightSplitLeaf)).toBe(false);
      expect(results.every((sugg) => sugg.type === 'editor')).toBe(true);

      expect(includeViewTypesSpy).toHaveBeenCalled();
      expect(mockView.getViewType).toHaveBeenCalled();
      expect(mockPrepareQuery).toHaveBeenCalled();
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

      const inputInfo = new InputInfo(editorTrigger, Mode.EditorList);
      const results = sut.getSuggestions(inputInfo);

      expect(results).not.toBeNull();
      expect(results).toBeInstanceOf(Array);
      expect(results).toHaveLength(2);

      const resultLeaves = new Set(results.map((sugg: EditorSuggestion) => sugg.item));
      expect(resultLeaves.has(mockRootSplitLeaf)).toBe(false);
      expect(resultLeaves.has(mockLeftSplitLeaf)).toBe(true);
      expect(resultLeaves.has(mockRightSplitLeaf)).toBe(true);
      expect(results.every((sugg) => sugg.type === 'editor')).toBe(true);

      expect(excludeViewTypesSpy).toHaveBeenCalled();
      expect(mockView.getViewType).toHaveBeenCalled();
      expect(mockPrepareQuery).toHaveBeenCalled();
      expect(mockWorkspace.iterateAllLeaves).toHaveBeenCalled();
      expect(mockRootSplitLeaf.getRoot).toHaveBeenCalled();
      expect(mockLeftSplitLeaf.getRoot).toHaveBeenCalled();
      expect(mockRightSplitLeaf.getRoot).toHaveBeenCalled();

      excludeViewTypesSpy.mockRestore();
    });
  });

  describe('renderSuggestion', () => {
    it('should not throw an error with a null suggestion', () => {
      expect(() => sut.renderSuggestion(null, null)).not.toThrow();
    });

    it('should render a suggestion with match offsets', () => {
      const mockParentEl = mock<HTMLElement>();
      const displayText = 'foo';
      const mockLeaf = makeLeaf(displayText, null);
      const mockRenderResults = jest.mocked(renderResults);

      const sugg: EditorSuggestion = {
        type: 'editor',
        file: null,
        item: mockLeaf,
        match: makeFuzzyMatch(),
      };

      sut.renderSuggestion(sugg, mockParentEl);

      expect(mockRenderResults).toHaveBeenCalledWith(
        mockParentEl,
        displayText,
        sugg.match,
      );
      expect(mockLeaf.getDisplayText).toHaveBeenCalled();
    });
  });

  describe('onChooseSuggestion', () => {
    it('should not throw an error with a null suggestion', () => {
      expect(() => sut.onChooseSuggestion(null, null)).not.toThrow();
    });

    it('should activate the selected leaf', () => {
      const mockLeaf = makeLeaf(null, null);
      const sugg: EditorSuggestion = {
        type: 'editor',
        file: null,
        item: mockLeaf,
        match: makeFuzzyMatch(),
      };

      sut.onChooseSuggestion(sugg, null);

      expect(activateLeaf).toHaveBeenCalledWith(mockWorkspace, sugg.item, false);
    });

    it('should open file in new leaf when Mod is down', () => {
      const mockLeaf = mock<WorkspaceLeaf>();
      const mockKeymap = jest.mocked<typeof Keymap>(Keymap);

      mockKeymap.isModEvent.mockReturnValueOnce(true);
      mockLeaf.openFile.mockResolvedValueOnce();
      mockWorkspace.getLeaf.mockReturnValueOnce(mockLeaf);

      const sugg: EditorSuggestion = {
        type: 'editor',
        file: new TFile(),
        item: null,
        match: null,
      };

      sut.onChooseSuggestion(sugg, null);

      expect(mockWorkspace.getLeaf).toHaveBeenCalledWith(true);
      expect(mockLeaf.openFile).toHaveBeenCalledWith(sugg.file, { active: true });
    });
  });
});
