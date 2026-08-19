import { SettingsTabSection } from './settingsTabSection';
import { SettingDefinitionPage } from 'obsidian';
import { SettingsControlKey } from './switcherPlusSettings';

export class WorkspaceSettingsTabSection extends SettingsTabSection {
  display(containerEl: HTMLElement): void {
    const { config } = this;

    this.addSectionTitle(containerEl, 'Workspace List Mode');

    this.addTextSetting(
      containerEl,
      'Workspace list mode trigger',
      'Character that will trigger workspace list mode in the switcher',
      config.workspaceListCommand,
      'workspaceListCommand',
      config.workspaceListPlaceholderText,
    );
  }

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
