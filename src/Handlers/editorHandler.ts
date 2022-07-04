import { AnySuggestion, EditorSuggestion, Mode, SuggestionType } from 'src/types';
import { InputInfo } from 'src/switcherPlus';
import {
  SearchResult,
  sortSearchResults,
  fuzzySearch,
  WorkspaceLeaf,
  Keymap,
} from 'obsidian';
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
        let shouldPush = true;
        let match: SearchResult = null;

        if (hasSearchTerm) {
          match = fuzzySearch(prepQuery, item.getDisplayText());
          shouldPush = !!match;
        }

        if (shouldPush) {
          const file = item.view?.file;
          suggestions.push({ type: SuggestionType.EditorList, file, item, match });
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
      parentEl.addClass('qsp-suggestion-editor');
      this.renderContent(parentEl, sugg.item.getDisplayText(), sugg.match);
      this.renderPath(parentEl, sugg.file, true);
    }
  }

  onChooseSuggestion(sugg: EditorSuggestion, evt: MouseEvent | KeyboardEvent): void {
    if (sugg) {
      this.navigateToLeafOrOpenFile(
        Keymap.isModEvent(evt),
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
