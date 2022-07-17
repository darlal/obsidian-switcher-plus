import { Handler } from './handler';
import { FileSuggestion, AliasSuggestion, AnySuggestion, MatchType } from 'src/types';
import { SearchResult, WorkspaceLeaf } from 'obsidian';
import { InputInfo } from 'src/switcherPlus';
import { isFileSuggestion } from 'src/utils';

type SupportedSystemSuggestions = FileSuggestion | AliasSuggestion;

export class StandardExHandler extends Handler<SupportedSystemSuggestions> {
  validateCommand(
    _inputInfo: InputInfo,
    _index: number,
    _filterText: string,
    _activeSuggestion: AnySuggestion,
    _activeLeaf: WorkspaceLeaf,
  ): void {
    throw new Error('Method not implemented.');
  }

  getSuggestions(_inputInfo: InputInfo): SupportedSystemSuggestions[] {
    throw new Error('Method not implemented.');
  }

  renderSuggestion(sugg: SupportedSystemSuggestions, parentEl: HTMLElement): void {
    if (isFileSuggestion(sugg)) {
      const { file, matchType, match } = sugg;
      let contentMatch: SearchResult = match;
      let pathMatch: SearchResult = null;

      if (matchType === MatchType.ParentPath) {
        contentMatch = null;
        pathMatch = match;
      }

      this.addClassesToSuggestionContainer(parentEl, ['qsp-suggestion-file']);

      const contentEl = this.renderContent(parentEl, file.basename, contentMatch);
      this.renderPath(contentEl, file, true, pathMatch, !!pathMatch);
    }
  }

  onChooseSuggestion(
    sugg: SupportedSystemSuggestions,
    evt: MouseEvent | KeyboardEvent,
  ): void {
    if (sugg) {
      const { file } = sugg;

      this.navigateToLeafOrOpenFile(
        evt,
        file,
        `Unable to open file from SystemSuggestion ${file.path}`,
      );
    }
  }
}
