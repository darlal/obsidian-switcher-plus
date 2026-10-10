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
import {
  analyzeTriggerConflicts,
  getConfiguredTriggers,
  isTriggerSettingKey,
} from 'src/utils/modeTriggers';

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

    const definitions: SettingDefinitionItem<SettingsControlKey>[] = [
      ...new generalTabSection(app, this, config).getSettingDefinitions(),
      {
        type: 'group',
        heading: 'Custom mode behaviors',
        items: modeTabSections.flatMap((tabSectionClass) =>
          new tabSectionClass(app, this, config).getSettingDefinitions(),
        ),
      },
    ];
    const warnings = new Map<string, string[]>();
    for (const conflict of analyzeTriggerConflicts(
      getConfiguredTriggers(config),
      config.escapeCmdChar,
    )) {
      for (const key of conflict.keys) {
        const messages = warnings.get(key) ?? [];
        messages.push(conflict.message);
        warnings.set(key, messages);
      }
    }
    this.addTriggerWarnings(definitions, warnings);
    return definitions;
  }

  /** Keep native text controls; descriptions are regenerated on settings updates. */
  private addTriggerWarnings(
    items: SettingDefinitionItem<SettingsControlKey>[],
    warnings: Map<string, string[]>,
  ): void {
    for (const item of items) {
      if ('items' in item && item.items) {
        this.addTriggerWarnings(item.items, warnings);
      }
      if ('control' in item && item.control) {
        const messages = warnings.get(item.control.key);
        if (messages) {
          const desc = typeof item.desc === 'string' ? item.desc : item.desc?.textContent;
          item.desc = [desc, ...messages.map((message) => `Warning: ${message}`)]
            .filter(Boolean)
            .join('\n\n');
        }
      }
    }
  }

  getControlValue(key: string): unknown {
    return this.config.readControlValue(key);
  }

  setControlValue(key: string, value: unknown): Promise<void> {
    this.config.writeControlValue(key, value);
    if (isTriggerSettingKey(key)) {
      this.update();
    }

    // Returned so the framework awaits the write before re-evaluating visible
    // and disabled predicates. Rejections are logged rather than propagated
    // because it is not documented how a rejected setControlValue is handled.
    return this.config.saveSettings().catch((reason) => {
      logError('Switcher++: Error saving changes to settings. ', reason);
    });
  }
}
