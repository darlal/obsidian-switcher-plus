import { SwitcherPlusSettings } from './switcherPlusSettings';
import { SettingsTabSection } from './settingsTabSection';
import { Modal } from 'obsidian';

export class HeadingsSettingsTabSection extends SettingsTabSection {
  display(containerEl: HTMLElement): void {
    const { config } = this;

    this.addSectionTitle(containerEl, 'Headings List Mode Settings');

    this.addTextSetting(
      containerEl,
      'Headings list mode trigger',
      'Character that will trigger headings list mode in the switcher',
      config.headingsListCommand,
      'headingsListCommand',
      config.headingsListPlaceholderText,
    );

    this.addToggleSetting(
      containerEl,
      'Show headings only',
      'Enabled, strictly search through only the headings contained in the file. Note: this setting overrides the "Show existing only", and "Search filenames" settings. Disabled, fallback to searching against the filename when there is not a match in the first H1 contained in the file. This will also allow searching through filenames, Aliases, and Unresolved links to be enabled.',
      config.strictHeadingsOnly,
      'strictHeadingsOnly',
    );

    this.addToggleSetting(
      containerEl,
      'Search all headings',
      'Enabled, search through all headings contained in each file. Disabled, only search through the first H1 in each file.',
      config.searchAllHeadings,
      'searchAllHeadings',
    );

    this.addToggleSetting(
      containerEl,
      'Search filenames',
      "Enabled, search and show suggestions for filenames. Disabled, Don't search through filenames (except for fallback searches)",
      config.shouldSearchFilenames,
      'shouldSearchFilenames',
    );

    this.addToggleSetting(
      containerEl,
      'Search Bookmarks',
      "Enabled, search and show suggestions for Boomarks. Disabled, Don't search through Bookmarks",
      config.shouldSearchBookmarks,
      'shouldSearchBookmarks',
    );

    this.addSliderSetting(
      containerEl,
      'Max recent files to show',
      'The maximum number of recent files to show when there is no search term',
      config.maxRecentFileSuggestionsOnInit,
      [0, 75, 1],
      'maxRecentFileSuggestionsOnInit',
    );

    this.showExcludeFolders(containerEl, config);

    this.addToggleSetting(
      containerEl,
      'Hide Obsidian "Excluded files"',
      'Enabled, do not display suggestions for files that are in Obsidian\'s "Options > Files & Links > Excluded files" list. Disabled, suggestions for those files will be displayed but downranked.',
      config.excludeObsidianIgnoredFiles,
      'excludeObsidianIgnoredFiles',
    );

    this.showFileExtAllowList(containerEl, config);
  }

  showFileExtAllowList(containerEl: HTMLElement, config: SwitcherPlusSettings): void {
    this.createSetting(
      containerEl,
      'File extension override',
      'Override the "Show attachments" and the "Show all file types" builtin, system Switcher settings and always search files with the listed extensions. Add one path per line. For example to add ".canvas" file extension, just add "canvas".',
    ).addTextArea((textArea) => {
      textArea.setValue(config.fileExtAllowList.join('\n'));
      textArea.inputEl.addEventListener('focusout', () => {
        const allowList = textArea
          .getValue()
          .split('\n')
          .map((v) => v.trim())
          .filter((v) => v.length > 0);

        config.fileExtAllowList = allowList;
        config.save();
      });
    });
  }

  showExcludeFolders(containerEl: HTMLElement, config: SwitcherPlusSettings): void {
    const settingName = 'Exclude folders';

    this.createSetting(
      containerEl,
      settingName,
      'When in Headings list mode, folder path that match any regex listed here will not be searched for suggestions. Path should start from the Vault Root. Add one path per line.',
    ).addTextArea((textArea) => {
      textArea.setValue(config.excludeFolders.join('\n'));
      textArea.inputEl.addEventListener('focusout', () => {
        const excludes = textArea
          .getValue()
          .split('\n')
          .filter((v) => v.length > 0);

        if (this.validateExcludeFolderList(settingName, excludes)) {
          config.excludeFolders = excludes;
          config.save();
        }
      });
    });
  }

  validateExcludeFolderList(settingName: string, excludes: string[]) {
    let isValid = true;
    let failedMsg = '';

    for (const str of excludes) {
      try {
        new RegExp(str);
      } catch (err) {
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        failedMsg += `<span class="qsp-warning">${str}</span><br/>${err}<br/><br/>`;
        isValid = false;
      }
    }

    if (!isValid) {
      const popup = new Modal(this.app);
      popup.titleEl.setText(settingName);
      popup.contentEl.innerHTML = `Changes not saved. The following regex contain errors:<br/><br/>${failedMsg}`;
      popup.open();
    }

    return isValid;
  }
}
