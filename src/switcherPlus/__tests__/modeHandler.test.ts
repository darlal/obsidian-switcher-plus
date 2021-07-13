import { SwitcherPlusSettings } from 'src/settings/switcherPlusSettings';
import { ModeHandler } from 'src/switcherPlus/modeHandler';
import { Mode, FileSuggestion, EditorSuggestion } from 'src/types/sharedTypes';
import { editorTrigger, symbolTrigger } from 'src/__fixtures__/modeTrigger.fixture';
import { TFile, WorkspaceLeaf } from 'obsidian';
import {
  standardModeInputFixture,
  editorPrefixOnlyInputFixture,
  symbolPrefixOnlyInputFixture,
  symbolModeInputFixture,
  unicodeInputFixture,
} from 'src/__fixtures__/inputText.fixture';

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
          type: 'Editor',
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
          type: 'Editor',
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
