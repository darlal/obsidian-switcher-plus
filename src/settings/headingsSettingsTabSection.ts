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
      'Enabled, only show suggestions where there is a match in the first H1 contained in the file. Disabled, if there is not a match in the first H1, fallback to showing suggestions where there is a filename or path match.',
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

    this.setExcludeFolders(containerEl, config);

    this.addToggleSetting(
      containerEl,
      'Hide Obsidian "Excluded files"',
      'Enabled, do not display suggestions for files that are in Obsidian\'s "Options > Files & Links > Excluded files" list. Disabled, suggestions for those files will be displayed but downranked.',
      config.excludeObsidianIgnoredFiles,
      'excludeObsidianIgnoredFiles',
    );
  }

  setExcludeFolders(containerEl: HTMLElement, config: SwitcherPlusSettings): void {
    const settingName = 'Exclude folders';

    this.createSetting(
      containerEl,
      settingName,
      'When in Headings list mode, folder path that match any regex listed here will not be searched for suggestions. Path should start from the Vault Root. Add one path per line.',
    ).addTextArea((textArea) => {
      textArea.setValue(config.excludeFolders.join('\n'));
      textArea.inputEl.addEventListener('blur', () => {
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
