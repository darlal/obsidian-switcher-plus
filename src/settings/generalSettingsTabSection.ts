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
  }
}
