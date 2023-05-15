import { Handler } from './handler';
import { MetadataCache, WorkspaceLeaf } from 'obsidian';
import { InputInfo } from 'src/switcherPlus';
import { isAliasSuggestion, isFileSuggestion } from 'src/utils';
import { SwitcherPlusSettings } from 'src/settings';
import {
  FileSuggestion,
  AliasSuggestion,
  AnySuggestion,
  MatchType,
  SuggestionType,
  UnresolvedSuggestion,
  SearchResultWithFallback,
  SessionOpts,
} from 'src/types';

export type SupportedSystemSuggestions = FileSuggestion | AliasSuggestion;

export class StandardExHandler extends Handler<SupportedSystemSuggestions> {
  getCommandString(_sessionOpts?: SessionOpts): string {
    return '';
  }

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

  renderSuggestion(sugg: SupportedSystemSuggestions, parentEl: HTMLElement): boolean {
    let handled = false;
    if (isFileSuggestion(sugg)) {
      handled = this.renderFileSuggestion(sugg, parentEl);
    } else {
      handled = this.renderAliasSuggestion(sugg, parentEl);
    }

    if (sugg?.downranked) {
      parentEl.addClass('mod-downranked');
    }

    return handled;
  }

  onChooseSuggestion(
    sugg: SupportedSystemSuggestions,
    evt: MouseEvent | KeyboardEvent,
  ): boolean {
    let handled = false;
    if (sugg) {
      const { file } = sugg;

      this.navigateToLeafOrOpenFile(
        evt,
        file,
        `Unable to open file from SystemSuggestion ${file.path}`,
      );

      handled = true;
    }

    return handled;
  }

  renderFileSuggestion(sugg: FileSuggestion, parentEl: HTMLElement): boolean {
    let handled = false;
    if (sugg) {
      const { file, matchType, match } = sugg;

      this.renderAsFileInfoPanel(
        parentEl,
        ['qsp-suggestion-file'],
        null,
        file,
        matchType,
        match,
      );

      this.renderOptionalIndicators(parentEl, sugg);
      handled = true;
    }

    return handled;
  }

  renderAliasSuggestion(sugg: AliasSuggestion, parentEl: HTMLElement): boolean {
    let handled = false;
    if (sugg) {
      const { file, matchType, match } = sugg;

      this.renderAsFileInfoPanel(
        parentEl,
        ['qsp-suggestion-alias'],
        sugg.alias,
        file,
        matchType,
        match,
        false,
      );

      const flairContainerEl = this.renderOptionalIndicators(parentEl, sugg);
      this.renderIndicator(flairContainerEl, ['qsp-alias-indicator'], 'lucide-forward');
      handled = true;
    }

    return handled;
  }

  addPropertiesToStandardSuggestions(
    inputInfo: InputInfo,
    sugg: SupportedSystemSuggestions,
  ): void {
    const { match, file } = sugg;
    const matches = match?.matches;
    let matchType = MatchType.None;
    let matchText = null;

    if (matches) {
      if (isAliasSuggestion(sugg)) {
        matchType = MatchType.Primary;
        matchText = sugg.alias;
      } else {
        matchType = MatchType.Path;
        matchText = file?.path;
      }
    }

    sugg.matchType = matchType;
    sugg.matchText = matchText;

    // patch with missing properties required for enhanced custom rendering
    Handler.updateWorkspaceEnvListStatus(inputInfo.currentWorkspaceEnvList, sugg);
  }

  static createUnresolvedSuggestion(
    linktext: string,
    result: SearchResultWithFallback,
    settings: SwitcherPlusSettings,
    metadataCache: MetadataCache,
  ): UnresolvedSuggestion {
    const sugg: UnresolvedSuggestion = {
      linktext,
      type: SuggestionType.Unresolved,
      ...result,
    };

    return Handler.applyMatchPriorityPreferences(sugg, settings, metadataCache);
  }
}
