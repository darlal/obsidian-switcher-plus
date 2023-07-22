import {
  makeBookmarksPluginFileItem,
  makeCommandItem,
  makeFuzzyMatch,
} from './fixtureUtils';
import {
  BookmarksPluginFileItem,
  Command,
  HeadingCache,
  SearchMatches,
  TFile,
  WorkspaceLeaf,
} from 'obsidian';
import { filenameFromPath, stripMDExtensionFromPath } from 'src/utils';
import {
  AliasSuggestion,
  CommandSuggestion,
  EditorSuggestion,
  FileSuggestion,
  SuggestionType,
  UnresolvedSuggestion,
  WorkspaceSuggestion,
  RelatedItemsSuggestion,
  HeadingSuggestion,
  SymbolSuggestion,
  AnySymbolInfoPayload,
  SymbolType,
  MatchType,
  SearchResultWithFallback,
  RelationType,
  RelatedItemsInfo,
  BookmarksSuggestion,
} from 'src/types';

export function makeFileSuggestion(
  file?: TFile,
  matches?: SearchMatches,
  score?: number,
  matchType?: MatchType,
  matchText?: string,
): FileSuggestion {
  file = file ?? new TFile();

  return {
    type: SuggestionType.File,
    ...makeSearchResultWithFallback(matches, matchType, matchText, score),
    file,
  };
}

export function makeUnresolvedSuggestion(linktext?: string): UnresolvedSuggestion {
  return {
    type: SuggestionType.Unresolved,
    linktext,
    match: null,
  };
}

export function makeAliasSuggestion(
  file?: TFile,
  alias: string = null,
  matches?: SearchMatches,
  score?: number,
  matchType?: MatchType,
  matchText?: string,
): AliasSuggestion {
  file = file ?? new TFile();

  return {
    type: SuggestionType.Alias,
    alias,
    file,
    ...makeSearchResultWithFallback(matches, matchType, matchText, score),
  };
}

export function makeEditorSuggestion(
  item: WorkspaceLeaf,
  file: TFile = null,
  matches?: SearchMatches,
  score?: number,
  matchType?: MatchType,
  matchText?: string,
): EditorSuggestion {
  return {
    type: SuggestionType.EditorList,
    ...makeSearchResultWithFallback(matches, matchType, matchText, score),
    file,
    item,
  };
}

export function makeBookmarkedFileSuggestion(
  options?: Partial<BookmarksSuggestion>,
): BookmarksSuggestion {
  const item = options?.item ?? makeBookmarksPluginFileItem();

  let file = options?.file;
  if (!file) {
    file = new TFile();
    file.path = (item as BookmarksPluginFileItem).path;
    file.basename = filenameFromPath(stripMDExtensionFromPath(file));
  }

  return {
    type: SuggestionType.Bookmark,
    match: options?.match,
    matchText: options?.matchText,
    matchType: options?.matchType,
    bookmarkPath: options?.bookmarkPath ?? file.path,
    item,
    file,
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
  item?: RelatedItemsInfo,
  preferredTitle?: string,
  matches?: SearchMatches,
  score?: number,
  matchType?: MatchType,
  matchText?: string,
): RelatedItemsSuggestion {
  if (!item) {
    item = {
      relationType: RelationType.DiskLocation,
      file: new TFile(),
    };
  }

  return {
    item,
    preferredTitle: preferredTitle ?? null,
    type: SuggestionType.RelatedItemsList,
    ...makeSearchResultWithFallback(matches, matchType, matchText, score),
    file: item.file,
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

export function makeSearchResultWithFallback(
  matches?: SearchMatches,
  type?: MatchType,
  text?: string,
  score?: number,
): SearchResultWithFallback {
  return {
    match: makeFuzzyMatch(matches, score),
    matchType: type ?? MatchType.None,
    matchText: text,
  };
}
