import {
  App,
  fuzzySearch,
  HeadingCache,
  PreparedQuery,
  SearchResult,
  TFile,
  SearchMatches,
  TAbstractFile,
  renderResults,
  sortSearchResults,
  WorkspaceLeaf,
  TFolder,
} from 'obsidian';
import { InputInfo } from 'src/switcherPlus';
import { SwitcherPlusSettings } from 'src/settings/';
import {
  Mode,
  HeadingSuggestion,
  FileSuggestion,
  AliasSuggestion,
  UnresolvedSuggestion,
  HeadingIndicators,
  Handler,
  AnySuggestion,
} from 'src/types';
import {
  isTFile,
  FrontMatterParser,
  stripMDExtensionFromPath,
  filenameFromPath,
  matcherFnForRegExList,
} from 'src/utils';

type SupportedSuggestionTypes =
  | HeadingSuggestion
  | FileSuggestion
  | AliasSuggestion
  | UnresolvedSuggestion;

export class HeadingsHandler implements Handler<SupportedSuggestionTypes> {
  get commandString(): string {
    return this.settings?.headingsListCommand;
  }

  constructor(private app: App, private settings: SwitcherPlusSettings) {}

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

  onChooseSuggestion(sugg: HeadingSuggestion, _evt: MouseEvent | KeyboardEvent): void {
    const { workspace } = this.app;

    if (sugg) {
      const {
        start: { line, col },
        end: endLoc,
      } = sugg.item.position;

      // state information to highlight the target heading
      const eState = {
        startLoc: { line, col },
        endLoc,
        line,
        cursor: {
          from: { line, ch: col },
          to: { line, ch: col },
        },
      };

      workspace
        .getLeaf(false)
        .openFile(sugg.file, {
          active: true,
          eState,
        })
        .catch(() => console.log('Switcher++: unable to open file.'));
    }
  }

  renderSuggestion(sugg: HeadingSuggestion, parentEl: HTMLElement): void {
    if (sugg) {
      const { item } = sugg;
      renderResults(parentEl, item.heading, sugg.match);

      parentEl.createSpan({
        cls: 'suggestion-flair',
        text: HeadingIndicators[item.level],
        prepend: true,
      });

      parentEl.createDiv({
        cls: 'suggestion-note',
        text: stripMDExtensionFromPath(sugg.file),
      });
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
        suggestions = this.getRecentFilesSuggestions();
      }
    }

    return suggestions;
  }

  private getAllFilesSuggestions(prepQuery: PreparedQuery): SupportedSuggestionTypes[] {
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
        this.processFile(suggestions, node, prepQuery);
      } else if (!isExcludedFolder(node.path)) {
        nodes = nodes.concat((node as TFolder).children);
      }
    }

    if (!strictHeadingsOnly && !showExistingOnly) {
      this.addUnresolvedSuggestions(suggestions as UnresolvedSuggestion[], prepQuery);
    }

    return suggestions;
  }

  private processFile(
    suggestions: SupportedSuggestionTypes[],
    file: TFile,
    prepQuery: PreparedQuery,
  ): void {
    const { settings } = this;

    if (this.shouldIncludeFile(file)) {
      const hasH1 = this.addHeadingSuggestions(
        suggestions as HeadingSuggestion[],
        prepQuery,
        file,
        settings.searchAllHeadings,
      );

      if (!settings.strictHeadingsOnly) {
        if (!hasH1) {
          // if there isn't a heading and strict is disabled, do a fallback search
          // against the file path
          this.addFileSuggestions(suggestions as FileSuggestion[], prepQuery, file);
        }

        if (settings.shouldShowAlias) {
          this.addAliasSuggestions(suggestions as AliasSuggestion[], prepQuery, file);
        }
      }
    }
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
        const { match } = this.matchStrings(prepQuery, alias, null);

        if (match) {
          suggestions.push(this.makeAliasSuggestion(alias, file, match));
        }
      }
    }
  }

  private addFileSuggestions(
    suggestions: FileSuggestion[],
    prepQuery: PreparedQuery,
    file: TFile,
  ): void {
    const path = stripMDExtensionFromPath(file);
    const filename = filenameFromPath(path);

    const { isPrimary, match } = this.matchStrings(prepQuery, filename, path);

    if (isPrimary) {
      this.adjustMatchIndicesForPath(match.matches, path.length - filename.length);
    }

    if (match) {
      suggestions.push(this.makeFileSuggestion(file, match));
    }
  }

  private addHeadingSuggestions(
    suggestions: HeadingSuggestion[],
    prepQuery: PreparedQuery,
    file: TFile,
    allHeadings: boolean,
  ): boolean {
    const { metadataCache } = this.app;
    const headingList = metadataCache.getFileCache(file)?.headings;
    let h1: HeadingCache = null;

    if (headingList) {
      let i = headingList.length;

      while (i--) {
        const heading = headingList[i];

        if (heading.level === 1) {
          const { line } = heading.position.start;

          if (h1 === null) {
            h1 = heading;
          } else if (line < h1.position.start.line) {
            h1 = heading;
          }
        }

        if (allHeadings) {
          this.matchAndPushHeading(suggestions, prepQuery, file, heading);
        }
      }

      if (!allHeadings && h1) {
        this.matchAndPushHeading(suggestions, prepQuery, file, h1);
      }
    }

    return !!h1;
  }

  private matchAndPushHeading(
    suggestions: HeadingSuggestion[],
    prepQuery: PreparedQuery,
    file: TFile,
    heading: HeadingCache,
  ): void {
    const { match } = this.matchStrings(prepQuery, heading.heading, null);

    if (match) {
      suggestions.push(this.makeHeadingSuggestion(heading, file, match));
    }
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
      const { match } = this.matchStrings(prepQuery, unresolved, null);

      if (match) {
        suggestions.push(this.makeUnresolvedSuggestion(unresolved, match));
      }
    }
  }

  private makeAliasSuggestion(
    alias: string,
    file: TFile,
    match: SearchResult,
  ): AliasSuggestion {
    return {
      alias,
      file,
      match,
      type: 'alias',
    };
  }

  private makeUnresolvedSuggestion(
    linktext: string,
    match: SearchResult,
  ): UnresolvedSuggestion {
    return {
      linktext,
      match,
      type: 'unresolved',
    };
  }

  private makeFileSuggestion(file: TFile, match: SearchResult): FileSuggestion {
    return {
      file,
      match,
      type: 'file',
    };
  }

  private makeHeadingSuggestion(
    item: HeadingCache,
    file: TFile,
    match: SearchResult,
  ): HeadingSuggestion {
    return {
      item,
      file,
      match,
      type: 'heading',
    };
  }

  private matchStrings(
    prepQuery: PreparedQuery,
    primaryString: string,
    secondaryString: string,
  ): { isPrimary: boolean; match?: SearchResult } {
    let isPrimary = false;
    let match: SearchResult = null;

    if (primaryString) {
      match = fuzzySearch(prepQuery, primaryString);
      isPrimary = !!match;
    }

    if (!match && secondaryString) {
      match = fuzzySearch(prepQuery, secondaryString);

      if (match) {
        match.score -= 1;
      }
    }

    return {
      isPrimary,
      match,
    };
  }

  private adjustMatchIndicesForPath(matches: SearchMatches, pathLen: number): void {
    matches?.forEach((match) => {
      match[0] += pathLen;
      match[1] += pathLen;
    });
  }

  private getRecentFilesSuggestions(): (HeadingSuggestion | FileSuggestion)[] {
    const suggestions: (HeadingSuggestion | FileSuggestion)[] = [];
    const { workspace, vault, metadataCache } = this.app;
    const recentFilePaths = workspace.getLastOpenFiles();

    recentFilePaths.forEach((path) => {
      const file = vault.getAbstractFileByPath(path);

      if (this.shouldIncludeFile(file)) {
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
          ? this.makeHeadingSuggestion(h1, f, null)
          : this.makeFileSuggestion(f, null);

        suggestions.push(sugg);
      }
    });

    return suggestions;
  }

  private shouldIncludeFile(file: TAbstractFile): boolean {
    let retVal = false;
    const {
      settings: {
        builtInSystemOptions: { showAttachments, showAllFileTypes },
      },
      app: { viewRegistry },
    } = this;

    if (isTFile(file)) {
      const { extension } = file;

      retVal = viewRegistry.isExtensionRegistered(extension)
        ? showAttachments || extension === 'md'
        : showAllFileTypes;
    }

    return retVal;
  }
}
