import { SwitcherPlusSettings } from 'src/settings';
import {
  AnySuggestion,
  EditorSuggestion,
  MatchType,
  Mode,
  SearchResultWithFallback,
  SessionOpts,
  SuggestionType,
} from 'src/types';
import { InputInfo, WorkspaceEnvList } from 'src/switcherPlus';
import { MetadataCache, sortSearchResults, TFile, WorkspaceLeaf } from 'obsidian';
import { Handler } from './handler';

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
  ): void {
    inputInfo.mode = Mode.EditorList;

    const editorCmd = inputInfo.parsedCommand(Mode.EditorList);
    editorCmd.index = index;
    editorCmd.parsedInput = filterText;
    editorCmd.isValidated = true;
  }

  getSuggestions(inputInfo: InputInfo): EditorSuggestion[] {
    const suggestions: EditorSuggestion[] = [];

    if (inputInfo) {
      inputInfo.buildSearchQuery();
      const { hasSearchTerm, prepQuery } = inputInfo.searchQuery;
      const items = this.getItems();

      items.forEach((item) => {
        const file = item.view?.file;
        let shouldPush = true;
        let result: SearchResultWithFallback = { matchType: MatchType.None, match: null };

        if (hasSearchTerm) {
          result = this.fuzzySearchWithFallback(prepQuery, item.getDisplayText(), file);
          shouldPush = result.matchType !== MatchType.None;
        }

        if (shouldPush) {
          suggestions.push(
            this.createSuggestion(inputInfo.currentWorkspaceEnvList, item, file, result),
          );
        }
      });

      if (hasSearchTerm) {
        sortSearchResults(suggestions);
      }
    }

    return suggestions;
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
      const { file, matchType, match, item } = sugg;
      const hideBasename = [MatchType.None, MatchType.Primary].includes(matchType);

      this.renderAsFileInfoPanel(
        parentEl,
        ['qsp-suggestion-editor'],
        item.getDisplayText(),
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
  ): EditorSuggestion {
    return EditorHandler.createSuggestion(
      currentWorkspaceEnvList,
      leaf,
      file,
      this.settings,
      this.app.metadataCache,
      result,
    );
  }

  static createSuggestion(
    currentWorkspaceEnvList: WorkspaceEnvList,
    leaf: WorkspaceLeaf,
    file: TFile,
    settings: SwitcherPlusSettings,
    metadataCache: MetadataCache,
    result?: SearchResultWithFallback,
  ): EditorSuggestion {
    result = result ?? { matchType: MatchType.None, match: null, matchText: null };

    let sugg: EditorSuggestion = {
      item: leaf,
      file,
      type: SuggestionType.EditorList,
      ...result,
    };

    sugg = Handler.updateWorkspaceEnvListStatus(currentWorkspaceEnvList, sugg);
    return Handler.applyMatchPriorityPreferences(sugg, settings, metadataCache);
  }
}
