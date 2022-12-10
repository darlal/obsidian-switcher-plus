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
  SearchResult,
  SectionCache,
} from 'obsidian';
import type { SuggestModal, StarredPluginItem } from 'obsidian';
import { PickKeys, WritableKeys } from 'ts-essentials';

// Pick from T the keys that are writable and whose value is of type K
export type WritableKeysWithValueOfType<T, K> = PickKeys<Pick<T, WritableKeys<T>>, K>;

export enum PathDisplayFormat {
  None,
  Full,
  FolderOnly,
  FolderWithFilename,
  FolderPathFilenameOptional,
}

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
  Callout = 16,
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

export type CalloutCache = SectionCache & {
  calloutType: string;
  calloutTitle: string;
};

export type AnySymbolInfoPayload =
  | LinkCache
  | EmbedCache
  | TagCache
  | HeadingCache
  | CalloutCache;

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

export enum MatchType {
  None = 0,
  Primary,
  Basename,
  Path,
}

export interface Suggestion<T> extends FuzzyMatch<T> {
  type: SuggestionType;
  file: TFile;
  downranked?: boolean;

  // Obsidian created suggestions won't have these props
  matchType?: MatchType;
  matchText?: string;
  isOpenInEditor?: boolean;
  isStarred?: boolean;
  isRecentOpen?: boolean;
}

export interface SymbolSuggestion extends Suggestion<SymbolInfo> {
  type: SuggestionType.SymbolList;
}

export interface EditorSuggestion extends Suggestion<WorkspaceLeaf> {
  type: SuggestionType.EditorList;
}

export interface WorkspaceSuggestion extends Omit<Suggestion<WorkspaceInfo>, 'file'> {
  type: SuggestionType.WorkspaceList;
}

export interface HeadingSuggestion extends Suggestion<HeadingCache> {
  type: SuggestionType.HeadingsList;
}

export interface StarredSuggestion extends Suggestion<StarredPluginItem> {
  type: SuggestionType.StarredList;
}

export enum RelationType {
  DiskLocation = 'disk-location',
  Backlink = 'backlink',
  OutgoingLink = 'outgoing-link',
}

export interface RelatedItemsInfo {
  relationType: RelationType;
  file: TFile;
  count?: number;
  unresolvedText?: string;
}

export interface RelatedItemsSuggestion extends Suggestion<RelatedItemsInfo> {
  type: SuggestionType.RelatedItemsList;
}

export interface FileSuggestion extends Omit<Suggestion<TFile>, 'item'> {
  downranked?: boolean;
  type: SuggestionType.File;
}

export interface AliasSuggestion extends Omit<Suggestion<TFile>, 'item'> {
  alias: string;
  type: SuggestionType.Alias;
  downranked?: boolean;
}

export interface UnresolvedSuggestion extends Omit<Suggestion<string>, 'item' | 'file'> {
  linktext: string;
  type: SuggestionType.Unresolved;
}

export interface CommandSuggestion extends Omit<Suggestion<Command>, 'file'> {
  type: SuggestionType.CommandList;
  isPinned?: boolean;
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
  onOpenPreferNewTab: boolean;
  alwaysNewTabForSymbols: boolean;
  useActiveTabForSymbolsOnMobile: boolean;
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
  shouldSearchFilenames: boolean;
  pathDisplayFormat: PathDisplayFormat;
  hidePathIfRoot: boolean;
  enabledRelatedItems: RelationType[];
  showOptionalIndicatorIcons: boolean;
  overrideStandardModeBehaviors: boolean;
  enabledRibbonCommands: Array<keyof typeof Mode>;
}

export interface SearchQuery {
  hasSearchTerm: boolean;
  prepQuery: PreparedQuery;
}

export interface SearchResultWithFallback {
  matchType: MatchType;
  match: SearchResult;
  matchText?: string;
}
