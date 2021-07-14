import { SwitcherPlusSettings } from 'src/settings/switcherPlusSettings';
import { ModeHandler } from 'src/switcherPlus/modeHandler';
import { Mode, FileSuggestion, EditorSuggestion } from 'src/types/sharedTypes';
import { editorTrigger, symbolTrigger } from 'src/__fixtures__/modeTrigger.fixture';
import {
  TFile,
  WorkspaceLeaf,
  Workspace,
  PreparedQuery,
  prepareQuery,
  fuzzySearch,
} from 'obsidian';
import {
  standardModeInputFixture,
  editorPrefixOnlyInputFixture,
  symbolPrefixOnlyInputFixture,
  symbolModeInputFixture,
  unicodeInputFixture,
} from 'src/__fixtures__/inputText.fixture';
import {
  rootSplitEditorFixtures,
  leftSplitEditorFixtures,
  rightSplitEditorFixtures,
} from 'src/__fixtures__/editorFilter.fixture';

describe('getCommandStringForMode', () => {
  let settings: SwitcherPlusSettings;
  let sut: ModeHandler;
  let editorCmdSpy: jest.SpyInstance;
  let symbolCmdSpy: jest.SpyInstance;

  beforeAll(() => {
    settings = new SwitcherPlusSettings(null);

    editorCmdSpy = jest
      .spyOn(settings, 'editorListCommand', 'get')
      .mockReturnValue(editorTrigger);
    symbolCmdSpy = jest
      .spyOn(settings, 'symbolListCommand', 'get')
      .mockReturnValue(symbolTrigger);

    sut = new ModeHandler(null, null, settings);
  });

  it('should return editorListCommand trigger', () => {
    const value = sut.getCommandStringForMode(Mode.EditorList);

    expect(value).toBe(editorTrigger);
    expect(editorCmdSpy).toHaveBeenCalled();
    editorCmdSpy.mockRestore();
  });

  it('should return symbolListCommand trigger', () => {
    const value = sut.getCommandStringForMode(Mode.SymbolList);

    expect(value).toBe(symbolTrigger);
    expect(symbolCmdSpy).toHaveBeenCalled();
    symbolCmdSpy.mockRestore();
  });
});

describe('determineRunMode', () => {
  let settings: SwitcherPlusSettings;
  let sut: ModeHandler;

  beforeAll(() => {
    settings = new SwitcherPlusSettings(null);
    jest.spyOn(settings, 'editorListCommand', 'get').mockReturnValue(editorTrigger);
    jest.spyOn(settings, 'symbolListCommand', 'get').mockReturnValue(symbolTrigger);

    sut = new ModeHandler(null, null, settings);
  });

  it('should reset on nullish input', () => {
    const spy = jest.spyOn(sut, 'reset');

    const input: string = null;
    const inputInfo = sut.determineRunMode(input, null, null);

    expect(inputInfo.mode).toBe(Mode.Standard);
    expect(inputInfo.hasSearchTerm).toBe(false);
    expect(inputInfo.inputText).toBe('');
    expect(spy).toHaveBeenCalled();

    spy.mockRestore();
  });

  describe('should identify unicode triggers', () => {
    test.each(unicodeInputFixture)(
      'for input: "$input" (array data index: $#)',
      ({ editorTrigger, symbolTrigger, input, expected: { mode, parsedInput } }) => {
        const s = new SwitcherPlusSettings(null);
        const mh = new ModeHandler(null, null, s);
        let editorCmdSpy, symbolCmdSpy;

        if (editorTrigger) {
          editorCmdSpy = jest
            .spyOn(s, 'editorListCommand', 'get')
            .mockReturnValue(editorTrigger);
        }

        if (symbolTrigger) {
          symbolCmdSpy = jest
            .spyOn(s, 'symbolListCommand', 'get')
            .mockReturnValue(symbolTrigger);
        }

        const es: EditorSuggestion = {
          item: new WorkspaceLeaf(),
          type: 'editor',
          match: {
            score: 0,
            matches: [[0, 0]],
          },
        };
        const inputInfo = mh.determineRunMode(input, es, new WorkspaceLeaf());

        let parsed;
        if (mode === Mode.EditorList) {
          parsed = inputInfo.editorCmd.parsedInput;
          expect(editorCmdSpy).toHaveBeenCalled();
        } else if (mode === Mode.SymbolList) {
          parsed = inputInfo.symbolCmd.parsedInput;
          expect(symbolCmdSpy).toHaveBeenCalled();
        }

        expect(inputInfo.mode).toBe(mode);
        expect(parsed).toBe(parsedInput);
      },
    );
  });

  describe('should parse as standard mode', () => {
    test(`with excluded active view for input: "${symbolTrigger} test"`, () => {
      const activeLeaf = new WorkspaceLeaf();
      const excludedType = 'foo';
      const input = `${symbolTrigger} test`;
      const excludeViewTypesSpy = jest
        .spyOn(settings, 'excludeViewTypes', 'get')
        .mockReturnValue([excludedType]);
      const getViewTypeSpy = jest
        .spyOn(activeLeaf.view, 'getViewType')
        .mockReturnValue(excludedType);

      const inputInfo = sut.determineRunMode(input, null, activeLeaf);

      expect(inputInfo.mode).toBe(Mode.Standard);
      expect(inputInfo.inputText).toBe(input);
      expect(excludeViewTypesSpy).toHaveBeenCalled();
      expect(getViewTypeSpy).toHaveBeenCalled();

      excludeViewTypesSpy.mockRestore();
    });

    test.each(standardModeInputFixture)(
      'for input: "$input" (array data index: $#)',
      ({ input, expected: { mode } }) => {
        const inputInfo = sut.determineRunMode(input, null, null);

        expect(inputInfo.mode).toBe(mode);
        expect(inputInfo.inputText).toBe(input);
      },
    );
  });

  describe('should parse as editor mode', () => {
    test.each(editorPrefixOnlyInputFixture)(
      'for input: "$input" (array data index: $#)',
      ({ input, expected: { mode, isValidated, parsedInput } }) => {
        const inputInfo = sut.determineRunMode(input, null, null);

        expect(inputInfo.mode).toBe(mode);
        expect(inputInfo.inputText).toBe(input);
        expect(inputInfo.editorCmd.isValidated).toBe(isValidated);
        expect(inputInfo.editorCmd.parsedInput).toBe(parsedInput);
      },
    );
  });

  describe('should parse as symbol mode', () => {
    test.each(symbolPrefixOnlyInputFixture)(
      'with ACTIVE LEAF for input: "$input" (array data index: $#)',
      ({ input, expected: { mode, isValidated, parsedInput } }) => {
        const activeLeaf = new WorkspaceLeaf();
        const inputInfo = sut.determineRunMode(input, null, activeLeaf);

        expect(inputInfo.mode).toBe(mode);
        expect(inputInfo.inputText).toBe(input);

        const { symbolCmd } = inputInfo;
        expect(symbolCmd.isValidated).toBe(isValidated);
        expect(symbolCmd.parsedInput).toBe(parsedInput);

        const { target } = symbolCmd;
        expect(target.isValidSymbolTarget).toBe(true);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect(target.file).toBe((activeLeaf.view as any).file);
        expect(target.leaf).toBe(activeLeaf);
        expect(target.suggestion).toBe(null);
      },
    );

    test.each(symbolModeInputFixture)(
      'with FILE SUGGESTIONO for input: "$input" (array data index: $#)',
      ({ input, expected: { mode, isValidated, parsedInput } }) => {
        const fileSuggestion: FileSuggestion = {
          file: new TFile(),
          type: 'file',
          match: {
            score: 0,
            matches: [[0, 0]],
          },
        };

        const inputInfo = sut.determineRunMode(input, fileSuggestion, null);

        expect(inputInfo.mode).toBe(mode);
        expect(inputInfo.inputText).toBe(input);

        const { symbolCmd } = inputInfo;
        expect(symbolCmd.isValidated).toBe(isValidated);
        expect(symbolCmd.parsedInput).toBe(parsedInput);

        const { target } = symbolCmd;
        expect(target.isValidSymbolTarget).toBe(true);
        expect(target.file).toBe(fileSuggestion.file);
        expect(target.leaf).toBe(null);
        expect(target.suggestion).toBe(fileSuggestion);
      },
    );

    test.each(symbolModeInputFixture)(
      'with EDITOR SUGGESTION for input: "$input" (array data index: $#)',
      ({ input, expected: { mode, isValidated, parsedInput } }) => {
        const leaf = new WorkspaceLeaf();
        const editorSuggestion: EditorSuggestion = {
          item: leaf,
          type: 'editor',
          match: {
            score: 0,
            matches: [[0, 0]],
          },
        };

        const inputInfo = sut.determineRunMode(input, editorSuggestion, null);

        expect(inputInfo.mode).toBe(mode);
        expect(inputInfo.inputText).toBe(input);

        const { symbolCmd } = inputInfo;
        expect(symbolCmd.isValidated).toBe(isValidated);
        expect(symbolCmd.parsedInput).toBe(parsedInput);

        const { target } = symbolCmd;
        expect(target.isValidSymbolTarget).toBe(true);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect(target.file).toBe((leaf.view as any).file);
        expect(target.leaf).toBe(leaf);
        expect(target.suggestion).toBe(editorSuggestion);
      },
    );
  });
});

describe('getSuggestions', () => {
  const rootFixture = rootSplitEditorFixtures[0];
  const leftFixture = leftSplitEditorFixtures[0];
  const rightFixture = rightSplitEditorFixtures[0];
  let settings: SwitcherPlusSettings;
  let workspace: Workspace;
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
  let sut: ModeHandler;

  beforeAll(() => {
    settings = new SwitcherPlusSettings(null);
    jest.spyOn(settings, 'editorListCommand', 'get').mockReturnValue(editorTrigger);
    jest.spyOn(settings, 'symbolListCommand', 'get').mockReturnValue(symbolTrigger);

    workspace = new Workspace();
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockImplementation((callback: (leaf: WorkspaceLeaf) => any) => {
        const leaves = [rootSplitLeaf, leftSplitLeaf, rightSplitLeaf];
        leaves.forEach((leaf) => callback(leaf));
      });

    mockPrepareQuery = prepareQuery as jest.MockedFunction<typeof prepareQuery>;
    mockPrepareQuery.mockReturnValue({ query: '', tokens: [], fuzzy: [] });

    mockFuzzySearch = fuzzySearch as jest.MockedFunction<typeof fuzzySearch>;
    sut = new ModeHandler(workspace, null, settings);
  });

  describe('for editor mode:', () => {
    test('with filter search term, it should return only matching suggestions for editor mode', () => {
      mockPrepareQuery.mockReturnValueOnce(rootFixture.prepQuery);

      mockFuzzySearch.mockImplementation((_q: PreparedQuery, text: string) => {
        return text === rootFixture.displayText ? rootFixture.fuzzyMatch : null;
      });

      const inputInfo = sut.determineRunMode(rootFixture.inputText, null, null);
      const results = sut.getSuggestions(inputInfo);

      expect(results).not.toBeNull();
      expect(results instanceof Array).toBe(true);
      expect(results.length).toBe(1);

      const resultLeaves = new Set(results.map((sugg) => sugg.item));
      expect(resultLeaves.has(rootSplitLeaf)).toBe(true);
      expect(resultLeaves.has(leftSplitLeaf)).toBe(false);
      expect(resultLeaves.has(rightSplitLeaf)).toBe(false);

      expect(results[0].type).toBe('editor');

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

      const inputInfo = sut.determineRunMode(editorTrigger, null, null);
      const results = sut.getSuggestions(inputInfo);

      expect(results).not.toBeNull();
      expect(results instanceof Array).toBe(true);
      expect(results.length).toBe(2);

      const resultLeaves = new Set(results.map((sugg) => sugg.item));
      expect(resultLeaves.has(rootSplitLeaf)).toBe(true);
      expect(resultLeaves.has(leftSplitLeaf)).toBe(true);
      expect(resultLeaves.has(rightSplitLeaf)).toBe(false);

      expect(results[0].type).toBe('editor');
      expect(results[1].type).toBe('editor');

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

      const inputInfo = sut.determineRunMode(editorTrigger, null, null);
      const results = sut.getSuggestions(inputInfo);

      expect(results).not.toBeNull();
      expect(results instanceof Array).toBe(true);
      expect(results.length).toBe(2);

      const resultLeaves = new Set(results.map((sugg) => sugg.item));
      expect(resultLeaves.has(rootSplitLeaf)).toBe(false);
      expect(resultLeaves.has(leftSplitLeaf)).toBe(true);
      expect(resultLeaves.has(rightSplitLeaf)).toBe(true);

      expect(results[0].type).toBe('editor');
      expect(results[1].type).toBe('editor');

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

    test('with default settings, it should return suggestions for editor mode', () => {
      const inputInfo = sut.determineRunMode(editorTrigger, null, null);
      const results = sut.getSuggestions(inputInfo);

      expect(results).not.toBeNull();
      expect(results instanceof Array).toBe(true);
      expect(results.length).toBe(3);

      const resultLeaves = new Set(results.map((sugg) => sugg.item));
      expect(resultLeaves.has(rootSplitLeaf)).toBe(true);
      expect(resultLeaves.has(leftSplitLeaf)).toBe(true);
      expect(resultLeaves.has(rightSplitLeaf)).toBe(true);

      expect(results[0].type).toBe('editor');
      expect(results[1].type).toBe('editor');
      expect(results[2].type).toBe('editor');

      expect(mockPrepareQuery).toHaveBeenCalled();
      expect(iterateAllLeavesSpy).toHaveBeenCalled();
      expect(rootSplitGetRootSpy).toHaveBeenCalled();
      expect(leftSplitGetRootSpy).toHaveBeenCalled();
      expect(rightSplitGetRootSpy).toHaveBeenCalled();
    });
  });
});
