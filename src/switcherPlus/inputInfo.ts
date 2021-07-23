import { Mode, TargetInfo } from 'src/types';

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
  hasSearchTerm = false;
  editorCmd: ParsedCommand;
  workspaceCmd: ParsedCommand;
  symbolCmd: SymbolParsedCommand;

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
  }
}
