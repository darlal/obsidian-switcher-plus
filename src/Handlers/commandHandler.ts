import { getInternalPluginById } from 'src/utils';
import { InputInfo } from 'src/switcherPlus';
import { AnySuggestion, Mode, CommandSuggestion, SuggestionType } from 'src/types';
import { Handler } from './handler';
import {
  InstalledPlugin,
  SearchResult,
  sortSearchResults,
  WorkspaceLeaf,
  fuzzySearch,
  CommandPalettePluginInstance,
  Command,
} from 'obsidian';

export const COMMAND_PALETTE_PLUGIN_ID = 'command-palette';

export class CommandHandler extends Handler<CommandSuggestion> {
  get commandString(): string {
    return this.settings?.commandListCommand;
  }

  validateCommand(
    inputInfo: InputInfo,
    index: number,
    filterText: string,
    _activeSuggestion: AnySuggestion,
    _activeLeaf: WorkspaceLeaf,
  ): void {
    inputInfo.mode = Mode.CommandList;

    const commandCmd = inputInfo.parsedCommand(Mode.CommandList);
    commandCmd.index = index;
    commandCmd.parsedInput = filterText;
    commandCmd.isValidated = true;
  }

  getSuggestions(inputInfo: InputInfo): CommandSuggestion[] {
    const suggestions: CommandSuggestion[] = [];

    if (inputInfo) {
      inputInfo.buildSearchQuery();
      const { hasSearchTerm, prepQuery } = inputInfo.searchQuery;
      const itemsInfo = this.getItems();

      itemsInfo.forEach((item) => {
        let shouldPush = true;
        let match: SearchResult = null;

        if (hasSearchTerm) {
          match = fuzzySearch(prepQuery, item.name);
          shouldPush = !!match;
        }

        if (shouldPush) {
          suggestions.push({
            type: SuggestionType.CommandList,
            item,
            match,
          });
        }
      });

      if (hasSearchTerm) {
        sortSearchResults(suggestions);
      }
    }

    return suggestions;
  }

  renderSuggestion(sugg: CommandSuggestion, parentEl: HTMLElement): void {
    if (sugg) {
      this.addClassesToSuggestionContainer(parentEl, ['qsp-suggestion-command']);
      this.renderContent(parentEl, sugg.item.name, sugg.match);
    }
  }

  onChooseSuggestion(sugg: CommandSuggestion): void {
    if (sugg) {
      const { item } = sugg;
      this.app.commands.executeCommandById(item.id);
    }
  }

  getItems(): Command[] {
    // Sort commands by their name
    const items: Command[] = this.app.commands.listCommands().sort((a, b) => {
      if (a.name < b.name) return -1;
      if (a.name > b.name) return 1;
      return 0;
    });

    // Pinned commands should be at the top (if any)
    if (
      this.isCommandPalettePluginEnabled() &&
      this.getCommandPalettePluginInstance()?.options.pinned?.length > 0
    ) {
      const pinnedCommandIds = this.getCommandPalettePluginInstance().options.pinned;

      // We're gonna find the pinned command in `items` and move it to the beginning
      // Therefore we need to perform "for each right"
      for (let i = pinnedCommandIds.length - 1; i >= 0; i--) {
        const commandId = pinnedCommandIds[i];
        const commandIndex = items.findIndex((c) => c.id === commandId);
        if (commandIndex > -1) {
          const command = items[commandIndex];
          items.splice(commandIndex, 1);
          items.unshift(command);
        }
      }
    }

    return items;
  }

  private isCommandPalettePluginEnabled(): boolean {
    const plugin = this.getCommandPalettePlugin();
    return plugin?.enabled;
  }

  private getCommandPalettePlugin(): InstalledPlugin {
    return getInternalPluginById(this.app, COMMAND_PALETTE_PLUGIN_ID);
  }

  private getCommandPalettePluginInstance(): CommandPalettePluginInstance {
    const commandPalettePlugin = this.getCommandPalettePlugin();
    return commandPalettePlugin?.instance as CommandPalettePluginInstance;
  }
}
