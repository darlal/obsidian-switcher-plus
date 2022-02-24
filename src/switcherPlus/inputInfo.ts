import { prepareQuery } from 'obsidian';
import { Mode, TargetInfo, SearchQuery } from 'src/types';

export interface ParsedCommand {
  isValidated: boolean;
  index: number;
  parsedInput: string;
}

export interface SymbolParsedCommand extends ParsedCommand {
  target: TargetInfo;
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
    const sc: SymbolParsedCommand = {
      ...InputInfo.defaultParsedCommand,
      target: null,
    };

    const pcs = {} as Record<Mode, ParsedCommand>;
    pcs[Mode.SymbolList] = sc;
    pcs[Mode.Standard] = InputInfo.defaultParsedCommand;
    pcs[Mode.EditorList] = InputInfo.defaultParsedCommand;
    pcs[Mode.WorkspaceList] = InputInfo.defaultParsedCommand;
    pcs[Mode.HeadingsList] = InputInfo.defaultParsedCommand;
    pcs[Mode.StarredList] = InputInfo.defaultParsedCommand;
    this.parsedCommands = pcs;
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
