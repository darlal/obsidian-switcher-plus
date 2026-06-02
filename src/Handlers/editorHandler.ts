import { SwitcherPlusSettings } from 'src/settings';
import {
  AnySuggestion,
  EditorSuggestion,
  MatchType,
  Mode,
  SearchResultWithFallback,
  SessionOpts,
  SuggestionType,
  TitleSource,
} from 'src/types';
import { InputInfo, ParsedCommand, WorkspaceEnvList } from 'src/switcherPlus';
import { MetadataCache, sortSearchResults, TFile, WorkspaceLeaf } from 'obsidian';
import { Handler } from './handler';
import { Searcher } from 'src/search';
import { getTFileFromLeaf } from 'src/utils';

export class EditorHandler extends Handler<EditorSuggestion> {
  getCommandString(_sessionOpts?: SessionOpts): string {
    return this.settings?.editorListCommand;
  }

  validateCommand(
    inputInfo: InputInfo,
    index: number,
    filterText: string,
    _activeSuggestion: AnySuggestion,
    _activeLeaf: WorkspaceLeaf,
  ): ParsedCommand {
    inputInfo.mode = Mode.EditorList;

    const cmd = inputInfo.parsedCommand(Mode.EditorList);
    cmd.index = index;
    cmd.parsedInput = filterText;
    cmd.isValidated = true;

    return cmd;
  }

  getSuggestions(inputInfo: InputInfo): EditorSuggestion[] {
    const suggestions: EditorSuggestion[] = [];

    if (inputInfo) {
      const { query, hasSearchTerm } = inputInfo.parsedInputQuery;
      const searcher = Searcher.create(query);
      const items = this.getItems();

      items.forEach((item) => {
        const file = getTFileFromLeaf(item);
        let shouldPush = true;
        let result: SearchResultWithFallback = { matchType: MatchType.None, match: null };

        const preferredTitle = this.getPreferredTitle(
          item,
          this.settings.preferredSourceForTitle,
        );

        if (hasSearchTerm) {
          result = searcher.searchWithFallback(preferredTitle, file);
          shouldPush = result.matchType !== MatchType.None;
        }

        if (shouldPush) {
          suggestions.push(
            this.createSuggestion(
              inputInfo.currentWorkspaceEnvList,
              item,
              file,
              result,
              preferredTitle,
            ),
          );
        }
      });

      if (hasSearchTerm) {
        sortSearchResults(suggestions);
      }
    }

    return suggestions;
  }

  getPreferredTitle(leaf: WorkspaceLeaf, titleSource: TitleSource): string {
    return EditorHandler.getPreferredTitle(
      leaf,
      titleSource,
      this.app.metadataCache,
      this.settings.frontmatterTitleProperty,
    );
  }

  static getPreferredTitle(
    leaf: WorkspaceLeaf,
    titleSource: TitleSource,
    metadataCache: MetadataCache,
    frontmatterProperty?: string,
  ): string {
    const file = getTFileFromLeaf(leaf);
    let text = leaf.getDisplayText();

    if (titleSource === 'H1' && file) {
      const h1 = EditorHandler.getFirstH1(file, metadataCache);

      if (h1) {
        text = text.replace(file.basename, h1.heading);
      }
    } else if (titleSource === 'FrontMatter' && file && frontmatterProperty) {
      const frontmatter = metadataCache.getFileCache(file)?.frontmatter;
      const customTitle = Handler.getFrontmatterProperty(
        frontmatter,
        frontmatterProperty,
      );

      if (customTitle) {
        text = text.replace(file.basename, customTitle);
      }
    }

    return text;
  }

  getItems(): WorkspaceLeaf[] {
    const {
      excludeViewTypes,
      includeSidePanelViewTypes,
      orderEditorListByAccessTime: orderByAccessTime,
    } = this.settings;

    const leaves = this.getOpenLeaves(excludeViewTypes, includeSidePanelViewTypes, {
      orderByAccessTime,
    });

    return EditorHandler.orderByPinnedStatus(leaves);
  }

  /**
   * Partitions leaves into pinned and unpinned groups and returns a new array with
   * the pinned leaves first. The relative order within each group is preserved, so
   * any access-time ordering applied upstream is retained per group.
   */
  static orderByPinnedStatus(leaves: WorkspaceLeaf[]): WorkspaceLeaf[] {
    const pinned: WorkspaceLeaf[] = [];
    const unpinned: WorkspaceLeaf[] = [];

    leaves.forEach((leaf) => {
      (EditorHandler.isLeafPinned(leaf) ? pinned : unpinned).push(leaf);
    });

    return [...pinned, ...unpinned];
  }

  /**
   * Source-of-truth check for whether a leaf is pinned. The pinned flag lives on the
   * leaf's ViewState (not directly on WorkspaceLeaf), so it is read via getViewState().
   *
   * @param {WorkspaceLeaf} leaf
   * @returns {boolean} true when the leaf's ViewState reports pinned.
   */
  static isLeafPinned(leaf: WorkspaceLeaf): boolean {
    return leaf.getViewState()?.pinned === true;
  }

  renderSuggestion(sugg: EditorSuggestion, parentEl: HTMLElement): boolean {
    let handled = false;
    if (sugg) {
      const { file, matchType, match } = sugg;
      const hideBasename = [MatchType.None, MatchType.Primary].includes(matchType);

      this.renderAsFileInfoPanel(
        parentEl,
        ['qsp-suggestion-editor'],
        sugg.preferredTitle,
        file,
        matchType,
        match,
        hideBasename,
      );

      const flairContainerEl = this.renderOptionalIndicators(parentEl, sugg);

      if (sugg.isPinned) {
        this.renderIndicator(flairContainerEl, [], 'filled-pin');
      }

      handled = true;
    }

    return handled;
  }

  onChooseSuggestion(sugg: EditorSuggestion, evt: MouseEvent | KeyboardEvent): boolean {
    let handled = false;
    if (sugg) {
      this.navigateToLeafOrOpenFile(
        evt,
        sugg.file,
        'Unable to reopen existing editor in new Leaf.',
        null,
        sugg.item,
        null,
        true,
      );
      handled = true;
    }

    return handled;
  }

  createSuggestion(
    currentWorkspaceEnvList: WorkspaceEnvList,
    leaf: WorkspaceLeaf,
    file: TFile,
    result: SearchResultWithFallback,
    preferredTitle?: string,
  ): EditorSuggestion {
    return EditorHandler.createSuggestion(
      currentWorkspaceEnvList,
      leaf,
      file,
      this.settings,
      this.app.metadataCache,
      preferredTitle,
      result,
    );
  }

  static createSuggestion(
    currentWorkspaceEnvList: WorkspaceEnvList,
    leaf: WorkspaceLeaf,
    file: TFile,
    settings: SwitcherPlusSettings,
    metadataCache: MetadataCache,
    preferredTitle?: string,
    result?: SearchResultWithFallback,
  ): EditorSuggestion {
    result = result ?? { matchType: MatchType.None, match: null, matchText: null };
    preferredTitle = preferredTitle ?? null;

    let sugg: EditorSuggestion = {
      item: leaf,
      file,
      preferredTitle,
      isPinned: EditorHandler.isLeafPinned(leaf),
      type: SuggestionType.EditorList,
      ...result,
    };

    sugg = Handler.updateWorkspaceEnvListStatus(currentWorkspaceEnvList, sugg);
    return Handler.applyMatchPriorityPreferences(sugg, settings, metadataCache);
  }
}
