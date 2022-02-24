import { getInternalPluginById, isFileStarredItem, isTFile } from 'src/utils';
import { InputInfo } from 'src/switcherPlus';
import { SwitcherPlusSettings } from 'src/settings/';
import { AnySuggestion, Handler, Mode, StarredSuggestion } from 'src/types';
import {
  App,
  InstalledPlugin,
  SearchResult,
  sortSearchResults,
  WorkspaceLeaf,
  fuzzySearch,
  StarredPluginItem,
  StarredPluginInstance,
  renderResults,
  Keymap,
  TFile,
  FileStarredItem,
} from 'obsidian';

export const STARRED_PLUGIN_ID = 'starred';

export class StarredHandler implements Handler<StarredSuggestion> {
  get commandString(): string {
    return this.settings?.starredListCommand;
  }

  constructor(private app: App, private settings: SwitcherPlusSettings) {}
  validateCommand(
    inputInfo: InputInfo,
    index: number,
    filterText: string,
    _activeSuggestion: AnySuggestion,
    _activeLeaf: WorkspaceLeaf,
  ): void {
    if (this.isStarredPluginEnabled()) {
      inputInfo.mode = Mode.StarredList;

      const starredCmd = inputInfo.parsedCommand(Mode.StarredList);
      starredCmd.index = index;
      starredCmd.parsedInput = filterText;
      starredCmd.isValidated = true;
    }
  }

  getSuggestions(inputInfo: InputInfo): StarredSuggestion[] {
    const suggestions: StarredSuggestion[] = [];

    if (inputInfo) {
      inputInfo.buildSearchQuery();
      const { hasSearchTerm, prepQuery } = inputInfo.searchQuery;
      const items = this.getItems();

      items.forEach((item) => {
        let shouldPush = true;
        let match: SearchResult = null;

        if (hasSearchTerm) {
          match = fuzzySearch(prepQuery, item.title);
          shouldPush = !!match;
        }

        if (shouldPush) {
          suggestions.push({ type: 'starred', item, match });
        }
      });

      if (hasSearchTerm) {
        sortSearchResults(suggestions);
      }
    }

    return suggestions;
  }

  renderSuggestion(sugg: StarredSuggestion, parentEl: HTMLElement): void {
    if (sugg) {
      renderResults(parentEl, sugg.item.title, sugg.match);
    }
  }

  onChooseSuggestion(sugg: StarredSuggestion, evt: MouseEvent | KeyboardEvent): void {
    if (sugg) {
      const { item } = sugg;

      if (isFileStarredItem(item)) {
        const { workspace } = this.app;
        const isModDown = Keymap.isModEvent(evt);
        const state = { active: true };

        workspace.openLinkText(item.path, '', isModDown, state).catch((reason) =>
          // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
          console.log(`Switcher++: unable to open file ${item.path}. ${reason}`),
        );
      }
    }
  }

  getTFileByPath(path: string): TFile | null {
    let file: TFile = null;
    const abstractItem = this.app.vault.getAbstractFileByPath(path);

    if (isTFile(abstractItem)) {
      file = abstractItem;
    }

    return file;
  }

  getItems(): StarredPluginItem[] {
    const starredFiles: StarredPluginItem[] = [];
    const starredItems = this.getSystemStarredPluginInstance()?.items;

    if (starredItems) {
      starredItems.forEach((starredItem) => {
        // Only support displaying of starred files for now
        if (isFileStarredItem(starredItem)) {
          const file = this.getTFileByPath(starredItem.path);

          // 2022-apr when a starred file is deleted, the underlying data stored in the
          // Starred plugin data file (starred.json) for that file remain in there, but
          // at runtime the deleted file info is not displayed. Do the same here.
          if (file) {
            // 2022-apr when a starred file is renamed, the 'title' property stored in
            // the underlying Starred plugin data file (starred.json) is not updated, but
            // at runtime, the title that is displayed in the UI does reflect the updated
            // filename. So do the same thing here in order to display the current
            // filename as the starred file title
            const title = file.basename;
            const starredFile: FileStarredItem = {
              type: 'file',
              title,
              path: starredItem.path,
            };

            starredFiles.push(starredFile);
          }
        }
      });
    }

    return starredFiles;
  }

  private isStarredPluginEnabled(): boolean {
    const plugin = this.getSystemStarredPlugin();
    return plugin?.enabled;
  }

  private getSystemStarredPlugin(): InstalledPlugin {
    return getInternalPluginById(this.app, STARRED_PLUGIN_ID);
  }

  private getSystemStarredPluginInstance(): StarredPluginInstance {
    const starredPlugin = this.getSystemStarredPlugin();
    return starredPlugin?.instance as StarredPluginInstance;
  }
}
