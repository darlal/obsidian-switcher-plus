import {
  App, renderResults, SearchResult, sortSearchResults, fuzzySearch, WorkspaceLeaf,
  prepareQuery,
} from 'obsidian';
import { SwitcherPlusSettings } from 'src/settings';
import { InputInfo } from 'src/switcherPlus';
import { AnySuggestion, EditorSuggestion, Handler, Mode } from 'src/types';
import { activateLeaf, getOpenLeaves } from 'src/utils';

export class EditorHandler implements Handler<EditorSuggestion> {
  get commandString(): string {
    return this.settings?.editorListCommand;
  }

  constructor(private app: App, private settings: SwitcherPlusSettings) {}

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

  static getOpenFileSuggestions(app: App, query: string): EditorSuggestion[] {
    const suggestions: EditorSuggestion[] = [];
    const input = (query ?? '').trim().toLowerCase()

    const prepQuery = prepareQuery(input);
    const hasSearchTerm = prepQuery?.query?.length > 0;

    const excludeViewTypes = ['empty'],
    includeSidePanelViewTypes = ['image', 'markdown', 'pdf']

    const items = getOpenLeaves(
      app.workspace,
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
    return suggestions;
  }

  renderSuggestion(sugg: EditorSuggestion, parentEl: HTMLElement): void {
    if (sugg) {
      parentEl.addClass('qsp-editor-suggestion');
      renderResults(parentEl, sugg.item.getDisplayText(), sugg.match);
    }
  }

  onChooseSuggestion(sugg: EditorSuggestion, _evt: MouseEvent | KeyboardEvent): void {
    if (sugg) {
      activateLeaf(this.app.workspace, sugg.item, false);
    }
  }
}
