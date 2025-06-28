import { Chance } from 'chance';
import { Searcher } from 'src/search';
import { Mode, CommandSuggestion, SuggestionType, SearchQuery } from 'src/types';
import { InputInfo } from 'src/switcherPlus';
import { CommandHandler, COMMAND_PALETTE_PLUGIN_ID, Handler } from 'src/Handlers';
import { SwitcherPlusSettings } from 'src/settings/switcherPlusSettings';
import { CommandListFacetIds } from 'src/settings';
import {
  App,
  InstalledPlugin,
  InternalPlugins,
  CommandPalettePluginInstance,
  Command,
  Hotkey,
} from 'obsidian';
import {
  makeFuzzyMatch,
  commandTrigger,
  makeCommandItem,
  makeCommandSuggestion,
} from '@fixtures';
import { mock, mockFn, MockProxy, mockReset } from 'jest-mock-extended';

const chance = new Chance();
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

  mockInternalPlugins.getEnabledPluginById
    .calledWith(COMMAND_PALETTE_PLUGIN_ID)
    .mockReturnValue(mockPlugins[COMMAND_PALETTE_PLUGIN_ID].instance);

  return mockInternalPlugins;
}

describe('commandHandler', () => {
  let settings: SwitcherPlusSettings;
  let mockApp: MockProxy<App>;
  let mockInternalPlugins: MockProxy<InternalPlugins>;
  let mockCommandPalettePluginInstance: MockProxy<CommandPalettePluginInstance>;
  let mockCommands: Command[];
  let sut: CommandHandler;
  const mockFindCommand = mockFn<App['commands']['findCommand']>();
  const mockGetHotkeys = mockFn<App['hotkeyManager']['getHotkeys']>();
  const mockGetDefaultHotkeys = mockFn<App['hotkeyManager']['getDefaultHotkeys']>();
  const mockPrintHotkeyForCommand =
    mockFn<App['hotkeyManager']['printHotkeyForCommand']>();

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
        findCommand: mockFindCommand,
      },
      hotkeyManager: {
        printHotkeyForCommand: mockPrintHotkeyForCommand,
        getHotkeys: mockGetHotkeys,
        getDefaultHotkeys: mockGetDefaultHotkeys,
      },
    });

    settings = new SwitcherPlusSettings(null);
    jest.spyOn(settings, 'commandListCommand', 'get').mockReturnValue(commandTrigger);

    sut = new CommandHandler(mockApp, settings);
  });

  describe('getCommandString', () => {
    it('should return commandListCommand trigger', () => {
      expect(sut.getCommandString()).toBe(commandTrigger);
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

      const resultCommandIds = new Set(results.map((sugg) => sugg.item.id));

      expect(results).toHaveLength(mockCommands.length);
      expect(mockCommands.every((command) => resultCommandIds.has(command.id))).toBe(
        true,
      );
      expect(results.every((sugg) => sugg.type === SuggestionType.CommandList)).toBe(
        true,
      );
      expect(mockInternalPlugins.getEnabledPluginById).toHaveBeenCalledWith(
        COMMAND_PALETTE_PLUGIN_ID,
      );
    });

    test('with filter search term, it should return only matching suggestions for command list mode', () => {
      const inputInfo = new InputInfo(null, Mode.CommandList);
      const parsedInputQuerySpy = jest
        .spyOn(inputInfo, 'parsedInputQuery', 'get')
        .mockReturnValue(mock<SearchQuery>({ hasSearchTerm: true, query: null }));

      const searchSpy = jest
        .spyOn(Searcher.prototype, 'executeSearch')
        .mockImplementation((text) => {
          return text === expectedCommandName ? makeFuzzyMatch() : null;
        });

      const expectedItem = mockCommands.find(
        (command) => command.name === expectedCommandName,
      );

      const results = sut.getSuggestions(inputInfo);

      expect(results).toHaveLength(1);
      expect(results[0]).toHaveProperty('type', SuggestionType.CommandList);
      expect(results[0].item).toBe(expectedItem);
      expect(mockInternalPlugins.getEnabledPluginById).toHaveBeenCalled();

      searchSpy.mockRestore();
      parsedInputQuerySpy.mockRestore();
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

      expect(renderContentSpy).toHaveBeenCalledWith(mockParentEl, item.name, sugg.match);
      expect(mockParentEl.addClasses).toHaveBeenCalledWith(
        expect.arrayContaining(['mod-complex', 'qsp-suggestion-command']),
      );

      renderContentSpy.mockRestore();
    });

    it('should render indicator icons', () => {
      const mockFlairContainer = mock<HTMLDivElement>();
      const item = makeCommandItem();
      item.icon = 'iconName';
      const sugg = makeCommandSuggestion(item);
      sugg.isPinned = true;

      const mockParentEl = mock<HTMLElement>();
      mockParentEl.createDiv.mockReturnValue(mock<HTMLDivElement>());

      const renderIndicatorSpy = jest.spyOn(Handler.prototype, 'renderIndicator');
      const createFlairContainerSpy = jest
        .spyOn(Handler.prototype, 'createFlairContainer')
        .mockReturnValueOnce(mockFlairContainer);

      sut.renderSuggestion(sugg, mockParentEl);

      expect(renderIndicatorSpy.mock.calls).toEqual([
        [mockFlairContainer, [], item.icon],
        [mockFlairContainer, [], 'filled-pin'],
      ]);

      renderIndicatorSpy.mockRestore();
      createFlairContainerSpy.mockRestore();
    });

    it('should render optional icons', () => {
      const mockFlairContainer = mock<HTMLDivElement>();
      const item = makeCommandItem();
      const sugg = makeCommandSuggestion(item);
      sugg.isRecent = true;

      const mockParentEl = mock<HTMLElement>();
      mockParentEl.createDiv.mockReturnValue(mock<HTMLDivElement>());

      const renderOptionalIndicatorsSpy = jest.spyOn(
        Handler.prototype,
        'renderOptionalIndicators',
      );
      const createFlairContainerSpy = jest
        .spyOn(Handler.prototype, 'createFlairContainer')
        .mockReturnValueOnce(mockFlairContainer);

      sut.renderSuggestion(sugg, mockParentEl);

      expect(renderOptionalIndicatorsSpy).toHaveBeenCalledWith(
        mockParentEl,
        sugg,
        mockFlairContainer,
      );

      renderOptionalIndicatorsSpy.mockRestore();
      createFlairContainerSpy.mockRestore();
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

      expect(mockInternalPlugins.getEnabledPluginById).toHaveBeenCalled();
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

    it('should return all commands', () => {
      const recentCommandIds = new Set(['recent:commandB']);
      mockCommands = [
        makeCommandItem({ name: 'Command C', id: 'pinned:commandC' }),
        makeCommandItem({ name: 'Command B', id: 'recent:commandB' }),
        makeCommandItem({ name: 'Command A' }),
        makeCommandItem({ name: 'Command D' }),
        makeCommandItem({ name: 'Command C' }),
      ];
      mockCommandPalettePluginInstance.options.pinned = ['pinned:commandC'];

      const recentCommandIdsSpy = jest
        .spyOn(sut, 'getRecentCommandIds')
        .mockReturnValueOnce(recentCommandIds);

      const results = sut.getItems(new InputInfo(commandTrigger), true);

      const resultNames = new Set(results.map((v) => v.cmd.name));
      expect(results).toHaveLength(5);
      expect(mockCommands.every((command) => resultNames.has(command.name))).toBe(true);
      expect(results.find((v) => v.cmd.id === 'pinned:commandC').isPinned).toBe(true);
      expect(results.find((v) => v.cmd.id === 'recent:commandB').isRecent).toBe(true);

      recentCommandIdsSpy.mockRestore();
    });

    it('should order pinned commands first, then recently used', () => {
      const recentCommandIds = new Set(['recent:commandA', 'recent:commandB']);
      mockCommands = [
        makeCommandItem({ name: 'Command B', id: 'recent:commandB' }),
        makeCommandItem({ name: 'Command A', id: 'recent:commandA' }),
        makeCommandItem({ name: 'Command C' }),
        makeCommandItem({ name: 'Command Pinned 1', id: 'pinned:command1' }),
        makeCommandItem({ name: 'Command Pinned 2', id: 'pinned:command2' }),
      ];
      mockCommandPalettePluginInstance.options.pinned = [
        'pinned:command1',
        'pinned:command2',
      ];

      const recentCommandIdsSpy = jest
        .spyOn(sut, 'getRecentCommandIds')
        .mockReturnValueOnce(recentCommandIds);

      mockFindCommand.mockImplementation((id) => mockCommands.find((c) => c.id === id));

      const results = sut.getItems(new InputInfo(commandTrigger), false);

      expect(results).toHaveLength(4);
      expect(results[0].cmd.name).toBe('Command Pinned 1');
      expect(results[1].cmd.name).toBe('Command Pinned 2');
      expect(results[2].cmd.name).toBe('Command A');
      expect(results[3].cmd.name).toBe('Command B');

      recentCommandIdsSpy.mockRestore();
      mockReset(mockFindCommand);
    });

    test('should return only commands that match the active facet', () => {
      const expectedId = 'expectedCommandId';
      const expectedCommand = mock<Command>({ id: expectedId });
      const mockCommand = mock<Command>();

      const getPinnedCommandIdsSpy = jest
        .spyOn(sut, 'getPinnedCommandIds')
        .mockReturnValueOnce(new Set([expectedId]));

      const getRecentCommandIdsSpy = jest
        .spyOn(sut, 'getRecentCommandIds')
        .mockReturnValueOnce(new Set(['firstId']));

      const getActiveFacetIdsSpy = jest
        .spyOn(sut, 'getActiveFacetIds')
        .mockReturnValueOnce(new Set([CommandListFacetIds.Pinned]));

      mockFindCommand.mockImplementation((id) => {
        return id === expectedId ? expectedCommand : mockCommand;
      });

      const results = sut.getItems(new InputInfo(commandTrigger), false);

      expect(results).toHaveLength(1);
      expect(results[0].cmd).toBe(expectedCommand);
      expect(results[0].isPinned).toBe(true);

      getPinnedCommandIdsSpy.mockRestore();
      getRecentCommandIdsSpy.mockRestore();
      getActiveFacetIdsSpy.mockRestore();
      mockReset(mockFindCommand);
    });

    test('commands that are both pinned and recently used should appear in the result list once (as pinned)', () => {
      const expectedId = 'expectedCommandId';
      const expectedCommand = mock<Command>({ id: expectedId });
      const mockCommand = mock<Command>();

      const getPinnedCommandIdsSpy = jest
        .spyOn(sut, 'getPinnedCommandIds')
        .mockReturnValueOnce(new Set([expectedId]));

      const getRecentCommandIdsSpy = jest
        .spyOn(sut, 'getRecentCommandIds')
        .mockReturnValueOnce(new Set(['firstId', expectedId]));

      mockFindCommand.mockImplementation((id) => {
        return id === expectedId ? expectedCommand : mockCommand;
      });

      const results = sut.getItems(new InputInfo(commandTrigger), false);

      // First item should the expected item, both pinned and recent
      expect(results).toHaveLength(2);
      expect(results[0].cmd).toBe(expectedCommand);
      expect(results[0].isPinned).toBe(true);
      expect(results[0].isRecent).toBe(true);

      // Secon item should be the other distict recent item
      expect(results[1].cmd).toBe(mockCommand);
      expect(results[1].isRecent).toBe(true);
      expect(results[1].isPinned).toBe(false);

      getPinnedCommandIdsSpy.mockRestore();
      getRecentCommandIdsSpy.mockRestore();
      mockReset(mockFindCommand);
    });
  });

  describe('renderHotkeyForCommand', () => {
    it('should create an element for a hotkey', () => {
      const mockFlairContainer = mock<HTMLElement>();
      const keyStr = chance.word();
      const id = chance.word();

      mockGetHotkeys.mockReturnValueOnce([mock<Hotkey>()]);
      mockPrintHotkeyForCommand.calledWith(id).mockReturnValueOnce(keyStr);

      sut.renderHotkeyForCommand(id, mockApp, mockFlairContainer);

      expect(mockPrintHotkeyForCommand).toHaveBeenCalledWith(id);
      expect(mockFlairContainer.createEl).toHaveBeenCalledWith(
        'kbd',
        expect.objectContaining({ text: keyStr }),
      );
    });

    it('should not render if both custom, and default hotkeys are not defined', () => {
      const mockFlairContainer = mock<HTMLElement>();
      const id = chance.word();

      mockGetHotkeys.mockReturnValueOnce(null);
      mockGetDefaultHotkeys.mockReturnValueOnce(null);
      mockPrintHotkeyForCommand.mockClear();

      sut.renderHotkeyForCommand(id, mockApp, mockFlairContainer);

      expect(mockPrintHotkeyForCommand).not.toHaveBeenCalledWith();
      expect(mockFlairContainer.createEl).not.toHaveBeenCalledWith();
    });

    it('should log errors to the console', () => {
      const id = chance.word();
      const consoleLogSpy = jest.spyOn(console, 'log').mockReturnValueOnce();

      mockGetDefaultHotkeys.mockReturnValueOnce([mock<Hotkey>()]);

      const error = new Error('renderHotkeyForCommand unit test error');
      mockPrintHotkeyForCommand.mockImplementationOnce(() => {
        throw error;
      });

      sut.renderHotkeyForCommand(id, mockApp, null);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.any(String), id, error);

      consoleLogSpy.mockRestore();
    });
  });

  describe('saveUsageToList', () => {
    it('should add a new item to index 0', () => {
      const id = 'expected';
      const recentCommandIds = ['id A', 'id B'];

      sut.saveUsageToList(id, recentCommandIds);

      expect(recentCommandIds).toHaveLength(3);
      expect(recentCommandIds[0]).toBe(id);
    });

    it('should not add more items than are allowed by settings', () => {
      const recentCommandIds: string[] = [];
      const max = 5;
      const maxRecentSpy = jest
        .spyOn(settings, 'maxRecentCommands', 'get')
        .mockReturnValue(max);

      for (let i = 0; i < max + 5; i++) {
        sut.saveUsageToList(String(i), recentCommandIds);
      }

      expect(recentCommandIds).toHaveLength(max);

      maxRecentSpy.mockRestore();
    });

    it('should move an existing item from an old index to index 0', () => {
      const id = 'expected';
      const recentCommandIds = ['id A', id, 'id B'];

      sut.saveUsageToList(id, recentCommandIds);

      expect(recentCommandIds).toHaveLength(3);
      expect(recentCommandIds[0]).toBe(id);
    });
  });

  describe('getPinnedAndRecentCommands ordering', () => {
    beforeEach(() => {
      // Clear the array before each test
      CommandHandler.recentlyUsedCommandIds.length = 0;
      mockReset(mockFindCommand);
    });

    it('should return recent commands in descending order (most recent first) when setting is "desc"', () => {
      // Arrange
      settings.recentCommandDisplayOrder = 'desc';
      CommandHandler.recentlyUsedCommandIds.push('cmd2', 'cmd1'); // cmd2 is most recent

      mockFindCommand.mockImplementation(
        (id) => ({ id, name: `Command ${id}` }) as Command,
      );

      const getPinnedSpy = jest
        .spyOn(sut, 'getPinnedCommandIds')
        .mockReturnValue(new Set());

      // Act
      const results = sut.getPinnedAndRecentCommands(new Set());
      const resultIds = results.map((info) => info.cmd.id);

      // Assert
      expect(resultIds).toEqual(['cmd2', 'cmd1']);
      getPinnedSpy.mockRestore();
    });

    it('should return recent commands in ascending order (most recent last) when setting is "asc"', () => {
      // Arrange
      settings.recentCommandDisplayOrder = 'asc';
      CommandHandler.recentlyUsedCommandIds.push('cmd2', 'cmd1'); // cmd2 is most recent

      mockFindCommand.mockImplementation(
        (id) => ({ id, name: `Command ${id}` }) as Command,
      );
      const getPinnedSpy = jest
        .spyOn(sut, 'getPinnedCommandIds')
        .mockReturnValue(new Set());

      // Act
      const results = sut.getPinnedAndRecentCommands(new Set());
      const resultIds = results.map((info) => info.cmd.id);

      // Assert
      expect(resultIds).toEqual(['cmd1', 'cmd2']);
      getPinnedSpy.mockRestore();
    });
  });
});
