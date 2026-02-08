import { Plugin } from 'obsidian';
import { SwitcherPlusSettings, SwitcherPlusSettingTab } from 'src/settings';
import {
  createSwitcherPlus,
  EmptyTabMonitor,
  MobileLauncher,
  getCommandDefinitions,
  CommandDefinition,
} from 'src/switcherPlus';
import { Mode, SessionOpts } from 'src/types';

export default class SwitcherPlusPlugin extends Plugin {
  public options: SwitcherPlusSettings;
  private commandDefinitions: CommandDefinition[];
  private ribbonIconEls: Map<string, HTMLElement> = new Map();

  async onload(): Promise<void> {
    const options = new SwitcherPlusSettings(this);
    await options.updateDataAndLoadSettings();
    this.options = options;

    this.commandDefinitions = getCommandDefinitions(options);

    this.addSettingTab(new SwitcherPlusSettingTab(this.app, this, options));
    this.registerRibbonCommandIcons();
    this.updateLauncherButtonOverrides(true);

    this.commandDefinitions.forEach((def) => {
      const sessionOpts = def.parserCommand.useActiveEditorAsSource
        ? { useActiveEditorAsSource: true }
        : undefined;
      this.registerCommand(
        def.commandId,
        def.commandName,
        def.mode,
        def.iconId,
        sessionOpts,
      );
    });
  }

  onunload(): void {
    this.updateLauncherButtonOverrides(false);
  }

  registerCommand(
    id: string,
    name: string,
    mode: Mode,
    iconId?: string,
    sessionOpts?: Pick<SessionOpts, 'useActiveEditorAsSource'>,
  ): void {
    this.addCommand({
      id,
      name,
      icon: iconId,
      checkCallback: (checking) => {
        return this.createModalAndOpen(mode, checking, sessionOpts);
      },
    });
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
          this.createModalAndOpen(data.mode, false);
        });
        this.ribbonIconEls.set(data.commandId, iconEl);
      }
    });
  }

  createModalAndOpen(
    mode: Mode,
    isChecking: boolean,
    sessionOpts?: Pick<SessionOpts, 'useActiveEditorAsSource'>,
  ): boolean {
    if (!isChecking) {
      // modal needs to be created dynamically (same as system switcher)
      // as system options are evaluated in the modal constructor
      const modal = createSwitcherPlus(this.app, this);
      if (!modal) {
        return false;
      }

      const opts: SessionOpts = Object.assign({ mode }, sessionOpts);
      modal.openInMode(opts);
    }

    return true;
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
          this.createModalAndOpen(openMode, false);
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
