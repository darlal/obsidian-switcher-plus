import { SettingsTabSection } from './settingsTabSection';

export class WorkspaceSettingsTabSection extends SettingsTabSection {
  display(containerEl: HTMLElement): void {
    const { config } = this;

    this.addSectionTitle(containerEl, 'Workspace List Mode');

    this.addTriggerSetting(
      containerEl,
      'Workspace list mode trigger',
      'Trigger text that will activate workspace list mode in the switcher',
      config.workspaceListCommand,
      'workspaceListCommand',
      config.workspaceListPlaceholderText,
    );
  }
}
