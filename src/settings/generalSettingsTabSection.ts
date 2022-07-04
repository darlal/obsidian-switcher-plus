import { SwitcherPlusSettings } from 'src/settings';
import { PathDisplayFormat } from 'src/types';
import { SettingsTabSection } from './settingsTabSection';

export class GeneralSettingsTabSection extends SettingsTabSection {
  display(containerEl: HTMLElement): void {
    this.addSectionTitle(containerEl, 'General Settings');

    this.addToggleSetting(
      containerEl,
      'Default to open in new pane',
      'When enabled, navigating to un-opened files will open a new editor pane whenever possible (as if cmd/ctrl were held). When the file is already open, the existing pane will be activated. This overrides all other pane settings.',
      this.config.onOpenPreferNewPane,
      'onOpenPreferNewPane',
    );

    this.setPathDisplayFormat(containerEl, this.config);
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
}
