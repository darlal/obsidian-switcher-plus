import { SwitcherPlusModal } from './switcherPlus';
import { CommandDefinition } from './commandDefinitions';
import { Mode } from 'src/types';
import SwitcherPlusPlugin from 'src/main';

/**
 * Manages ribbon icon registration and lifecycle for the Switcher++ plugin.
 */
export class RibbonIconManager {
  private static iconEls: Map<string, HTMLElement> = new Map();

  /**
   * Register ribbon icons for each enabled command.
   * Removes any previously registered icons before adding new ones.
   * @param plugin - The Switcher++ plugin instance used to register ribbon icons.
   * @param definitions - All command definitions (filtered by enabledRibbonCommands setting).
   */
  static registerRibbonIcons(
    plugin: SwitcherPlusPlugin,
    definitions: CommandDefinition[],
  ): void {
    RibbonIconManager.iconEls.forEach((el) => el.remove());
    RibbonIconManager.iconEls.clear();

    const commandDataByMode = definitions.reduce(
      (acc, curr) => {
        acc[curr.mode] = curr;
        return acc;
      },
      {} as Record<Mode, CommandDefinition>,
    );

    plugin.options.enabledRibbonCommands.forEach((command) => {
      const data = commandDataByMode[Mode[command]];

      if (data) {
        const iconEl = plugin.addRibbonIcon(data.iconId, data.commandName, () => {
          SwitcherPlusModal.createAndOpen(plugin.app, plugin, data.mode);
        });
        RibbonIconManager.iconEls.set(data.commandId, iconEl);
      }
    });
  }
}
