import { Plugin } from 'obsidian';
import { SwitcherPlusSettings, SwitcherPlusSettingTab } from 'src/settings';
import { createSwitcherPlus } from 'src/switcherPlus';
import { Mode } from 'src/types';

export default class SwitcherPlusPlugin extends Plugin {
  public options: SwitcherPlusSettings;

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
    this.registerCommand(
      'switcher-plus:open-workspaces',
      'Open in Workspaces Mode',
      Mode.WorkspaceList,
    );
  }

  registerCommand(id: string, name: string, mode: Mode): void {
    this.addCommand({
      id,
      name,
      hotkeys: [],
      checkCallback: (checking) => {
        // modal needs to be created dynamically (same as system switcher)
        // as system options are evaluated in the modal constructor
        const modal = createSwitcherPlus(this.app, this);
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
}
