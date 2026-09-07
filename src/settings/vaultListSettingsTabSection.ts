import { SettingsTabSection } from './settingsTabSection';
import { SettingDefinitionPage } from 'obsidian';
import { SettingsControlKey } from './switcherPlusSettings';

export class VaultListSettingsTabSection extends SettingsTabSection {
  getSettingDefinitions(): SettingDefinitionPage<SettingsControlKey>[] {
    const { config } = this;

    return [
      {
        type: 'page',
        name: 'Vault Mode',
        desc: 'Experimental.',
        status: () => 'warning',
        displayValue: () => config.vaultListCommand,
        items: [
          {
            name: 'Vault list mode trigger',
            desc: 'Character that will trigger vault list mode in the switcher',
            control: {
              type: 'text',
              key: 'vaultListCommand',
              placeholder: config.vaultListPlaceholderText,
            },
          },
        ],
      },
    ];
  }
}
