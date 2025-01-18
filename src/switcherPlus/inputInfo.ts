import { TFile, WorkspaceLeaf } from 'obsidian';
import { getModeNames, getSourcedModes } from 'src/utils';
import { Mode, SourceInfo, SearchQuery, SessionOpts, BookmarksItemInfo } from 'src/types';

export interface WorkspaceEnvList {
  openWorkspaceLeaves: Set<WorkspaceLeaf>;
  openWorkspaceFiles: Set<TFile>;
  fileBookmarks: Map<TFile, BookmarksItemInfo[]>;
  nonFileBookmarks: Set<BookmarksItemInfo>;
  mostRecentFiles: Set<TFile>;
  attachmentFileExtensions: Set<string>;
}

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
  private _inputTextSansEscapeChar: string = null;

  static get defaultParsedCommand(): ParsedCommand {
    return {
      isValidated: false,
      index: -1,
      parsedInput: null,
    };
  }

  sessionOpts: SessionOpts;
  readonly currentWorkspaceEnvList: WorkspaceEnvList = {
    openWorkspaceLeaves: new Set<WorkspaceLeaf>(),
    openWorkspaceFiles: new Set<TFile>(),
    fileBookmarks: new Map<TFile, BookmarksItemInfo[]>(),
    nonFileBookmarks: new Set<BookmarksItemInfo>(),
    mostRecentFiles: new Set<TFile>(),
    attachmentFileExtensions: new Set<string>(),
  };

  get parsedInputQuery(): SearchQuery {
    const query = (this.parsedCommand()?.parsedInput ?? '').trim().toLowerCase();

    return {
      query,
      hasSearchTerm: !!query.length,
    };
  }

  /**
   * If it exists, returns a version of inputText that has been stripped of the
   * custom mode escape command char. Otherwise, returns raw inputText.
   *
   * @type {string}
   */
  get inputTextSansEscapeChar(): string {
    return this._inputTextSansEscapeChar ?? this.inputText;
  }

  set inputTextSansEscapeChar(value: string) {
    this._inputTextSansEscapeChar = value;
  }

  constructor(
    public inputText = '',
    public mode = Mode.Standard,
    sessionOpts?: SessionOpts,
  ) {
    this.sessionOpts = sessionOpts ?? {};

    const sourcedModes = getSourcedModes();
    this.parsedCommands = {} as Record<Mode, ParsedCommand>;

    // Initialize .parsedCommands with an object for each mode
    getModeNames().forEach((modeName) => {
      const modeValue = Mode[modeName];

      if (sourcedModes.includes(modeValue)) {
        // Initialize the additional properties for sourced commands.
        (this.parsedCommands[modeValue] as SourcedParsedCommand) = {
          ...InputInfo.defaultParsedCommand,
          source: null,
        };
      } else {
        this.parsedCommands[modeValue] = InputInfo.defaultParsedCommand;
      }
    });
  }

  parsedCommand(mode?: Mode): ParsedCommand {
    mode = mode ?? this.mode;
    return this.parsedCommands[mode];
  }
}
