import { Chance } from 'chance';
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
  Hotkey,
} from 'obsidian';
import {
  makePreparedQuery,
  makeFuzzyMatch,
  commandTrigger,
  makeCommandItem,
  makeCommandSuggestion,
} from '@fixtures';
import { mock, mockFn, MockProxy } from 'jest-mock-extended';

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
      expect(mockInternalPlugins.getEnabledPluginById).toHaveBeenCalledWith(
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
      expect(mockInternalPlugins.getEnabledPluginById).toHaveBeenCalled();

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

    it('should return empty array if items cannot be found', () => {
      const getInitialCommandListSpy = jest
        .spyOn(sut, 'getInitialCommandList')
        .mockReturnValueOnce(null);

      const results = sut.getItems(false, null);

      expect(results).toBeInstanceOf(Array);
      expect(results).toHaveLength(0);

      getInitialCommandListSpy.mockRestore();
    });

    it('should return all commands', () => {
      const recentCommandIds = ['recent:commandB'];
      mockCommands = [
        makeCommandItem({ name: 'Command C', id: 'pinned:commandC' }),
        makeCommandItem({ name: 'Command B', id: 'recent:commandB' }),
        makeCommandItem({ name: 'Command A' }),
        makeCommandItem({ name: 'Command D' }),
        makeCommandItem({ name: 'Command C' }),
      ];
      mockCommandPalettePluginInstance.options.pinned = ['pinned:commandC'];

      const results = sut.getItems(true, recentCommandIds);

      const resultNames = new Set(results.map((v) => v.cmd.name));
      expect(results).toHaveLength(5);
      expect(mockCommands.every((command) => resultNames.has(command.name))).toBe(true);
      expect(results.find((v) => v.cmd.id === 'pinned:commandC').isPinned).toBe(true);
      expect(results.find((v) => v.cmd.id === 'recent:commandB').isRecent).toBe(true);
    });

    it('should order pinned commands first, then recently used', () => {
      const recentCommandIds = ['recent:commandA', 'recent:commandB'];
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

      mockFindCommand.mockImplementation((id) => mockCommands.find((c) => c.id === id));

      const results = sut.getItems(false, recentCommandIds);

      expect(results).toHaveLength(4);
      expect(results[0].cmd.name).toBe('Command Pinned 1');
      expect(results[1].cmd.name).toBe('Command Pinned 2');
      expect(results[2].cmd.name).toBe('Command A');
      expect(results[3].cmd.name).toBe('Command B');

      mockFindCommand.mockReset();
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
      mockPrintHotkeyForCommand.mockImplementationOnce(() => {
        throw new Error('renderHotkeyForCommand unit test error');
      });

      sut.renderHotkeyForCommand(id, mockApp, null);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.any(String),
        id,
        expect.anything(),
      );

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

    it('should move an existing item from an old index to index 0', () => {
      const id = 'expected';
      const recentCommandIds = ['id A', id, 'id B'];

      sut.saveUsageToList(id, recentCommandIds);

      expect(recentCommandIds).toHaveLength(3);
      expect(recentCommandIds[0]).toBe(id);
    });
  });
});
