import {
  HeadingCache,
  PreparedQuery,
  SearchResult,
  TFile,
  TAbstractFile,
  sortSearchResults,
  WorkspaceLeaf,
  TFolder,
} from 'obsidian';
import { InputInfo } from 'src/switcherPlus';
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
} from 'src/types';
import { isTFile, FrontMatterParser, matcherFnForRegExList } from 'src/utils';
import { Handler } from './handler';

type SupportedSuggestionTypes =
  | HeadingSuggestion
  | FileSuggestion
  | AliasSuggestion
  | UnresolvedSuggestion
  | EditorSuggestion;

export class HeadingsHandler extends Handler<SupportedSuggestionTypes> {
  override get commandString(): string {
    return this.settings?.headingsListCommand;
  }

  validateCommand(
    inputInfo: InputInfo,
    index: number,
    filterText: string,
    _activeSuggestion: AnySuggestion,
    _activeLeaf: WorkspaceLeaf,
  ): void {
    inputInfo.mode = Mode.HeadingsList;

    const headingsCmd = inputInfo.parsedCommand(Mode.HeadingsList);
    headingsCmd.index = index;
    headingsCmd.parsedInput = filterText;
    headingsCmd.isValidated = true;
  }

  onChooseSuggestion(sugg: HeadingSuggestion, evt: MouseEvent | KeyboardEvent): void {
    if (sugg) {
      const {
        start: { line, col },
        end: endLoc,
      } = sugg.item.position;

      // state information to highlight the target heading
      const eState = {
        active: true,
        focus: true,
        startLoc: { line, col },
        endLoc,
        line,
        cursor: {
          from: { line, ch: col },
          to: { line, ch: col },
        },
      };

      this.navigateToLeafOrOpenFile(
        evt,
        sugg.file,
        'Unable to navigate to heading for file.',
        { active: true, eState },
      );
    }
  }

  renderSuggestion(sugg: HeadingSuggestion, parentEl: HTMLElement): void {
    if (sugg) {
      const { item } = sugg;

      this.addClassesToSuggestionContainer(parentEl, [
        'qsp-suggestion-headings',
        `qsp-headings-l${item.level}`,
      ]);

      const contentEl = this.renderContent(parentEl, item.heading, sugg.match);
      this.renderPath(contentEl, sugg.file);

      // render the flair icon
      const flairContainerEl = this.createFlairContainer(parentEl);
      flairContainerEl.createSpan({
        cls: ['suggestion-flair', 'qsp-headings-indicator'],
        text: HeadingIndicators[item.level],
      });

      this.renderOptionalIndicators(sugg.optionalIndicators, parentEl, flairContainerEl);

      if (sugg.downranked) {
        parentEl.addClass('mod-downranked');
      }
    }
  }

  getSuggestions(inputInfo: InputInfo): SupportedSuggestionTypes[] {
    let suggestions: SupportedSuggestionTypes[] = [];

    if (inputInfo) {
      inputInfo.buildSearchQuery();
      const { prepQuery, hasSearchTerm } = inputInfo.searchQuery;

      if (hasSearchTerm) {
        const { limit } = this.settings;
        suggestions = this.getAllFilesSuggestions(prepQuery);
        sortSearchResults(suggestions);

        if (suggestions.length > 0 && limit > 0) {
          suggestions = suggestions.slice(0, limit);
        }
      } else {
        suggestions = this.getInitialSuggestionList();
      }
    }

    return suggestions;
  }

  getAllFilesSuggestions(prepQuery: PreparedQuery): SupportedSuggestionTypes[] {
    const suggestions: SupportedSuggestionTypes[] = [];
    const {
      app: { vault },
      settings: { strictHeadingsOnly, showExistingOnly, excludeFolders },
    } = this;

    const isExcludedFolder = matcherFnForRegExList(excludeFolders);
    let nodes: TAbstractFile[] = [vault.getRoot()];

    while (nodes.length > 0) {
      const node = nodes.pop();

      if (isTFile(node)) {
        this.addSuggestionsFromFile(suggestions, node, prepQuery);
      } else if (!isExcludedFolder(node.path)) {
        nodes = nodes.concat((node as TFolder).children);
      }
    }

    if (!strictHeadingsOnly && !showExistingOnly) {
      this.addUnresolvedSuggestions(suggestions as UnresolvedSuggestion[], prepQuery);
    }

    return suggestions;
  }

  addSuggestionsFromFile(
    suggestions: SupportedSuggestionTypes[],
    file: TFile,
    prepQuery: PreparedQuery,
  ): void {
    const {
      searchAllHeadings,
      strictHeadingsOnly,
      shouldSearchFilenames,
      shouldShowAlias,
    } = this.settings;

    if (this.shouldIncludeFile(file)) {
      const isH1Matched = this.addHeadingSuggestions(
        suggestions as HeadingSuggestion[],
        prepQuery,
        file,
        searchAllHeadings,
      );

      if (!strictHeadingsOnly) {
        if (shouldSearchFilenames || !isH1Matched) {
          // if strict is disabled and filename search is enabled or there
          // isn't an H1 match, then do a fallback search against the filename, then path
          this.addFileSuggestions(suggestions as FileSuggestion[], prepQuery, file);
        }

        if (shouldShowAlias) {
          this.addAliasSuggestions(suggestions as AliasSuggestion[], prepQuery, file);
        }
      }
    }
  }

  downrankScoreIfIgnored<
    T extends Exclude<SupportedSuggestionTypes, UnresolvedSuggestion | EditorSuggestion>,
  >(sugg: T): T {
    if (this.app.metadataCache.isUserIgnored(sugg?.file?.path)) {
      sugg.downranked = true;

      if (sugg.match) {
        sugg.match.score -= 10;
      }
    }

    return sugg;
  }

  shouldIncludeFile(file: TAbstractFile): boolean {
    let retVal = false;
    const {
      settings: {
        excludeObsidianIgnoredFiles,
        builtInSystemOptions: { showAttachments, showAllFileTypes },
      },
      app: { viewRegistry, metadataCache },
    } = this;

    if (isTFile(file)) {
      const { extension } = file;

      if (!metadataCache.isUserIgnored(file.path) || !excludeObsidianIgnoredFiles) {
        retVal = viewRegistry.isExtensionRegistered(extension)
          ? showAttachments || extension === 'md'
          : showAllFileTypes;
      }
    }

    return retVal;
  }

  private addAliasSuggestions(
    suggestions: AliasSuggestion[],
    prepQuery: PreparedQuery,
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
        const { match } = this.fuzzySearchWithFallback(prepQuery, alias);

        if (match) {
          suggestions.push(this.createAliasSuggestion(alias, file, match));
        }
      }
    }
  }

  private addFileSuggestions(
    suggestions: FileSuggestion[],
    prepQuery: PreparedQuery,
    file: TFile,
  ): void {
    const { match, matchType, matchText } = this.fuzzySearchWithFallback(
      prepQuery,
      null,
      file,
    );

    if (match) {
      suggestions.push(this.createFileSuggestion(file, match, matchType, matchText));
    }
  }

  private addHeadingSuggestions(
    suggestions: HeadingSuggestion[],
    prepQuery: PreparedQuery,
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
        isMatched = this.matchAndPushHeading(suggestions, prepQuery, file, heading);
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
      isH1Matched = this.matchAndPushHeading(suggestions, prepQuery, file, h1);
    }

    return isH1Matched;
  }

  private matchAndPushHeading(
    suggestions: HeadingSuggestion[],
    prepQuery: PreparedQuery,
    file: TFile,
    heading: HeadingCache,
  ): boolean {
    const { match } = this.fuzzySearchWithFallback(prepQuery, heading.heading);

    if (match) {
      suggestions.push(this.createHeadingSuggestion(heading, file, match));
    }

    return !!match;
  }

  private addUnresolvedSuggestions(
    suggestions: UnresolvedSuggestion[],
    prepQuery: PreparedQuery,
  ): void {
    const { unresolvedLinks } = this.app.metadataCache;

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
      const { match } = this.fuzzySearchWithFallback(prepQuery, unresolved);

      if (match) {
        suggestions.push(this.createUnresolvedSuggestion(unresolved, match));
      }
    }
  }

  private createAliasSuggestion(
    alias: string,
    file: TFile,
    match: SearchResult,
  ): AliasSuggestion {
    const sugg: AliasSuggestion = {
      alias,
      file,
      ...this.createSearchMatch(match, MatchType.Primary, alias),
      type: SuggestionType.Alias,
    };

    return this.downrankScoreIfIgnored(sugg);
  }

  private createUnresolvedSuggestion(
    linktext: string,
    match: SearchResult,
  ): UnresolvedSuggestion {
    return {
      linktext,
      ...this.createSearchMatch(match, MatchType.Primary, linktext),
      type: SuggestionType.Unresolved,
    };
  }

  private createFileSuggestion(
    file: TFile,
    match: SearchResult,
    matchType = MatchType.None,
    matchText: string = null,
  ): FileSuggestion {
    const sugg: FileSuggestion = {
      file,
      match,
      matchType,
      matchText,
      type: SuggestionType.File,
    };

    return this.downrankScoreIfIgnored(sugg);
  }

  private createHeadingSuggestion(
    item: HeadingCache,
    file: TFile,
    match: SearchResult,
  ): HeadingSuggestion {
    const sugg: HeadingSuggestion = {
      item,
      file,
      ...this.createSearchMatch(match, MatchType.Primary, item.heading),
      type: SuggestionType.HeadingsList,
    };

    return this.downrankScoreIfIgnored(sugg);
  }

  createEditorSuggestion(
    item: WorkspaceLeaf,
    file: TFile,
    match: SearchResult,
  ): EditorSuggestion {
    const sugg: EditorSuggestion = {
      item,
      file,
      ...this.createSearchMatch(match, MatchType.None, null),
      type: SuggestionType.EditorList,
    };

    return sugg;
  }

  private createSearchMatch(
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

  getRecentFilesSuggestions(
    ignoreFiles: TAbstractFile[] = [],
  ): (HeadingSuggestion | FileSuggestion)[] {
    const suggestions: (HeadingSuggestion | FileSuggestion)[] = [];
    const { workspace, vault, metadataCache } = this.app;
    const recentFilePaths = workspace.getLastOpenFiles();

    recentFilePaths.forEach((path) => {
      const file = vault.getAbstractFileByPath(path);

      if (!ignoreFiles.includes(file) && this.shouldIncludeFile(file)) {
        const f = file as TFile;
        let h1: HeadingCache = null;

        const h1s = metadataCache
          .getFileCache(f)
          ?.headings?.filter((h) => h.level === 1)
          .sort((a, b) => a.position.start.line - b.position.start.line);

        if (h1s?.length) {
          h1 = h1s[0];
        }

        const sugg = h1
          ? this.createHeadingSuggestion(h1, f, null)
          : this.createFileSuggestion(f, null);

        sugg.optionalIndicators = ['qsp-recent-indicator'];
        suggestions.push(sugg);
      }
    });

    return suggestions;
  }

  getOpenEditorSuggestions(): EditorSuggestion[] {
    const suggestions: EditorSuggestion[] = [];
    const { excludeViewTypes } = this.settings;
    const leaves = this.getOpenLeaves(excludeViewTypes);

    leaves.forEach((leaf) => {
      const file = leaf.view?.file;
      const sugg = this.createEditorSuggestion(leaf, file, null);

      sugg.optionalIndicators = ['qsp-editor-indicator'];
      suggestions.push(sugg);
    });

    return suggestions;
  }

  getInitialSuggestionList(): (HeadingSuggestion | FileSuggestion | EditorSuggestion)[] {
    const openEditors = this.getOpenEditorSuggestions();
    const ignoreFiles = openEditors.map((v) => v.file);
    const recentFiles = this.getRecentFilesSuggestions(ignoreFiles);

    return [...openEditors, ...recentFiles];
  }
}
