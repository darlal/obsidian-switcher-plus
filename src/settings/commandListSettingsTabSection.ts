import { SwitcherPlusSettings } from 'src/settings';
import { SettingsTabSection } from './settingsTabSection';
import { RecentCommandDisplayOrder } from 'src/types';
import { SettingDefinitionPage } from 'obsidian';
import { SettingsControlKey } from './switcherPlusSettings';

export class CommandListSettingsTabSection extends SettingsTabSection {
  display(containerEl: HTMLElement): void {
    const { config } = this;

    this.addSectionTitle(containerEl, 'Command List Mode');

    this.addTextSetting(
      containerEl,
      'Command list mode trigger',
      'Character that will trigger command list mode in the switcher',
      config.commandListCommand,
      'commandListCommand',
      config.commandListPlaceholderText,
    );

    this.addSliderSetting(
      containerEl,
      'Max recent commands',
      'The maximum number of recently used commands to display in the list.',
      config.maxRecentCommands,
      // The upper limit matches MAX_STORED_RECENT_COMMANDS
      [0, 100, 1, 25],
      'maxRecentCommands',
    );

    this.showRecentCommandDisplayOrder(containerEl, config);
  }

  showRecentCommandDisplayOrder(
    containerEl: HTMLElement,
    config: SwitcherPlusSettings,
  ): void {
    const options: Record<RecentCommandDisplayOrder, string> = {
      desc: 'Most recent first (descending)',
      asc: 'Most recent last (ascending)',
    };

    this.addDropdownSetting(
      containerEl,
      'Recent commands display order',
      'Select the sort order for recently used commands.',
      config.recentCommandDisplayOrder,
      options,
      'recentCommandDisplayOrder',
    );
  }

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
