import { SettingsTabSection } from './settingsTabSection';
import { SettingDefinitionPage } from 'obsidian';
import { SettingsControlKey } from './switcherPlusSettings';

export class BookmarksSettingsTabSection extends SettingsTabSection {
  getSettingDefinitions(): SettingDefinitionPage<SettingsControlKey>[] {
    const { config } = this;

    return [
      {
        type: 'page',
        name: 'Bookmarks Mode',
        displayValue: () => this.getModeDisplayValue('bookmarksListCommand'),
        items: [
          ...this.createTriggerSettings(
            'bookmarksListCommand',
            'Bookmarks list mode trigger',
            'Primary trigger that will activate bookmarks list mode in the switcher',
            config.bookmarksListPlaceholderText,
          ),
        ],
      },
    ];
  }
}
