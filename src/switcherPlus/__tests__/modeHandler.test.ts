import { mock, mockClear, MockProxy } from 'jest-mock-extended';
import { SwitcherPlusSettings } from 'src/settings';
import { AnySuggestion, Mode, SymbolType } from 'src/types';
import { SwitcherPlusKeymap, ModeHandler, SourcedParsedCommand } from 'src/switcherPlus';
import {
  EditorHandler,
  HeadingsHandler,
  SymbolHandler,
  WorkspaceHandler,
  StarredHandler,
  CommandHandler,
  RelatedItemsHandler,
  StandardExHandler,
} from 'src/Handlers';
import { App, Chooser, debounce, View, InternalPlugins, Workspace } from 'obsidian';
import {
  editorTrigger,
  symbolTrigger,
  workspaceTrigger,
  standardModeInputFixture,
  unicodeInputFixture,
  headingsTrigger,
  makeHeading,
  getHeadings,
  starredTrigger,
  commandTrigger,
  relatedItemsTrigger,
  makeFileSuggestion,
  makeEditorSuggestion,
  makeStarredSuggestion,
  makeCommandSuggestion,
  makeRelatedItemsSuggestion,
  makeHeadingSuggestion,
  makeWorkspaceSuggestion,
  makeSymbolSuggestion,
  makeLeaf,
  makePrefixOnlyInputFixture,
  makeSourcedCmdEmbeddedInputFixture,
  makeAliasSuggestion,
} from '@fixtures';

// dataset used for various test scenarios
const modeHandlingData = [
  {
    title: 'EDITOR MODE',
    mode: Mode.EditorList,
    handlerPrototype: EditorHandler.prototype,
    trigger: editorTrigger,
    suggestions: [makeEditorSuggestion(makeLeaf())],
  },
  {
    title: 'STARRED MODE',
    mode: Mode.StarredList,
    handlerPrototype: StarredHandler.prototype,
    trigger: starredTrigger,
    suggestions: [makeStarredSuggestion()],
  },
  {
    title: 'WORKSPACE MODE',
    mode: Mode.WorkspaceList,
    handlerPrototype: WorkspaceHandler.prototype,
    trigger: workspaceTrigger,
    suggestions: [makeWorkspaceSuggestion('foo')],
  },
  {
    title: 'HEADING MODE',
    mode: Mode.HeadingsList,
    handlerPrototype: HeadingsHandler.prototype,
    trigger: headingsTrigger,
    suggestions: [makeHeadingSuggestion(makeHeading('foo', 1))],
  },
  {
    title: 'COMMAND MODE',
    mode: Mode.CommandList,
    handlerPrototype: CommandHandler.prototype,
    trigger: commandTrigger,
    suggestions: [makeCommandSuggestion()],
  },
  {
    title: 'SYMBOL MODE',
    mode: Mode.SymbolList,
    handlerPrototype: SymbolHandler.prototype,
    trigger: symbolTrigger,
    isSourcedCmd: true, // requires source file
    suggestions: Promise.resolve([
      makeSymbolSuggestion(getHeadings()[0], SymbolType.Heading),
    ]),
  },
  {
    title: 'RELATEDITEMS MODE',
    mode: Mode.RelatedItemsList,
    handlerPrototype: RelatedItemsHandler.prototype,
    trigger: relatedItemsTrigger,
    isSourcedCmd: true, // requires source file
    suggestions: [makeRelatedItemsSuggestion()],
  },
];

describe('modeHandler', () => {
  const excludedViewType = 'excludedViewType';
  let mockApp: MockProxy<App>;
  let mockSettings: MockProxy<SwitcherPlusSettings>;
  let mockWorkspace: MockProxy<Workspace>;

  beforeAll(() => {
    const mockInternalPlugins = mock<InternalPlugins>();
    mockInternalPlugins.getPluginById.mockImplementation((_id) => {
      return {
        enabled: true,
        instance: null,
      };
    });

    mockWorkspace = mock<Workspace>();
    mockWorkspace.iterateAllLeaves.mockImplementation();

    mockApp = mock<App>({
      internalPlugins: mockInternalPlugins,
      workspace: mockWorkspace,
    });

    mockSettings = mock<SwitcherPlusSettings>({
      editorListCommand: editorTrigger,
      symbolListCommand: symbolTrigger,
      workspaceListCommand: workspaceTrigger,
      headingsListCommand: headingsTrigger,
      starredListCommand: starredTrigger,
      commandListCommand: commandTrigger,
      relatedItemsListCommand: relatedItemsTrigger,
      excludeViewTypes: [excludedViewType],
      referenceViews: [],
    });
  });

  describe('opening and closing the modal', () => {
    const mockKeymap = mock<SwitcherPlusKeymap>();
    let sut: ModeHandler;

    beforeAll(() => {
      sut = new ModeHandler(mockApp, mockSettings, mockKeymap);
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
    let sut: ModeHandler;

    beforeAll(() => {
      sut = new ModeHandler(mockApp, mockSettings, null);
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

      test.each(modeHandlingData)(
        '$title: should not save the command string for Ex mode: $mode',
        ({ handlerPrototype }) => {
          const commandStringSpy = jest.spyOn(handlerPrototype, 'commandString', 'get');

          sut.setSessionOpenMode(Mode.Standard, null);

          expect(commandStringSpy).not.toHaveBeenCalled();

          commandStringSpy.mockRestore();
        },
      );
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
    let sut: ModeHandler;

    beforeAll(() => {
      sut = new ModeHandler(mockApp, mockSettings, null);
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
          const mh = new ModeHandler(mockApp, s, null);
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

          const leaf = makeLeaf();
          const es = makeEditorSuggestion(leaf, leaf.view.file);

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
        const input = `${symbolTrigger} test`;

        mockView.getViewType.mockReturnValue(excludedViewType);

        const inputInfo = sut.determineRunMode(input, null, mockLeaf);

        expect(inputInfo.mode).toBe(Mode.Standard);
        expect(inputInfo.inputText).toBe(input);
        expect(mockView.getViewType).toHaveBeenCalled();
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

    describe.each(
      // exclude sourced modes (modes that require a source file) since they
      // are handled separately
      modeHandlingData.filter((v) => !v.isSourcedCmd),
    )(
      '$title: should parse as Mode: $mode using trigger: $trigger',
      ({ mode: triggerMode }) => {
        test.each(makePrefixOnlyInputFixture(triggerMode))(
          'for input (array data index: $#): "$input"',
          ({ input, expected: { mode, isValidated, parsedInput } }) => {
            const inputInfo = sut.determineRunMode(input, null, null);

            expect(inputInfo.mode).toBe(mode);
            expect(inputInfo.inputText).toBe(input);

            const cmd = inputInfo.parsedCommand();
            expect(cmd.isValidated).toBe(isValidated);
            expect(cmd.parsedInput).toBe(parsedInput);
          },
        );
      },
    );

    describe.each(
      // include only the sourced modes (mode that require a source file)
      modeHandlingData.filter((v) => v.isSourcedCmd),
    )(
      '$title: should parse as Sourced Mode: $mode using trigger: $trigger',
      ({ mode: triggerMode }) => {
        const embeddedCases = makeSourcedCmdEmbeddedInputFixture(triggerMode);

        test.each(makePrefixOnlyInputFixture(triggerMode))(
          'with ACTIVE LEAF for input: "$input" (array data index: $#)',
          ({ input, expected: { mode, isValidated, parsedInput } }) => {
            const mockLeaf = makeLeaf();
            const inputInfo = sut.determineRunMode(input, null, mockLeaf);

            expect(inputInfo.mode).toBe(mode);
            expect(inputInfo.inputText).toBe(input);

            const symbolCmd = inputInfo.parsedCommand() as SourcedParsedCommand;
            expect(symbolCmd.isValidated).toBe(isValidated);
            expect(symbolCmd.parsedInput).toBe(parsedInput);

            const { source } = symbolCmd;
            expect(source.isValidSource).toBe(true);
            expect(source.file).toBe(mockLeaf.view.file);
            expect(source.leaf).toBe(mockLeaf);
            expect(source.suggestion).toBe(null);
          },
        );

        test.each(embeddedCases)(
          'with FILE SUGGESTION for input: "$input" (array data index: $#)',
          ({ input, expected: { mode, isValidated, parsedInput } }) => {
            const fileSuggestion = makeFileSuggestion(null, [[0, 0]], 0);

            const inputInfo = sut.determineRunMode(input, fileSuggestion, null);

            expect(inputInfo.mode).toBe(mode);
            expect(inputInfo.inputText).toBe(input);

            const symbolCmd = inputInfo.parsedCommand() as SourcedParsedCommand;
            expect(symbolCmd.isValidated).toBe(isValidated);
            expect(symbolCmd.parsedInput).toBe(parsedInput);

            const { source } = symbolCmd;
            expect(source.isValidSource).toBe(true);
            expect(source.file).toBe(fileSuggestion.file);
            expect(source.leaf).toBe(null);
            expect(source.suggestion).toBe(fileSuggestion);
          },
        );

        test.each(embeddedCases)(
          'with EDITOR SUGGESTION for input: "$input" (array data index: $#)',
          ({ input, expected: { mode, isValidated, parsedInput } }) => {
            const leaf = makeLeaf();
            const editorSuggestion = makeEditorSuggestion(leaf, leaf.view.file);

            const inputInfo = sut.determineRunMode(input, editorSuggestion, null);

            expect(inputInfo.mode).toBe(mode);
            expect(inputInfo.inputText).toBe(input);

            const symbolCmd = inputInfo.parsedCommand() as SourcedParsedCommand;
            expect(symbolCmd.isValidated).toBe(isValidated);
            expect(symbolCmd.parsedInput).toBe(parsedInput);

            const { source } = symbolCmd;
            expect(source.isValidSource).toBe(true);
            expect(source.file).toBe(leaf.view.file);
            expect(source.leaf).toBe(leaf);
            expect(source.suggestion).toBe(editorSuggestion);
          },
        );
      },
    );
  });

  describe('managing suggestions', () => {
    const mockEvt = mock<MouseEvent>();
    const mockParentEl = mock<HTMLElement>();
    const mockChooser = mock<Chooser<AnySuggestion>>();
    const mockSetSuggestion = mockChooser.setSuggestions.mockImplementation();
    let sut: ModeHandler;

    beforeAll(() => {
      sut = new ModeHandler(mockApp, mockSettings, mock<SwitcherPlusKeymap>());

      // needed for file sourced command modes i.e. Symbol, RelatedItems
      mockWorkspace.getActiveViewOfType
        .calledWith(View)
        .mockReturnValue(mock<View>({ leaf: makeLeaf() }));
    });

    afterAll(() => {
      mockWorkspace.getActiveViewOfType.mockReset();
    });

    test('updateSuggestions should return not handled (false) with falsy input', () => {
      const results = sut.updateSuggestions(null, null);
      expect(results).toBe(false);
    });

    test('renderSuggestion should return not handled (false) with falsy input', () => {
      const result = sut.renderSuggestion(null, null);
      expect(result).toBe(false);
    });

    test('onChooseSuggestion should return not handled (false) with falsy input', () => {
      const result = sut.onChooseSuggestion(null, null);
      expect(result).toBe(false);
    });

    it('should log errors from async handlers to the console', async () => {
      const errorMsg = 'Unit test error';
      const rejectedPromise = Promise.reject(errorMsg);
      const consoleLogSpy = jest.spyOn(console, 'log').mockReturnValueOnce();

      const getSuggestionSpy = jest
        .spyOn(SymbolHandler.prototype, 'getSuggestions')
        .mockReturnValueOnce(rejectedPromise);

      sut.updateSuggestions(symbolTrigger, mockChooser);

      try {
        await rejectedPromise;
      } catch (e) {
        /* noop */
      }

      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Switcher++: error retrieving suggestions as Promise. ',
        errorMsg,
      );

      getSuggestionSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });

    it('should debounce searches in Headings mode with filter text', () => {
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
      sut = new ModeHandler(mockApp, mockSettings, mock<SwitcherPlusKeymap>());

      const results = sut.updateSuggestions(headingsTrigger, mockChooser);

      expect(results).toBe(true);
      expect(mockDebounce).toHaveBeenCalled();
      expect(mockDebouncedFn).toHaveBeenCalled();
      expect(validateCommandSpy).toHaveBeenCalled();

      validateCommandSpy.mockRestore();
      mockDebounce.mockReset();
    });

    it('should set the active suggestion in Symbol Mode', () => {
      const sugg = makeSymbolSuggestion(getHeadings()[0], SymbolType.Heading, null, true);
      const expectedSuggestions = [sugg];

      const getSuggestionsPromise = Promise.resolve(expectedSuggestions);

      const getSuggestionSpy = jest
        .spyOn(SymbolHandler.prototype, 'getSuggestions')
        .mockReturnValue(getSuggestionsPromise);

      const validateCommandSpy = jest
        .spyOn(SymbolHandler.prototype, 'validateCommand')
        .mockImplementation((inputInfo) => {
          inputInfo.mode = Mode.SymbolList;
        });

      const mockSetSelectedItem = mockChooser.setSelectedItem.mockImplementation();
      mockChooser.values = expectedSuggestions;

      const results = sut.updateSuggestions(symbolTrigger, mockChooser);

      return getSuggestionsPromise.finally(() => {
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
    });

    test.each([makeFileSuggestion(), makeAliasSuggestion()])(
      'onChooseSuggestion should use the StandardExHandler when in Headings mode for File & Alias Suggestions',
      (sugg) => {
        const getSuggestionSpy = jest
          .spyOn(HeadingsHandler.prototype, 'getSuggestions')
          .mockReturnValue([]);

        const onChooseSuggestionSpy = jest
          .spyOn(StandardExHandler.prototype, 'onChooseSuggestion')
          .mockImplementation();

        const handled = sut.updateSuggestions(`${headingsTrigger}`, mockChooser);

        sut.onChooseSuggestion(sugg, mockEvt);

        expect(onChooseSuggestionSpy).toHaveBeenCalledWith(sugg, mockEvt);
        expect(handled).toBe(true);

        getSuggestionSpy.mockRestore();
        onChooseSuggestionSpy.mockRestore();
        mockClear(mockChooser);
      },
    );

    describe.each(modeHandlingData)(
      '$title',
      ({ handlerPrototype, trigger, suggestions }) => {
        it('should get suggestions', async () => {
          const getSuggestionSpy = jest
            .spyOn(handlerPrototype, 'getSuggestions')
            .mockReturnValue(suggestions);

          let sugg: AnySuggestion[];
          let promise: Promise<void | AnySuggestion[]> = Promise.resolve();

          if (Array.isArray(suggestions)) {
            sugg = suggestions;
          } else {
            sugg = await suggestions;
            promise = suggestions;
          }

          // this value is checked in symbol mode
          mockChooser.values = sugg;
          const results = sut.updateSuggestions(trigger, mockChooser);

          return promise.finally(() => {
            expect(results).toBe(true);
            expect(getSuggestionSpy).toHaveBeenCalled();
            expect(mockSetSuggestion).toHaveBeenLastCalledWith(sugg);

            getSuggestionSpy.mockRestore();
            mockSetSuggestion.mockReset();
          });
        });

        it('should render suggestions', async () => {
          const expected = (
            Array.isArray(suggestions) ? suggestions : await suggestions
          )[0];

          const renderSuggestionSpy = jest
            .spyOn(handlerPrototype, 'renderSuggestion')
            .mockImplementation();

          const result = sut.renderSuggestion(expected, mockParentEl);

          expect(result).toBe(true);
          expect(renderSuggestionSpy).toHaveBeenCalledWith(expected, mockParentEl);

          renderSuggestionSpy.mockRestore();
        });

        it('should action the chosen suggestion', async () => {
          const expected = (
            Array.isArray(suggestions) ? suggestions : await suggestions
          )[0];

          const onChooseSuggestionSpy = jest
            .spyOn(handlerPrototype, 'onChooseSuggestion')
            .mockImplementation();

          const result = sut.onChooseSuggestion(expected, mockEvt);

          expect(result).toBe(true);
          expect(onChooseSuggestionSpy).toHaveBeenCalledWith(expected, mockEvt);

          onChooseSuggestionSpy.mockRestore();
        });
      },
    );
  });
});
