import { SwitcherPlusModal } from './switcherPlus';
import { CommandDefinition } from './commandDefinitions';
import SwitcherPlusPlugin from 'src/main';

/**
 * Registers Obsidian commands for each {@link CommandDefinition}.
 * Follows the same static-method class pattern as {@link MobileLauncher} and
 * {@link EmptyTabMonitor}.
 */
export class CommandRegistrar {
  /**
   * Register an Obsidian command for every definition provided.
   * Each command opens the switcher modal in the corresponding mode.
   * @param plugin - The Switcher++ plugin instance used to register commands.
   * @param definitions - The command definitions to register.
   */
  static registerCommands(
    plugin: SwitcherPlusPlugin,
    definitions: CommandDefinition[],
  ): void {
    definitions.forEach((def) => {
      const sessionOpts = def.parserCommand.useActiveEditorAsSource
        ? { useActiveEditorAsSource: true }
        : undefined;

      plugin.addCommand({
        id: def.commandId,
        name: def.commandName,
        icon: def.iconId,
        checkCallback: (checking) => {
          if (checking) {
            return true;
          }

          return SwitcherPlusModal.createAndOpen(
            plugin.app,
            plugin,
            def.mode,
            sessionOpts,
          );
        },
      });
    });
  }
}
