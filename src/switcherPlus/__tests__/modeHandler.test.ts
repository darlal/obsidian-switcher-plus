import { SwitcherPlusSettings } from 'src/settings';
import {
  Mode,
  FileSuggestion,
  EditorSuggestion,
  WorkspaceSuggestion,
  HeadingSuggestion,
  SymbolSuggestion,
  SymbolType,
} from 'src/types';
import { InputInfo, ModeHandler, SymbolParsedCommand } from 'src/switcherPlus';
import {
  EditorHandler,
  HeadingsHandler,
  SymbolHandler,
  WorkspaceHandler,
} from 'src/Handlers';
import { TFile, WorkspaceLeaf, App } from 'obsidian';
import {
  editorTrigger,
  symbolTrigger,
  workspaceTrigger,
  standardModeInputFixture,
  editorPrefixOnlyInputFixture,
  symbolPrefixOnlyInputFixture,
  symbolModeInputFixture,
  unicodeInputFixture,
  workspacePrefixOnlyInputFixture,
  headingsTrigger,
  headingsPrefixOnlyInputFixture,
  makeHeading,
  getHeadings,
} from '@fixtures';

describe('modeHandler', () => {
  let app: App;
  let settings: SwitcherPlusSettings;
  let sut: ModeHandler;
  let editorCmdSpy: jest.SpyInstance;
  let symbolCmdSpy: jest.SpyInstance;
  let workspaceCmdSpy: jest.SpyInstance;
  let headingsCmdSpy: jest.SpyInstance;

  beforeAll(() => {
    app = new App();
    settings = new SwitcherPlusSettings(null);

    editorCmdSpy = jest
      .spyOn(settings, 'editorListCommand', 'get')
      .mockReturnValue(editorTrigger);
    symbolCmdSpy = jest
      .spyOn(settings, 'symbolListCommand', 'get')
      .mockReturnValue(symbolTrigger);
    workspaceCmdSpy = jest
      .spyOn(settings, 'workspaceListCommand', 'get')
      .mockReturnValue(workspaceTrigger);
    headingsCmdSpy = jest
      .spyOn(settings, 'headingsListCommand', 'get')
      .mockReturnValue(headingsTrigger);
  });

  describe('getCommandStringForMode', () => {
    beforeAll(() => {
      sut = new ModeHandler(app, settings);
    });

    it('should return editorListCommand trigger', () => {
      const value = sut.getCommandStringForMode(Mode.EditorList);

      expect(value).toBe(editorTrigger);
      expect(editorCmdSpy).toHaveBeenCalled();
    });

    it('should return symbolListCommand trigger', () => {
      const value = sut.getCommandStringForMode(Mode.SymbolList);

      expect(value).toBe(symbolTrigger);
      expect(symbolCmdSpy).toHaveBeenCalled();
    });

    it('should return workspaceListCommand trigger', () => {
      const value = sut.getCommandStringForMode(Mode.WorkspaceList);

      expect(value).toBe(workspaceTrigger);
      expect(workspaceCmdSpy).toHaveBeenCalled();
    });

    it('should return headingsListCommand trigger', () => {
      const value = sut.getCommandStringForMode(Mode.HeadingsList);

      expect(value).toBe(headingsTrigger);
      expect(headingsCmdSpy).toHaveBeenCalled();
    });
  });

  describe('determineRunMode', () => {
    beforeAll(() => {
      sut = new ModeHandler(app, settings);
    });

    it('should reset on falsy input', () => {
      const spy = jest.spyOn(sut, 'reset');

      const input: string = null;
      const inputInfo = sut.determineRunMode(input, null, null);

      expect(inputInfo.mode).toBe(Mode.Standard);
      expect(inputInfo.searchQuery).toBeFalsy();
      expect(inputInfo.inputText).toBe('');
      expect(spy).toHaveBeenCalled();

      spy.mockRestore();
    });

    describe('should identify unicode triggers', () => {
      test.each(unicodeInputFixture)(
        'for input: "$input" (array data index: $#)',
        ({ editorTrigger, symbolTrigger, input, expected: { mode, parsedInput } }) => {
          const s = new SwitcherPlusSettings(null);
          const mh = new ModeHandler(null, s);
          let cmdSpy: jest.SpyInstance;

          if (editorTrigger) {
            cmdSpy = jest
              .spyOn(s, 'editorListCommand', 'get')
              .mockReturnValue(editorTrigger);
          }

          if (symbolTrigger) {
            cmdSpy = jest
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
          const parsed = inputInfo.parsedCommand().parsedInput;

          expect(cmdSpy).toHaveBeenCalled();
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

          const editorCmd = inputInfo.parsedCommand();
          expect(editorCmd.isValidated).toBe(isValidated);
          expect(editorCmd.parsedInput).toBe(parsedInput);
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

          const symbolCmd = inputInfo.parsedCommand() as SymbolParsedCommand;
          expect(symbolCmd.isValidated).toBe(isValidated);
          expect(symbolCmd.parsedInput).toBe(parsedInput);

          const { target } = symbolCmd;
          expect(target.isValidSymbolTarget).toBe(true);
          expect(target.file).toBe(activeLeaf.view.file);
          expect(target.leaf).toBe(activeLeaf);
          expect(target.suggestion).toBe(null);
        },
      );

      test.each(symbolModeInputFixture)(
        'with FILE SUGGESTION for input: "$input" (array data index: $#)',
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

          const symbolCmd = inputInfo.parsedCommand() as SymbolParsedCommand;
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

          const symbolCmd = inputInfo.parsedCommand() as SymbolParsedCommand;
          expect(symbolCmd.isValidated).toBe(isValidated);
          expect(symbolCmd.parsedInput).toBe(parsedInput);

          const { target } = symbolCmd;
          expect(target.isValidSymbolTarget).toBe(true);
          expect(target.file).toBe(leaf.view.file);
          expect(target.leaf).toBe(leaf);
          expect(target.suggestion).toBe(editorSuggestion);
        },
      );
    });

    describe('should parse as workspace mode', () => {
      test.each(workspacePrefixOnlyInputFixture)(
        'for input: "$input" (array data index: $#)',
        ({ input, expected: { mode, isValidated, parsedInput } }) => {
          const inputInfo = sut.determineRunMode(input, null, null);

          expect(inputInfo.mode).toBe(mode);
          expect(inputInfo.inputText).toBe(input);

          const workspaceCmd = inputInfo.parsedCommand();
          expect(workspaceCmd.isValidated).toBe(isValidated);
          expect(workspaceCmd.parsedInput).toBe(parsedInput);
        },
      );
    });

    describe('should parse as headings mode', () => {
      test.each(headingsPrefixOnlyInputFixture)(
        'for input: "$input" (array data index: $#)',
        ({ input, expected: { mode, isValidated, parsedInput } }) => {
          const inputInfo = sut.determineRunMode(input, null, null);

          expect(inputInfo.mode).toBe(mode);
          expect(inputInfo.inputText).toBe(input);

          const headingsCmd = inputInfo.parsedCommand();
          expect(headingsCmd.isValidated).toBe(isValidated);
          expect(headingsCmd.parsedInput).toBe(parsedInput);
        },
      );
    });
  });

  describe('managing suggestions', () => {
    jest.doMock('src/Handlers/symbolHandler');
    jest.doMock('src/Handlers/editorHandler');
    jest.doMock('src/Handlers/workspaceHandler');
    jest.doMock('src/Handlers/headingsHandler');

    const editorSugg: EditorSuggestion = {
      type: 'editor',
      item: new WorkspaceLeaf(),
      match: null,
    };

    const symbolSugg: SymbolSuggestion = {
      type: 'symbol',
      item: {
        type: 'symbolInfo',
        symbol: getHeadings()[0],
        symbolType: SymbolType.Heading,
      },
      match: null,
    };

    const workspaceSugg: WorkspaceSuggestion = {
      type: 'workspace',
      item: {
        type: 'workspaceInfo',
        id: 'foo',
      },
      match: null,
    };

    const headingsSugg: HeadingSuggestion = {
      type: 'heading',
      item: makeHeading('foo', 1),
      file: null,
      match: null,
    };

    beforeAll(() => {
      sut = new ModeHandler(app, settings);
    });

    describe('getSuggestions', () => {
      let getSuggestionSpy: jest.SpyInstance;

      test('with falsy input, it should return an empty array', () => {
        const results = sut.getSuggestions(null);

        expect(sut.mode).toBe(Mode.Standard);
        expect(results).not.toBeNull();
        expect(results).toBeInstanceOf(Array);
        expect(results).toHaveLength(0);
      });

      it('should get suggestions for Editor Mode', () => {
        const inputInfo = new InputInfo(editorTrigger, Mode.EditorList);
        getSuggestionSpy = jest
          .spyOn(EditorHandler.prototype, 'getSuggestions')
          .mockReturnValue([editorSugg]);

        const results = sut.getSuggestions(inputInfo);

        expect(results).toHaveLength(1);
        expect(results[0]).toBe(editorSugg);
        expect(getSuggestionSpy).toHaveBeenCalledWith(inputInfo);

        getSuggestionSpy.mockRestore();
      });

      it('should get suggestions for Symbol Mode', () => {
        const inputInfo = new InputInfo(symbolTrigger, Mode.SymbolList);
        getSuggestionSpy = jest
          .spyOn(SymbolHandler.prototype, 'getSuggestions')
          .mockReturnValue([symbolSugg]);

        const results = sut.getSuggestions(inputInfo);

        expect(results).toHaveLength(1);
        expect(results[0]).toBe(symbolSugg);
        expect(getSuggestionSpy).toHaveBeenCalledWith(inputInfo);

        getSuggestionSpy.mockRestore();
      });

      it('should get suggestions for Workspace Mode', () => {
        const inputInfo = new InputInfo(workspaceTrigger, Mode.WorkspaceList);
        getSuggestionSpy = jest
          .spyOn(WorkspaceHandler.prototype, 'getSuggestions')
          .mockReturnValue([workspaceSugg]);

        const results = sut.getSuggestions(inputInfo);

        expect(results).toHaveLength(1);
        expect(results[0]).toBe(workspaceSugg);
        expect(getSuggestionSpy).toHaveBeenCalledWith(inputInfo);

        getSuggestionSpy.mockRestore();
      });

      it('should get suggestions for Headings Mode', () => {
        const inputInfo = new InputInfo(editorTrigger, Mode.HeadingsList);
        getSuggestionSpy = jest
          .spyOn(HeadingsHandler.prototype, 'getSuggestions')
          .mockReturnValue([headingsSugg]);

        const results = sut.getSuggestions(inputInfo);

        expect(results).toHaveLength(1);
        expect(results[0]).toBe(headingsSugg);
        expect(getSuggestionSpy).toHaveBeenCalledWith(inputInfo);

        getSuggestionSpy.mockRestore();
      });
    });

    describe('renderSuggestions', () => {
      const parentElObj = {} as HTMLElement;
      let renderSuggestionSpy: jest.SpyInstance;

      it('should render suggestions for Editor Mode', () => {
        renderSuggestionSpy = jest
          .spyOn(EditorHandler.prototype, 'renderSuggestion')
          .mockImplementation();

        sut.renderSuggestion(editorSugg, parentElObj);

        expect(renderSuggestionSpy).toHaveBeenCalledWith(editorSugg, parentElObj);

        renderSuggestionSpy.mockRestore();
      });

      it('should render suggestions for Symbol Mode', () => {
        renderSuggestionSpy = jest
          .spyOn(SymbolHandler.prototype, 'renderSuggestion')
          .mockImplementation();

        sut.renderSuggestion(symbolSugg, parentElObj);

        expect(renderSuggestionSpy).toHaveBeenCalledWith(symbolSugg, parentElObj);

        renderSuggestionSpy.mockRestore();
      });

      it('should render suggestions for Headings Mode', () => {
        renderSuggestionSpy = jest
          .spyOn(HeadingsHandler.prototype, 'renderSuggestion')
          .mockImplementation();

        sut.renderSuggestion(headingsSugg, parentElObj);

        expect(renderSuggestionSpy).toHaveBeenCalledWith(headingsSugg, parentElObj);

        renderSuggestionSpy.mockRestore();
      });

      it('should render suggestions for Workspace Mode', () => {
        renderSuggestionSpy = jest
          .spyOn(WorkspaceHandler.prototype, 'renderSuggestion')
          .mockImplementation();

        sut.renderSuggestion(workspaceSugg, parentElObj);

        expect(renderSuggestionSpy).toHaveBeenCalledWith(workspaceSugg, parentElObj);

        renderSuggestionSpy.mockRestore();
      });
    });

    describe('onchooseSuggestions', () => {
      const evt = {} as MouseEvent;
      let onChooseSuggestionSpy: jest.SpyInstance;

      it('should action suggestions for Editor Mode', () => {
        onChooseSuggestionSpy = jest
          .spyOn(EditorHandler.prototype, 'onChooseSuggestion')
          .mockImplementation();

        sut.onChooseSuggestion(editorSugg, evt);

        expect(onChooseSuggestionSpy).toHaveBeenCalledWith(editorSugg);

        onChooseSuggestionSpy.mockRestore();
      });

      it('should action suggestions for Symbol Mode', () => {
        onChooseSuggestionSpy = jest
          .spyOn(SymbolHandler.prototype, 'onChooseSuggestion')
          .mockImplementation();

        sut.onChooseSuggestion(symbolSugg, evt);

        expect(onChooseSuggestionSpy).toHaveBeenCalledWith(symbolSugg, evt);

        onChooseSuggestionSpy.mockRestore();
      });

      it('should action suggestions for Headings Mode', () => {
        onChooseSuggestionSpy = jest
          .spyOn(HeadingsHandler.prototype, 'onChooseSuggestion')
          .mockImplementation();

        sut.onChooseSuggestion(headingsSugg, evt);

        expect(onChooseSuggestionSpy).toHaveBeenCalledWith(headingsSugg, evt);

        onChooseSuggestionSpy.mockRestore();
      });

      it('should action suggestions for Workspace Mode', () => {
        onChooseSuggestionSpy = jest
          .spyOn(WorkspaceHandler.prototype, 'onChooseSuggestion')
          .mockImplementation();

        sut.onChooseSuggestion(workspaceSugg, evt);

        expect(onChooseSuggestionSpy).toHaveBeenCalledWith(workspaceSugg);

        onChooseSuggestionSpy.mockRestore();
      });
    });
  });
});
