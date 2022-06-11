import { makeCommandItem, makeFileStarredItem, makeFuzzyMatch } from './fixtureUtils';
import {
  Command,
  HeadingCache,
  SearchMatches,
  StarredPluginItem,
  TFile,
  WorkspaceLeaf,
} from 'obsidian';
import {
  AliasSuggestion,
  CommandSuggestion,
  EditorSuggestion,
  FileSuggestion,
  StarredSuggestion,
  SuggestionType,
  UnresolvedSuggestion,
  WorkspaceSuggestion,
  RelatedItemsSuggestion,
  HeadingSuggestion,
  SymbolSuggestion,
  AnySymbolInfoPayload,
  SymbolType,
} from 'src/types';

export function makeFileSuggestion(
  file?: TFile,
  matches?: SearchMatches,
  score?: number,
): FileSuggestion {
  file = file ?? new TFile();

  return {
    type: SuggestionType.File,
    match: makeFuzzyMatch(matches, score),
    file,
  };
}

export function makeUnresolvedSuggestion(): UnresolvedSuggestion {
  return {
    type: SuggestionType.Unresolved,
    linktext: null,
    match: null,
  };
}

export function makeAliasSuggestion(file?: TFile, alias: string = null): AliasSuggestion {
  file = file ?? new TFile();

  return {
    type: SuggestionType.Alias,
    alias,
    file,
    match: null,
  };
}

export function makeEditorSuggestion(
  item: WorkspaceLeaf,
  file: TFile = null,
  matches?: SearchMatches,
  score?: number,
): EditorSuggestion {
  return {
    type: SuggestionType.EditorList,
    match: makeFuzzyMatch(matches, score),
    file,
    item,
  };
}

export function makeStarredSuggestion(
  item?: StarredPluginItem,
  file: TFile = null,
  matches?: SearchMatches,
  score?: number,
): StarredSuggestion {
  item = item ?? makeFileStarredItem();

  return {
    type: SuggestionType.StarredList,
    match: makeFuzzyMatch(matches, score),
    file,
    item,
  };
}

export function makeWorkspaceSuggestion(
  workspaceId: string,
  matches?: SearchMatches,
  score?: number,
): WorkspaceSuggestion {
  return {
    type: SuggestionType.WorkspaceList,
    match: makeFuzzyMatch(matches, score),
    item: {
      type: 'workspaceInfo',
      id: workspaceId,
    },
  };
}

export function makeCommandSuggestion(
  item?: Command,
  matches?: SearchMatches,
  score?: number,
): CommandSuggestion {
  item = item ?? makeCommandItem();

  return {
    type: SuggestionType.CommandList,
    match: makeFuzzyMatch(matches, score),
    item,
  };
}

export function makeRelatedItemsSuggestion(
  file?: TFile,
  matches?: SearchMatches,
  score?: number,
): RelatedItemsSuggestion {
  file = file ?? new TFile();

  return {
    type: SuggestionType.RelatedItemsList,
    match: makeFuzzyMatch(matches, score),
    relationType: 'diskLocation',
    file,
  };
}

export function makeHeadingSuggestion(
  item: HeadingCache,
  file: TFile = null,
  matches?: SearchMatches,
  score?: number,
): HeadingSuggestion {
  return {
    type: SuggestionType.HeadingsList,
    match: makeFuzzyMatch(matches, score),
    item,
    file,
  };
}

export function makeSymbolSuggestion(
  symbol: AnySymbolInfoPayload,
  symbolType: SymbolType,
  file: TFile = null,
  isSelected = false,
  matches?: SearchMatches,
  score?: number,
): SymbolSuggestion {
  return {
    type: SuggestionType.SymbolList,
    match: makeFuzzyMatch(matches, score),
    item: {
      type: 'symbolInfo',
      symbol,
      symbolType,
      isSelected,
    },
    file,
  };
}
