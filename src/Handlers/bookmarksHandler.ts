import { getInternalEnabledPluginById, isOfType } from 'src/utils';
import { InputInfo, WorkspaceEnvList } from 'src/switcherPlus';
import {
  AnySuggestion,
  BookmarksItemInfo,
  BookmarksSuggestion,
  MatchType,
  Mode,
  SearchResultWithFallback,
  SessionOpts,
  SuggestionType,
} from 'src/types';
import {
  sortSearchResults,
  WorkspaceLeaf,
  TFile,
  BookmarksPluginInstance,
  BookmarksPluginItem,
  BookmarksPluginFileItem,
  BookmarksPluginGroupItem,
  MetadataCache,
} from 'obsidian';
import { Handler } from './handler';
import { BOOKMARKS_FACET_ID_MAP, SwitcherPlusSettings } from 'src/settings';

export const BOOKMARKS_PLUGIN_ID = 'bookmarks';

export class BookmarksHandler extends Handler<BookmarksSuggestion> {
  getCommandString(_sessionOpts?: SessionOpts): string {
    return this.settings?.bookmarksListCommand;
  }

  validateCommand(
    inputInfo: InputInfo,
    index: number,
    filterText: string,
    _activeSuggestion: AnySuggestion,
    _activeLeaf: WorkspaceLeaf,
  ): void {
    if (this.getEnabledBookmarksPluginInstance()) {
      inputInfo.mode = Mode.BookmarksList;

      const cmd = inputInfo.parsedCommand(Mode.BookmarksList);
      cmd.index = index;
      cmd.parsedInput = filterText;
      cmd.isValidated = true;
    }
  }

  getSuggestions(inputInfo: InputInfo): BookmarksSuggestion[] {
    const suggestions: BookmarksSuggestion[] = [];

    if (inputInfo) {
      inputInfo.buildSearchQuery();
      const { hasSearchTerm, prepQuery } = inputInfo.searchQuery;
      const itemsInfo = this.getItems(inputInfo);

      itemsInfo.forEach((info) => {
        let shouldPush = true;
        let result: SearchResultWithFallback = { matchType: MatchType.None, match: null };

        if (hasSearchTerm) {
          result = this.fuzzySearchWithFallback(prepQuery, info.bookmarkPath);
          shouldPush = result.matchType !== MatchType.None;
        }

        if (shouldPush) {
          suggestions.push(
            this.createSuggestion(inputInfo.currentWorkspaceEnvList, info, result),
          );
        }
      });

      if (hasSearchTerm) {
        sortSearchResults(suggestions);
      }
    }

    return suggestions;
  }

  renderSuggestion(_sugg: BookmarksSuggestion, _parentEl: HTMLElement): boolean {
    return false;
  }

  onChooseSuggestion(
    _sugg: BookmarksSuggestion,
    _evt: MouseEvent | KeyboardEvent,
  ): boolean {
    return false;
  }

  getItems(inputInfo: InputInfo | null): BookmarksItemInfo[] {
    const itemsInfo: BookmarksItemInfo[] = [];
    const pluginInstance = this.getEnabledBookmarksPluginInstance();

    if (pluginInstance) {
      // if inputInfo is not supplied, then all items are expected (disregard facets), so use
      // and empty facet list
      const activeFacetIds = inputInfo
        ? this.getActiveFacetIds(inputInfo)
        : new Set<string>();

      const traverseBookmarks = (bookmarks: BookmarksPluginItem[], path: string) => {
        bookmarks?.forEach((bookmark) => {
          if (BookmarksHandler.isBookmarksPluginGroupItem(bookmark)) {
            traverseBookmarks(bookmark.items, `${path}${bookmark.title}/`);
          } else if (
            this.isFacetedWith(activeFacetIds, BOOKMARKS_FACET_ID_MAP[bookmark.type])
          ) {
            let file: TFile = null;

            if (BookmarksHandler.isBookmarksPluginFileItem(bookmark)) {
              file = this.getTFileByPath(bookmark.path);
            }

            const bookmarkPath = path + pluginInstance.getItemTitle(bookmark);
            itemsInfo.push({ item: bookmark, bookmarkPath, file });
          }
        });
      };

      traverseBookmarks(pluginInstance.items, '');
    }

    return itemsInfo;
  }

  getEnabledBookmarksPluginInstance(): BookmarksPluginInstance {
    return getInternalEnabledPluginById(
      this.app,
      BOOKMARKS_PLUGIN_ID,
    ) as BookmarksPluginInstance;
  }

  createSuggestion(
    currentWorkspaceEnvList: WorkspaceEnvList,
    bookmarkInfo: BookmarksItemInfo,
    result: SearchResultWithFallback,
  ): BookmarksSuggestion {
    return BookmarksHandler.createSuggestion(
      currentWorkspaceEnvList,
      bookmarkInfo,
      this.settings,
      this.app.metadataCache,
      result,
    );
  }

  static createSuggestion(
    currentWorkspaceEnvList: WorkspaceEnvList,
    bookmarkInfo: BookmarksItemInfo,
    settings: SwitcherPlusSettings,
    metadataCache: MetadataCache,
    result: SearchResultWithFallback,
  ): BookmarksSuggestion {
    let sugg: BookmarksSuggestion = {
      type: SuggestionType.Bookmark,
      item: bookmarkInfo.item,
      bookmarkPath: bookmarkInfo.bookmarkPath,
      file: bookmarkInfo.file,
      ...result,
    };

    sugg = Handler.updateWorkspaceEnvListStatus(currentWorkspaceEnvList, sugg);
    return Handler.applyMatchPriorityPreferences(sugg, settings, metadataCache);
  }

  static isBookmarksPluginFileItem(obj: unknown): obj is BookmarksPluginFileItem {
    return isOfType<BookmarksPluginFileItem>(obj, 'type', 'file');
  }

  static isBookmarksPluginGroupItem(obj: unknown): obj is BookmarksPluginGroupItem {
    return isOfType<BookmarksPluginFileItem>(obj, 'type', 'group');
  }
}
