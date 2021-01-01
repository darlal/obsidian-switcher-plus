import { Plugin } from 'obsidian';
import { Settings } from 'src/settings';
import SettingTab from 'src/settings/settingTab';
import { createSwitcherPlus } from './switcherPlus';
import { Mode, SwitcherPlus } from 'src/types';

export default class SwitcherPlusPlugin extends Plugin {
  private settings: Settings;
  private modal: SwitcherPlus;

  async onload(): Promise<void> {
    const settings = new Settings(this);
    await settings.loadSettings();
    this.settings = settings;

    this.addSettingTab(new SettingTab(this.app, this, settings));

    this.registerCommand('switcher-plus:open', 'Open', Mode.Standard);
    this.registerCommand(
      'switcher-plus:open-editors',
      'Open in Editor Mode',
      Mode.EditorList,
    );
    this.registerCommand(
      'switcher-plus:open-symbols',
      'Open in Symbol Mode',
      Mode.SymbolList,
    );
  }

  onunload(): void {
    this.modal = null;
  }

  registerCommand(id: string, name: string, mode: Mode): void {
    this.addCommand({
      id,
      name,
      hotkeys: [],
      checkCallback: (checking) => {
        const modal = this.getModal();
        if (modal) {
          if (!checking) {
            modal.openInMode(mode);
          }

          return true;
        }

        return false;
      },
    });
  }

  private getModal(): SwitcherPlus {
    let { modal } = this;
    const { app, settings } = this;

    if (modal) {
      return modal;
    }

    modal = createSwitcherPlus(app, settings);
    this.modal = modal;
    return modal;
  }
}
