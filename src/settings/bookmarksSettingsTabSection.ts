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
        displayValue: () => config.bookmarksListCommand,
        items: [
          {
            name: 'Bookmarks list mode trigger',
            desc: 'Character that will trigger bookmarks list mode in the switcher',
            control: {
              type: 'text',
              key: 'bookmarksListCommand',
              placeholder: config.bookmarksListPlaceholderText,
            },
          },
        ],
      },
    ];
  }
}
