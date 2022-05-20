import { SwitcherPlusSettings } from './switcherPlusSettings';
import { SettingsTabSection } from './settingsTabSection';

export class CommandListSettingTabSection extends SettingsTabSection {
  display(containerEl: HTMLElement): void {
    containerEl.createEl('h2', { text: 'Command List Mode Settings' });

    this.setCommandListCommand(containerEl, this.settings);
  }

  private setCommandListCommand(
    containerEl: HTMLElement,
    settings: SwitcherPlusSettings,
  ): void {
    this.createSetting(
      containerEl,
      'Command list mode trigger',
      'Character that will trigger command list mode in the switcher',
    ).addText((text) =>
      text
        .setPlaceholder(settings.commandListPlaceholderText)
        .setValue(settings.commandListCommand)
        .onChange((value) => {
          const val = value.length ? value : settings.commandListPlaceholderText;

          settings.commandListCommand = val;
          settings.save();
        }),
    );
  }
}
