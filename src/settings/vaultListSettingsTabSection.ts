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
        status: this.triggerStatus('vaultListCommand'),
        displayValue: () => config.vaultListCommand,
        items: [
          {
            name: 'Experimental',
            desc: 'Vault mode is experimental and may change or be removed.',
          },
          this.triggerGroup({
            desc: 'Character that will trigger vault list mode in the switcher',
            control: {
              type: 'text',
              key: 'vaultListCommand',
              placeholder: config.vaultListPlaceholderText,
            },
          }),
        ],
      },
    ];
  }
}
