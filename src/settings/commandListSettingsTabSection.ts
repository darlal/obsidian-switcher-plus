import { SettingsTabSection } from './settingsTabSection';

export class CommandListSettingsTabSection extends SettingsTabSection {
  display(containerEl: HTMLElement): void {
    const { config } = this;

    this.addSectionTitle(containerEl, 'Command List Mode Settings');

    this.addTextSetting(
      containerEl,
      'Command list mode trigger',
      'Character that will trigger command list mode in the switcher',
      config.commandListCommand,
      'commandListCommand',
      config.commandListPlaceholderText,
    );
  }
}
