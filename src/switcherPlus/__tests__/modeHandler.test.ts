import { mock, MockProxy } from 'jest-mock-extended';
import { SwitcherPlusSettings } from 'src/settings';
import {
  Mode,
  FileSuggestion,
  EditorSuggestion,
  WorkspaceSuggestion,
  HeadingSuggestion,
  SymbolSuggestion,
  SymbolType,
  AnySuggestion,
} from 'src/types';
import { Keymap, ModeHandler, SymbolParsedCommand } from 'src/switcherPlus';
import {
  EditorHandler,
  HeadingsHandler,
  SymbolHandler,
  WorkspaceHandler,
  WORKSPACE_PLUGIN_ID,
} from 'src/Handlers';
import {
  TFile,
  WorkspaceLeaf,
  App,
  Chooser,
  debounce,
  View,
  InternalPlugins,
  InstalledPlugin,
} from 'obsidian';
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

function makeLeaf(): MockProxy<WorkspaceLeaf> {
  const view = mock<View>({ file: new TFile() });
  return mock<WorkspaceLeaf>({ view });
}

describe('modeHandler', () => {
  let mockApp: MockProxy<App>;
  let settings: SwitcherPlusSettings;
  let sut: ModeHandler;

  beforeAll(() => {
    mockApp = mock<App>({ internalPlugins: mock<InternalPlugins>() });
    settings = new SwitcherPlusSettings(null);

    jest.spyOn(settings, 'editorListCommand', 'get').mockReturnValue(editorTrigger);
    jest.spyOn(settings, 'symbolListCommand', 'get').mockReturnValue(symbolTrigger);
    jest.spyOn(settings, 'workspaceListCommand', 'get').mockReturnValue(workspaceTrigger);
    jest.spyOn(settings, 'headingsListCommand', 'get').mockReturnValue(headingsTrigger);
  });

  describe('opening and closing the modal', () => {
    const mockKeymap = mock<Keymap>();

    beforeAll(() => {
      sut = new ModeHandler(mockApp, settings, mockKeymap);
    });

    test('onOpen() should open the keymap', () => {
      mockKeymap.isOpen = false;

      sut.onOpen();

      expect(mockKeymap.isOpen).toBe(true);
    });

    test('onClose() should close the keymap', () => {
      mockKeymap.isOpen = true;

      sut.onClose();

      expect(mockKeymap.isOpen).toBe(false);
    });
  });

  describe('Starting sessions with explicit command string', () => {
    let commandStringSpy: jest.SpyInstance;

    beforeAll(() => {
      sut = new ModeHandler(mockApp, settings, null);
    });

    describe('setSessionOpenMode', () => {
      it('should save the command string for any Ex modes', () => {
        commandStringSpy = jest
          .spyOn(EditorHandler.prototype, 'commandString', 'get')
          .mockReturnValueOnce(editorTrigger);

        sut.setSessionOpenMode(Mode.EditorList, null);

        expect(commandStringSpy).toHaveBeenCalled();

        commandStringSpy.mockRestore();
      });

      it('should not save the command string for any Ex modes', () => {
        const sSpy = jest.spyOn(SymbolHandler.prototype, 'commandString', 'get');
        const eSpy = jest.spyOn(EditorHandler.prototype, 'commandString', 'get');
        const wSpy = jest.spyOn(WorkspaceHandler.prototype, 'commandString', 'get');
        const hSpy = jest.spyOn(HeadingsHandler.prototype, 'commandString', 'get');

        sut.setSessionOpenMode(Mode.Standard, null);

        expect(sSpy).not.toHaveBeenCalled();
        expect(eSpy).not.toHaveBeenCalled();
        expect(wSpy).not.toHaveBeenCalled();
        expect(hSpy).not.toHaveBeenCalled();

        sSpy.mockRestore();
        eSpy.mockRestore();
        wSpy.mockRestore();
        hSpy.mockRestore();
      });
    });

    describe('insertSessionOpenModeCommandString', () => {
      const mockInputEl = mock<HTMLInputElement>();

      it('should insert the command string into the input element', () => {
        mockInputEl.value = '';
        sut.setSessionOpenMode(Mode.EditorList, null);

        sut.insertSessionOpenModeCommandString(mockInputEl);

        expect(mockInputEl).toHaveProperty('value', editorTrigger);
      });

      it('should do nothing when sessionOpenModeString is falsy', () => {
        mockInputEl.value = '';
        sut.setSessionOpenMode(Mode.Standard, null);

        sut.insertSessionOpenModeCommandString(mockInputEl);

        expect(mockInputEl).toHaveProperty('value', '');
      });
    });
  });

  describe('determineRunMode', () => {
    beforeAll(() => {
      sut = new ModeHandler(mockApp, settings, null);
    });

    it('should reset on falsy input', () => {
      const input: string = null;
      const inputInfo = sut.determineRunMode(input, null, null);

      expect(inputInfo.mode).toBe(Mode.Standard);
      expect(inputInfo.searchQuery).toBeFalsy();
      expect(inputInfo.inputText).toBe('');
    });

    describe('should identify unicode triggers', () => {
      test.each(unicodeInputFixture)(
        'for input: "$input" (array data index: $#)',
        ({ editorTrigger, symbolTrigger, input, expected: { mode, parsedInput } }) => {
          const s = new SwitcherPlusSettings(null);
          const mh = new ModeHandler(null, s, null);
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
            item: makeLeaf(),
            type: 'editor',
            match: {
              score: 0,
              matches: [[0, 0]],
            },
          };

          const inputInfo = mh.determineRunMode(input, es, makeLeaf());
          const parsed = inputInfo.parsedCommand().parsedInput;

          expect(cmdSpy).toHaveBeenCalled();
          expect(inputInfo.mode).toBe(mode);
          expect(parsed).toBe(parsedInput);
        },
      );
    });

    describe('should parse as standard mode', () => {
      test(`with excluded active view for input: "${symbolTrigger} test"`, () => {
        const mockLeaf = makeLeaf();
        const mockView = mockLeaf.view as MockProxy<View>;
        const excludedType = 'foo';
        const input = `${symbolTrigger} test`;

        const excludeViewTypesSpy = jest
          .spyOn(settings, 'excludeViewTypes', 'get')
          .mockReturnValue([excludedType]);

        mockView.getViewType.mockReturnValue(excludedType);

        const inputInfo = sut.determineRunMode(input, null, mockLeaf);

        expect(inputInfo.mode).toBe(Mode.Standard);
        expect(inputInfo.inputText).toBe(input);
        expect(excludeViewTypesSpy).toHaveBeenCalled();
        expect(mockView.getViewType).toHaveBeenCalled();

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
          const mockLeaf = makeLeaf();
          const inputInfo = sut.determineRunMode(input, null, mockLeaf);

          expect(inputInfo.mode).toBe(mode);
          expect(inputInfo.inputText).toBe(input);

          const symbolCmd = inputInfo.parsedCommand() as SymbolParsedCommand;
          expect(symbolCmd.isValidated).toBe(isValidated);
          expect(symbolCmd.parsedInput).toBe(parsedInput);

          const { target } = symbolCmd;
          expect(target.isValidSymbolTarget).toBe(true);
          expect(target.file).toBe(mockLeaf.view.file);
          expect(target.leaf).toBe(mockLeaf);
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
          const leaf = makeLeaf();
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
      beforeAll(() => {
        const mockInternalPlugins = mockApp.internalPlugins as MockProxy<InternalPlugins>;
        mockInternalPlugins.getPluginById.mockImplementation((id) => {
          let ret: InstalledPlugin;
          if (id === WORKSPACE_PLUGIN_ID) {
            ret = {
              enabled: true,
              instance: null,
            };
          }

          return ret;
        });
      });

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
    const editorSugg: EditorSuggestion = {
      type: 'editor',
      item: makeLeaf(),
      match: null,
    };

    const symbolSugg: SymbolSuggestion = {
      type: 'symbol',
      item: {
        type: 'symbolInfo',
        symbol: getHeadings()[0],
        symbolType: SymbolType.Heading,
        isSelected: false,
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
      sut = new ModeHandler(mockApp, settings, mock<Keymap>());
    });

    describe('updateSuggestions', () => {
      const mockChooser = mock<Chooser<AnySuggestion>>();
      const mockSetSuggestion = mockChooser.setSuggestions.mockImplementation();
      let getSuggestionSpy: jest.SpyInstance;

      test('with falsy input (Standard mode), it should return not handled', () => {
        const results = sut.updateSuggestions(null, null);
        expect(results).toBe(false);
      });

      it('should debounce in Headings mode with filter text', () => {
        const validateCommandSpy = jest
          .spyOn(HeadingsHandler.prototype, 'validateCommand')
          .mockImplementation((inputInfo) => {
            inputInfo.mode = Mode.HeadingsList;
            const cmd = inputInfo.parsedCommand(Mode.HeadingsList);
            cmd.parsedInput = 'foo';
          });

        const mockDebouncedFn = jest.fn();
        const mockDebounce = debounce as jest.Mock;
        mockDebounce.mockImplementation(() => mockDebouncedFn);
        sut = new ModeHandler(mockApp, settings, mock<Keymap>());

        const results = sut.updateSuggestions(headingsTrigger, mockChooser);

        expect(results).toBe(true);
        expect(mockDebounce).toHaveBeenCalled();
        expect(mockDebouncedFn).toHaveBeenCalled();
        expect(validateCommandSpy).toHaveBeenCalled();

        validateCommandSpy.mockRestore();
        mockDebounce.mockReset();
      });

      it('should get suggestions for Editor Mode', () => {
        const expectedSuggestions = [editorSugg];
        getSuggestionSpy = jest
          .spyOn(EditorHandler.prototype, 'getSuggestions')
          .mockReturnValue(expectedSuggestions);

        const results = sut.updateSuggestions(editorTrigger, mockChooser);

        expect(results).toBe(true);
        expect(getSuggestionSpy).toHaveBeenCalled();
        expect(mockSetSuggestion).toHaveBeenLastCalledWith(expectedSuggestions);

        getSuggestionSpy.mockRestore();
        mockSetSuggestion.mockReset();
      });

      it('should get suggestions for Symbol Mode', () => {
        const expectedSuggestions = [symbolSugg];
        getSuggestionSpy = jest
          .spyOn(SymbolHandler.prototype, 'getSuggestions')
          .mockReturnValue(expectedSuggestions);

        const validateCommandSpy = jest
          .spyOn(SymbolHandler.prototype, 'validateCommand')
          .mockImplementation((inputInfo) => {
            inputInfo.mode = Mode.SymbolList;
          });

        const mockSetSelectedItem = mockChooser.setSelectedItem.mockImplementation();
        mockChooser.values = expectedSuggestions;

        const results = sut.updateSuggestions(symbolTrigger, mockChooser);

        expect(results).toBe(true);
        expect(getSuggestionSpy).toHaveBeenCalled();
        expect(validateCommandSpy).toHaveBeenCalled();
        expect(mockSetSelectedItem).not.toHaveBeenCalled();
        expect(mockSetSuggestion).toHaveBeenLastCalledWith(expectedSuggestions);

        getSuggestionSpy.mockRestore();
        validateCommandSpy.mockRestore();
        mockSetSelectedItem.mockRestore();
        mockSetSuggestion.mockReset();
      });

      it('should set the active suggestion in Symbol Mode', () => {
        const symbolSugg2: SymbolSuggestion = {
          type: 'symbol',
          item: {
            type: 'symbolInfo',
            symbol: getHeadings()[0],
            symbolType: SymbolType.Heading,
            isSelected: true, // <-- here
          },
          match: null,
        };

        const expectedSuggestions = [symbolSugg2];
        getSuggestionSpy = jest
          .spyOn(SymbolHandler.prototype, 'getSuggestions')
          .mockReturnValue(expectedSuggestions);

        const validateCommandSpy = jest
          .spyOn(SymbolHandler.prototype, 'validateCommand')
          .mockImplementation((inputInfo) => {
            inputInfo.mode = Mode.SymbolList;
          });

        const mockSetSelectedItem = mockChooser.setSelectedItem.mockImplementation();
        mockChooser.values = expectedSuggestions;

        const results = sut.updateSuggestions(symbolTrigger, mockChooser);

        expect(results).toBe(true);
        expect(getSuggestionSpy).toHaveBeenCalled();
        expect(validateCommandSpy).toHaveBeenCalled();
        expect(mockSetSelectedItem).toHaveBeenCalledWith(0, true); // <-- here
        expect(mockSetSuggestion).toHaveBeenLastCalledWith(expectedSuggestions);

        getSuggestionSpy.mockRestore();
        validateCommandSpy.mockRestore();
        mockSetSelectedItem.mockRestore();
        mockSetSuggestion.mockReset();
      });

      it('should get suggestions for Workspace Mode', () => {
        const expectedSuggestions = [workspaceSugg];
        getSuggestionSpy = jest
          .spyOn(WorkspaceHandler.prototype, 'getSuggestions')
          .mockReturnValue(expectedSuggestions);

        const results = sut.updateSuggestions(workspaceTrigger, mockChooser);

        expect(results).toBe(true);
        expect(getSuggestionSpy).toHaveBeenCalled();
        expect(mockSetSuggestion).toHaveBeenLastCalledWith(expectedSuggestions);

        getSuggestionSpy.mockRestore();
        mockSetSuggestion.mockReset();
      });

      it('should get suggestions for Headings Mode', () => {
        const expectedSuggestions = [headingsSugg];
        getSuggestionSpy = jest
          .spyOn(HeadingsHandler.prototype, 'getSuggestions')
          .mockReturnValue(expectedSuggestions);

        const results = sut.updateSuggestions(headingsTrigger, mockChooser);

        expect(results).toBe(true);
        expect(getSuggestionSpy).toHaveBeenCalled();
        expect(mockSetSuggestion).toHaveBeenLastCalledWith(expectedSuggestions);

        getSuggestionSpy.mockRestore();
        mockSetSuggestion.mockReset();
      });
    });

    describe('renderSuggestions', () => {
      const mockParentEl = mock<HTMLElement>();
      let renderSuggestionSpy: jest.SpyInstance;

      it('should return false with falsy input', () => {
        const result = sut.renderSuggestion(null, null);
        expect(result).toBe(false);
      });

      it('should render suggestions for Editor Mode', () => {
        renderSuggestionSpy = jest
          .spyOn(EditorHandler.prototype, 'renderSuggestion')
          .mockImplementation();

        const result = sut.renderSuggestion(editorSugg, mockParentEl);

        expect(result).toBe(true);
        expect(renderSuggestionSpy).toHaveBeenCalledWith(editorSugg, mockParentEl);

        renderSuggestionSpy.mockRestore();
      });

      it('should render suggestions for Symbol Mode', () => {
        renderSuggestionSpy = jest
          .spyOn(SymbolHandler.prototype, 'renderSuggestion')
          .mockImplementation();

        const result = sut.renderSuggestion(symbolSugg, mockParentEl);

        expect(result).toBe(true);
        expect(renderSuggestionSpy).toHaveBeenCalledWith(symbolSugg, mockParentEl);

        renderSuggestionSpy.mockRestore();
      });

      it('should render suggestions for Headings Mode', () => {
        renderSuggestionSpy = jest
          .spyOn(HeadingsHandler.prototype, 'renderSuggestion')
          .mockImplementation();

        const result = sut.renderSuggestion(headingsSugg, mockParentEl);

        expect(result).toBe(true);
        expect(renderSuggestionSpy).toHaveBeenCalledWith(headingsSugg, mockParentEl);

        renderSuggestionSpy.mockRestore();
      });

      it('should render suggestions for Workspace Mode', () => {
        renderSuggestionSpy = jest
          .spyOn(WorkspaceHandler.prototype, 'renderSuggestion')
          .mockImplementation();

        const result = sut.renderSuggestion(workspaceSugg, mockParentEl);

        expect(result).toBe(true);
        expect(renderSuggestionSpy).toHaveBeenCalledWith(workspaceSugg, mockParentEl);

        renderSuggestionSpy.mockRestore();
      });
    });

    describe('onchooseSuggestions', () => {
      const mockEvt = mock<MouseEvent>();
      let onChooseSuggestionSpy: jest.SpyInstance;

      it('should return false with falsy input', () => {
        const result = sut.onChooseSuggestion(null, null);
        expect(result).toBe(false);
      });

      it('should action suggestions for Editor Mode', () => {
        onChooseSuggestionSpy = jest
          .spyOn(EditorHandler.prototype, 'onChooseSuggestion')
          .mockImplementation();

        const result = sut.onChooseSuggestion(editorSugg, mockEvt);

        expect(result).toBe(true);
        expect(onChooseSuggestionSpy).toHaveBeenCalledWith(editorSugg, mockEvt);

        onChooseSuggestionSpy.mockRestore();
      });

      it('should action suggestions for Symbol Mode', () => {
        onChooseSuggestionSpy = jest
          .spyOn(SymbolHandler.prototype, 'onChooseSuggestion')
          .mockImplementation();

        const result = sut.onChooseSuggestion(symbolSugg, mockEvt);

        expect(result).toBe(true);
        expect(onChooseSuggestionSpy).toHaveBeenCalledWith(symbolSugg, mockEvt);

        onChooseSuggestionSpy.mockRestore();
      });

      it('should action suggestions for Headings Mode', () => {
        onChooseSuggestionSpy = jest
          .spyOn(HeadingsHandler.prototype, 'onChooseSuggestion')
          .mockImplementation();

        const result = sut.onChooseSuggestion(headingsSugg, mockEvt);

        expect(result).toBe(true);
        expect(onChooseSuggestionSpy).toHaveBeenCalledWith(headingsSugg, mockEvt);

        onChooseSuggestionSpy.mockRestore();
      });

      it('should action suggestions for Workspace Mode', () => {
        onChooseSuggestionSpy = jest
          .spyOn(WorkspaceHandler.prototype, 'onChooseSuggestion')
          .mockImplementation();

        const result = sut.onChooseSuggestion(workspaceSugg, mockEvt);

        expect(result).toBe(true);
        expect(onChooseSuggestionSpy).toHaveBeenCalledWith(workspaceSugg, mockEvt);

        onChooseSuggestionSpy.mockRestore();
      });
    });
  });
});
