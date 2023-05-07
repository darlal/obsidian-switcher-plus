import { SettingsTabSection } from './settingsTabSection';

export class BookmarksSettingsTabSection extends SettingsTabSection {
  display(containerEl: HTMLElement): void {
    const { config } = this;

    this.addSectionTitle(containerEl, 'Bookmarks List Mode Settings');

    this.addTextSetting(
      containerEl,
      'Bookmarks list mode trigger',
      'Character that will trigger bookmarks list mode in the switcher',
      config.bookmarksListCommand,
      'bookmarksListCommand',
      config.bookmarksListPlaceholderText,
    );
  }
}
