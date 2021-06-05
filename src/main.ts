import { Plugin } from 'obsidian';
import { SwitcherPlusSettings, SwitcherPlusSettingTab } from 'src/settings';
import { createSwitcherPlus } from 'src/switcherPlus';
import { Mode, SwitcherPlus } from 'src/types';

export default class SwitcherPlusPlugin extends Plugin {
  public options: SwitcherPlusSettings;
  private modal: SwitcherPlus;

  async onload(): Promise<void> {
    const options = new SwitcherPlusSettings(this);
    await options.loadSettings();
    this.options = options;

    this.addSettingTab(new SwitcherPlusSettingTab(this.app, this, options));

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

    if (modal) {
      return modal;
    }

    modal = createSwitcherPlus(this.app, this);
    this.modal = modal;
    return modal;
  }
}
