import { SwitcherPlusSettings } from 'src/settings';
import { EditorSuggestion, Mode } from 'src/types';
import { InputInfo } from 'src/switcherPlus';
import {
  App,
  renderResults,
  SearchResult,
  sortSearchResults,
  fuzzySearch,
} from 'obsidian';
import { activateLeaf, getOpenLeaves } from 'src/utils';

export class EditorHandler {
  constructor(private app: App, private settings: SwitcherPlusSettings) {}

  validateCommand(inputInfo: InputInfo, index: number, filterText: string): void {
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

      const items = getOpenLeaves(
        this.app.workspace,
        excludeViewTypes,
        includeSidePanelViewTypes,
      );

      items.forEach((item) => {
        let shouldPush = true;
        let match: SearchResult = null;

        if (hasSearchTerm) {
          match = fuzzySearch(prepQuery, item.getDisplayText());
          shouldPush = !!match;
        }

        if (shouldPush) {
          suggestions.push({ type: 'editor', item, match });
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
      renderResults(parentEl, sugg.item.getDisplayText(), sugg.match);
    }
  }

  onChooseSuggestion(sugg: EditorSuggestion): void {
    if (sugg) {
      activateLeaf(this.app.workspace, sugg.item, false);
    }
  }
}
