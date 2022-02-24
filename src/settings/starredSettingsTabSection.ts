import { SwitcherPlusSettings } from './switcherPlusSettings';
import { SettingsTabSection } from './settingsTabSection';

export class StarredSettingTabSection extends SettingsTabSection {
  display(containerEl: HTMLElement): void {
    containerEl.createEl('h2', { text: 'Starred List Mode Settings' });

    this.setStarredListCommand(containerEl, this.settings);
  }

  private setStarredListCommand(
    containerEl: HTMLElement,
    settings: SwitcherPlusSettings,
  ): void {
    this.createSetting(
      containerEl,
      'Starred list mode trigger',
      'Character that will trigger starred list mode in the switcher',
    ).addText((text) =>
      text
        .setPlaceholder(settings.starredListPlaceholderText)
        .setValue(settings.starredListCommand)
        .onChange((value) => {
          const val = value.length ? value : settings.starredListPlaceholderText;

          settings.starredListCommand = val;
          settings.save();
        }),
    );
  }
}
