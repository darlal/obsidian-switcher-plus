import { Modal } from 'obsidian';
import { SwitcherPlusSettings } from 'src/settings';
import { Mode, PathDisplayFormat } from 'src/types';
import { SettingsTabSection } from './settingsTabSection';

const PRIORITY_ADJUSTMENTS = [
  { key: 'isOpenInEditor', name: 'Open items', desc: '' },
  { key: 'isBookmarked', name: 'Bookmarked items', desc: '' },
  { key: 'isRecent', name: 'Recent items', desc: '' },
  { key: 'file', name: 'Filenames', desc: '' },
  { key: 'alias', name: 'Aliases', desc: '' },
  { key: 'unresolved', name: 'Unresolved filenames', desc: '' },
  { key: 'h1', name: 'H₁ headings', desc: '' },
  { key: 'h2', name: 'H₂ headings', desc: '' },
  { key: 'h3', name: 'H₃ headings', desc: '' },
  { key: 'h4', name: 'H₄ headings', desc: '' },
  { key: 'h5', name: 'H₅ headings', desc: '' },
  { key: 'h6', name: 'H₆ headings', desc: '' },
];

export class GeneralSettingsTabSection extends SettingsTabSection {
  display(containerEl: HTMLElement): void {
    const { config } = this;

    this.addSectionTitle(containerEl, 'General Settings');
    this.showEnabledRibbonCommands(containerEl, config);

    this.showPathDisplayFormat(containerEl, config);
    this.addToggleSetting(
      containerEl,
      'Hide path for root items',
      'When enabled, path information will be hidden for items at the root of the vault.',
      config.hidePathIfRoot,
      'hidePathIfRoot',
    ).setClass('qsp-setting-item-indent');

    this.addToggleSetting(
      containerEl,
      'Default to open in new tab',
      'When enabled, navigating to un-opened files will open a new editor tab whenever possible (as if cmd/ctrl were held). When the file is already open, the existing tab will be activated. This overrides all other tab settings.',
      config.onOpenPreferNewTab,
      'onOpenPreferNewTab',
    );

    this.addToggleSetting(
      containerEl,
      'Override Standard mode behavior',
      'When enabled, Switcher++ will change the default Obsidian builtin Switcher functionality (Standard mode) to inject custom behavior.',
      config.overrideStandardModeBehaviors,
      'overrideStandardModeBehaviors',
    );

    this.addToggleSetting(
      containerEl,
      'Show indicator icons',
      'Display icons to indicate that an item is recent, bookmarked, etc..',
      config.showOptionalIndicatorIcons,
      'showOptionalIndicatorIcons',
    );

    this.addToggleSetting(
      containerEl,
      'Allow Backspace key to close the Switcher',
      'When the search box is empty, pressing the backspace key will close Switcher++.',
      config.shouldCloseModalOnBackspace,
      'shouldCloseModalOnBackspace',
    );

    this.showMatchPriorityAdjustments(containerEl, config);
    this.showInsertLinkInEditor(containerEl, config);

    this.addToggleSetting(
      containerEl,
      'Restore previous input in Command Mode',
      'When enabled, restore the last typed input in Command Mode when launched via global command hotkey.',
      config.preserveCommandPaletteLastInput,
      'preserveCommandPaletteLastInput',
    );
    this.addToggleSetting(
      containerEl,
      'Restore previous input',
      'When enabled, restore the last typed input when launched via global command hotkey.',
      config.preserveQuickSwitcherLastInput,
      'preserveQuickSwitcherLastInput',
    );

    this.showResetFacetEachSession(containerEl, config);
  }

  showPathDisplayFormat(containerEl: HTMLElement, config: SwitcherPlusSettings): void {
    const options: Record<string, string> = {};
    options[PathDisplayFormat.None.toString()] = 'Hide path';
    options[PathDisplayFormat.Full.toString()] = 'Full path';
    options[PathDisplayFormat.FolderOnly.toString()] = 'Only parent folder';
    options[PathDisplayFormat.FolderWithFilename.toString()] = 'Parent folder & filename';
    options[PathDisplayFormat.FolderPathFilenameOptional.toString()] =
      'Parent folder path (filename optional)';

    this.addDropdownSetting(
      containerEl,
      'Preferred file path display format',
      'The preferred way to display file paths in suggestions',
      config.pathDisplayFormat.toString(),
      options,
      null,
      (rawValue, config) => {
        config.pathDisplayFormat = Number(rawValue);
        config.save();
      },
    );
  }

  showEnabledRibbonCommands(
    containerEl: HTMLElement,
    config: SwitcherPlusSettings,
  ): void {
    const modeNames = Object.values(Mode)
      .filter((v) => isNaN(Number(v)))
      .sort();
    const modeNamesStr = modeNames.join(' ');
    const desc = `Display an icon in the ribbon menu to launch specific modes. Add one mode per line. Available modes: ${modeNamesStr}`;

    this.createSetting(containerEl, 'Show ribbon icons', desc).addTextArea((textArea) => {
      textArea.setValue(config.enabledRibbonCommands.join('\n'));

      textArea.inputEl.addEventListener('focusout', () => {
        const values = textArea
          .getValue()
          .split('\n')
          .map((v) => v.trim())
          .filter((v) => v.length > 0);

        const invalidValues = Array.from(new Set(values)).filter(
          (v) => !modeNames.includes(v),
        );

        if (invalidValues.length) {
          this.showErrorPopup(invalidValues.join('<br/>'), modeNamesStr);
        } else {
          config.enabledRibbonCommands = values as Array<keyof typeof Mode>;
          config.save();

          // force unregister/register of ribbon commands, so the changes take
          // effect immediately
          this.mainSettingsTab.plugin.registerRibbonCommandIcons();
        }
      });
    });
  }

  showErrorPopup(invalidValues: string, validModes: string): void {
    const popup = new Modal(this.app);

    popup.titleEl.setText('Invalid mode');
    popup.contentEl.innerHTML = `Changes not saved. Available modes are: ${validModes}. The following are invalid:<br/><br/>${invalidValues}`;
    popup.open();
  }

  showMatchPriorityAdjustments(
    containerEl: HTMLElement,
    config: SwitcherPlusSettings,
  ): void {
    const { enableMatchPriorityAdjustments, matchPriorityAdjustments } = config;
    this.addToggleSetting(
      containerEl,
      'Result priority adjustments',
      'Artificially increase the match score of the specified item types by a fixed percentage so they appear higher in the results list',
      enableMatchPriorityAdjustments,
      null,
      (isEnabled, config) => {
        config.enableMatchPriorityAdjustments = isEnabled;

        // have to wait for the save here because the call to display() will
        // trigger a read of the updated data
        config.saveSettings().then(
          () => {
            // reload the settings panel. This will cause the matchPriorityAdjustments
            // controls to be shown/hidden based on enableMatchPriorityAdjustments status
            this.mainSettingsTab.display();
          },
          (reason) =>
            console.log(
              'Switcher++: error saving "Result Priority Adjustments" setting. ',
              reason,
            ),
        );
      },
    );

    if (enableMatchPriorityAdjustments) {
      PRIORITY_ADJUSTMENTS.forEach(({ key, name, desc }) => {
        if (Object.prototype.hasOwnProperty.call(matchPriorityAdjustments, key)) {
          const setting = this.addSliderSetting(
            containerEl,
            name,
            desc,
            matchPriorityAdjustments[key],
            [-1, 1, 0.05],
            null,
            (value, config) => {
              matchPriorityAdjustments[key] = value;
              config.save();
            },
          );

          setting.setClass('qsp-setting-item-indent');
        }
      });
    }
  }

  showResetFacetEachSession(
    containerEl: HTMLElement,
    config: SwitcherPlusSettings,
  ): void {
    this.addToggleSetting(
      containerEl,
      'Reset active Quick Filters',
      'When enabled, the switcher will reset all Quick Filters back to inactive for each session.',
      config.quickFilters.shouldResetActiveFacets,
      null,
      (value, config) => {
        config.quickFilters.shouldResetActiveFacets = value;
        config.save();
      },
    );
  }

  showInsertLinkInEditor(containerEl: HTMLElement, config: SwitcherPlusSettings): void {
    this.createSetting(containerEl, 'Insert link in editor', '');

    let setting = this.addToggleSetting(
      containerEl,
      'Use filename as alias',
      'When enabled, the file basename will be set as the link alias.',
      config.insertLinkInEditor.useBasenameAsAlias,
      null,
      (value, config) => {
        config.insertLinkInEditor.useBasenameAsAlias = value;
        config.save();
      },
    );
    setting.setClass('qsp-setting-item-indent');

    setting = this.addToggleSetting(
      containerEl,
      'Use heading as alias',
      'When enabled, the file heading will be set as the link alias. This overrides the "use filename as alias" setting.',
      config.insertLinkInEditor.useHeadingAsAlias,
      null,
      (value, config) => {
        config.insertLinkInEditor.useHeadingAsAlias = value;
        config.save();
      },
    );
    setting.setClass('qsp-setting-item-indent');
  }
}
