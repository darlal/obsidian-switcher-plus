import { SettingsTabSection } from './settingsTabSection';

export class VaultListSettingsTabSection extends SettingsTabSection {
  display(containerEl: HTMLElement): void {
    const { config } = this;

    const titleSetting = this.addSectionTitle(containerEl, 'Vault List Mode');
    titleSetting.nameEl?.createSpan({
      cls: ['qsp-tag', 'qsp-warning'],
      text: 'Experimental',
    });

    this.addTriggerSetting(
      containerEl,
      'Vault list mode trigger',
      'Trigger text that will activate vault list mode in the switcher',
      config.vaultListCommand,
      'vaultListCommand',
      config.vaultListPlaceholderText,
    );
  }
}
