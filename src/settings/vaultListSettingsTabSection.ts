import { SettingsTabSection } from './settingsTabSection';

export class VaultListSettingsTabSection extends SettingsTabSection {
  display(containerEl: HTMLElement): void {
    const { config } = this;

    const titleSetting = this.addSectionTitle(containerEl, 'Vault List Mode Settings');
    titleSetting.nameEl?.createSpan({
      cls: ['qsp-tag', 'qsp-warning'],
      text: 'Experimental',
    });

    this.addTextSetting(
      containerEl,
      'Vault list mode trigger',
      'Character that will trigger vault list mode in the switcher',
      config.vaultListCommand,
      'vaultListCommand',
      config.vaultListPlaceholderText,
    );
  }
}
