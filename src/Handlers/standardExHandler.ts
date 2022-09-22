import { Handler } from './handler';
import { FileSuggestion, AliasSuggestion, AnySuggestion } from 'src/types';
import { WorkspaceLeaf } from 'obsidian';
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

      this.renderAsFileInfoPanel(
        parentEl,
        ['qsp-suggestion-file'],
        file.basename,
        file,
        matchType,
        match,
      );

      this.renderOptionalIndicators(parentEl, sugg.optionalIndicators);
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
