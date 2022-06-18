import {
  App,
  Chooser,
  EditorPosition,
  EmbedCache,
  FuzzyMatch,
  HeadingCache,
  LinkCache,
  PreparedQuery,
  TagCache,
  TFile,
  WorkspaceLeaf,
  Command,
} from 'obsidian';
import type { SuggestModal, StarredPluginItem } from 'obsidian';
import { PickKeys, WritableKeys } from 'ts-essentials';

// Pick from T the keys that are writable and whose value is of type K
export type WritableKeysWithValueOfType<T, K> = PickKeys<Pick<T, WritableKeys<T>>, K>;

export enum Mode {
  Standard = 1,
  EditorList = 2,
  SymbolList = 4,
  WorkspaceList = 8,
  HeadingsList = 16,
  StarredList = 32,
  CommandList = 64,
  RelatedItemsList = 128,
}

export enum SymbolType {
  Link = 1,
  Embed = 2,
  Tag = 4,
  Heading = 8,
}

export enum LinkType {
  None = 0,
  Normal = 1,
  Heading = 2,
  Block = 4,
}

type AllSymbols = {
  [type in SymbolType]: string;
};

export const SymbolIndicators: Partial<AllSymbols> = {};
SymbolIndicators[SymbolType.Link] = '🔗';
SymbolIndicators[SymbolType.Embed] = '!';
SymbolIndicators[SymbolType.Tag] = '#';
SymbolIndicators[SymbolType.Heading] = 'H';

interface HeadingLevelIndicators {
  [level: number]: string;
}

export const HeadingIndicators: Partial<HeadingLevelIndicators> = {};
HeadingIndicators[1] = 'H₁';
HeadingIndicators[2] = 'H₂';
HeadingIndicators[3] = 'H₃';
HeadingIndicators[4] = 'H₄';
HeadingIndicators[5] = 'H₅';
HeadingIndicators[6] = 'H₆';

export declare class SystemSwitcher extends SuggestModal<AnySuggestion> {
  shouldShowAlias: boolean;
  protected isOpen: boolean;
  protected chooser: Chooser<AnySuggestion>;
  constructor(app: App);
  protected onInput(): void;
  protected updateSuggestions(): void;
  getSuggestions(query: string): AnySuggestion[];
  renderSuggestion(value: AnySuggestion, el: HTMLElement): void;
  onChooseSuggestion(item: AnySuggestion, evt: MouseEvent | KeyboardEvent): void;
}

export interface SwitcherPlus extends SystemSwitcher {
  openInMode(mode: Mode): void;
}

export type AnySymbolInfoPayload = LinkCache | EmbedCache | TagCache | HeadingCache;
export interface SymbolInfo {
  type: 'symbolInfo';
  symbol: AnySymbolInfoPayload;
  symbolType: SymbolType;
  indentLevel?: number;
  isSelected?: boolean;
}

export interface WorkspaceInfo {
  type: 'workspaceInfo';
  id: string;
}

export enum SuggestionType {
  EditorList = 'editorList',
  SymbolList = 'symbolList',
  WorkspaceList = 'workspaceList',
  HeadingsList = 'headingsList',
  StarredList = 'starredList',
  CommandList = 'commandList',
  RelatedItemsList = 'relatedItemsList',
  File = 'file',
  Alias = 'alias',
  Unresolved = 'unresolved',
}

export interface SymbolSuggestion extends FuzzyMatch<SymbolInfo> {
  file: TFile;
  type: SuggestionType.SymbolList;
}

export interface EditorSuggestion extends FuzzyMatch<WorkspaceLeaf> {
  file: TFile;
  type: SuggestionType.EditorList;
}

export interface WorkspaceSuggestion extends FuzzyMatch<WorkspaceInfo> {
  type: SuggestionType.WorkspaceList;
}

export interface HeadingSuggestion extends FuzzyMatch<HeadingCache> {
  file: TFile;
  downranked?: boolean;
  type: SuggestionType.HeadingsList;
}

export interface StarredSuggestion extends FuzzyMatch<StarredPluginItem> {
  file: TFile;
  type: SuggestionType.StarredList;
}

export interface RelatedItemsSuggestion extends Omit<FuzzyMatch<TFile>, 'item'> {
  file: TFile;
  type: SuggestionType.RelatedItemsList;
  relationType: 'diskLocation';
}

export interface FileSuggestion extends Omit<FuzzyMatch<TFile>, 'item'> {
  file: TFile;
  downranked?: boolean;
  type: SuggestionType.File;
}

export interface AliasSuggestion extends Omit<FuzzyMatch<TFile>, 'item'> {
  file: TFile;
  alias: string;
  type: SuggestionType.Alias;
  downranked?: boolean;
}

export interface UnresolvedSuggestion extends Omit<FuzzyMatch<string>, 'item'> {
  linktext: string;
  type: SuggestionType.Unresolved;
}

export interface CommandSuggestion extends FuzzyMatch<Command> {
  type: SuggestionType.CommandList;
}

export type AnyExSuggestionPayload = WorkspaceLeaf | SymbolInfo | WorkspaceInfo;

export type AnyExSuggestion =
  | SymbolSuggestion
  | EditorSuggestion
  | WorkspaceSuggestion
  | HeadingSuggestion
  | StarredSuggestion
  | CommandSuggestion
  | RelatedItemsSuggestion;

export type AnySystemSuggestion = FileSuggestion | AliasSuggestion | UnresolvedSuggestion;

export type AnySuggestion = AnyExSuggestion | AnySystemSuggestion;

export interface SourceInfo {
  file: TFile;
  leaf: WorkspaceLeaf;
  suggestion: AnySuggestion;
  isValidSource: boolean;
  cursor?: EditorPosition;
}

export interface SettingsData {
  onOpenPreferNewPane: boolean;
  alwaysNewPaneForSymbols: boolean;
  useActivePaneForSymbolsOnMobile: boolean;
  symbolsInLineOrder: boolean;
  editorListCommand: string;
  symbolListCommand: string;
  workspaceListCommand: string;
  headingsListCommand: string;
  starredListCommand: string;
  commandListCommand: string;
  relatedItemsListCommand: string;
  strictHeadingsOnly: boolean;
  searchAllHeadings: boolean;
  excludeViewTypes: Array<string>;
  referenceViews: Array<string>;
  limit: number;
  includeSidePanelViewTypes: Array<string>;
  enabledSymbolTypes: Record<SymbolType, boolean>;
  selectNearestHeading: boolean;
  excludeFolders: Array<string>;
  excludeLinkSubTypes: number;
  excludeRelatedFolders: Array<string>;
  excludeOpenRelatedFiles: boolean;
  excludeObsidianIgnoredFiles: boolean;
}

export interface SearchQuery {
  hasSearchTerm: boolean;
  prepQuery: PreparedQuery;
}
