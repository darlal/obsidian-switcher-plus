import { SettingsTabSection } from './settingsTabSection';
import { BookmarksSettingsTabSection } from './bookmarksSettingsTabSection';
import { CommandListSettingsTabSection } from './commandListSettingsTabSection';
import { RelatedItemsSettingsTabSection } from './relatedItemsSettingsTabSection';
import { GeneralSettingsTabSection } from './generalSettingsTabSection';
import { WorkspaceSettingsTabSection } from './workspaceSettingsTabSection';
import { EditorSettingsTabSection } from './editorSettingsTabSection';
import { HeadingsSettingsTabSection } from './headingsSettingsTabSection';
import { SymbolSettingsTabSection } from './symbolSettingsTabSection';
import { VaultListSettingsTabSection } from './vaultListSettingsTabSection';
import { SwitcherPlusSettings } from './switcherPlusSettings';
import { App, PluginSettingTab } from 'obsidian';
import type SwitcherPlusPlugin from '../main';

type ConstructableSettingsTabSection = {
  new (
    app: App,
    mainSettingsTab: SwitcherPlusSettingTab,
    config: SwitcherPlusSettings,
  ): SettingsTabSection;
};

export class SwitcherPlusSettingTab extends PluginSettingTab {
  constructor(
    app: App,
    public plugin: SwitcherPlusPlugin,
    private config: SwitcherPlusSettings,
  ) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    const tabSections = [
      GeneralSettingsTabSection,
      SymbolSettingsTabSection,
      HeadingsSettingsTabSection,
      EditorSettingsTabSection,
      RelatedItemsSettingsTabSection,
      BookmarksSettingsTabSection,
      CommandListSettingsTabSection,
      WorkspaceSettingsTabSection,
      VaultListSettingsTabSection,
    ];

    containerEl.empty();
    containerEl.createEl('h2', { text: 'Quick Switcher++ Settings' });

    tabSections.forEach((tabSectionClass) => {
      this.displayTabSection(tabSectionClass);
    });
  }

  displayTabSection(tabSectionClass: ConstructableSettingsTabSection): void {
    const { app, config, containerEl } = this;
    const tabSection = new tabSectionClass(app, this, config);
    tabSection.display(containerEl);
  }
}
