import { ipcRenderer } from 'electron';
import { filenameFromPath } from 'src/utils';
import {
  AnySuggestion,
  MatchType,
  Mode,
  SessionOpts,
  SuggestionType,
  VaultSuggestion,
} from 'src/types';
import {
  Platform,
  renderResults,
  setIcon,
  sortSearchResults,
  WorkspaceLeaf,
} from 'obsidian';
import { InputInfo, ParsedCommand } from 'src/switcherPlus';
import { Handler } from './handler';

// 12/8/23: Format of Record is vaultId as key with and object payload
export type VaultData = Record<string, { path: string; ts: number; open?: boolean }>;

export class VaultHandler extends Handler<VaultSuggestion> {
  mobileVaultChooserMarker: VaultSuggestion = {
    type: SuggestionType.VaultList,
    match: null,
    item: null,
    pathSegments: null,
  };

  getCommandString(_sessionOpts?: SessionOpts): string {
    return this.settings?.vaultListCommand;
  }

  validateCommand(
    inputInfo: InputInfo,
    index: number,
    filterText: string,
    _activeSuggestion: AnySuggestion,
    _activeLeaf: WorkspaceLeaf,
  ): ParsedCommand {
    inputInfo.mode = Mode.VaultList;

    const cmd = inputInfo.parsedCommand(Mode.VaultList);
    cmd.index = index;
    cmd.parsedInput = filterText;
    cmd.isValidated = true;

    return cmd;
  }

  getSuggestions(inputInfo: InputInfo): VaultSuggestion[] {
    const suggestions: VaultSuggestion[] = [];

    if (inputInfo) {
      inputInfo.buildSearchQuery();
      const { hasSearchTerm, prepQuery } = inputInfo.searchQuery;
      const items = Platform.isDesktop
        ? this.getItems()
        : [this.mobileVaultChooserMarker];

      items.forEach((item) => {
        let shouldPush = true;

        if (hasSearchTerm) {
          const results = this.fuzzySearchWithFallback(
            prepQuery,
            null,
            item.pathSegments,
          );

          Object.assign(item, results);
          shouldPush = !!results.match;
        }

        if (shouldPush) {
          suggestions.push(item);
        }
      });

      if (hasSearchTerm) {
        sortSearchResults(suggestions);
      }
    }

    return suggestions;
  }

  renderSuggestion(sugg: VaultSuggestion, parentEl: HTMLElement): boolean {
    let handled = false;
    if (sugg) {
      this.addClassesToSuggestionContainer(parentEl, ['qsp-suggestion-vault']);
      handled = true;

      if (Platform.isDesktop) {
        this.renderVaultSuggestion(sugg, parentEl);
      } else if (sugg === this.mobileVaultChooserMarker) {
        this.renderMobileHintSuggestion(parentEl);
      }
    }

    return handled;
  }

  renderMobileHintSuggestion(parentEl: HTMLElement): void {
    this.renderContent(parentEl, 'Show mobile vault chooser', null);
  }

  renderVaultSuggestion(sugg: VaultSuggestion, parentEl: HTMLElement): void {
    const { pathSegments, matchType } = sugg;
    let { match } = sugg;
    let basenameMatch = null;

    if (matchType === MatchType.Basename) {
      basenameMatch = match;
      match = null;
    }

    const contentEl = this.renderContent(parentEl, pathSegments.basename, basenameMatch);
    const wrapperEl = contentEl.createDiv({ cls: ['suggestion-note', 'qsp-note'] });
    const iconEl = wrapperEl.createSpan({ cls: ['qsp-path-indicator'] });
    const pathEl = wrapperEl.createSpan({ cls: 'qsp-path' });

    setIcon(iconEl, 'folder');
    renderResults(pathEl, pathSegments.path, match);
  }

  onChooseSuggestion(sugg: VaultSuggestion, _evt: MouseEvent | KeyboardEvent): boolean {
    let handled = false;
    if (sugg) {
      if (Platform.isDesktop) {
        // 12/8/23: "vault-open" is the Obsidian defined channel for open a vault
        handled = ipcRenderer.sendSync(
          'vault-open',
          sugg.pathSegments?.path,
          false, // true to create if it doesn't exist
        ) as boolean;
      } else if (sugg === this.mobileVaultChooserMarker) {
        // It's the mobile app context, show the vault chooser
        this.app.openVaultChooser();
        handled = true;
      }
    }

    return handled;
  }

  getItems(): VaultSuggestion[] {
    const items: VaultSuggestion[] = [];

    try {
      // 12/8/23: "vault-list" is the Obsidian defined channel for retrieving
      // the vault list
      const vaultData = ipcRenderer.sendSync('vault-list') as VaultData;

      if (vaultData) {
        for (const [id, { path, open }] of Object.entries(vaultData)) {
          const basename = filenameFromPath(path);
          const sugg: VaultSuggestion = {
            type: SuggestionType.VaultList,
            match: null,
            item: id,
            isOpen: !!open,
            pathSegments: { basename, path },
          };

          items.push(sugg);
        }
      }
    } catch (err) {
      console.log('Switcher++: error retrieving list of available vaults. ', err);
    }

    return items.sort((a, b) =>
      a.pathSegments.basename.localeCompare(b.pathSegments.basename),
    );
  }
}
