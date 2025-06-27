import { getInternalEnabledPluginById } from 'src/utils';
import { Searcher } from 'src/search';
import { InputInfo, ParsedCommand } from 'src/switcherPlus';
import { CommandListFacetIds } from 'src/settings';
import {
  AnySuggestion,
  Mode,
  CommandSuggestion,
  SuggestionType,
  SessionOpts,
} from 'src/types';
import { Handler } from './handler';
import {
  SearchResult,
  sortSearchResults,
  WorkspaceLeaf,
  CommandPalettePluginInstance,
  Command,
  App,
} from 'obsidian';

export const COMMAND_PALETTE_PLUGIN_ID = 'command-palette';
export type CommandInfo = { cmd: Command; isPinned: boolean; isRecent: boolean };

export class CommandHandler extends Handler<CommandSuggestion> {
  static recentlyUsedCommandIds: string[] = [];

  getCommandString(_sessionOpts?: SessionOpts): string {
    return this.settings?.commandListCommand;
  }

  validateCommand(
    inputInfo: InputInfo,
    index: number,
    filterText: string,
    _activeSuggestion: AnySuggestion,
    _activeLeaf: WorkspaceLeaf,
  ): ParsedCommand {
    const cmd = inputInfo.parsedCommand(Mode.CommandList);

    if (this.getEnabledCommandPalettePluginInstance()) {
      inputInfo.mode = Mode.CommandList;

      cmd.index = index;
      cmd.parsedInput = filterText;
      cmd.isValidated = true;
    }

    return cmd;
  }

  getSuggestions(inputInfo: InputInfo): CommandSuggestion[] {
    const suggestions: CommandSuggestion[] = [];

    if (inputInfo) {
      const { query, hasSearchTerm } = inputInfo.parsedInputQuery;
      const searcher = Searcher.create(query);
      const itemsInfo = this.getItems(inputInfo, hasSearchTerm);

      itemsInfo.forEach((info) => {
        let shouldPush = true;
        let match: SearchResult = null;

        if (hasSearchTerm) {
          ({ match } = searcher.searchWithFallback(info.cmd.name));
          shouldPush = !!match;
        }

        if (shouldPush) {
          suggestions.push(this.createSuggestion(info, match));
        }
      });

      if (hasSearchTerm) {
        sortSearchResults(suggestions);
      }
    }

    return suggestions;
  }

  renderSuggestion(sugg: CommandSuggestion, parentEl: HTMLElement): boolean {
    let handled = false;
    if (sugg) {
      const { item, match, isPinned, isRecent } = sugg;
      this.addClassesToSuggestionContainer(parentEl, ['qsp-suggestion-command']);
      this.renderContent(parentEl, item.name, match);

      const flairContainerEl = this.createFlairContainer(parentEl);
      this.renderHotkeyForCommand(item.id, this.app, flairContainerEl);

      if (item.icon) {
        this.renderIndicator(flairContainerEl, [], item.icon);
      }

      if (isPinned) {
        this.renderIndicator(flairContainerEl, [], 'filled-pin');
      } else if (isRecent) {
        this.renderOptionalIndicators(parentEl, sugg, flairContainerEl);
      }

      handled = true;
    }

    return handled;
  }

  renderHotkeyForCommand(id: string, app: App, flairContainerEl: HTMLElement): void {
    try {
      const { hotkeyManager } = app;

      if (hotkeyManager.getHotkeys(id) || hotkeyManager.getDefaultHotkeys(id)) {
        const hotkeyStr = hotkeyManager.printHotkeyForCommand(id);

        if (hotkeyStr?.length) {
          flairContainerEl.createEl('kbd', {
            cls: 'suggestion-hotkey',
            text: hotkeyStr,
          });
        }
      }
    } catch (err) {
      console.log('Switcher++: error rendering hotkey for command id: ', id, err);
    }
  }

  onChooseSuggestion(sugg: CommandSuggestion): boolean {
    let handled = false;
    if (sugg) {
      const { item } = sugg;
      this.app.commands.executeCommandById(item.id);
      this.saveUsageToList(item.id, CommandHandler.recentlyUsedCommandIds);
      handled = true;
    }

    return handled;
  }

  saveUsageToList(commandId: string, recentCommandIds: string[]): void {
    if (recentCommandIds) {
      const oldIndex = recentCommandIds.indexOf(commandId);
      if (oldIndex > -1) {
        recentCommandIds.splice(oldIndex, 1);
      }

      recentCommandIds.unshift(commandId);
      recentCommandIds.splice(25);
    }
  }

  getItems(inputInfo: InputInfo, includeAllCommands: boolean): CommandInfo[] {
    let items: CommandInfo[] = [];
    const activeFacetIds = this.getActiveFacetIds(inputInfo);
    const hasActiveFacets = !!activeFacetIds.size;

    if (hasActiveFacets) {
      items = this.getPinnedAndRecentCommands(activeFacetIds);
    } else if (includeAllCommands) {
      items = this.getAllCommands();
    } else {
      const pinnedAndRecents = this.getPinnedAndRecentCommands(activeFacetIds);
      items = pinnedAndRecents.length ? pinnedAndRecents : this.getAllCommands();
    }

    return items;
  }

  getPinnedAndRecentCommands(activeFacetIds: Set<string>): CommandInfo[] {
    const items: CommandInfo[] = [];
    const pinnedIdsSet = this.getPinnedCommandIds();
    const recentIdsSet = this.getRecentCommandIds();

    const findCommandInfo = (id: string) => {
      let cmdInfo: CommandInfo = null;
      const cmd = this.app.commands.findCommand(id);

      if (cmd) {
        cmdInfo = {
          isPinned: pinnedIdsSet.has(id),
          isRecent: recentIdsSet.has(id),
          cmd,
        };
      }

      return cmdInfo;
    };

    const addCommandInfo = (facetId: string, cmdIds: string[]) => {
      if (this.isFacetedWith(activeFacetIds, facetId)) {
        cmdIds.forEach((id) => {
          const cmdInfo = findCommandInfo(id);

          if (cmdInfo) {
            items.push(cmdInfo);
          }
        });
      }
    };

    addCommandInfo(CommandListFacetIds.Pinned, Array.from(pinnedIdsSet));

    const isPinnedFaceted = this.isFacetedWith(
      activeFacetIds,
      CommandListFacetIds.Pinned,
    );

    // Remove any recently used ids that are also in the pinned list so they don't
    // appear twice in the result list when the pinned facet is enabled
    const recentIds = Array.from(recentIdsSet).filter(
      // When not pinned faceted then the recent item should be in the result list
      // but when it is pinned facted, the recent item should only be in the result list
      // when it does not already exist in the pinned list
      (id) => !isPinnedFaceted || (isPinnedFaceted && !pinnedIdsSet.has(id)),
    );

    if (this.settings.recentCommandDisplayOrder === 'asc') {
      recentIds.reverse();
    }

    addCommandInfo(CommandListFacetIds.Recent, recentIds);

    return items;
  }

  getAllCommands(): CommandInfo[] {
    const pinnedIdsSet = this.getPinnedCommandIds();
    const recentIdsSet = this.getRecentCommandIds();

    return this.app.commands
      .listCommands()
      ?.sort((a, b) => a.name.localeCompare(b.name))
      .map((cmd) => {
        return {
          isPinned: pinnedIdsSet.has(cmd.id),
          isRecent: recentIdsSet.has(cmd.id),
          cmd,
        };
      });
  }

  getPinnedCommandIds(): Set<string> {
    const ids = this.getEnabledCommandPalettePluginInstance()?.options?.pinned;
    return new Set<string>(ids ?? []);
  }

  getRecentCommandIds(): Set<string> {
    return new Set(CommandHandler.recentlyUsedCommandIds);
  }

  createSuggestion(commandInfo: CommandInfo, match: SearchResult): CommandSuggestion {
    const { cmd, isPinned, isRecent } = commandInfo;
    const sugg: CommandSuggestion = {
      type: SuggestionType.CommandList,
      item: cmd,
      isPinned,
      isRecent,
      match,
    };

    return this.applyMatchPriorityPreferences(sugg);
  }

  getEnabledCommandPalettePluginInstance(): CommandPalettePluginInstance {
    return CommandHandler.getEnabledCommandPalettePluginInstance(this.app);
  }

  static getEnabledCommandPalettePluginInstance(app: App): CommandPalettePluginInstance {
    return getInternalEnabledPluginById(
      app,
      COMMAND_PALETTE_PLUGIN_ID,
    ) as CommandPalettePluginInstance;
  }
}
