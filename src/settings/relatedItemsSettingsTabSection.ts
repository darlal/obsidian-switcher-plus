import { SwitcherPlusSettings } from './switcherPlusSettings';
import { SettingsTabSection } from './settingsTabSection';

export class RelatedItemsSettingTabSection extends SettingsTabSection {
  display(containerEl: HTMLElement): void {
    containerEl.createEl('h2', { text: 'Related Items List Mode Settings' });

    this.setRelatedItemsListCommand(containerEl, this.settings);
  }

  private setRelatedItemsListCommand(
    containerEl: HTMLElement,
    settings: SwitcherPlusSettings,
  ): void {
    this.createSetting(
      containerEl,
      'Related Items list mode trigger',
      'Character that will trigger related items list mode in the switcher',
    ).addText((text) =>
      text
        .setPlaceholder(settings.relatedItemsListPlaceholderText)
        .setValue(settings.relatedItemsListCommand)
        .onChange((value) => {
          const val = value.length ? value : settings.relatedItemsListPlaceholderText;

          settings.relatedItemsListCommand = val;
          settings.save();
        }),
    );
  }
}
