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

    this.addToggleSetting(
      containerEl,
      'Exclude open files',
      'Enable, related files which are already open will not be displayed in the list. Disabled, All related files will be displayed in the list.',
      config.excludeOpenRelatedFiles,
      'excludeOpenRelatedFiles',
    );
  }
}
