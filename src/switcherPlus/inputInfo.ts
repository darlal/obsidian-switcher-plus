import { Mode, TargetInfo } from 'src/types';

export interface ParsedCommand {
  isValidated: boolean;
  index: number;
  parsedInput: string;
  target: TargetInfo;
}

export class InputInfo {
  mode = Mode.Standard;
  hasSearchTerm = false;
  symbolCmd: ParsedCommand;
  editorCmd: Omit<ParsedCommand, 'target'>;

  constructor(public inputText = '') {
    this.symbolCmd = {
      isValidated: false,
      index: -1,
      parsedInput: null,
      target: null,
    };

    this.editorCmd = {
      isValidated: false,
      index: -1,
      parsedInput: null,
    };
  }
}
