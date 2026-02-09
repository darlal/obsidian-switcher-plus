import { Plugin } from 'obsidian';
import { SwitcherPlusSettings, SwitcherPlusSettingTab } from 'src/settings';
import {
  EmptyTabMonitor,
  MobileLauncher,
  CommandRegistrar,
  RibbonIconManager,
  getCommandDefinitions,
  CommandDefinition,
} from 'src/switcherPlus';
import { Mode } from 'src/types';

export default class SwitcherPlusPlugin extends Plugin {
  public options: SwitcherPlusSettings;
  private _commandDefinitions: CommandDefinition[];

  get commandDefinitions(): CommandDefinition[] {
    return this._commandDefinitions;
  }

  async onload(): Promise<void> {
    const options = new SwitcherPlusSettings(this);
    await options.updateDataAndLoadSettings();
    this.options = options;
    this._commandDefinitions = getCommandDefinitions(options);

    this.addSettingTab(new SwitcherPlusSettingTab(this.app, this, options));
    this.registerRibbonCommandIcons();
    this.updateLauncherButtonOverrides(true);
    CommandRegistrar.registerCommands(this, this.commandDefinitions);
  }

  onunload(): void {
    this.updateLauncherButtonOverrides(false);
  }

  registerRibbonCommandIcons(): void {
    RibbonIconManager.registerRibbonIcons(this, this.commandDefinitions);
  }

  updateLauncherButtonOverrides(isInstall: boolean): void {
    const {
      app,
      options: { mobileLauncher },
    } = this;

    // First uninstall so any previously installed qsp launcher buttons/icons
    // are removed so that they can be reinstalled if we needed.
    MobileLauncher.removeMobileLauncherOverride();
    EmptyTabMonitor.removeEmptyTabButtons(app.workspace);

    if (isInstall) {
      const modeString = mobileLauncher.modeString as keyof typeof Mode;
      const openMode = Mode[modeString];

      MobileLauncher.installMobileLauncherOverride(this, mobileLauncher, openMode);

      const commandDef = this.commandDefinitions.find((def) => def.mode === openMode);
      const buttonLabel = 'Switcher++: ' + (commandDef?.commandName ?? '');

      EmptyTabMonitor.installEmptyTabMonitor(this, {
        isEnabled: mobileLauncher.isEnabled && mobileLauncher.isEmptyTabButtonEnabled,
        buttonLabel,
        mode: openMode,
      });
    }
  }
}
