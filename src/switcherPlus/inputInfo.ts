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
  mode = Mode.Standard;
  editorCmd: ParsedCommand;
  workspaceCmd: ParsedCommand;
  symbolCmd: SymbolParsedCommand;
  searchQuery: SearchQuery;

  private static get defaultParsedCommand(): ParsedCommand {
    return {
      isValidated: false,
      index: -1,
      parsedInput: null,
    };
  }

  constructor(public inputText = '') {
    this.symbolCmd = { ...InputInfo.defaultParsedCommand, target: null };
    this.editorCmd = InputInfo.defaultParsedCommand;
    this.workspaceCmd = InputInfo.defaultParsedCommand;
    this.searchQuery = { hasSearchTerm: false, prepQuery: null };
  }

  buildSearchQuery(): void {
    const { mode } = this;
    let input = '';

    if (mode === Mode.SymbolList) {
      input = this.symbolCmd.parsedInput;
    } else if (mode === Mode.EditorList) {
      input = this.editorCmd.parsedInput;
    } else if (mode === Mode.WorkspaceList) {
      input = this.workspaceCmd.parsedInput;
    }

    const prepQuery = prepareQuery(input.trim().toLowerCase());
    const hasSearchTerm = prepQuery?.query?.length > 0;

    this.searchQuery = { prepQuery, hasSearchTerm };
  }
}
