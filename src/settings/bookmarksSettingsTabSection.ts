import { SettingsTabSection } from './settingsTabSection';

export class BookmarksSettingsTabSection extends SettingsTabSection {
  display(containerEl: HTMLElement): void {
    const { config } = this;

    this.addSectionTitle(containerEl, 'Bookmarks List Mode');

    this.addTriggerSetting(
      containerEl,
      'Bookmarks list mode trigger',
      'Trigger text that will activate bookmarks list mode in the switcher',
      config.bookmarksListCommand,
      'bookmarksListCommand',
      config.bookmarksListPlaceholderText,
    );
  }
}
