import { SwitcherPlusSettings } from 'src/settings';
import { SettingsTabSection } from './settingsTabSection';
import { RecentCommandDisplayOrder } from 'src/types';

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

    this.showRecentCommandDisplayOrder(containerEl, config);
  }

  showRecentCommandDisplayOrder(
    containerEl: HTMLElement,
    config: SwitcherPlusSettings,
  ): void {
    const options: Record<RecentCommandDisplayOrder, string> = {
      desc: 'Most recent first (descending)',
      asc: 'Most recent last (ascending)',
    };

    this.addDropdownSetting(
      containerEl,
      'Recent commands display order',
      'Select the sort order for recently used commands.',
      config.recentCommandDisplayOrder,
      options,
      'recentCommandDisplayOrder',
    );
  }
}
