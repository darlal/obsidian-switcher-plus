import { TFile, WorkspaceLeaf } from 'obsidian';
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

  private static get defaultParsedCommand(): ParsedCommand {
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
    const symbolListCmd: SourcedParsedCommand = {
      ...InputInfo.defaultParsedCommand,
      source: null,
    };

    const relatedItemsListCmd: SourcedParsedCommand = {
      ...InputInfo.defaultParsedCommand,
      source: null,
    };

    const parsedCmds = {} as Record<Mode, ParsedCommand>;
    this.parsedCommands = parsedCmds;
    parsedCmds[Mode.SymbolList] = symbolListCmd;
    parsedCmds[Mode.RelatedItemsList] = relatedItemsListCmd;

    [
      Mode.Standard,
      Mode.EditorList,
      Mode.WorkspaceList,
      Mode.HeadingsList,
      Mode.BookmarksList,
      Mode.CommandList,
      Mode.VaultList,
    ].forEach((mode) => {
      parsedCmds[mode] = InputInfo.defaultParsedCommand;
    });
  }

  parsedCommand(mode?: Mode): ParsedCommand {
    mode = mode ?? this.mode;
    return this.parsedCommands[mode];
  }
}
