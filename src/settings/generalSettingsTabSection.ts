import { Modal } from 'obsidian';
import { SwitcherPlusSettings } from 'src/settings';
import { Mode, PathDisplayFormat } from 'src/types';
import { SettingsTabSection } from './settingsTabSection';

export class GeneralSettingsTabSection extends SettingsTabSection {
  display(containerEl: HTMLElement): void {
    const { config } = this;

    this.addSectionTitle(containerEl, 'General Settings');
    this.setEnabledRibbonCommands(containerEl, config);

    this.setPathDisplayFormat(containerEl, config);
    this.addToggleSetting(
      containerEl,
      'Hide path for root items',
      'When enabled, path information will be hidden for items at the root of the vault.',
      this.config.hidePathIfRoot,
      'hidePathIfRoot',
    ).setClass('qsp-setting-item-indent');

    this.addToggleSetting(
      containerEl,
      'Default to open in new tab',
      'When enabled, navigating to un-opened files will open a new editor tab whenever possible (as if cmd/ctrl were held). When the file is already open, the existing tab will be activated. This overrides all other tab settings.',
      this.config.onOpenPreferNewTab,
      'onOpenPreferNewTab',
    );

    this.addToggleSetting(
      containerEl,
      'Override Standard mode behavior',
      'When enabled, Switcher++ will change the default Obsidian builtin Switcher functionality (Standard mode) to inject custom behavior.',
      this.config.overrideStandardModeBehaviors,
      'overrideStandardModeBehaviors',
    );

    this.addToggleSetting(
      containerEl,
      'Show indicator icons',
      'Display icons to indicate that an item is recent, starred, etc..',
      this.config.showOptionalIndicatorIcons,
      'showOptionalIndicatorIcons',
    );
  }

  setPathDisplayFormat(containerEl: HTMLElement, config: SwitcherPlusSettings): void {
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

  setEnabledRibbonCommands(containerEl: HTMLElement, config: SwitcherPlusSettings) {
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
}
