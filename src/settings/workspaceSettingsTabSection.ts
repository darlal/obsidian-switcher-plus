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
        displayValue: () => this.getModeDisplayValue('workspaceListCommand'),
        items: [
          ...this.createTriggerSettings(
            'workspaceListCommand',
            'Workspace list mode trigger',
            'Primary trigger that will activate workspace list mode in the switcher',
            config.workspaceListPlaceholderText,
          ),
        ],
      },
    ];
  }
}
