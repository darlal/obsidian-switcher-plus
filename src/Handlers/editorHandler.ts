import {
  AnySuggestion,
  EditorSuggestion,
  MatchType,
  Mode,
  SearchResultWithFallback,
  SuggestionType,
} from 'src/types';
import { InputInfo } from 'src/switcherPlus';
import { sortSearchResults, WorkspaceLeaf } from 'obsidian';
import { Handler } from './handler';

export class EditorHandler extends Handler<EditorSuggestion> {
  override get commandString(): string {
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
      const { excludeViewTypes, includeSidePanelViewTypes } = this.settings;

      const items = this.getOpenLeaves(excludeViewTypes, includeSidePanelViewTypes);

      items.forEach((item) => {
        const file = item.view?.file;
        let shouldPush = true;
        let result: SearchResultWithFallback = { matchType: MatchType.None, match: null };

        if (hasSearchTerm) {
          result = this.fuzzySearchWithFallback(prepQuery, item.getDisplayText(), file);
          shouldPush = result.matchType !== MatchType.None;
        }

        if (shouldPush) {
          suggestions.push({ type: SuggestionType.EditorList, file, item, ...result });
        }
      });

      if (hasSearchTerm) {
        sortSearchResults(suggestions);
      }
    }

    return suggestions;
  }

  renderSuggestion(sugg: EditorSuggestion, parentEl: HTMLElement): void {
    if (sugg) {
      const { file, matchType, match, item } = sugg;

      this.renderAsFileInfoPanel(
        parentEl,
        ['qsp-suggestion-editor'],
        item.getDisplayText(),
        file,
        matchType,
        match,
      );
    }
  }

  onChooseSuggestion(sugg: EditorSuggestion, evt: MouseEvent | KeyboardEvent): void {
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
    }
  }
}
