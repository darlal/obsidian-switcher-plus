import { SettingsTabSection } from './settingsTabSection';

export class StarredSettingsTabSection extends SettingsTabSection {
  display(containerEl: HTMLElement): void {
    const { config } = this;

    this.addSectionTitle(containerEl, 'Starred List Mode Settings');

    this.addTextSetting(
      containerEl,
      'Starred list mode trigger',
      'Character that will trigger starred list mode in the switcher',
      config.starredListCommand,
      'starredListCommand',
      config.starredListPlaceholderText,
    );
  }
}
