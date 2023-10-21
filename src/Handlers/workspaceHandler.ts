import { getInternalEnabledPluginById } from 'src/utils';
import {
  AnySuggestion,
  Mode,
  SessionOpts,
  SuggestionType,
  WorkspaceInfo,
  WorkspaceSuggestion,
} from 'src/types';
import { InputInfo, ParsedCommand } from 'src/switcherPlus';
import {
  fuzzySearch,
  SearchResult,
  sortSearchResults,
  WorkspaceLeaf,
  WorkspacesPluginInstance,
} from 'obsidian';
import { Handler } from './handler';

export const WORKSPACE_PLUGIN_ID = 'workspaces';

export class WorkspaceHandler extends Handler<WorkspaceSuggestion> {
  getCommandString(_sessionOpts?: SessionOpts): string {
    return this.settings?.workspaceListCommand;
  }

  validateCommand(
    inputInfo: InputInfo,
    index: number,
    filterText: string,
    _activeSuggestion: AnySuggestion,
    _activeLeaf: WorkspaceLeaf,
  ): ParsedCommand {
    const cmd = inputInfo.parsedCommand(Mode.WorkspaceList);

    if (this.getEnabledWorkspacesPluginInstance()) {
      inputInfo.mode = Mode.WorkspaceList;

      cmd.index = index;
      cmd.parsedInput = filterText;
      cmd.isValidated = true;
    }

    return cmd;
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
          suggestions.push({ type: SuggestionType.WorkspaceList, item, match });
        }
      });

      if (hasSearchTerm) {
        sortSearchResults(suggestions);
      }
    }

    return suggestions;
  }

  renderSuggestion(sugg: WorkspaceSuggestion, parentEl: HTMLElement): boolean {
    let handled = false;
    if (sugg) {
      this.addClassesToSuggestionContainer(parentEl, ['qsp-suggestion-workspace']);
      this.renderContent(parentEl, sugg.item.id, sugg.match);
      handled = true;
    }

    return handled;
  }

  onChooseSuggestion(
    sugg: WorkspaceSuggestion,
    _evt: MouseEvent | KeyboardEvent,
  ): boolean {
    let handled = false;
    if (sugg) {
      const { id } = sugg.item;
      const pluginInstance = this.getEnabledWorkspacesPluginInstance();

      if (pluginInstance) {
        pluginInstance.loadWorkspace(id);
      }

      handled = true;
    }

    return handled;
  }

  override onNoResultsCreateAction(
    inputInfo: InputInfo,
    _evt: MouseEvent | KeyboardEvent,
  ): boolean {
    const pluginInstance = this.getEnabledWorkspacesPluginInstance();

    if (pluginInstance) {
      const input = inputInfo.parsedCommand(Mode.WorkspaceList)?.parsedInput;

      // create a new workspace and set it active
      pluginInstance.saveWorkspace(input);
      pluginInstance.setActiveWorkspace(input);
    }

    return true;
  }

  private getItems(): WorkspaceInfo[] {
    const items: WorkspaceInfo[] = [];
    const workspaces = this.getEnabledWorkspacesPluginInstance()?.workspaces;

    if (workspaces) {
      Object.keys(workspaces).forEach((id) => items.push({ id, type: 'workspaceInfo' }));
    }

    return items.sort((a, b) => a.id.localeCompare(b.id));
  }

  getEnabledWorkspacesPluginInstance(): WorkspacesPluginInstance {
    return getInternalEnabledPluginById(
      this.app,
      WORKSPACE_PLUGIN_ID,
    ) as WorkspacesPluginInstance;
  }
}
