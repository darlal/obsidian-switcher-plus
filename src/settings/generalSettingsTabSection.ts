import { Modal } from 'obsidian';
import { SwitcherPlusSettings } from 'src/settings';
import { Mode, PathDisplayFormat, TitleSource } from 'src/types';
import { SettingsTabSection } from './settingsTabSection';
import { getModeNames } from 'src/utils';

export class GeneralSettingsTabSection extends SettingsTabSection {
  display(containerEl: HTMLElement): void {
    const { config } = this;

    this.addSectionTitle(containerEl, 'General Settings');
    this.showEnabledRibbonCommands(containerEl, config);
    this.showOverrideMobileLauncher(containerEl, config);
    this.showPreferredSourceForTitle(containerEl, config);

    this.showPathDisplayFormat(containerEl, config);
    this.addToggleSetting(
      containerEl,
      'Hide path for root items',
      'When enabled, path information will be hidden for items at the root of the vault.',
      config.hidePathIfRoot,
      'hidePathIfRoot',
    ).setClass('qsp-setting-item-indent');

    this.addTextSetting(
      containerEl,
      'Mode trigger escape character',
      'Character to indicate that a mode trigger character should be treated just as a normal text.',
      config.escapeCmdChar,
      'escapeCmdChar',
    );

    this.addToggleSetting(
      containerEl,
      'Default to open in new tab',
      'When enabled, navigating to un-opened files will open a new editor tab whenever possible (as if cmd/ctrl were held). When the file is already open, the existing tab will be activated. This overrides all other tab settings.',
      config.onOpenPreferNewTab,
      'onOpenPreferNewTab',
    );

    this.addToggleSetting(
      containerEl,
      'Override Standard mode file open behavior',
      'When enabled, Switcher++ will change the default Obsidian builtin Switcher functionality (Standard mode) to inject custom file open behavior.',
      config.overrideStandardModeBehaviors,
      'overrideStandardModeBehaviors',
    );

    this.addToggleSetting(
      containerEl,
      'Override Standard mode rendering',
      'When enabled, Switcher++ will change the default Obsidian builtin Switcher functionality (Standard mode) to render suggestions as multi-line.',
      config.overrideStandardModeRendering,
      'overrideStandardModeRendering',
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
    this.addToggleSetting(
      containerEl,
      'Display mode trigger instructions',
      'When enabled, the trigger key for each mode will be displayed in the instructions section of the Switcher.',
      config.showModeTriggerInstructions,
      'showModeTriggerInstructions',
    );

    this.showResetFacetEachSession(containerEl, config);
    this.showRenderMarkdownContentAsHTML(containerEl, config);
    this.showQuickOpen(containerEl, config);
  }

  showPreferredSourceForTitle(
    containerEl: HTMLElement,
    config: SwitcherPlusSettings,
  ): void {
    const options: Record<TitleSource, string> = {
      H1: 'First H₁ heading',
      Default: 'Default',
    };

    this.addDropdownSetting(
      containerEl,
      'Preferred suggestion title source',
      'The preferred source to use for the "title" text that will be searched and displayed for file based suggestions',
      config.preferredSourceForTitle,
      options,
      'preferredSourceForTitle',
    );
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
    const modeNames = getModeNames();
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
          (v) => !(modeNames as string[]).includes(v),
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

  showOverrideMobileLauncher(
    containerEl: HTMLElement,
    config: SwitcherPlusSettings,
  ): void {
    const { mobileLauncher } = config;
    const desc =
      'Override the "🔍" button (in the Navigation Bar) on mobile platforms to launch Switcher++ instead of the default system switcher. Select the Mode to launch Switcher++ in, or select "Do not override" to disable the feature.';

    const disableOptionKey = 'disabled'; // Option to disable the feature
    const options: Record<string, string> = { [disableOptionKey]: 'Do not override' };

    // Add each mode to the list of options
    const modeNames = getModeNames();
    modeNames.forEach((name) => {
      options[name] = name;
    });

    let initialValue = disableOptionKey;
    if (
      mobileLauncher.isEnabled &&
      modeNames.includes(mobileLauncher.modeString as keyof typeof Mode)
    ) {
      initialValue = mobileLauncher.modeString;
    }

    this.addDropdownSetting(
      containerEl,
      'Override default Switcher launch button (the "🔍" button) on mobile platforms',
      desc,
      initialValue,
      options,
      null,
      (rawValue, config) => {
        const isEnabled = rawValue !== disableOptionKey;

        config.mobileLauncher.isEnabled = isEnabled;
        if (isEnabled) {
          config.mobileLauncher.modeString = rawValue;
        }

        config.save();
        this.mainSettingsTab.plugin.updateMobileLauncherButtonOverride(isEnabled);
      },
    );
  }

  showMatchPriorityAdjustments(
    containerEl: HTMLElement,
    config: SwitcherPlusSettings,
  ): void {
    const {
      matchPriorityAdjustments: { isEnabled, adjustments, fileExtAdjustments },
    } = config;

    this.addToggleSetting(
      containerEl,
      'Result priority adjustments',
      'Artificially increase the match score of the specified item types by a fixed percentage so they appear higher in the results list (does not apply to Standard Mode).',
      isEnabled,
      null,
      (isEnabled, config) => {
        config.matchPriorityAdjustments.isEnabled = isEnabled;

        // have to wait for the save here because the call to display() will
        // trigger a read of the updated data
        config.saveSettings().then(
          () => {
            // reload the settings panel. This will cause the matchPriorityAdjustments
            // controls to be shown/hidden based on isEnabled status
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

    if (isEnabled) {
      [adjustments, fileExtAdjustments].forEach((collection) => {
        Object.entries(collection).forEach(([key, data]) => {
          const { value, label } = data;

          const setting = this.addSliderSetting(
            containerEl,
            label,
            data.desc ?? '',
            value,
            [-1, 1, 0.05, 0],
            null,
            (value, config) => {
              collection[key].value = value;
              config.save();
            },
          );

          setting.setClass('qsp-setting-item-indent');
        });
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

  showRenderMarkdownContentAsHTML(
    containerEl: HTMLElement,
    config: SwitcherPlusSettings,
  ): void {
    const setting = this.addToggleSetting(
      containerEl,
      'Display Headings as Live Preview',
      'When enabled, Headings will be rendered as HTML similar to the Obsidian "Live Preview" display. When disabled, Headings will be rendered as raw text. Use the "toggle preview (selected heading)" hotkey to toggle the display for individual headings.',
      config.renderMarkdownContentInSuggestions.renderHeadings,
      null,
      (value, config) => {
        const { renderMarkdownContentInSuggestions } = config;
        renderMarkdownContentInSuggestions.renderHeadings = value;
        renderMarkdownContentInSuggestions.isEnabled = value;
        config.save();
      },
    );

    // Show a callout that this feature is experimental
    setting?.nameEl?.createSpan({
      cls: ['qsp-tag', 'qsp-warning'],
      text: 'Experimental',
    });
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

  showQuickOpen(containerEl: HTMLElement, config: SwitcherPlusSettings): void {
    this.addToggleSetting(
      containerEl,
      'Enable quick open hotkeys for top results',
      'When enabled, hotkeys will be defined for each of the top N results displayed in the Switcher. These hotkeys can be used to quickly open the associated suggestion directly. when disabled, no hotkeys are defined.',
      config.quickOpen.isEnabled,
      null,
      (value, config) => {
        config.quickOpen.isEnabled = value;
        config.save();
      },
    );
  }
}
