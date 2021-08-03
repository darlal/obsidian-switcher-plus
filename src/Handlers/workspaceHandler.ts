import { getInternalPluginById } from 'src/utils';
import { Mode, WorkspaceInfo, WorkspaceSuggestion } from 'src/types';
import { SwitcherPlusSettings } from 'src/settings';
import { InputInfo } from 'src/switcherPlus/inputInfo';
import {
  App,
  fuzzySearch,
  InstalledPlugin,
  renderResults,
  SearchResult,
  sortSearchResults,
  WorkspacesPluginInstance,
} from 'obsidian';

export const WORKSPACE_PLUGIN_ID = 'workspaces';

export class WorkspaceHandler {
  constructor(private app: App, private settings: SwitcherPlusSettings) {}

  validateCommand(inputInfo: InputInfo, index: number, filterText: string): void {
    const { workspaceCmd } = inputInfo;

    if (this.isWorkspacesPluginEnabled()) {
      inputInfo.mode = Mode.WorkspaceList;
      workspaceCmd.index = index;
      workspaceCmd.parsedInput = filterText;
      workspaceCmd.isValidated = true;
    }
  }

  getSuggestions(inputInfo: InputInfo): WorkspaceSuggestion[] {
    const suggestions: WorkspaceSuggestion[] = [];

    if (inputInfo) {
      inputInfo.buildSearchQuery();
      const { hasSearchTerm, prepQuery } = inputInfo.searchQuery;
      const items = this.getItems();

      items.forEach((item) => {
        let shouldPush = true;
        let match: SearchResult = null;

        if (hasSearchTerm) {
          match = fuzzySearch(prepQuery, item.id);
          shouldPush = !!match;
        }

        if (shouldPush) {
          suggestions.push({ type: 'workspace', item, match });
        }
      });

      if (hasSearchTerm) {
        sortSearchResults(suggestions);
      }
    }

    return suggestions;
  }

  renderSuggestion(sugg: WorkspaceSuggestion, parentEl: HTMLElement): void {
    if (sugg) {
      renderResults(parentEl, sugg.item.id, sugg.match);
    }
  }

  onChooseSuggestion(sugg: WorkspaceSuggestion): void {
    if (sugg) {
      const { id } = sugg.item;
      const pluginInstance = this.getSystemWorkspacesPluginInstance();

      if (typeof pluginInstance['loadWorkspace'] === 'function') {
        pluginInstance.loadWorkspace(id);
      }
    }
  }

  private getItems(): WorkspaceInfo[] {
    const items: WorkspaceInfo[] = [];
    const workspaces = this.getSystemWorkspacesPluginInstance()?.workspaces;

    if (workspaces) {
      Object.keys(workspaces).forEach((id) => items.push({ id, type: 'workspaceInfo' }));
    }

    return items;
  }

  private isWorkspacesPluginEnabled(): boolean {
    const plugin = this.getSystemWorkspacesPlugin();
    return plugin?.enabled;
  }

  private getSystemWorkspacesPlugin(): InstalledPlugin {
    return getInternalPluginById(this.app, WORKSPACE_PLUGIN_ID);
  }

  private getSystemWorkspacesPluginInstance(): WorkspacesPluginInstance {
    const workspacesPlugin = this.getSystemWorkspacesPlugin();
    return workspacesPlugin?.instance as WorkspacesPluginInstance;
  }
}
