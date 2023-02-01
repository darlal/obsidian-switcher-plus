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
    this.addToggleSetting(
      containerEl,
      'Preserve Command Palette last input',
      'Controls whether the last typed input to the Command Palette should be restored when opening it the next time.',
      config.preserveCommandPaletteLastInput,
      'preserveCommandPaletteLastInput',
    );
  }
}
