import { prepareQuery, TFile, WorkspaceLeaf } from 'obsidian';
import { Mode, SourceInfo, SearchQuery, SessionOpts, BookmarksItemInfo } from 'src/types';

export interface WorkspaceEnvList {
  openWorkspaceLeaves: Set<WorkspaceLeaf>;
  openWorkspaceFiles: Set<TFile>;
  fileBookmarks: Map<TFile, BookmarksItemInfo>;
  nonFileBookmarks: Set<BookmarksItemInfo>;
  mostRecentFiles: Set<TFile>;
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
  private _searchQuery: SearchQuery;

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
    fileBookmarks: new Map<TFile, BookmarksItemInfo>(),
    nonFileBookmarks: new Set<BookmarksItemInfo>(),
    mostRecentFiles: new Set<TFile>(),
  };

  get searchQuery(): SearchQuery {
    return this._searchQuery;
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
    ].forEach((mode) => {
      parsedCmds[mode] = InputInfo.defaultParsedCommand;
    });
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
