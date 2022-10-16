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
} from 'src/types';

export type SupportedSystemSuggestions = FileSuggestion | AliasSuggestion;

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
      this.renderFileSuggestion(sugg, parentEl);
    } else {
      this.renderAliasSuggestion(sugg, parentEl);
    }

    if (sugg?.downranked) {
      parentEl.addClass('mod-downranked');
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

  renderFileSuggestion(sugg: FileSuggestion, parentEl: HTMLElement): void {
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
    }
  }

  renderAliasSuggestion(sugg: AliasSuggestion, parentEl: HTMLElement): void {
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
    }
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
