import { Mode, CommandSuggestion, SuggestionType } from 'src/types';
import { InputInfo } from 'src/switcherPlus';
import { CommandHandler, COMMAND_PALETTE_PLUGIN_ID, Handler } from 'src/Handlers';
import { SwitcherPlusSettings } from 'src/settings/switcherPlusSettings';
import {
  App,
  fuzzySearch,
  InstalledPlugin,
  InternalPlugins,
  prepareQuery,
  CommandPalettePluginInstance,
  Command,
} from 'obsidian';
import {
  makePreparedQuery,
  makeFuzzyMatch,
  commandTrigger,
  makeCommandItem,
  makeCommandSuggestion,
} from '@fixtures';
import { mock, MockProxy } from 'jest-mock-extended';

const expectedCommandName = 'Command 1';

function makeCommandPalettePluginInstall(): MockProxy<InstalledPlugin> {
  const mockInstance = mock<CommandPalettePluginInstance>({
    id: COMMAND_PALETTE_PLUGIN_ID,
    options: {
      pinned: null,
    },
  });

  return mock<InstalledPlugin>({
    enabled: true,
    instance: mockInstance,
  });
}

function makeInternalPluginList(
  commandPalettePlugin: MockProxy<InstalledPlugin>,
): MockProxy<InternalPlugins> {
  const mockPlugins = mock<Record<string, InstalledPlugin>>({
    [COMMAND_PALETTE_PLUGIN_ID]: commandPalettePlugin,
  });

  const mockInternalPlugins = mock<InternalPlugins>({ plugins: mockPlugins });

  mockInternalPlugins.getPluginById.mockImplementation((id) => mockPlugins[id]);

  return mockInternalPlugins;
}

describe('commandHandler', () => {
  let settings: SwitcherPlusSettings;
  let mockApp: MockProxy<App>;
  let mockInternalPlugins: MockProxy<InternalPlugins>;
  let mockCommandPalettePluginInstance: MockProxy<CommandPalettePluginInstance>;
  let mockCommands: Command[];
  let sut: CommandHandler;

  beforeAll(() => {
    const commandPalettePluginInstall = makeCommandPalettePluginInstall();
    mockCommandPalettePluginInstance =
      commandPalettePluginInstall.instance as MockProxy<CommandPalettePluginInstance>;

    mockCommands = [
      makeCommandItem(),
      makeCommandItem(),
      makeCommandItem(),
      makeCommandItem(),
      makeCommandItem({ name: expectedCommandName }),
    ];

    mockInternalPlugins = makeInternalPluginList(commandPalettePluginInstall);
    mockApp = mock<App>({
      internalPlugins: mockInternalPlugins,
      commands: {
        listCommands: jest.fn(() => mockCommands),
        executeCommandById: jest.fn(),
      },
    });

    settings = new SwitcherPlusSettings(null);
    jest.spyOn(settings, 'commandListCommand', 'get').mockReturnValue(commandTrigger);

    sut = new CommandHandler(mockApp, settings);
  });

  describe('commandString', () => {
    it('should return commandListCommand trigger', () => {
      expect(sut.commandString).toBe(commandTrigger);
    });
  });

  describe('validateCommand', () => {
    let inputText: string;
    let startIndex: number;
    const filterText = 'foo';

    beforeAll(() => {
      inputText = `${commandTrigger}${filterText}`;
      startIndex = commandTrigger.length;
    });

    it('should validate parsed input', () => {
      const inputInfo = new InputInfo(inputText);

      sut.validateCommand(inputInfo, startIndex, filterText, null, null);
      expect(inputInfo.mode).toBe(Mode.CommandList);

      const commandListCmd = inputInfo.parsedCommand();
      expect(commandListCmd.parsedInput).toBe(filterText);
      expect(commandListCmd.isValidated).toBe(true);
    });
  });

  describe('getSuggestions', () => {
    test('with falsy input, it should return an empty array', () => {
      const results = sut.getSuggestions(null);

      expect(results).not.toBeNull();
      expect(results).toBeInstanceOf(Array);
      expect(results).toHaveLength(0);
    });

    test('with default settings, it should return suggestions for command list mode', () => {
      const inputInfo = new InputInfo(commandTrigger);
      const results = sut.getSuggestions(inputInfo);

      expect(results).not.toBeNull();
      expect(results).toBeInstanceOf(Array);

      const resultCommandIds = new Set(results.map((sugg) => sugg.item.id));

      expect(results).toHaveLength(mockCommands.length);
      expect(mockCommands.every((command) => resultCommandIds.has(command.id))).toBe(
        true,
      );
      expect(results.every((sugg) => sugg.type === SuggestionType.CommandList)).toBe(
        true,
      );
      expect(mockInternalPlugins.getPluginById).toHaveBeenCalledWith(
        COMMAND_PALETTE_PLUGIN_ID,
      );
    });

    test('with filter search term, it should return only matching suggestions for command list mode', () => {
      const filterText = expectedCommandName;

      const expectedItem = mockCommands.find(
        (command) => command.name === expectedCommandName,
      );

      const mockPrepareQuery = jest.mocked<typeof prepareQuery>(prepareQuery);
      mockPrepareQuery.mockReturnValueOnce(makePreparedQuery(filterText));

      const mockFuzzySearch = jest.mocked<typeof fuzzySearch>(fuzzySearch);

      mockFuzzySearch.mockImplementation((_q, text: string) => {
        const match = makeFuzzyMatch();
        return text.startsWith(filterText) ? match : null;
      });

      const inputInfo = new InputInfo(`${commandTrigger}${filterText}`);
      const results = sut.getSuggestions(inputInfo);

      expect(results).toBeInstanceOf(Array);
      expect(results).toHaveLength(1);

      const onlyResult = results[0];
      expect(onlyResult).toHaveProperty('type', SuggestionType.CommandList);
      expect(onlyResult.item.id).toBe(expectedItem.id);
      expect(onlyResult.item.name).toBe(expectedItem.name);

      expect(mockFuzzySearch).toHaveBeenCalled();
      expect(mockPrepareQuery).toHaveBeenCalled();
      expect(mockInternalPlugins.getPluginById).toHaveBeenCalled();

      mockFuzzySearch.mockReset();
    });
  });

  describe('renderSuggestion', () => {
    it('should not throw an error with a null suggestion', () => {
      expect(() => sut.renderSuggestion(null, null)).not.toThrow();
    });

    it('should render a suggestion with match offsets', () => {
      const item = mockCommands[0];
      const sugg = makeCommandSuggestion(item);
      const renderContentSpy = jest.spyOn(Handler.prototype, 'renderContent');
      const mockParentEl = mock<HTMLElement>();
      mockParentEl.createDiv.mockReturnValue(mock<HTMLDivElement>());

      sut.renderSuggestion(sugg, mockParentEl);

      expect(mockParentEl.addClass).toHaveBeenCalledWith('qsp-suggestion-command');
      expect(renderContentSpy).toBeCalledWith(mockParentEl, item.name, sugg.match);

      renderContentSpy.mockRestore();
    });
  });

  describe('onChooseSuggestion', () => {
    it('should not throw an error with a null suggestion', () => {
      expect(() => sut.onChooseSuggestion(null)).not.toThrow();
    });

    it('should tell the app to execute the command with the chosen ID', () => {
      const match = makeFuzzyMatch();
      const item = mockCommands[0];

      const sugg = mock<CommandSuggestion>({ item, match });

      sut.onChooseSuggestion(sugg);

      expect(mockInternalPlugins.getPluginById).toHaveBeenCalled();
      expect(mockApp.commands.executeCommandById).toHaveBeenCalledWith(item.id);
    });
  });

  describe('getItems', () => {
    let oldCommands: Command[];
    let oldPinnedCommandIds: string[] | null;

    beforeAll(() => {
      oldCommands = mockCommands;
      oldPinnedCommandIds = mockCommandPalettePluginInstance.options.pinned;
    });

    afterAll(() => {
      mockCommands = oldCommands;
      mockCommandPalettePluginInstance.options.pinned = oldPinnedCommandIds;
    });

    it('should order commands by name', () => {
      mockCommands = [
        makeCommandItem({ name: 'Command C' }),
        makeCommandItem({ name: 'Command B' }),
        makeCommandItem({ name: 'Command A' }),
        makeCommandItem({ name: 'Command D' }),
        makeCommandItem({ name: 'Command C' }),
      ];

      const results = sut.getItems();
      expect(results).toHaveLength(5);
      expect(results[0].name).toBe('Command A');
      expect(results[1].name).toBe('Command B');
      expect(results[2].name).toBe('Command C');
      expect(results[3].name).toBe('Command C');
      expect(results[4].name).toBe('Command D');
    });

    it('should order pinned commands first', () => {
      mockCommands = [
        makeCommandItem({ name: 'Command B' }),
        makeCommandItem({ name: 'Command A' }),
        makeCommandItem({ name: 'Command Pinned 1', id: 'pinned:command1' }),
        makeCommandItem({ name: 'Command Pinned 2', id: 'pinned:command2' }),
      ];
      mockCommandPalettePluginInstance.options.pinned = [
        'pinned:command1',
        'pinned:command2',
      ];

      const results = sut.getItems();
      expect(results).toHaveLength(4);
      expect(results[0].name).toBe('Command Pinned 1');
      expect(results[1].name).toBe('Command Pinned 2');
      expect(results[2].name).toBe('Command A');
      expect(results[3].name).toBe('Command B');
    });
  });
});
