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
  private triggerWarningElements: WeakRef<HTMLElement>[] = [];

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
    this.addTriggerWarnings(definitions, this.getTriggerWarnings());
    return definitions;
  }

  private getTriggerWarnings(): Map<string, string[]> {
    const warnings = new Map<string, string[]>();
    for (const conflict of analyzeTriggerConflicts(
      getConfiguredTriggers(this.config),
      this.config.escapeCmdChar,
    )) {
      for (const key of conflict.keys) {
        const messages = warnings.get(key) ?? [];
        messages.push(conflict.message);
        warnings.set(key, messages);
      }
    }
    return warnings;
  }

  /** Native descriptions are cloned by Obsidian when a declarative page is rendered. */
  private addTriggerWarnings(
    items: SettingDefinitionItem<SettingsControlKey>[],
    warnings: Map<string, string[]>,
  ): string[] {
    const triggerKeys: string[] = [];
    for (const item of items) {
      if ('items' in item && item.items) {
        const childKeys = this.addTriggerWarnings(item.items, warnings);
        triggerKeys.push(...childKeys);
        if (item.type === 'page' && childKeys.length > 0) {
          const originalStatus = item.status;
          // Native page rows re-evaluate this when returning from a subpage.
          item.status = () => {
            const currentWarnings = this.getTriggerWarnings();
            if (childKeys.some((key) => currentWarnings.has(key))) {
              return 'warning';
            }
            return typeof originalStatus === 'function'
              ? originalStatus()
              : (originalStatus ?? null);
          };
        }
      }
      if ('control' in item && item.control && isTriggerSettingKey(item.control.key)) {
        const key = item.control.key;
        triggerKeys.push(key);
        const originalDesc = item.desc;
        item.desc = window.createFragment((fragment) => {
          if (originalDesc) {
            fragment.append(
              typeof originalDesc === 'string'
                ? originalDesc
                : originalDesc.cloneNode(true),
            );
          }
          const warning = fragment.createDiv({ cls: 'qsp-trigger-warning' });
          warning.dataset.triggerKey = key;
          warning.setAttribute('role', 'status');
          warning.setAttribute('aria-live', 'polite');
          this.triggerWarningElements.push(new WeakRef(warning));
          this.updateTriggerWarning(warning, warnings);
        });
      }
    }
    return triggerKeys;
  }

  private updateTriggerWarning(
    element: HTMLElement,
    warnings: Map<string, string[]>,
  ): void {
    const messages = warnings.get(element.dataset.triggerKey) ?? [];
    element.textContent = messages.map((message) => `⚠ Warning: ${message}`).join('\n\n');
    element.hidden = messages.length === 0;
  }

  /** Update visible clones and retained descriptions without rebuilding focused controls. */
  private refreshTriggerWarnings(): void {
    const warnings = this.getTriggerWarnings();
    const elements = new Set(
      Array.from(
        this.containerEl.ownerDocument.querySelectorAll<HTMLElement>(
          '.qsp-trigger-warning',
        ),
      ),
    );
    this.triggerWarningElements = this.triggerWarningElements.filter((ref) => {
      const element = ref.deref();
      if (!element) {
        return false;
      }
      elements.add(element);
      return true;
    });
    for (const element of elements) {
      this.updateTriggerWarning(element, warnings);
    }
  }

  getControlValue(key: string): unknown {
    return this.config.readControlValue(key);
  }

  setControlValue(key: string, value: unknown): Promise<void> {
    this.config.writeControlValue(key, value);
    if (isTriggerSettingKey(key)) {
      this.refreshTriggerWarnings();
      // Native page status callbacks are only re-evaluated by update().
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
