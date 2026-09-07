import { SettingsTabSection } from './settingsTabSection';
import { RecentCommandDisplayOrder } from 'src/types';
import { SettingDefinitionPage } from 'obsidian';
import { SettingsControlKey } from './switcherPlusSettings';

export class CommandListSettingsTabSection extends SettingsTabSection {
  getSettingDefinitions(): SettingDefinitionPage<SettingsControlKey>[] {
    const { config } = this;
    const displayOrderOptions: Record<RecentCommandDisplayOrder, string> = {
      desc: 'Most recent first (descending)',
      asc: 'Most recent last (ascending)',
    };

    return [
      {
        type: 'page',
        name: 'Command Mode',
        displayValue: () => config.commandListCommand,
        items: [
          {
            name: 'Command list mode trigger',
            desc: 'Character that will trigger command list mode in the switcher',
            control: {
              type: 'text',
              key: 'commandListCommand',
              placeholder: config.commandListPlaceholderText,
            },
          },
          {
            name: 'Max recent commands',
            desc: 'The maximum number of recently used commands to display in the list.',
            control: {
              type: 'slider',
              key: 'maxRecentCommands',
              // The upper limit matches MAX_STORED_RECENT_COMMANDS
              min: 0,
              max: 100,
              step: 1,
              defaultValue: 25,
            },
          },
          {
            name: 'Recent commands display order',
            desc: 'Select the sort order for recently used commands.',
            control: {
              type: 'dropdown',
              key: 'recentCommandDisplayOrder',
              options: displayOrderOptions,
            },
          },
        ],
      },
    ];
  }
}
