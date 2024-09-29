import { getInternalEnabledPluginById, isOfType } from 'src/utils';
import { Searcher } from 'src/search';
import { InputInfo, ParsedCommand, WorkspaceEnvList } from 'src/switcherPlus';
import {
  AnySuggestion,
  BookmarksItemInfo,
  BookmarksSuggestion,
  MatchType,
  Mode,
  SearchResultWithFallback,
  SessionOpts,
  SuggestionType,
  TitleSource,
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
  ): ParsedCommand {
    const cmd = inputInfo.parsedCommand(Mode.BookmarksList);

    if (this.getEnabledBookmarksPluginInstance()) {
      inputInfo.mode = Mode.BookmarksList;

      cmd.index = index;
      cmd.parsedInput = filterText;
      cmd.isValidated = true;
    }

    return cmd;
  }

  getSuggestions(inputInfo: InputInfo): BookmarksSuggestion[] {
    const suggestions: BookmarksSuggestion[] = [];

    if (inputInfo) {
      const { query, hasSearchTerm } = inputInfo.parsedInputQuery;
      const searcher = Searcher.create(query);
      const { allBookmarks } = this.getItems(inputInfo);

      allBookmarks.forEach((info) => {
        let shouldPush = true;
        let result: SearchResultWithFallback = { matchType: MatchType.None, match: null };

        if (hasSearchTerm) {
          result = searcher.searchWithFallback(info.bookmarkPath);
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

  getPreferredTitle(
    pluginInstance: BookmarksPluginInstance,
    bookmark: BookmarksPluginItem,
    file: TFile,
    titleSource: TitleSource,
  ): string {
    let text = pluginInstance.getItemTitle(bookmark);

    if (titleSource === 'H1' && file) {
      const h1 = this.getFirstH1(file);

      if (h1) {
        // the "#" represents the start of a heading deep link,
        // "#^" represents the the start of a deep block link,
        // so everything before "#" should represent the filename that
        // needs to be replaced with the file title
        text = text.replace(/^[^#]*/, h1.heading);
      }
    }

    return text;
  }

  getItems(inputInfo: InputInfo | null): {
    allBookmarks: BookmarksItemInfo[];
    fileBookmarks: Map<TFile, BookmarksItemInfo[]>;
    nonFileBookmarks: Set<BookmarksItemInfo>;
  } {
    const allBookmarks: BookmarksItemInfo[] = [];
    const fileBookmarks = new Map<TFile, BookmarksItemInfo[]>();
    const nonFileBookmarks = new Set<BookmarksItemInfo>();
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
            let bookmarkInfo: BookmarksItemInfo;

            if (BookmarksHandler.isBookmarksPluginFileItem(bookmark)) {
              const file = this.getTFileByPath(bookmark.path);

              // When a file is bookmarked and then deleted. The bookmark data is still
              // retained, this allows for the bookmark to be restore if the file is restored.
              // So if the source file for a file bookmark data cannot be found, then it
              // should not be added to the bookmarks list.
              if (file) {
                bookmarkInfo = { item: bookmark, bookmarkPath: null, file };

                const infoList = fileBookmarks.get(file) ?? [];
                infoList.push(bookmarkInfo);
                fileBookmarks.set(file, infoList);
              }
            } else {
              bookmarkInfo = { item: bookmark, bookmarkPath: null, file: null };
              nonFileBookmarks.add(bookmarkInfo);
            }

            if (bookmarkInfo) {
              const title = this.getPreferredTitle(
                pluginInstance,
                bookmark,
                bookmarkInfo.file,
                this.settings.preferredSourceForTitle,
              );

              bookmarkInfo.bookmarkPath = path + title;
              allBookmarks.push(bookmarkInfo);
            }
          }
        });
      };

      traverseBookmarks(pluginInstance.items, '');
    }

    return { allBookmarks, fileBookmarks, nonFileBookmarks };
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
