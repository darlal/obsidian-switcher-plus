import { Plugin } from 'obsidian';
import { SwitcherPlusSettings, SwitcherPlusSettingTab } from 'src/settings';
import {
  SwitcherPlusModal,
  EmptyTabMonitor,
  MobileLauncher,
  CommandRegistrar,
  getCommandDefinitions,
  CommandDefinition,
} from 'src/switcherPlus';
import { Mode } from 'src/types';

export default class SwitcherPlusPlugin extends Plugin {
  public options: SwitcherPlusSettings;
  private _commandDefinitions: CommandDefinition[];
  private ribbonIconEls: Map<string, HTMLElement> = new Map();

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
    this.ribbonIconEls.forEach((el) => el.remove());
    this.ribbonIconEls.clear();

    const commandDataByMode = this.commandDefinitions.reduce(
      (acc, curr) => {
        acc[curr.mode] = curr;
        return acc;
      },
      {} as Record<Mode, CommandDefinition>,
    );

    this.options.enabledRibbonCommands.forEach((command) => {
      const data = commandDataByMode[Mode[command]];

      if (data) {
        const iconEl = this.addRibbonIcon(data.iconId, data.commandName, () => {
          SwitcherPlusModal.createAndOpen(this.app, this, data.mode);
        });
        this.ribbonIconEls.set(data.commandId, iconEl);
      }
    });
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
      const onclickListener = () => {
        if (openMode) {
          SwitcherPlusModal.createAndOpen(this.app, this, openMode);
        }
      };

      MobileLauncher.installMobileLauncherOverride(app, mobileLauncher, onclickListener);

      const commandDef = this.commandDefinitions.find((def) => def.mode === openMode);
      const buttonLabel = 'Switcher++: ' + (commandDef?.commandName ?? '');

      EmptyTabMonitor.installEmptyTabMonitor(this, {
        isEnabled: mobileLauncher.isEnabled && mobileLauncher.isEmptyTabButtonEnabled,
        buttonLabel,
        onclickListener,
      });
    }
  }
}
