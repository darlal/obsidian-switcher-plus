import { mock, mockClear, mockFn, MockProxy, mockReset } from 'jest-mock-extended';
import { SwitcherPlusSettings } from 'src/settings';
import { AnySuggestion, Mode, SwitcherPlus, SymbolType } from 'src/types';
import { Chance } from 'chance';
import {
  SwitcherPlusKeymap,
  ModeHandler,
  SourcedParsedCommand,
  InputInfo,
} from 'src/switcherPlus';
import {
  EditorHandler,
  HeadingsHandler,
  SymbolHandler,
  WorkspaceHandler,
  StarredHandler,
  CommandHandler,
  RelatedItemsHandler,
  StandardExHandler,
  StarredItemInfo,
  Handler,
} from 'src/Handlers';
import {
  App,
  Chooser,
  debounce,
  View,
  InternalPlugins,
  Workspace,
  Debouncer,
  TFile,
  Vault,
  StarredPluginItem,
} from 'obsidian';
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

const chance = new Chance();

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
  let mockVault: MockProxy<Vault>;

  const mockDebouncedGetSuggestions =
    mockFn<Debouncer<[InputInfo, Chooser<AnySuggestion>], void>>();
  mockDebouncedGetSuggestions.cancel = mockFn();

  const mockDebounce = jest.mocked(debounce);
  mockDebounce.mockReturnValue(mockDebouncedGetSuggestions);

  beforeAll(() => {
    const mockInternalPlugins = mock<InternalPlugins>();
    mockInternalPlugins.getPluginById.mockImplementation((_id) => {
      return {
        enabled: true,
        instance: null,
      };
    });

    mockVault = mock<Vault>();
    mockWorkspace = mock<Workspace>();
    mockWorkspace.iterateAllLeaves.mockImplementation();

    mockApp = mock<App>({
      internalPlugins: mockInternalPlugins,
      workspace: mockWorkspace,
      vault: mockVault,
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
      overrideStandardModeBehaviors: false,
    });
  });

  afterAll(() => {
    mockDebounce.mockReset();
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

    describe('insertSessionOpenModeOrLastInputString', () => {
      const mockInputEl = mock<HTMLInputElement>();

      it('should insert the command string into the input element', () => {
        mockInputEl.value = '';
        sut.setSessionOpenMode(Mode.EditorList, null);

        sut.insertSessionOpenModeOrLastInputString(mockInputEl);

        expect(mockInputEl).toHaveProperty('value', editorTrigger);
      });

      it('should do nothing when sessionOpenModeString is falsy', () => {
        mockInputEl.value = '';
        sut.setSessionOpenMode(Mode.Standard, null);

        sut.insertSessionOpenModeOrLastInputString(mockInputEl);

        expect(mockInputEl).toHaveProperty('value', '');
      });
    });
    describe('insertSessionOpenModeOrLastInputString should restore last text', () => {
      const mockKeymap = mock<SwitcherPlusKeymap>();
      const mockChooser = mock<Chooser<AnySuggestion>>();
      const mockInputEl = mock<HTMLInputElement>();

      let getSuggestionSpy: jest.SpyInstance;
      beforeAll(() => {
        sut = new ModeHandler(mockApp, mockSettings, mockKeymap);
        getSuggestionSpy = jest
          .spyOn(ModeHandler.prototype, 'getSuggestions')
          .mockReturnValue();
      });
      afterAll(() => {
        getSuggestionSpy.mockRestore();
      });
      it('should restore the command string into the input element', () => {
        mockSettings.preserveCommandPaletteLastInput = true;

        // save input
        const expectToRestore = `${commandTrigger} hello`;
        sut.updateSuggestions(expectToRestore, mockChooser, null);

        mockInputEl.value = '';
        sut.setSessionOpenMode(Mode.CommandList, null);
        sut.insertSessionOpenModeOrLastInputString(mockInputEl);

        expect(mockInputEl).toHaveProperty('value', expectToRestore);
        // will auto select command text
        // this make it easy to delete whole text
        expect(mockInputEl.setSelectionRange).toHaveBeenCalledWith(
          commandTrigger.length,
          expectToRestore.length,
        );

        // if we open another mode, it wouldn't restore last input
        mockInputEl.value = '';
        sut.setSessionOpenMode(Mode.SymbolList, null);
        sut.insertSessionOpenModeOrLastInputString(mockInputEl);

        expect(mockInputEl).toHaveProperty('value', symbolTrigger);

        mockSettings.preserveCommandPaletteLastInput = false;
      });

      it("shouldn't restore the command string into the input element without config", () => {
        mockSettings.preserveCommandPaletteLastInput = false;

        // save first input
        const firstText = `${commandTrigger} hello`;
        sut.updateSuggestions(firstText, mockChooser, null);

        mockInputEl.value = '';
        sut.setSessionOpenMode(Mode.CommandList, null);
        sut.insertSessionOpenModeOrLastInputString(mockInputEl);

        expect(mockInputEl).toHaveProperty('value', commandTrigger);
      });

      it('should restore the quicker switcher string into the input element', () => {
        mockSettings.preserveCommandPaletteLastInput = false;
        mockSettings.preserveQuickSwitcherLastInput = true;

        // will not save, because `preserveCommandPaletteLastInput` is false.
        sut.updateSuggestions(`${commandTrigger} any text`, mockChooser, null);

        mockInputEl.value = '';
        sut.setSessionOpenMode(Mode.CommandList, null);
        sut.insertSessionOpenModeOrLastInputString(mockInputEl);

        // will not save command last input if the configuration is falsy.
        expect(mockInputEl).toHaveProperty('value', commandTrigger);

        // save input
        const expectToRestore = `${editorTrigger} hello`;
        sut.updateSuggestions(expectToRestore, mockChooser, null);

        mockInputEl.value = '';
        sut.setSessionOpenMode(Mode.EditorList, null);

        sut.insertSessionOpenModeOrLastInputString(mockInputEl);
        expect(mockInputEl).toHaveProperty('value', expectToRestore);

        mockSettings.preserveQuickSwitcherLastInput = false;
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

    it('should reset state for sourced handlers when there is not a trigger match', () => {
      const headingSugg = makeHeadingSuggestion(getHeadings()[0], new TFile());
      const symbolResetSpy = jest.spyOn(SymbolHandler.prototype, 'reset');

      const relatedResetSpy = jest.spyOn(RelatedItemsHandler.prototype, 'reset');

      // first call should trigger symbol mode, and clear the other sourced handlers
      const inputInfo1 = sut.determineRunMode(
        `${headingsTrigger}${symbolTrigger}`,
        headingSugg,
        null,
      );

      // second call should trigger headings mode and clear all sourced handlers
      const inputInfo2 = sut.determineRunMode(headingsTrigger, null, null);

      expect(inputInfo1.mode).toBe(Mode.SymbolList);
      expect(inputInfo2.mode).toBe(Mode.HeadingsList);

      // should have been reset in the second call where headings mode matched
      expect(symbolResetSpy).toHaveBeenCalled();

      // should have been reset the first time when symbol mode matched, and a second
      // time, when headings mode matched
      expect(relatedResetSpy).toHaveBeenCalledTimes(2);

      symbolResetSpy.mockRestore();
      relatedResetSpy.mockRestore();
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
      const results = sut.updateSuggestions(null, null, null);
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

      sut.updateSuggestions(symbolTrigger, mockChooser, null);

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
      mockDebounce.mockClear();
      mockClear(mockDebouncedGetSuggestions);

      const validateCommandSpy = jest
        .spyOn(HeadingsHandler.prototype, 'validateCommand')
        .mockImplementation((inputInfo) => {
          inputInfo.mode = Mode.HeadingsList;
          const cmd = inputInfo.parsedCommand(Mode.HeadingsList);
          cmd.parsedInput = 'foo';
        });

      sut = new ModeHandler(mockApp, mockSettings, mock<SwitcherPlusKeymap>());

      const results = sut.updateSuggestions(headingsTrigger, mockChooser, null);

      expect(results).toBe(true);
      expect(mockDebounce).toHaveBeenCalled();
      expect(mockDebouncedGetSuggestions).toHaveBeenCalled();
      expect(mockDebouncedGetSuggestions.cancel).toHaveBeenCalled();
      expect(validateCommandSpy).toHaveBeenCalled();

      validateCommandSpy.mockRestore();
    });

    it('should set the active suggestion in Symbol Mode', () => {
      const sugg = makeSymbolSuggestion(getHeadings()[0], SymbolType.Heading, null, true);
      const expectedSuggs = [sugg];
      const expectedSuggEls = expectedSuggs.map((_v) => mock<HTMLDivElement>());

      const getSuggestionsPromise = Promise.resolve(expectedSuggs);

      const getSuggestionSpy = jest
        .spyOn(SymbolHandler.prototype, 'getSuggestions')
        .mockReturnValue(getSuggestionsPromise);

      const validateCommandSpy = jest
        .spyOn(SymbolHandler.prototype, 'validateCommand')
        .mockImplementation((inputInfo) => {
          inputInfo.mode = Mode.SymbolList;
        });

      mockSetSuggestion.calledWith(expectedSuggs).mockImplementationOnce(() => {
        mockChooser.values = expectedSuggs;
        mockChooser.suggestions = expectedSuggEls;
        mockChooser.selectedItem = 0;
      });

      const results = sut.updateSuggestions(symbolTrigger, mockChooser, null);

      return getSuggestionsPromise.finally(() => {
        expect(results).toBe(true);
        expect(getSuggestionSpy).toHaveBeenCalled();
        expect(validateCommandSpy).toHaveBeenCalled();
        expect(mockChooser.setSelectedItem).toHaveBeenCalledWith(0, null); // <-- here
        expect(expectedSuggEls[0].scrollIntoView).toHaveBeenCalled();
        expect(mockSetSuggestion).toHaveBeenLastCalledWith(expectedSuggs);

        getSuggestionSpy.mockRestore();
        validateCommandSpy.mockRestore();
        mockReset(mockChooser);
      });
    });

    test('with a null sugg param, .renderSuggestion should show a hint suggestion to create a new file', () => {
      const searchText = 'filename';
      const mockParentEl = mock<HTMLElement>();
      const getSuggestionSpy = jest
        .spyOn(HeadingsHandler.prototype, 'getSuggestions')
        .mockReturnValue([]);

      const renderNoteCreationSuggestionSpy = jest
        .spyOn(Handler.prototype, 'renderFileCreationSuggestion')
        .mockReturnValueOnce(null);

      sut.updateSuggestions(`${headingsTrigger}${searchText}`, mockChooser, null);

      const handled = sut.renderSuggestion(null, mockParentEl);

      expect(handled).toBe(true);
      expect(renderNoteCreationSuggestionSpy).toHaveBeenCalledWith(
        mockParentEl,
        searchText,
      );

      getSuggestionSpy.mockRestore();
      renderNoteCreationSuggestionSpy.mockRestore();
    });

    test('when there are no results for a search term, it should call .onNoSuggestion() on the modal', () => {
      const mockModal = mock<SwitcherPlus>();
      const getSuggestionSpy = jest
        .spyOn(HeadingsHandler.prototype, 'getSuggestions')
        .mockReturnValue([]);

      const inputInfo = new InputInfo('', Mode.HeadingsList);
      inputInfo.parsedCommand(Mode.HeadingsList).parsedInput = chance.word();

      sut.getSuggestions(inputInfo, mockChooser, mockModal);

      expect(mockModal.onNoSuggestion).toHaveBeenCalled();

      getSuggestionSpy.mockRestore();
    });

    test('with no results and no search term, it should set suggestions to null', () => {
      mockReset(mockChooser);
      const getSuggestionSpy = jest
        .spyOn(HeadingsHandler.prototype, 'getSuggestions')
        .mockReturnValue([]);

      const inputInfo = new InputInfo('', Mode.HeadingsList);

      sut.getSuggestions(inputInfo, mockChooser, null);

      expect(mockChooser.setSuggestions).toHaveBeenCalledWith(null);

      getSuggestionSpy.mockRestore();
      mockReset(mockChooser);
    });

    test('with a null sugg param, .onChooseSuggestion should create a new file in Headings mode', () => {
      const searchText = 'filename';
      const mockEvt = mock<MouseEvent>();
      const getSuggestionSpy = jest
        .spyOn(HeadingsHandler.prototype, 'getSuggestions')
        .mockReturnValue([]);

      const createNoteSpy = jest
        .spyOn(Handler.prototype, 'createFile')
        .mockReturnValueOnce();

      sut.updateSuggestions(`${headingsTrigger}${searchText}`, mockChooser, null);

      const handled = sut.onChooseSuggestion(null, mockEvt);

      expect(handled).toBe(true);
      expect(createNoteSpy).toHaveBeenCalledWith(searchText, mockEvt);

      getSuggestionSpy.mockRestore();
      createNoteSpy.mockRestore();
    });

    test('with overrideStandardModeBehaviors enabled, renderSuggestion should use the StandardExHandler', () => {
      mockSettings.overrideStandardModeBehaviors = true;
      const sugg = makeFileSuggestion();
      const mockParentEl = mock<HTMLElement>();

      const addPropsSpy = jest
        .spyOn(StandardExHandler.prototype, 'addPropertiesToStandardSuggestions')
        .mockImplementation();

      const renderSuggestionSpy = jest
        .spyOn(StandardExHandler.prototype, 'renderSuggestion')
        .mockImplementation();

      sut.updateSuggestions(chance.word(), mockChooser, null);

      const handled = sut.renderSuggestion(sugg, mockParentEl);

      expect(renderSuggestionSpy).toHaveBeenCalledWith(sugg, mockParentEl);
      expect(addPropsSpy).toHaveBeenCalled();
      expect(handled).toBe(true);

      renderSuggestionSpy.mockRestore();
      addPropsSpy.mockRestore();
      mockClear(mockChooser);
      mockSettings.overrideStandardModeBehaviors = false;
    });

    test.each([makeFileSuggestion()])(
      'renderSuggestion should use the StandardExHandler when in Headings mode for File Suggestions',
      (sugg) => {
        const mockParentEl = mock<HTMLElement>();
        const getSuggestionSpy = jest
          .spyOn(HeadingsHandler.prototype, 'getSuggestions')
          .mockReturnValue([sugg]);

        const renderSuggestionSpy = jest
          .spyOn(StandardExHandler.prototype, 'renderSuggestion')
          .mockImplementation();

        sut.updateSuggestions(`${headingsTrigger}`, mockChooser, null);

        const handled = sut.renderSuggestion(sugg, mockParentEl);

        expect(renderSuggestionSpy).toHaveBeenCalledWith(sugg, mockParentEl);
        expect(handled).toBe(true);

        getSuggestionSpy.mockRestore();
        renderSuggestionSpy.mockRestore();
        mockClear(mockChooser);
      },
    );

    test('with overrideStandardModeBehaviors enabled, onChooseSuggestion should use the StandardExHandler', () => {
      mockSettings.overrideStandardModeBehaviors = true;
      const sugg = makeFileSuggestion();

      const onChooseSuggestionSpy = jest
        .spyOn(StandardExHandler.prototype, 'onChooseSuggestion')
        .mockImplementation();

      sut.updateSuggestions(chance.word(), mockChooser, null);

      sut.onChooseSuggestion(sugg, mockEvt);

      expect(onChooseSuggestionSpy).toHaveBeenCalledWith(sugg, mockEvt);

      onChooseSuggestionSpy.mockRestore();

      mockSettings.overrideStandardModeBehaviors = false;
    });

    test.each([makeFileSuggestion(), makeAliasSuggestion()])(
      'onChooseSuggestion should use the StandardExHandler when in Headings mode for File & Alias Suggestions',
      (sugg) => {
        const getSuggestionSpy = jest
          .spyOn(HeadingsHandler.prototype, 'getSuggestions')
          .mockReturnValue([sugg]);

        const onChooseSuggestionSpy = jest
          .spyOn(StandardExHandler.prototype, 'onChooseSuggestion')
          .mockImplementation();

        const handled = sut.updateSuggestions(`${headingsTrigger}`, mockChooser, null);

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
          const results = sut.updateSuggestions(trigger, mockChooser, null);

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

  describe('getRecentFiles', () => {
    let sut: ModeHandler;
    const fileData: Record<string, TFile> = {};
    let file = new TFile();
    fileData[file.path] = file;

    file = new TFile();
    fileData[file.path] = file;

    file = new TFile();
    fileData[file.path] = file;

    const fileDataKeys = Object.keys(fileData);

    beforeAll(() => {
      sut = new ModeHandler(mockApp, mockSettings, null);

      mockWorkspace.getLastOpenFiles.mockReturnValue(fileDataKeys);
      mockVault.getAbstractFileByPath.mockImplementation(
        (path: string) => fileData[path],
      );
    });

    afterAll(() => {
      mockWorkspace.getLastOpenFiles.mockReset();
      mockVault.getAbstractFileByPath.mockReset();
    });

    it('should not throw with falsy values', () => {
      expect(() => sut.getRecentFiles(null)).not.toThrow();
    });

    it('should not include ignored files', () => {
      const ignoredFile = Object.values(fileData)[0];

      const results = sut.getRecentFiles(new Set([ignoredFile]));

      const found = results.has(ignoredFile);

      expect(found).toBe(false);
      expect(results.size).toBe(fileDataKeys.length - 1);
    });
  });

  describe('addWorkspaceEnvLists', () => {
    let sut: ModeHandler;

    beforeAll(() => {
      sut = new ModeHandler(mockApp, mockSettings, null);
    });

    it('should add file list', () => {
      const inputInfo = new InputInfo();
      const editors = [makeLeaf()];
      const editorFiles = editors.map((v) => v.view.file);
      const recentFiles = new Set([new TFile(), new TFile(), ...editorFiles]);

      const starred = [
        mock<StarredItemInfo>({
          file: new TFile(),
          item: mock<StarredPluginItem>({ type: 'file' }),
        }),
      ];

      const starredFiles = starred.map((v) => v.file);

      const editorSpy = jest
        .spyOn(EditorHandler.prototype, 'getItems')
        .mockReturnValueOnce(editors);

      const starredSpy = jest
        .spyOn(StarredHandler.prototype, 'getItems')
        .mockReturnValueOnce(starred);

      const recentSpy = jest
        .spyOn(sut, 'getRecentFiles')
        .mockReturnValueOnce(recentFiles);

      sut.addWorkspaceEnvLists(inputInfo);

      expect(inputInfo.currentWorkspaceEnvList).toEqual(
        expect.objectContaining({
          openWorkspaceLeaves: new Set(editors),
          openWorkspaceFiles: new Set(editorFiles),
          starredFiles: new Set(starredFiles),
          mostRecentFiles: new Set(recentFiles),
        }),
      );

      editorSpy.mockRestore();
      starredSpy.mockRestore();
      recentSpy.mockRestore();
    });
  });
});
