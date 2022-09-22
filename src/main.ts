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
      'lucide-file-edit',
    );
    this.registerCommand(
      'switcher-plus:open-symbols',
      'Open in Symbol Mode',
      Mode.SymbolList,
      'lucide-dollar-sign',
    );
    this.registerCommand(
      'switcher-plus:open-workspaces',
      'Open in Workspaces Mode',
      Mode.WorkspaceList,
      'lucide-album',
    );
    this.registerCommand(
      'switcher-plus:open-headings',
      'Open in Headings Mode',
      Mode.HeadingsList,
      'lucide-file-search',
    );
    this.registerCommand(
      'switcher-plus:open-starred',
      'Open in Starred Mode',
      Mode.StarredList,
      'star',
    );
    this.registerCommand(
      'switcher-plus:open-commands',
      'Open in Commands Mode',
      Mode.CommandList,
      'run-command',
    );
    this.registerCommand(
      'switcher-plus:open-related-items',
      'Open in Related Items Mode',
      Mode.RelatedItemsList,
      'lucide-file-plus-2',
    );
  }

  registerCommand(id: string, name: string, mode: Mode, iconId?: string): void {
    this.addCommand({
      id,
      name,
      icon: iconId,
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
