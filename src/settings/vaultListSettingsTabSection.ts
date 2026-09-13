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
        displayValue: () => this.getModeDisplayValue('vaultListCommand'),
        items: [
          ...this.createTriggerSettings(
            'vaultListCommand',
            'Vault list mode trigger',
            'Primary trigger that will activate vault list mode in the switcher',
            config.vaultListPlaceholderText,
          ),
        ],
      },
    ];
  }
}
