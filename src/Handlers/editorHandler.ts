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
    return EditorHandler.getPreferredTitle(leaf, titleSource, this.app.metadataCache);
  }

  static getPreferredTitle(
    leaf: WorkspaceLeaf,
    titleSource: TitleSource,
    metadataCache: MetadataCache,
  ): string {
    const { view } = leaf;
    const file = view?.file;
    let text = leaf.getDisplayText();

    if (titleSource === 'H1' && file) {
      const h1 = EditorHandler.getFirstH1(file, metadataCache);

      if (h1) {
        text = text.replace(file.basename, h1.heading);
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

    return this.getOpenLeaves(excludeViewTypes, includeSidePanelViewTypes, {
      orderByAccessTime,
    });
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

      this.renderOptionalIndicators(parentEl, sugg);
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
      type: SuggestionType.EditorList,
      ...result,
    };

    sugg = Handler.updateWorkspaceEnvListStatus(currentWorkspaceEnvList, sugg);
    return Handler.applyMatchPriorityPreferences(sugg, settings, metadataCache);
  }
}
