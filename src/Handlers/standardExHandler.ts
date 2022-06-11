import { Handler } from './handler';
import { FileSuggestion, AliasSuggestion, AnySuggestion } from 'src/types';
import { Keymap, WorkspaceLeaf } from 'obsidian';
import { InputInfo } from 'src/switcherPlus';

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

  renderSuggestion(_sugg: SupportedSystemSuggestions, _parentEl: HTMLElement): void {
    throw new Error('Method not implemented.');
  }

  onChooseSuggestion(
    sugg: SupportedSystemSuggestions,
    evt: MouseEvent | KeyboardEvent,
  ): void {
    if (sugg) {
      const { file } = sugg;

      this.navigateToLeafOrOpenFile(
        Keymap.isModEvent(evt),
        file,
        `Unable to open file from SystemSuggestion ${file.path}`,
      );
    }
  }
}
