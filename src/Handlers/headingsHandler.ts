import { getApi as getIconShortcodesApi } from '@aidenlx/obsidian-icon-shortcodes';
import { Handler } from './handler';
import { StandardExHandler } from './standardExHandler';
import { EditorHandler } from './editorHandler';
import { BookmarksHandler } from './bookmarksHandler';
import { Searcher, StringSearcher } from 'src/search';
import { HeadingsListFacetIds, SwitcherPlusSettings } from 'src/settings';
import {
  HeadingCache,
  SearchResult,
  TFile,
  TAbstractFile,
  sortSearchResults,
  WorkspaceLeaf,
  TFolder,
  ViewRegistry,
  renderResults,
  App,
  Pos,
} from 'obsidian';
import { InputInfo, ParsedCommand } from 'src/switcherPlus';
import {
  Mode,
  HeadingSuggestion,
  FileSuggestion,
  AliasSuggestion,
  UnresolvedSuggestion,
  HeadingIndicators,
  AnySuggestion,
  SuggestionType,
  MatchType,
  SearchResultWithFallback,
  EditorSuggestion,
  SessionOpts,
  BookmarksSuggestion,
  BookmarksItemInfo,
  Facet,
} from 'src/types';
import {
  isTFile,
  FrontMatterParser,
  matcherFnForRegExList,
  getTFileFromLeaf,
} from 'src/utils';

type SupportedSuggestionTypes =
  | HeadingSuggestion
  | FileSuggestion
  | AliasSuggestion
  | UnresolvedSuggestion
  | EditorSuggestion
  | BookmarksSuggestion;

export class HeadingsHandler extends Handler<SupportedSuggestionTypes> {
  getCommandString(_sessionOpts?: SessionOpts): string {
    return this.settings?.headingsListCommand;
  }

  validateCommand(
    inputInfo: InputInfo,
    index: number,
    filterText: string,
    _activeSuggestion: AnySuggestion,
    _activeLeaf: WorkspaceLeaf,
  ): ParsedCommand {
    inputInfo.mode = Mode.HeadingsList;

    const cmd = inputInfo.parsedCommand(Mode.HeadingsList);
    cmd.index = index;
    cmd.parsedInput = filterText;
    cmd.isValidated = true;

    return cmd;
  }

  onChooseSuggestion(sugg: HeadingSuggestion, evt: MouseEvent | KeyboardEvent): boolean {
    let handled = false;
    if (sugg) {
      const openState = this.getOpenViewState(sugg);
      this.navigateToLeafOrOpenFile(
        evt,
        sugg.file,
        'Unable to navigate to heading for file.',
        openState,
      );

      handled = true;
    }

    return handled;
  }

  override getPreferredViewLinePosition(sugg?: HeadingSuggestion): Pos {
    return sugg?.item?.position;
  }

  renderSuggestion(sugg: HeadingSuggestion, parentEl: HTMLElement): boolean {
    let handled = false;
    if (sugg) {
      const { item, file, match } = sugg;
      const { app, settings } = this;

      this.addClassesToSuggestionContainer(parentEl, [
        'qsp-suggestion-headings',
        `qsp-headings-l${item.level}`,
      ]);

      const { contentEl, titleEl } = Handler.createContentStructureElements(parentEl);
      HeadingsHandler.renderHeadingContent(app, settings, titleEl, item, file, match);
      this.renderPath(contentEl, file);

      // render the flair icons
      const flairContainerEl = this.createFlairContainer(parentEl);
      this.renderOptionalIndicators(parentEl, sugg, flairContainerEl);
      this.renderIndicator(
        flairContainerEl,
        ['qsp-headings-indicator'],
        null,
        HeadingIndicators[item.level],
      );

      if (sugg.downranked) {
        parentEl.addClass('mod-downranked');
      }

      handled = true;
    }

    return handled;
  }

  /**
   * Renders the heading content into titleEl. Note when shouldRenderAsHTML is true
   * rendering will happen asynchronously
   *
   * @static
   * @param {App} app
   * @param {SwitcherPlusSettings} config
   * @param {HTMLElement} titleEl The parent element that the heading text content should
   * be rended into
   * @param {HeadingCache} headingCache
   * @param {TFile} sourceFile The source file that contains the heading, used for
   * resolving relative links
   * @param {?SearchResult} [searchResult]
   * @param {?boolean} [renderAsHTMLOverride] True to convert markdown text to HTML
   * elements using MarkdownRenderer.render. This means that search matches (if any) will
   * not be highlighted in the resulting HTML. False to keep markdown text and search matches
   * (if any) will be highlighted. Omit this parameter to respect user defined rendering
   * settings.
   */
  static renderHeadingContent(
    app: App,
    config: SwitcherPlusSettings,
    titleEl: HTMLElement,
    headingCache: HeadingCache,
    sourceFile: TFile,
    searchResult?: SearchResult,
    renderAsHTMLOverride?: boolean,
  ): void {
    const { heading } = headingCache;
    const {
      renderMarkdownContentInSuggestions: { isEnabled, renderHeadings },
    } = config;

    let headingText = heading;
    const iconShortcodesApi = getIconShortcodesApi();

    if (iconShortcodesApi) {
      headingText = iconShortcodesApi.postProcessor(headingText, (iconText: string) => {
        const iconResult = iconShortcodesApi.getIcon(iconText).innerText;
        return iconResult ?? iconText;
      });
    }

    // If the override is null or undefined, fallback to the config value
    renderAsHTMLOverride = renderAsHTMLOverride ?? (isEnabled && renderHeadings);

    if (renderAsHTMLOverride) {
      Handler.renderMarkdownContentAsync(app, titleEl, headingText, sourceFile.path);
    } else {
      renderResults(titleEl, headingText, searchResult);
    }
  }

  getAvailableFacets(inputInfo: InputInfo): Facet[] {
    const {
      settings: {
        shouldSearchHeadings,
        shouldSearchBookmarks,
        shouldSearchFilenames,
        shouldSearchRecentFiles,
        builtInSystemOptions: { showAttachments, showAllFileTypes },
      },
    } = this;

    const externalFilesEnabled = showAttachments || showAllFileTypes;

    // List of facetIds that depend on the corresponding feature being enabled
    const featureEnablementStatus: Partial<Record<HeadingsListFacetIds, boolean>> = {
      [HeadingsListFacetIds.RecentFiles]: shouldSearchRecentFiles,
      [HeadingsListFacetIds.Bookmarks]: shouldSearchBookmarks,
      [HeadingsListFacetIds.Filenames]: shouldSearchFilenames,
      [HeadingsListFacetIds.Headings]: shouldSearchHeadings,
      [HeadingsListFacetIds.ExternalFiles]: externalFilesEnabled,
    };

    return this.getFacets(inputInfo.mode).filter((facet) => {
      // If the facetId exists in the feature list, set its availability to the
      // corresponding feature availability
      if (Object.prototype.hasOwnProperty.call(featureEnablementStatus, facet.id)) {
        facet.isAvailable = featureEnablementStatus[facet.id as HeadingsListFacetIds];
      }

      return facet.isAvailable;
    });
  }

  getSuggestions(inputInfo: InputInfo): SupportedSuggestionTypes[] {
    let suggestions: SupportedSuggestionTypes[] = [];

    if (inputInfo) {
      const { hasSearchTerm } = inputInfo.parsedInputQuery;
      const { settings } = this;
      const activeFacetIds = this.getActiveFacetIds(inputInfo);
      const hasActiveFacets = !!activeFacetIds.size;

      if (hasSearchTerm || hasActiveFacets) {
        const { limit } = settings;
        const {
          app: { vault },
        } = this;

        // initialize options
        const options = {
          headings: settings.shouldSearchHeadings,
          allHeadings: settings.searchAllHeadings,
          aliases: settings.shouldShowAlias,
          bookmarks: settings.shouldSearchBookmarks,
          filename: settings.shouldSearchFilenames,
          filenameAsFallback: !settings.strictHeadingsOnly,
          unresolved: !settings.showExistingOnly,
        };

        this.getItems([vault.getRoot()], inputInfo, suggestions, activeFacetIds, options);
        sortSearchResults(suggestions);

        if (limit > 0 && suggestions.length > limit) {
          suggestions = suggestions.slice(0, limit);
        }
      } else {
        this.getSuggestionsForEditorsAndRecentFiles(
          inputInfo,
          suggestions as (HeadingSuggestion | FileSuggestion | EditorSuggestion)[],
          new Set<string>(),
          { editors: true, recentFiles: settings.shouldSearchRecentFiles },
        );
      }
    }

    return suggestions;
  }

  getItems(
    files: TAbstractFile[],
    inputInfo: InputInfo,
    collection: SupportedSuggestionTypes[],
    activeFacetIds: Set<string>,
    options: {
      headings?: boolean;
      allHeadings?: boolean;
      aliases?: boolean;
      bookmarks?: boolean;
      filename?: boolean;
      filenameAsFallback?: boolean;
      unresolved?: boolean;
    },
  ): void {
    const hasActiveFacets = !!activeFacetIds.size;
    const searcher = Searcher.create(inputInfo.parsedInputQuery.query);

    // Editors and recent files should only be displayed when there's no search term, or when
    // it's faceted with recentFiles
    const editorAndRecentOptions = { editors: false, recentFiles: false };
    this.getSuggestionsForEditorsAndRecentFiles(
      inputInfo,
      collection as (HeadingSuggestion | FileSuggestion | EditorSuggestion)[],
      activeFacetIds,
      editorAndRecentOptions,
    );

    // Use the bookmark enabled state to determine whether or not to include them
    const bookmarkOptions = {
      fileBookmarks: options.bookmarks,
      nonFileBookmarks: options.bookmarks,
    };
    this.getSuggestionsForBookmarks(
      inputInfo,
      searcher,
      collection,
      activeFacetIds,
      bookmarkOptions,
    );

    // Set up options for processing the collections of files
    const fileOptions = {
      headings: options.headings,
      allHeadings: options.allHeadings,
      aliases: options.aliases,
      filename: options.filename,
      filenameAsFallback: options.filenameAsFallback,
    };
    this.getSuggestionForFiles(
      inputInfo,
      searcher,
      files,
      collection,
      activeFacetIds,
      fileOptions,
    );

    // Since there's no facet for unresolved, they should never show up when
    // facets are active.
    if (options.unresolved && !hasActiveFacets) {
      this.addUnresolvedSuggestions(collection as UnresolvedSuggestion[], searcher);
    }
  }

  getSuggestionsForBookmarks(
    inputInfo: InputInfo,
    searcher: StringSearcher,
    collection: SupportedSuggestionTypes[],
    activeFacetIds: Set<string>,
    options: {
      fileBookmarks?: boolean;
      nonFileBookmarks?: boolean;
    },
  ): void {
    const hasActiveFacets = !!activeFacetIds.size;
    const { fileBookmarks, nonFileBookmarks } = inputInfo.currentWorkspaceEnvList;

    if (hasActiveFacets) {
      const isBookmarkFacetEnabled = activeFacetIds.has(HeadingsListFacetIds.Bookmarks);

      options = Object.assign(options, {
        fileBookmarks: isBookmarkFacetEnabled,
        nonFileBookmarks: isBookmarkFacetEnabled,
      });
    }

    const processBookmarks = (bookmarkInfoList: Iterable<BookmarksItemInfo>) => {
      for (const bookmarkInfo of bookmarkInfoList) {
        this.addBookmarkSuggestion(
          inputInfo,
          collection as BookmarksSuggestion[],
          searcher,
          bookmarkInfo,
        );
      }
    };

    if (options.fileBookmarks) {
      fileBookmarks.forEach((bookmarkInfoList) => {
        processBookmarks(bookmarkInfoList);
      });
    }

    if (options.nonFileBookmarks) {
      processBookmarks(nonFileBookmarks);
    }
  }

  getSuggestionForFiles(
    inputInfo: InputInfo,
    searcher: StringSearcher,
    files: TAbstractFile[],
    collection: SupportedSuggestionTypes[],
    activeFacetIds: Set<string>,
    options: {
      headings?: boolean;
      allHeadings?: boolean;
      aliases?: boolean;
      filename?: boolean;
      filenameAsFallback?: boolean;
    },
  ): void {
    const hasActiveFacets = !!activeFacetIds.size;

    if (hasActiveFacets) {
      const isHeadingsEnabled = this.isFacetedWith(
        activeFacetIds,
        HeadingsListFacetIds.Headings,
      );

      const isExternalFilesEnabled = this.isFacetedWith(
        activeFacetIds,
        HeadingsListFacetIds.ExternalFiles,
      );

      // Enable filename when external files facet is active, or, when the Filename
      // facet is active
      const isFilenameEnabled =
        isExternalFilesEnabled ||
        this.isFacetedWith(activeFacetIds, HeadingsListFacetIds.Filenames);

      let allHeadings = false;
      let filenameAsFallback = false;

      if (isHeadingsEnabled) {
        allHeadings = options.allHeadings === true;
        filenameAsFallback = options.filenameAsFallback === true;
      }

      options = Object.assign(options, {
        headings: isHeadingsEnabled,
        aliases: false,
        filename: isFilenameEnabled,
        allHeadings,
        filenameAsFallback,
      });
    } else {
      options = Object.assign(
        {
          headings: true,
          allHeadings: true,
          aliases: true,
          filename: true,
          filenameAsFallback: true,
        },
        options,
      );
    }

    // If any of these options are true then every file needs to be processed.
    const shouldProcessFiles = [options.headings, options.aliases, options.filename].some(
      (option) => option === true,
    );

    if (shouldProcessFiles) {
      const { excludeFolders } = this.settings;
      const isExcludedFolder = matcherFnForRegExList(excludeFolders);
      let nodes = Array.prototype.concat(files) as TAbstractFile[];

      while (nodes.length > 0) {
        const node = nodes.pop();

        if (isTFile(node)) {
          if (this.shouldIncludeFile(node, activeFacetIds)) {
            this.addSuggestionsForFile(inputInfo, searcher, collection, node, options);
          }
        } else if (!isExcludedFolder(node.path)) {
          nodes = nodes.concat((node as TFolder).children);
        }
      }
    }
  }

  addSuggestionsForFile(
    inputInfo: InputInfo,
    searcher: StringSearcher,
    suggestions: SupportedSuggestionTypes[],
    file: TFile,
    options: {
      headings?: boolean;
      allHeadings?: boolean;
      aliases?: boolean;
      filename?: boolean;
      filenameAsFallback?: boolean;
    },
  ): void {
    let isH1Matched = false;

    if (options.headings) {
      isH1Matched = this.addHeadingSuggestions(
        inputInfo,
        searcher,
        suggestions as HeadingSuggestion[],
        file,
        options.allHeadings,
      );
    }

    if (options.filename || (!isH1Matched && options.filenameAsFallback)) {
      this.addFileSuggestions(inputInfo, searcher, suggestions as FileSuggestion[], file);
    }

    if (options.aliases) {
      this.addAliasSuggestions(
        inputInfo,
        searcher,
        suggestions as AliasSuggestion[],
        file,
      );
    }
  }

  shouldIncludeFile(file: TFile, activeFacetIds = new Set<string>()): boolean {
    let isIncluded = false;

    if (file) {
      const coreFileExtensions = new Set(['md', 'canvas']);
      const { extension } = file;

      const {
        app: { viewRegistry, metadataCache },
        settings: {
          excludeObsidianIgnoredFiles,
          fileExtAllowList,
          builtInSystemOptions: { showAttachments, showAllFileTypes },
        },
      } = this;

      const isUserIgnored =
        excludeObsidianIgnoredFiles && metadataCache.isUserIgnored(file.path);

      if (!isUserIgnored) {
        if (activeFacetIds.has(HeadingsListFacetIds.ExternalFiles)) {
          const externalFilesEnabled = showAttachments || showAllFileTypes;
          isIncluded = !coreFileExtensions.has(extension) && externalFilesEnabled;
        } else {
          const isExtAllowed = this.isExternalFileTypeAllowed(
            file,
            viewRegistry,
            showAttachments,
            showAllFileTypes,
            fileExtAllowList,
          );

          isIncluded = isExtAllowed || coreFileExtensions.has(extension);
        }
      }
    }

    return isIncluded;
  }

  isExternalFileTypeAllowed(
    file: TFile,
    viewRegistry: ViewRegistry,
    showAttachments: boolean,
    showAllFileTypes: boolean,
    fileExtAllowList: string[],
  ): boolean {
    const { extension } = file;

    let isAllowed = viewRegistry.isExtensionRegistered(extension)
      ? showAttachments
      : showAllFileTypes;

    if (!isAllowed) {
      const allowList = new Set(fileExtAllowList);
      isAllowed = allowList.has(extension);
    }

    return isAllowed;
  }

  addAliasSuggestions(
    inputInfo: InputInfo,
    searcher: StringSearcher,
    suggestions: AliasSuggestion[],
    file: TFile,
  ): void {
    const { metadataCache } = this.app;
    const frontMatter = metadataCache.getFileCache(file)?.frontmatter;

    if (frontMatter) {
      const aliases = FrontMatterParser.getAliases(frontMatter);
      let i = aliases.length;

      // create suggestions where there is a match with an alias
      while (i--) {
        const alias = aliases[i];
        const { match } = searcher.searchWithFallback(alias);

        if (match) {
          suggestions.push(this.createAliasSuggestion(inputInfo, alias, file, match));
        }
      }
    }
  }

  addFileSuggestions(
    inputInfo: InputInfo,
    searcher: StringSearcher,
    suggestions: FileSuggestion[],
    file: TFile,
  ): void {
    const { match, matchType, matchText } = searcher.searchWithFallback(null, file);

    if (match) {
      suggestions.push(
        this.createFileSuggestion(inputInfo, file, match, matchType, matchText),
      );
    }
  }

  addBookmarkSuggestion(
    inputInfo: InputInfo,
    suggestions: BookmarksSuggestion[],
    searcher: StringSearcher,
    bookmarkInfo: BookmarksItemInfo,
  ): void {
    const result = searcher.searchWithFallback(bookmarkInfo.bookmarkPath);

    if (result.match) {
      const sugg = BookmarksHandler.createSuggestion(
        inputInfo.currentWorkspaceEnvList,
        bookmarkInfo,
        this.settings,
        this.app.metadataCache,
        result,
      );

      suggestions.push(sugg);
    }
  }

  addHeadingSuggestions(
    inputInfo: InputInfo,
    searcher: StringSearcher,
    suggestions: HeadingSuggestion[],
    file: TFile,
    allHeadings: boolean,
  ): boolean {
    const { metadataCache } = this.app;
    const headingList = metadataCache.getFileCache(file)?.headings ?? [];
    let h1: HeadingCache = null;
    let isH1Matched = false;
    let i = headingList.length;

    while (i--) {
      const heading = headingList[i];
      let isMatched = false;

      if (allHeadings) {
        isMatched = this.matchAndPushHeading(
          inputInfo,
          searcher,
          suggestions,
          file,
          heading,
        );
      }

      if (heading.level === 1) {
        const { line } = heading.position.start;

        if (h1 === null || line < h1.position.start.line) {
          h1 = heading;
          isH1Matched = isMatched;
        }
      }
    }

    if (!allHeadings && h1) {
      isH1Matched = this.matchAndPushHeading(inputInfo, searcher, suggestions, file, h1);
    }

    return isH1Matched;
  }

  matchAndPushHeading(
    inputInfo: InputInfo,
    searcher: StringSearcher,
    suggestions: HeadingSuggestion[],
    file: TFile,
    heading: HeadingCache,
  ): boolean {
    const { match } = searcher.searchWithFallback(heading.heading);

    if (match) {
      suggestions.push(this.createHeadingSuggestion(inputInfo, heading, file, match));
    }

    return !!match;
  }

  addUnresolvedSuggestions(
    suggestions: UnresolvedSuggestion[],
    searcher: StringSearcher,
  ): void {
    const { metadataCache } = this.app;
    const { unresolvedLinks } = metadataCache;

    const unresolvedSet = new Set<string>();
    const sources = Object.keys(unresolvedLinks);
    let i = sources.length;

    // create a distinct list of unresolved links
    while (i--) {
      // each source has an object with keys that represent the list of unresolved links
      // for that source file
      const sourcePath = sources[i];
      const links = Object.keys(unresolvedLinks[sourcePath]);
      let j = links.length;

      while (j--) {
        // unresolved links can be duplicates, use a Set to get a distinct list
        unresolvedSet.add(links[j]);
      }
    }

    const unresolvedList = Array.from(unresolvedSet);
    i = unresolvedList.length;

    // create suggestions where there is a match with an unresolved link
    while (i--) {
      const unresolved = unresolvedList[i];
      const result = searcher.searchWithFallback(unresolved);

      if (result.matchType !== MatchType.None) {
        suggestions.push(
          StandardExHandler.createUnresolvedSuggestion(
            unresolved,
            result,
            this.settings,
            metadataCache,
          ),
        );
      }
    }
  }

  createAliasSuggestion(
    inputInfo: InputInfo,
    alias: string,
    file: TFile,
    match: SearchResult,
  ): AliasSuggestion {
    let sugg: AliasSuggestion = {
      alias,
      file,
      ...this.createSearchMatch(match, MatchType.Primary, alias),
      type: SuggestionType.Alias,
    };

    sugg = Handler.updateWorkspaceEnvListStatus(inputInfo.currentWorkspaceEnvList, sugg);
    return this.applyMatchPriorityPreferences(sugg);
  }

  createFileSuggestion(
    inputInfo: InputInfo,
    file: TFile,
    match: SearchResult,
    matchType: MatchType,
    matchText: string,
  ): FileSuggestion {
    let sugg: FileSuggestion = {
      file,
      match,
      matchType,
      matchText,
      type: SuggestionType.File,
    };

    sugg = Handler.updateWorkspaceEnvListStatus(inputInfo.currentWorkspaceEnvList, sugg);
    return this.applyMatchPriorityPreferences(sugg);
  }

  createHeadingSuggestion(
    inputInfo: InputInfo,
    item: HeadingCache,
    file: TFile,
    match: SearchResult,
  ): HeadingSuggestion {
    let sugg: HeadingSuggestion = {
      item,
      file,
      ...this.createSearchMatch(match, MatchType.Primary, item.heading),
      type: SuggestionType.HeadingsList,
    };

    sugg = Handler.updateWorkspaceEnvListStatus(inputInfo.currentWorkspaceEnvList, sugg);
    return this.applyMatchPriorityPreferences(sugg);
  }

  createSearchMatch(
    match: SearchResult,
    type: MatchType,
    text: string,
  ): SearchResultWithFallback {
    let matchType = MatchType.None;
    let matchText = null;

    if (match) {
      matchType = type;
      matchText = text;
    }

    return {
      match,
      matchType,
      matchText,
    };
  }

  addRecentFilesSuggestions(
    file: TFile,
    inputInfo: InputInfo,
    searcher: StringSearcher,
    collection: (HeadingSuggestion | FileSuggestion)[],
  ): void {
    const h1 = this.getFirstH1(file);
    const { match, matchType, matchText } = searcher.searchWithFallback(
      h1?.heading,
      file,
    );

    if (match) {
      let sugg: HeadingSuggestion | FileSuggestion;

      if (matchType === MatchType.Primary) {
        sugg = this.createHeadingSuggestion(inputInfo, h1, file, match);
      } else {
        sugg = this.createFileSuggestion(inputInfo, file, match, matchType, matchText);
      }

      collection.push(sugg);
    }
  }

  addOpenEditorSuggestions(
    leaf: WorkspaceLeaf,
    inputInfo: InputInfo,
    searcher: StringSearcher,
    collection: EditorSuggestion[],
  ): void {
    const file = getTFileFromLeaf(leaf);
    const {
      settings,
      app: { metadataCache },
    } = this;

    const preferredTitle = EditorHandler.getPreferredTitle(
      leaf,
      settings.preferredSourceForTitle,
      metadataCache,
    );

    const result = searcher.searchWithFallback(preferredTitle, file);

    if (result.match) {
      const sugg = EditorHandler.createSuggestion(
        inputInfo.currentWorkspaceEnvList,
        leaf,
        file,
        settings,
        metadataCache,
        preferredTitle,
        result,
      );

      collection.push(sugg);
    }
  }

  getSuggestionsForEditorsAndRecentFiles(
    inputInfo: InputInfo,
    collection: (HeadingSuggestion | FileSuggestion | EditorSuggestion)[],
    activeFacetIds: Set<string>,
    options: {
      editors?: boolean;
      recentFiles?: boolean;
    },
  ): void {
    const { query } = inputInfo.parsedInputQuery;
    const searcher = Searcher.create(query);

    if (activeFacetIds.has(HeadingsListFacetIds.RecentFiles)) {
      options = Object.assign(options, { editors: false, recentFiles: true });
    } else {
      options = Object.assign({ editors: true, recentFiles: true }, options);
    }

    if (options.editors) {
      const leaves = inputInfo.currentWorkspaceEnvList?.openWorkspaceLeaves;

      leaves?.forEach((leaf) => {
        this.addOpenEditorSuggestions(
          leaf,
          inputInfo,
          searcher,
          collection as EditorSuggestion[],
        );
      });
    }

    if (options.recentFiles) {
      const files = inputInfo.currentWorkspaceEnvList?.mostRecentFiles;

      files?.forEach((file) => {
        if (this.shouldIncludeFile(file, activeFacetIds)) {
          this.addRecentFilesSuggestions(
            file,
            inputInfo,
            searcher,
            collection as (HeadingSuggestion | FileSuggestion)[],
          );
        }
      });
    }
  }

  override onNoResultsCreateAction(
    inputInfo: InputInfo,
    evt: MouseEvent | KeyboardEvent,
  ): boolean {
    const filename = inputInfo.parsedCommand(Mode.HeadingsList)?.parsedInput;
    this.createFile(filename, evt);
    return true;
  }
}
