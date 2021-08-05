import {
  App,
  Chooser,
  EmbedCache,
  FuzzyMatch,
  HeadingCache,
  LinkCache,
  PreparedQuery,
  TagCache,
  TFile,
  WorkspaceLeaf,
} from 'obsidian';
import type { SuggestModal } from 'obsidian';

export enum Mode {
  Standard = 1,
  EditorList = 2,
  SymbolList = 4,
  WorkspaceList = 8,
}

export enum SymbolType {
  Link = 1,
  Embed = 2,
  Tag = 4,
  Heading = 8,
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
}

export interface WorkspaceInfo {
  type: 'workspaceInfo';
  id: string;
}

export interface SymbolSuggestion extends FuzzyMatch<SymbolInfo> {
  type: 'symbol';
}

export interface EditorSuggestion extends FuzzyMatch<WorkspaceLeaf> {
  type: 'editor';
}

export interface WorkspaceSuggestion extends FuzzyMatch<WorkspaceInfo> {
  type: 'workspace';
}

export interface FileSuggestion extends Omit<FuzzyMatch<TFile>, 'item'> {
  file: TFile;
  type: 'file';
}

export interface AliasSuggestion extends Omit<FuzzyMatch<TFile>, 'item'> {
  file: TFile;
  alias: string;
  type: 'alias';
}

export interface UnresolvedSuggestion extends Omit<FuzzyMatch<string>, 'item'> {
  linktext: string;
  type: 'unresolved';
}

export type AnyExSuggestionPayload = WorkspaceLeaf | SymbolInfo | WorkspaceInfo;
export type AnyExSuggestion = SymbolSuggestion | EditorSuggestion | WorkspaceSuggestion;
export type AnySystemSuggestion = FileSuggestion | AliasSuggestion | UnresolvedSuggestion;
export type AnySuggestion = AnyExSuggestion | AnySystemSuggestion;

export interface TargetInfo {
  file: TFile;
  leaf: WorkspaceLeaf;
  suggestion: AnySuggestion;
  isValidSymbolTarget: boolean;
}

export interface SettingsData {
  alwaysNewPaneForSymbols: boolean;
  useActivePaneForSymbolsOnMobile: boolean;
  symbolsInLineOrder: boolean;
  editorListCommand: string;
  symbolListCommand: string;
  workspaceListCommand: string;
  excludeViewTypes: Array<string>;
  referenceViews: Array<string>;
  includeSidePanelViewTypes: Array<string>;
}

export interface SearchQuery {
  hasSearchTerm: boolean;
  prepQuery: PreparedQuery;
}
