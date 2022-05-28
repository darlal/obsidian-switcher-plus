import { SettingsTabSection } from './settingsTabSection';

export class RelatedItemsSettingsTabSection extends SettingsTabSection {
  display(containerEl: HTMLElement): void {
    const { config } = this;

    this.addSectionTitle(containerEl, 'Related Items List Mode Settings');

    this.addTextSetting(
      containerEl,
      'Related Items list mode trigger',
      'Character that will trigger related items list mode in the switcher',
      config.relatedItemsListCommand,
      'relatedItemsListCommand',
      config.relatedItemsListPlaceholderText,
    );
  }
}
