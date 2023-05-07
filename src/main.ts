import { Plugin } from 'obsidian';
import { SwitcherPlusSettings, SwitcherPlusSettingTab } from 'src/settings';
import { createSwitcherPlus } from 'src/switcherPlus';
import { Mode } from 'src/types';

type CommandInfo = {
  id: string;
  name: string;
  mode: Mode;
  iconId: string;
  ribbonIconEl: HTMLElement;
};

const COMMAND_DATA: CommandInfo[] = [
  {
    id: 'switcher-plus:open',
    name: 'Open in Standard Mode',
    mode: Mode.Standard,
    iconId: 'lucide-search',
    ribbonIconEl: null,
  },
  {
    id: 'switcher-plus:open-editors',
    name: 'Open in Editor Mode',
    mode: Mode.EditorList,
    iconId: 'lucide-file-edit',
    ribbonIconEl: null,
  },
  {
    id: 'switcher-plus:open-symbols',
    name: 'Open Symbols for the active editor',
    mode: Mode.SymbolList,
    iconId: 'lucide-dollar-sign',
    ribbonIconEl: null,
  },
  {
    id: 'switcher-plus:open-workspaces',
    name: 'Open in Workspaces Mode',
    mode: Mode.WorkspaceList,
    iconId: 'lucide-album',
    ribbonIconEl: null,
  },
  {
    id: 'switcher-plus:open-headings',
    name: 'Open in Headings Mode',
    mode: Mode.HeadingsList,
    iconId: 'lucide-file-search',
    ribbonIconEl: null,
  },
  {
    // Note: leaving this id with the old starred plugin name so that user
    // don't have to update their hotkey mappings when they upgrade
    id: 'switcher-plus:open-starred',
    name: 'Open in Bookmarks Mode',
    mode: Mode.BookmarksList,
    iconId: 'lucide-bookmark',
    ribbonIconEl: null,
  },
  {
    id: 'switcher-plus:open-commands',
    name: 'Open in Commands Mode',
    mode: Mode.CommandList,
    iconId: 'run-command',
    ribbonIconEl: null,
  },
  {
    id: 'switcher-plus:open-related-items',
    name: 'Open Related Items for the active editor',
    mode: Mode.RelatedItemsList,
    iconId: 'lucide-file-plus-2',
    ribbonIconEl: null,
  },
];

export default class SwitcherPlusPlugin extends Plugin {
  public options: SwitcherPlusSettings;

  async onload(): Promise<void> {
    const options = new SwitcherPlusSettings(this);
    await options.updateDataAndLoadSettings();
    this.options = options;

    this.addSettingTab(new SwitcherPlusSettingTab(this.app, this, options));
    this.registerRibbonCommandIcons();

    COMMAND_DATA.forEach(({ id, name, mode, iconId }) => {
      this.registerCommand(id, name, mode, iconId);
    });
  }

  registerCommand(id: string, name: string, mode: Mode, iconId?: string): void {
    this.addCommand({
      id,
      name,
      icon: iconId,
      hotkeys: [],
      checkCallback: (checking) => {
        return this.createModalAndOpen(mode, checking);
      },
    });
  }

  registerRibbonCommandIcons(): void {
    // remove any registered icons
    COMMAND_DATA.forEach((data) => {
      data.ribbonIconEl?.remove();
      data.ribbonIconEl = null;
    });

    // map to keyed object
    const commandDataByMode = COMMAND_DATA.reduce((acc, curr) => {
      acc[curr.mode] = curr;
      return acc;
    }, {} as Record<Mode, CommandInfo>);

    this.options.enabledRibbonCommands.forEach((command) => {
      const data = commandDataByMode[Mode[command]];

      if (data) {
        data.ribbonIconEl = this.addRibbonIcon(data.iconId, data.name, () => {
          this.createModalAndOpen(data.mode, false);
        });
      }
    });
  }

  createModalAndOpen(mode: Mode, isChecking: boolean): boolean {
    // modal needs to be created dynamically (same as system switcher)
    // as system options are evaluated in the modal constructor
    const modal = createSwitcherPlus(this.app, this);
    if (!modal) {
      return false;
    }

    if (!isChecking) {
      modal.openInMode(mode);
    }

    return true;
  }
}
