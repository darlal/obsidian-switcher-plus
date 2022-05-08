import { prepareQuery } from 'obsidian';
import { Mode, SourceInfo, SearchQuery } from 'src/types';

export interface ParsedCommand {
  isValidated: boolean;
  index: number;
  parsedInput: string;
}

export interface SourcedParsedCommand extends ParsedCommand {
  source: SourceInfo;
}

export class InputInfo {
  private parsedCommands: Record<Mode, ParsedCommand>;
  private _searchQuery: SearchQuery;

  private static get defaultParsedCommand(): ParsedCommand {
    return {
      isValidated: false,
      index: -1,
      parsedInput: null,
    };
  }

  get searchQuery(): SearchQuery {
    return this._searchQuery;
  }

  constructor(public inputText = '', public mode = Mode.Standard) {
    const symbolListCmd: SourcedParsedCommand = {
      ...InputInfo.defaultParsedCommand,
      source: null,
    };

    const relatedItemsListCmd: SourcedParsedCommand = {
      ...InputInfo.defaultParsedCommand,
      source: null,
    };

    const parsedCmds = {} as Record<Mode, ParsedCommand>;
    parsedCmds[Mode.SymbolList] = symbolListCmd;
    parsedCmds[Mode.Standard] = InputInfo.defaultParsedCommand;
    parsedCmds[Mode.EditorList] = InputInfo.defaultParsedCommand;
    parsedCmds[Mode.WorkspaceList] = InputInfo.defaultParsedCommand;
    parsedCmds[Mode.HeadingsList] = InputInfo.defaultParsedCommand;
    parsedCmds[Mode.StarredList] = InputInfo.defaultParsedCommand;
    parsedCmds[Mode.CommandList] = InputInfo.defaultParsedCommand;
    parsedCmds[Mode.RelatedItemsList] = relatedItemsListCmd;
    this.parsedCommands = parsedCmds;
  }

  buildSearchQuery(): void {
    const { mode } = this;
    const input = this.parsedCommands[mode].parsedInput ?? '';
    const prepQuery = prepareQuery(input.trim().toLowerCase());
    const hasSearchTerm = prepQuery?.query?.length > 0;

    this._searchQuery = { prepQuery, hasSearchTerm };
  }

  parsedCommand(mode?: Mode): ParsedCommand {
    mode = mode ?? this.mode;
    return this.parsedCommands[mode];
  }
}
