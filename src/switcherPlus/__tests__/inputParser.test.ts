import { InputParser } from '../inputParser';
import { HandlerRegistry } from '../handlerRegistry';
import { CommandDefinition, getCommandDefinitions } from '../commandDefinitions';
import { SwitcherPlusSettings } from 'src/settings';
import { AnySuggestion, Mode, SuggestionType } from 'src/types';
import { Handler } from 'src/Handlers';
import { mock, MockProxy, mockReset } from 'jest-mock-extended';
import { Chance } from 'chance';
import { SourcedParsedCommand } from 'src/switcherPlus';
import {
  editorTrigger,
  symbolTrigger,
  workspaceTrigger,
  standardModeInputFixture,
  unicodeInputFixture,
  headingsTrigger,
  commandTrigger,
  relatedItemsTrigger,
  makeFileSuggestion,
  makeEditorSuggestion,
  makeLeaf,
  makePrefixOnlyInputFixture,
  makeSourcedCmdEmbeddedInputFixture,
  bookmarksTrigger,
  symbolActiveTrigger,
  relatedItemsActiveTrigger,
  escapeCmdCharTrigger,
  makeEscapedStandardModeInputFixture,
  makeEscapedPrefixCommandInputFixture,
  makeEscapedSourcedCommandInputFixture,
  vaultTrigger,
  makeInputInfo,
} from '@fixtures';
import { App, View, Workspace, WorkspaceLeaf } from 'obsidian';

const chance = new Chance();

class MockHandler extends Handler<AnySuggestion> {
  renderSuggestion = jest.fn();
  getCommandString = jest.fn();
  validateCommand = jest.fn();
  reset = jest.fn();
  validate = jest.fn();
  getSuggestions = jest.fn();
  onChooseSuggestion = jest.fn();
}

describe('InputParser', () => {
  let mockApp: MockProxy<App>;
  let mockHandlerRegistry: MockProxy<HandlerRegistry>;
  let mockConfig: MockProxy<SwitcherPlusSettings>;
  let mockCommandDefinitions: MockProxy<CommandDefinition>[];

  beforeAll(() => {
    mockApp = mock<App>();
    mockHandlerRegistry = mock<HandlerRegistry>();

    mockConfig = mock<SwitcherPlusSettings>({
      escapeCmdChar: escapeCmdCharTrigger,
    });
  });

  beforeEach(() => {
    mockCommandDefinitions = [
      mock<CommandDefinition>({
        mode: Mode.HeadingsList,
        handlerClass: MockHandler,
        ownSuggestionTypes: [SuggestionType.HeadingsList],
        parserCommand: {
          getCommandStr: () => headingsTrigger,
          type: 'prefix',
        },
      }),
      mock<CommandDefinition>({
        mode: Mode.EditorList,
        handlerClass: MockHandler,
        ownSuggestionTypes: [SuggestionType.EditorList],
        parserCommand: {
          getCommandStr: () => editorTrigger,
          type: 'prefix',
        },
      }),
      mock<CommandDefinition>({
        mode: Mode.SymbolList,
        handlerClass: MockHandler,
        ownSuggestionTypes: [SuggestionType.SymbolList],
        parserCommand: {
          getCommandStr: () => symbolTrigger,
          type: 'sourced',
        },
      }),
      mock<CommandDefinition>({
        mode: Mode.RelatedItemsList,
        handlerClass: MockHandler,
        ownSuggestionTypes: [SuggestionType.RelatedItemsList],
        parserCommand: {
          getCommandStr: () => relatedItemsTrigger,
          type: 'sourced',
        },
      }),
    ];
  });

  const createParser = () =>
    new InputParser(mockHandlerRegistry, mockConfig, mockCommandDefinitions);

  describe('parse', () => {
    test('should parse input with no commands', () => {
      const parser = createParser();
      const input = chance.sentence();

      const result = parser.parse(input);

      expect(result.cleanInput).toBe(input);
      expect(result.resolvedCommands).toEqual([]);
    });

    test('should parse a simple command', () => {
      const parser = createParser();
      const filterText = chance.word();
      const input = symbolTrigger + filterText;

      const result = parser.parse(input);

      expect(result.cleanInput).toBe(input);
      expect(result.resolvedCommands).toHaveLength(1);
      expect(result.resolvedCommands[0].cmdDef.mode).toBe(Mode.SymbolList);
      expect(result.resolvedCommands[0].filterText).toBe(filterText);
    });

    test('should parse a command with filter text', () => {
      const parser = createParser();
      const filterText = chance.sentence();
      const input = headingsTrigger + filterText;

      const result = parser.parse(input);

      expect(result.cleanInput).toBe(input);
      expect(result.resolvedCommands).toHaveLength(1);
      expect(result.resolvedCommands[0].cmdDef.mode).toBe(Mode.HeadingsList);
      expect(result.resolvedCommands[0].filterText).toBe(filterText);
    });

    test('should treat an escaped command as literal text', () => {
      const parser = createParser();
      const filterText = chance.word();
      const cleanInput = symbolTrigger + filterText;
      const input = escapeCmdCharTrigger + cleanInput;

      const result = parser.parse(input);

      expect(result.cleanInput).toBe(cleanInput);
      expect(result.resolvedCommands).toEqual([]);
    });

    test('should parse multiple commands', () => {
      const parser = createParser();
      const input = `${headingsTrigger}heading1 ${symbolTrigger}symbol1`;

      const result = parser.parse(input);

      expect(result.cleanInput).toBe(input);
      expect(result.resolvedCommands).toHaveLength(2);

      expect(result.resolvedCommands[0].cmdDef.mode).toBe(Mode.SymbolList);
      expect(result.resolvedCommands[0].filterText).toBe('symbol1');

      expect(result.resolvedCommands[1].cmdDef.mode).toBe(Mode.HeadingsList);
      expect(result.resolvedCommands[1].filterText).toBe(
        `heading1 ${symbolTrigger}symbol1`,
      );
    });

    test('should correctly match longer command triggers when commands overlap', () => {
      mockCommandDefinitions.push(
        mock<CommandDefinition>({
          mode: Mode.WorkspaceList,
          handlerClass: MockHandler,
          ownSuggestionTypes: [SuggestionType.WorkspaceList],
          parserCommand: {
            // Note: intentionally use overlapping trigger string for testing this mode
            getCommandStr: () => editorTrigger + editorTrigger,
            type: 'prefix',
          },
        }),
      );
      const parser = createParser();
      const input = `${editorTrigger}${editorTrigger}workspace using overlapping trigger`;

      const result = parser.parse(input);

      expect(result.cleanInput).toBe(input);
      expect(result.resolvedCommands).toHaveLength(1);

      expect(result.resolvedCommands[0].cmdDef.mode).toBe(Mode.WorkspaceList);
      expect(result.resolvedCommands[0].cmdStr).toBe(`${editorTrigger}${editorTrigger}`);
      expect(result.resolvedCommands[0].filterText).toBe(
        'workspace using overlapping trigger',
      );
    });

    test('should resolve command precedence correctly (prefix vs sourced)', () => {
      const parser = createParser();
      const input = `${headingsTrigger}heading1${symbolTrigger}symbol1`;

      const result = parser.parse(input);

      expect(result.cleanInput).toBe(input);
      expect(result.resolvedCommands).toHaveLength(2);

      // Sourced command comes first in precedence
      expect(result.resolvedCommands[0].cmdDef.mode).toBe(Mode.SymbolList);
      expect(result.resolvedCommands[0].filterText).toBe('symbol1');

      // Prefix command comes second
      expect(result.resolvedCommands[1].cmdDef.mode).toBe(Mode.HeadingsList);
      expect(result.resolvedCommands[1].filterText).toBe(
        `heading1${symbolTrigger}symbol1`,
      );
    });

    test('should return empty result for empty input string', () => {
      const parser = createParser();

      const result = parser.parse('');

      expect(result.cleanInput).toBe('');
      expect(result.resolvedCommands).toEqual([]);
    });

    test('input with only escape characters should be treated as regular text', () => {
      const parser = createParser();

      const result = parser.parse(escapeCmdCharTrigger);

      expect(result.cleanInput).toBe(escapeCmdCharTrigger);
      expect(result.resolvedCommands).toEqual([]);
    });

    test('should not treat an invalid escaped sequence as an escaped command', () => {
      const parser = createParser();
      const input = `${escapeCmdCharTrigger}x`;

      const result = parser.parse(input);

      expect(result.cleanInput).toBe(input);
      expect(result.resolvedCommands).toEqual([]);
    });

    test('should treat multiple escaped command triggers as literal text', () => {
      const parser = createParser();
      const cleanInput = `${symbolTrigger} ${headingsTrigger}`;
      const input = `${escapeCmdCharTrigger}${symbolTrigger} ${escapeCmdCharTrigger}${headingsTrigger}`;

      const result = parser.parse(input);

      expect(result.cleanInput).toBe(cleanInput);
      expect(result.resolvedCommands).toEqual([]);
    });

    test('should correctly parse a command at the end of the input string', () => {
      const parser = createParser();
      const input = `${chance.sentence()} ${symbolTrigger}`;

      const result = parser.parse(input);

      expect(result.cleanInput).toBe(input);
      expect(result.resolvedCommands).toHaveLength(1);
      expect(result.resolvedCommands[0].cmdDef.mode).toBe(Mode.SymbolList);
      expect(result.resolvedCommands[0].filterText).toBe('');
    });

    test('should correctly parse a mix of escaped and unescaped commands', () => {
      const parser = createParser();
      const input = `${escapeCmdCharTrigger}${symbolTrigger} some text ${relatedItemsTrigger}`;

      const result = parser.parse(input);

      const cleanInput = `${symbolTrigger} some text ${relatedItemsTrigger}`;
      expect(result.cleanInput).toBe(cleanInput);
      expect(result.resolvedCommands).toHaveLength(1);
      expect(result.resolvedCommands[0].cmdDef.mode).toBe(Mode.RelatedItemsList);
      expect(result.resolvedCommands[0].filterText).toBe('');
    });

    test('should correctly parse input that consists only of a command trigger', () => {
      const parser = createParser();
      const input = symbolTrigger;

      const result = parser.parse(input);

      expect(result.cleanInput).toBe(input);
      expect(result.resolvedCommands).toHaveLength(1);
      expect(result.resolvedCommands[0].cmdDef.mode).toBe(Mode.SymbolList);
      expect(result.resolvedCommands[0].filterText).toBe('');
    });

    test('should prioritize the longer command when one is a substring of another', () => {
      mockCommandDefinitions.push(
        mock<CommandDefinition>({
          mode: Mode.VaultList,
          handlerClass: MockHandler,
          ownSuggestionTypes: [SuggestionType.VaultList],
          parserCommand: {
            getCommandStr: () => headingsTrigger.substring(0, 1),
            type: 'prefix',
          },
        }),
      );
      const parser = createParser();
      const input = `${headingsTrigger}heading`;

      const result = parser.parse(input);

      expect(result.cleanInput).toBe(input);
      expect(result.resolvedCommands).toHaveLength(1);
      expect(result.resolvedCommands[0].cmdDef.mode).toBe(Mode.HeadingsList);
      expect(result.resolvedCommands[0].filterText).toBe('heading');
    });
  });

  describe('parseInputForMode', () => {
    let mockActiveSugg: MockProxy<AnySuggestion>;
    let mockActiveLeaf: MockProxy<WorkspaceLeaf>;
    let mockHandler: MockHandler;

    beforeEach(() => {
      mockHandler = new MockHandler(mockApp, mockConfig);
      mockActiveSugg = mock<AnySuggestion>();
      mockActiveLeaf = mock<WorkspaceLeaf>();

      mockReset(mockHandlerRegistry);
    });

    test('should set mode to standard when no command is found', () => {
      const parser = createParser();
      const inputInfo = makeInputInfo({ inputText: 'not a command' });

      parser.parseInputForMode(inputInfo, mockActiveSugg, mockActiveLeaf);

      expect(inputInfo.mode).toBe(Mode.Standard);
    });

    test('should reset sourced handlers when no command is validated', () => {
      mockHandler.validateCommand.mockReturnValue({ isValidated: false });
      mockHandlerRegistry.getHandler.mockReturnValue(mockHandler);

      const parser = createParser();
      const inputInfo = makeInputInfo({ inputText: `${headingsTrigger}heading` });

      parser.parseInputForMode(inputInfo, mockActiveSugg, mockActiveLeaf);

      expect(mockHandlerRegistry.resetSourcedHandlers).toHaveBeenCalledWith();
      expect(inputInfo.mode).toBe(Mode.Standard);
    });

    test('should reset sourced handlers, excluding the validated handler, for a sourced command', () => {
      mockHandler.validateCommand.mockReturnValue({ isValidated: true });
      mockHandlerRegistry.getHandler.mockReturnValue(mockHandler);

      const parser = createParser();
      const inputInfo = makeInputInfo({ inputText: `${symbolTrigger}symbol` });

      parser.parseInputForMode(inputInfo, mockActiveSugg, mockActiveLeaf);

      expect(mockHandlerRegistry.resetSourcedHandlers).toHaveBeenCalledWith([
        mockHandler,
      ]);
    });

    test('should set useActiveEditorAsSource session option on inputInfo', () => {
      mockHandler.validateCommand.mockReturnValue({ isValidated: true });
      mockHandlerRegistry.getHandler.mockReturnValue(mockHandler);

      mockCommandDefinitions[0].parserCommand.useActiveEditorAsSource = true;

      const parser = createParser();
      const inputInfo = makeInputInfo({ inputText: `${headingsTrigger}heading` });

      parser.parseInputForMode(inputInfo, mockActiveSugg, mockActiveLeaf);

      expect(inputInfo.sessionOpts.useActiveEditorAsSource).toBe(true);
    });
  });

  describe('Command validation and precedence scenarios', () => {
    let mockActiveSugg: MockProxy<AnySuggestion>;
    let mockActiveLeaf: MockProxy<WorkspaceLeaf>;
    let mockHeadingsHandler: MockHandler;
    let mockSymbolHandler: MockHandler;
    let mockRelatedItemsHandler: MockHandler;

    beforeEach(() => {
      mockActiveSugg = mock<AnySuggestion>();
      mockActiveLeaf = mock<WorkspaceLeaf>();

      mockHeadingsHandler = new MockHandler(mockApp, mockConfig);
      mockSymbolHandler = new MockHandler(mockApp, mockConfig);
      mockRelatedItemsHandler = new MockHandler(mockApp, mockConfig);

      // Setup the handler registry to return the correct mock handler based on the mode
      mockHandlerRegistry.getHandler.mockImplementation((identifier) => {
        if (identifier === Mode.HeadingsList) return mockHeadingsHandler;
        if (identifier === Mode.SymbolList) return mockSymbolHandler;
        if (identifier === Mode.RelatedItemsList) return mockRelatedItemsHandler;
        return null;
      });
    });

    test('should fall back to a prefix command if a sourced command is invalid', () => {
      const parser = createParser();
      const inputInfo = makeInputInfo({
        inputText: `${headingsTrigger}query ${symbolTrigger}term`,
      });

      mockSymbolHandler.validateCommand.mockReturnValue({ isValidated: false });
      mockHeadingsHandler.validateCommand.mockReturnValue({ isValidated: true });

      parser.parseInputForMode(inputInfo, mockActiveSugg, mockActiveLeaf);

      // Sourced command was attempted first
      expect(mockSymbolHandler.validateCommand).toHaveBeenCalled();

      // Prefix command was attempted second and its query includes the invalid sourced command
      expect(mockHeadingsHandler.validateCommand).toHaveBeenCalledWith(
        expect.anything(),
        0,
        `query ${symbolTrigger}term`,
        mockActiveSugg,
        mockActiveLeaf,
      );
    });

    test('should prioritize and validate a sourced command over a prefix command', () => {
      const parser = createParser();
      const inputInfo = makeInputInfo({
        inputText: `${headingsTrigger}query ${symbolTrigger}term`,
      });

      mockSymbolHandler.validateCommand.mockReturnValue({ isValidated: true });
      mockHeadingsHandler.validateCommand.mockReturnValue({ isValidated: true });

      parser.parseInputForMode(inputInfo, mockActiveSugg, mockActiveLeaf);

      expect(mockSymbolHandler.validateCommand).toHaveBeenCalled();
      expect(mockHeadingsHandler.validateCommand).not.toHaveBeenCalled();
    });

    test('should only validate the first of multiple sourced commands', () => {
      const parser = createParser();
      const inputInfo = makeInputInfo({
        inputText: `query ${symbolTrigger}one ${relatedItemsTrigger}two`,
      });

      mockSymbolHandler.validateCommand.mockReturnValue({ isValidated: true });
      mockRelatedItemsHandler.validateCommand.mockReturnValue({ isValidated: true });

      parser.parseInputForMode(inputInfo, mockActiveSugg, mockActiveLeaf);

      expect(mockSymbolHandler.validateCommand).toHaveBeenCalled();
      expect(mockRelatedItemsHandler.validateCommand).not.toHaveBeenCalled();
    });

    test('should pass the active suggestion to sourced commands for validation', () => {
      const parser = createParser();
      const inputInfo = makeInputInfo({ inputText: `${symbolTrigger}term` });

      mockSymbolHandler.validateCommand.mockReturnValue({ isValidated: true });

      parser.parseInputForMode(inputInfo, mockActiveSugg, mockActiveLeaf);

      expect(mockSymbolHandler.validateCommand).toHaveBeenCalledWith(
        expect.anything(),
        expect.any(Number),
        'term',
        mockActiveSugg, // Verify the active suggestion is passed as context
        mockActiveLeaf,
      );
    });

    test('should not trigger a prefix command if it is not at the start of the input', () => {
      const parser = createParser();
      const inputInfo = makeInputInfo({
        inputText: `some text ${headingsTrigger}query`,
      });

      mockHeadingsHandler.validateCommand.mockReturnValue({ isValidated: true });

      parser.parseInputForMode(inputInfo, mockActiveSugg, mockActiveLeaf);

      expect(mockHeadingsHandler.validateCommand).not.toHaveBeenCalled();
      expect(inputInfo.mode).toBe(Mode.Standard);
    });
  });
});

describe('InputParser integration tests', () => {
  const excludedViewType = 'excludedViewType';
  let sut: InputParser;
  let mockApp: MockProxy<App>;
  let mockConfig: MockProxy<SwitcherPlusSettings>;
  let mockWorkspace: MockProxy<Workspace>;

  const createParser = (config: SwitcherPlusSettings) => {
    const cmdDefs = getCommandDefinitions(config);
    HandlerRegistry.reset();
    HandlerRegistry.initialize(mockApp, config, cmdDefs);
    return new InputParser(HandlerRegistry.getInstance(), config, cmdDefs);
  };

  beforeAll(() => {
    mockWorkspace = mock<Workspace>();

    mockApp = mock<App>({
      workspace: mockWorkspace,
    });

    mockConfig = mock<SwitcherPlusSettings>({
      editorListCommand: editorTrigger,
      symbolListCommand: symbolTrigger,
      symbolListActiveEditorCommand: symbolActiveTrigger,
      workspaceListCommand: workspaceTrigger,
      headingsListCommand: headingsTrigger,
      bookmarksListCommand: bookmarksTrigger,
      commandListCommand: commandTrigger,
      vaultListCommand: vaultTrigger,
      relatedItemsListCommand: relatedItemsTrigger,
      relatedItemsListActiveEditorCommand: relatedItemsActiveTrigger,
      escapeCmdChar: escapeCmdCharTrigger,
      excludeViewTypes: [excludedViewType],
      referenceViews: [],
    });

    sut = createParser(mockConfig);
  });

  test.each(unicodeInputFixture)(
    'should identify unicode triggers for input: "$input" (array data index: $#)',
    ({
      editorTrigger: prefixEditorTrigger,
      symbolTrigger: sourcedSymbolTrigger,
      input,
      expected: { mode, parsedInput },
    }) => {
      let cmdKey: keyof SwitcherPlusSettings = 'editorListCommand';
      let cmdInitialValue = mockConfig.editorListCommand;
      let cmdValue = prefixEditorTrigger;

      if (sourcedSymbolTrigger) {
        cmdKey = 'symbolListCommand';
        cmdInitialValue = mockConfig.symbolListCommand;
        cmdValue = sourcedSymbolTrigger;
      }

      // Update either editorListCommand or symbolListCommand with the passed in value
      // based on the above. This is done because the a parser instance has to be created
      // using the new mode trigger from the fixture for each test run.
      mockConfig[cmdKey] = cmdValue;
      const parser = createParser(mockConfig);

      const leaf = makeLeaf();
      const es = makeEditorSuggestion(leaf, leaf.view.file);
      const inputInfo = makeInputInfo({ inputText: input });

      parser.parseInputForMode(inputInfo, es, makeLeaf());

      const parsed = inputInfo.parsedCommand().parsedInput;
      expect(inputInfo.mode).toBe(mode);
      expect(parsed).toBe(parsedInput);

      mockConfig[cmdKey] = cmdInitialValue;
    },
  );

  test.each(makePrefixOnlyInputFixture(Mode.HeadingsList))(
    'should parse as Prefix Headings mode with both activeSugg and activeLeaf null for input: "$input" (array data index: $#)',
    ({ input, expected: { mode, isValidated, parsedInput } }) => {
      const inputInfo = makeInputInfo({ inputText: input });

      sut.parseInputForMode(inputInfo, null, null);

      expect(inputInfo.mode).toBe(mode);
      expect(inputInfo.inputText).toBe(input);

      const cmd = inputInfo.parsedCommand();
      expect(cmd.isValidated).toBe(isValidated);
      expect(cmd.parsedInput).toBe(parsedInput);
    },
  );

  test.each(makePrefixOnlyInputFixture(Mode.SymbolList))(
    'should parse as Sourced Symbol Mode using ACTIVE LEAF for input: "$input" (array data index: $#)',
    ({ input, expected: { mode, isValidated, parsedInput } }) => {
      const mockLeaf = makeLeaf();
      const inputInfo = makeInputInfo({ inputText: input });

      sut.parseInputForMode(inputInfo, null, mockLeaf);

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

  test.each(makeSourcedCmdEmbeddedInputFixture(Mode.SymbolList))(
    'should parse as Sourced Symbol Mode with EDITOR SUGGESTION for input: "$input" (array data index: $#)',
    ({ input, expected: { mode, isValidated, parsedInput } }) => {
      const leaf = makeLeaf();
      const editorSuggestion = makeEditorSuggestion(leaf, leaf.view.file);

      const inputInfo = makeInputInfo({ inputText: input });

      sut.parseInputForMode(inputInfo, editorSuggestion, null);

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

  test.each(makeSourcedCmdEmbeddedInputFixture(Mode.SymbolList))(
    'should parse as Sourced Symbol Mode with FILE SUGGESTION for input: "$input" (array data index: $#)',
    ({ input, expected: { mode, isValidated, parsedInput } }) => {
      const fileSuggestion = makeFileSuggestion(null, [[0, 0]], 0);
      const inputInfo = makeInputInfo({ inputText: input });

      sut.parseInputForMode(inputInfo, fileSuggestion, null);

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

  describe('should parse as standard mode', () => {
    test(`with excluded active view for input: "${symbolTrigger} test"`, () => {
      const mockLeaf = makeLeaf();
      const mockView = mockLeaf.view as MockProxy<View>;
      const input = `${symbolTrigger} test`;

      mockView.getViewType.mockReturnValue(excludedViewType);
      const inputInfo = makeInputInfo({ inputText: input });

      sut.parseInputForMode(inputInfo, null, mockLeaf);

      expect(inputInfo.mode).toBe(Mode.Standard);
      expect(inputInfo.inputText).toBe(input);
      expect(mockView.getViewType).toHaveBeenCalled();
    });

    test.each(standardModeInputFixture)(
      'for input: "$input" (array data index: $#)',
      ({ input, expected: { mode } }) => {
        const inputInfo = makeInputInfo({ inputText: input });

        sut.parseInputForMode(inputInfo, null, null);

        expect(inputInfo.mode).toBe(mode);
        expect(inputInfo.inputText).toBe(input);
      },
    );
  });

  describe('should ignore escaped commands triggers', () => {
    const fileSuggestion = makeFileSuggestion(null, [[0, 0]], 0);
    const mockLeaf = makeLeaf();

    test.each(makeEscapedStandardModeInputFixture())(
      'and parse to STANDARD mode for input: "$input" (array data index: $#)',
      ({ input, expected: { mode, parsedInput } }) => {
        const inputInfo = makeInputInfo({ inputText: input });

        sut.parseInputForMode(inputInfo, fileSuggestion, mockLeaf);

        expect(inputInfo.mode).toBe(mode);
        expect(inputInfo.inputText).toBe(input);
        expect(inputInfo.cleanInput).toBe(parsedInput);
      },
    );

    test.each(makeEscapedPrefixCommandInputFixture())(
      'and parse to PREFIX mode: "$expected.mode" for input: "$input" (array data index: $#)',
      ({ input, expected: { mode, parsedInput } }) => {
        const inputInfo = makeInputInfo({ inputText: input });

        sut.parseInputForMode(inputInfo, fileSuggestion, mockLeaf);

        const cmd = inputInfo.parsedCommand(mode);
        expect(inputInfo.mode).toBe(mode);
        expect(inputInfo.inputText).toBe(input);
        expect(cmd.parsedInput).toBe(parsedInput);
        expect(cmd.isValidated).toBe(true);
      },
    );

    test.each(makeEscapedSourcedCommandInputFixture())(
      'and parse to SOURCED mode: "$expected.mode" for input: "$input" (array data index: $#)',
      ({ input, expected: { mode, parsedInput } }) => {
        const inputInfo = makeInputInfo({ inputText: input });

        sut.parseInputForMode(inputInfo, fileSuggestion, mockLeaf);

        const cmd = inputInfo.parsedCommand(mode);
        expect(inputInfo.mode).toBe(mode);
        expect(inputInfo.inputText).toBe(input);
        expect(cmd.parsedInput).toBe(parsedInput);
        expect(cmd.isValidated).toBe(true);
      },
    );
  });
});
