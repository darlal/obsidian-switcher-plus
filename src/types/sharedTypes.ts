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
  Modifier,
  BookmarksPluginItem,
  Hotkey,
} from 'obsidian';
import type { SuggestModal } from 'obsidian';
import { PickKeys, WritableKeys } from 'ts-essentials';
import { AllCanvasNodeData } from 'obsidian/canvas';

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
  BookmarksList = 32,
  CommandList = 64,
  RelatedItemsList = 128,
  VaultList = 256,
}

export enum SymbolType {
  Link = 1,
  Embed = 2,
  Tag = 4,
  Heading = 8,
  Callout = 16,
  CanvasNode = 32,
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
  openInMode(mode: Mode, sessionOpts?: SessionOpts): void;
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
  | CalloutCache
  | AllCanvasNodeData;

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
  Bookmark = 'bookmark',
  CommandList = 'commandList',
  RelatedItemsList = 'relatedItemsList',
  VaultList = 'vaultList',
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
  isBookmarked?: boolean;
  isRecent?: boolean;
  isAttachment?: boolean;
  preferredTitle?: string;
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

export interface BookmarksSuggestion extends Suggestion<BookmarksPluginItem> {
  type: SuggestionType.Bookmark;
  bookmarkPath: string;
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

export type PathSegments = Pick<TFile, 'basename' | 'path'>;

export interface VaultSuggestion extends Omit<Suggestion<string>, 'file'> {
  type: SuggestionType.VaultList;
  pathSegments: PathSegments;
  isOpen?: boolean;
}

export type AnyExSuggestionPayload = WorkspaceLeaf | SymbolInfo | WorkspaceInfo;

export type AnyExSuggestion =
  | SymbolSuggestion
  | EditorSuggestion
  | WorkspaceSuggestion
  | HeadingSuggestion
  | BookmarksSuggestion
  | CommandSuggestion
  | VaultSuggestion
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

export interface BookmarksItemInfo {
  item: BookmarksPluginItem;
  bookmarkPath: string;
  file: TFile;
}

export interface Facet {
  id: string;
  mode: Mode;
  label: string;
  isActive: boolean;
  isAvailable: boolean;
  key?: string;
  modifiers?: Modifier[];
}

export interface FacetSettingsData {
  resetKey: string;
  resetModifiers?: Modifier[];
  keyList: string[];
  modifiers: Modifier[];
  facetList: Record<string, Facet>;
  shouldResetActiveFacets: boolean;
  shouldShowFacetInstructions: boolean;
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

export type KeymapConfig = {
  mode: Mode;
  activeLeaf?: WorkspaceLeaf;
  facets?: {
    facetSettings: FacetSettingsData;
    facetList: Facet[];
    onToggleFacet: (facets: Facet[], isReset: boolean) => boolean;
  };
};

export type InsertLinkConfig = {
  isEnabled: boolean;
  insertableEditorTypes: string[];
  useBasenameAsAlias: boolean;
  useHeadingAsAlias: boolean;
  keymap: Hotkey & { purpose: string };
};

export type NavigationKeysConfig = {
  nextKeys: Hotkey[];
  prevKeys: Hotkey[];
};

export type TitleSource = 'Default' | 'H1';
export type MatchPriorityData = { value: number; label: string; desc?: string };

export interface SettingsData {
  version: string;
  onOpenPreferNewTab: boolean;
  alwaysNewTabForSymbols: boolean;
  useActiveTabForSymbolsOnMobile: boolean;
  symbolsInLineOrder: boolean;
  editorListCommand: string;
  symbolListCommand: string;
  symbolListActiveEditorCommand: string;
  workspaceListCommand: string;
  headingsListCommand: string;
  bookmarksListCommand: string;
  commandListCommand: string;
  vaultListCommand: string;
  relatedItemsListCommand: string;
  relatedItemsListActiveEditorCommand: string;
  strictHeadingsOnly: boolean;
  searchAllHeadings: boolean;
  headingsSearchDebounceMilli: number;
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
  shouldSearchBookmarks: boolean;
  pathDisplayFormat: PathDisplayFormat;
  hidePathIfRoot: boolean;
  enabledRelatedItems: RelationType[];
  showOptionalIndicatorIcons: boolean;
  overrideStandardModeBehaviors: boolean;
  enabledRibbonCommands: Array<keyof typeof Mode>;
  fileExtAllowList: Array<string>;
  matchPriorityAdjustments: {
    isEnabled: boolean;
    adjustments: Record<string, MatchPriorityData>;
    fileExtAdjustments: Record<string, MatchPriorityData>;
  };
  preserveCommandPaletteLastInput: boolean;
  preserveQuickSwitcherLastInput: boolean;
  quickFilters: FacetSettingsData;
  shouldCloseModalOnBackspace: boolean;
  maxRecentFileSuggestionsOnInit: number;
  orderEditorListByAccessTime: boolean;
  insertLinkInEditor: InsertLinkConfig;
  removeDefaultTabBinding: boolean;
  navigationKeys: NavigationKeysConfig;
  preferredSourceForTitle: TitleSource;
  closeWhenEmptyKeys: Hotkey[];
  escapeCmdChar: string;
}

export type SessionOpts = {
  openModeString?: string;
  useActiveEditorAsSource?: boolean;
};
