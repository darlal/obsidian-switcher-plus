import { SettingsTabSection } from './settingsTabSection';

export class WorkspaceSettingsTabSection extends SettingsTabSection {
  display(containerEl: HTMLElement): void {
    const { config } = this;

    this.addSectionTitle(containerEl, 'Workspace List Mode');

    this.addTextSetting(
      containerEl,
      'Workspace list mode trigger',
      'Character that will trigger workspace list mode in the switcher',
      config.workspaceListCommand,
      'workspaceListCommand',
      config.workspaceListPlaceholderText,
    );
  }
}
