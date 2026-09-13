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
import { SettingsControlKey, SwitcherPlusSettings } from './switcherPlusSettings';
import { App, PluginSettingTab, SettingDefinitionItem } from 'obsidian';
import { logError } from 'src/utils';
import type SwitcherPlusPlugin from '../main';

type ConstructableSettingsTabSection = {
  new (
    app: App,
    mainSettingsTab: SwitcherPlusSettingTab,
    config: SwitcherPlusSettings,
  ): SettingsTabSection;
};

export class SwitcherPlusSettingTab extends PluginSettingTab {
  generalTabSection: ConstructableSettingsTabSection = GeneralSettingsTabSection;

  /**
   * To have all the custom mode section nest under one heading, each mode section
   * has to contribute exactly one navigable page
   */
  modeTabSections = [
    SymbolSettingsTabSection,
    EditorSettingsTabSection,
    RelatedItemsSettingsTabSection,
    CommandListSettingsTabSection,
    HeadingsSettingsTabSection,
    BookmarksSettingsTabSection,
    WorkspaceSettingsTabSection,
    VaultListSettingsTabSection,
  ];

  constructor(
    app: App,
    public plugin: SwitcherPlusPlugin,
    private config: SwitcherPlusSettings,
  ) {
    super(app, plugin);
    this.containerEl.addClass('qsp-settings-container');
  }

  getSettingDefinitions(): SettingDefinitionItem<SettingsControlKey>[] {
    const { app, config, generalTabSection, modeTabSections } = this;

    return [
      ...new generalTabSection(app, this, config).getSettingDefinitions(),
      {
        type: 'group',
        heading: 'Custom mode behaviors',
        items: modeTabSections.flatMap((tabSectionClass) =>
          new tabSectionClass(app, this, config).getSettingDefinitions(),
        ),
      },
    ];
  }

  getControlValue(key: string): unknown {
    return this.config.readControlValue(key);
  }

  setControlValue(key: string, value: unknown): Promise<void> {
    this.config.writeControlValue(key, value);

    // Returned so the framework awaits the write before re-evaluating visible
    // and disabled predicates. Rejections are logged rather than propagated
    // because it is not documented how a rejected setControlValue is handled.
    return this.config.saveSettings().catch((reason) => {
      logError('Switcher++: Error saving changes to settings. ', reason);
    });
  }
}
