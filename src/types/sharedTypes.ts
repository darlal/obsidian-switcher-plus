import {
  App,
  EmbedCache,
  FuzzyMatch,
  HeadingCache,
  LinkCache,
  TagCache,
  TFile,
  WorkspaceLeaf,
} from 'obsidian';
import type { SuggestModal } from 'obsidian';

export enum Mode {
  Standard = 1,
  EditorList = 2,
  SymbolList = 4,
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
  protected chooser: unknown;
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
  symbol: AnySymbolInfoPayload;
  type: SymbolType;
  indentLevel?: number;
}

export interface SymbolSuggestion extends FuzzyMatch<SymbolInfo> {
  type: 'Symbol';
}

export interface EditorSuggestion extends FuzzyMatch<WorkspaceLeaf> {
  type: 'Editor';
}

export interface SystemSuggestion extends Omit<FuzzyMatch<TFile>, 'item'> {
  alias?: string;
  file: TFile;
}

export type AnyExSuggestionPayload = WorkspaceLeaf | SymbolInfo;
export type AnyExSuggestion = SymbolSuggestion | EditorSuggestion;
export type AnySuggestion = AnyExSuggestion | SystemSuggestion;
