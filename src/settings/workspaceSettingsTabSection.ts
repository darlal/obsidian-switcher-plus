import { SettingsTabSection } from './settingsTabSection';
import { SettingDefinitionPage } from 'obsidian';
import { SettingsControlKey } from './switcherPlusSettings';

export class WorkspaceSettingsTabSection extends SettingsTabSection {
  getSettingDefinitions(): SettingDefinitionPage<SettingsControlKey>[] {
    const { config } = this;

    return [
      {
        type: 'page',
        name: 'Workspace Mode',
        displayValue: () => config.workspaceListCommand,
        items: [
          {
            name: 'Workspace list mode trigger',
            desc: 'Character that will trigger workspace list mode in the switcher',
            control: {
              type: 'text',
              key: 'workspaceListCommand',
              placeholder: config.workspaceListPlaceholderText,
            },
          },
        ],
      },
    ];
  }
}
