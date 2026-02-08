import { mock, MockProxy, mockReset } from 'jest-mock-extended';
import { Chance } from 'chance';
import { App } from 'obsidian';
import SwitcherPlusPlugin from 'src/main';
import { SwitcherPlusModal } from 'src/switcherPlus/switcherPlus';
import { CommandRegistrar } from 'src/switcherPlus/commandRegistrar';
import { CommandDefinition } from 'src/switcherPlus/commandDefinitions';
import { Mode } from 'src/types';

const chance = new Chance();

function makeDefinition(overrides?: Partial<CommandDefinition>): CommandDefinition {
  return {
    commandId: chance.string(),
    commandName: chance.sentence({ words: 3 }),
    iconId: chance.string(),
    mode: Mode.Standard,
    handlerClass: null,
    parserCommand: {
      type: 'none',
      getCommandStr: () => '',
    },
    ...overrides,
  };
}

describe('CommandRegistrar', () => {
  let mockApp: MockProxy<App>;
  let mockPlugin: MockProxy<SwitcherPlusPlugin>;
  let createAndOpenSpy: jest.SpyInstance;

  beforeAll(() => {
    mockApp = mock<App>();
    mockPlugin = mock<SwitcherPlusPlugin>({ app: mockApp });
  });

  beforeEach(() => {
    mockReset(mockPlugin);
    mockPlugin.app = mockApp;

    createAndOpenSpy = jest
      .spyOn(SwitcherPlusModal, 'createAndOpen')
      .mockReturnValue(true);
  });

  afterEach(() => {
    createAndOpenSpy.mockRestore();
  });

  describe('registerCommands', () => {
    it('should call addCommand once for each definition', () => {
      const definitions = [makeDefinition(), makeDefinition(), makeDefinition()];

      CommandRegistrar.registerCommands(mockPlugin, definitions);

      expect(mockPlugin.addCommand).toHaveBeenCalledTimes(definitions.length);
    });

    it('should register each command with correct id, name, and icon from the definition', () => {
      const def = makeDefinition();

      CommandRegistrar.registerCommands(mockPlugin, [def]);

      expect(mockPlugin.addCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          id: def.commandId,
          name: def.commandName,
          icon: def.iconId,
        }),
      );
    });

    it('should return true without calling createAndOpen when checkCallback is called with checking=true', () => {
      const def = makeDefinition();

      CommandRegistrar.registerCommands(mockPlugin, [def]);

      const registeredCommand = mockPlugin.addCommand.mock.calls[0][0];
      const result = (registeredCommand.checkCallback as (checking: boolean) => boolean)(
        true,
      );

      expect(result).toBe(true);
      expect(createAndOpenSpy).not.toHaveBeenCalled();
    });

    it('should call SwitcherPlusModal.createAndOpen with correct arguments when checkCallback is called with checking=false', () => {
      const def = makeDefinition({ mode: Mode.EditorList });

      CommandRegistrar.registerCommands(mockPlugin, [def]);

      const registeredCommand = mockPlugin.addCommand.mock.calls[0][0];
      const result = (registeredCommand.checkCallback as (checking: boolean) => boolean)(
        false,
      );

      expect(createAndOpenSpy).toHaveBeenCalledWith(
        mockApp,
        mockPlugin,
        Mode.EditorList,
        undefined,
      );
      expect(result).toBe(true);
    });

    it('should pass sessionOpts with useActiveEditorAsSource when parserCommand.useActiveEditorAsSource is true', () => {
      const def = makeDefinition({
        mode: Mode.SymbolList,
        parserCommand: {
          type: 'prefix',
          getCommandStr: () => '',
          useActiveEditorAsSource: true,
        },
      });

      CommandRegistrar.registerCommands(mockPlugin, [def]);

      const registeredCommand = mockPlugin.addCommand.mock.calls[0][0];
      (registeredCommand.checkCallback as (checking: boolean) => boolean)(false);

      expect(createAndOpenSpy).toHaveBeenCalledWith(
        mockApp,
        mockPlugin,
        Mode.SymbolList,
        {
          useActiveEditorAsSource: true,
        },
      );
    });

    it('should pass undefined as sessionOpts when parserCommand.useActiveEditorAsSource is falsy', () => {
      const def = makeDefinition({
        mode: Mode.HeadingsList,
        parserCommand: {
          type: 'prefix',
          getCommandStr: () => '',
        },
      });

      CommandRegistrar.registerCommands(mockPlugin, [def]);

      const registeredCommand = mockPlugin.addCommand.mock.calls[0][0];
      (registeredCommand.checkCallback as (checking: boolean) => boolean)(false);

      expect(createAndOpenSpy).toHaveBeenCalledWith(
        mockApp,
        mockPlugin,
        Mode.HeadingsList,
        undefined,
      );
    });
  });
});
