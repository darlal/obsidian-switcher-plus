import { AnySuggestion, EditorSuggestion, Mode } from 'src/types';
import { InputInfo } from 'src/switcherPlus';
import {
  renderResults,
  SearchResult,
  sortSearchResults,
  fuzzySearch,
  WorkspaceLeaf,
  Keymap,
} from 'obsidian';
import { activateLeaf, getOpenLeaves, openFileInLeaf } from 'src/utils';
import { Handler } from './handler';

export class EditorHandler extends Handler<EditorSuggestion> {
  override get commandString(): string {
    return this.settings?.editorListCommand;
  }

  override validateCommand(
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

  override getSuggestions(inputInfo: InputInfo): EditorSuggestion[] {
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
          const file = item.view?.file;
          suggestions.push({ type: 'editor', file, item, match });
        }
      });

      if (hasSearchTerm) {
        sortSearchResults(suggestions);
      }
    }

    return suggestions;
  }

  override renderSuggestion(sugg: EditorSuggestion, parentEl: HTMLElement): void {
    if (sugg) {
      renderResults(parentEl, sugg.item.getDisplayText(), sugg.match);
    }
  }

  override onChooseSuggestion(
    sugg: EditorSuggestion,
    evt: MouseEvent | KeyboardEvent,
  ): void {
    if (sugg) {
      const isModDown = Keymap.isModEvent(evt);
      const { workspace } = this.app;

      if (isModDown) {
        openFileInLeaf(
          workspace,
          sugg.file,
          true,
          { active: true },
          'Unable to reopen existing editor in new Leaf.',
        );
      } else {
        activateLeaf(workspace, sugg.item, false);
      }
    }
  }
}
