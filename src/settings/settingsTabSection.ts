import { SettingsControlKey, SwitcherPlusSettings } from './switcherPlusSettings';
import { SwitcherPlusSettingTab } from './switcherPlusSettingTab';
import { App, SettingDefinitionItem, SettingDefinitionEmpty } from 'obsidian';

import {
  analyzeTriggerConflicts,
  getConfiguredTriggers,
  groupTriggerWarnings,
} from 'src/utils/modeTriggers';

export abstract class SettingsTabSection {
  constructor(
    protected app: App,
    protected mainSettingsTab: SwitcherPlusSettingTab,
    protected config: SwitcherPlusSettings,
  ) {}

  private getTriggerWarnings(): Map<string, string[]> {
    return groupTriggerWarnings(
      analyzeTriggerConflicts(
        getConfiguredTriggers(this.config),
        this.config.escapeCmdChar,
      ),
    );
  }

  /** A separate row can refresh while the preceding input retains focus. */
  protected triggerWarning(key: SettingsControlKey): SettingDefinitionEmpty {
    const messages = this.getTriggerWarnings().get(key) ?? [];
    return {
      name: '⚠ Warning',
      desc: messages.length
        ? window.createFragment((fragment) => {
            fragment.createSpan({
              cls: 'qsp-trigger-warning',
              text: messages.join('\n\n'),
            });
          })
        : '',
      visible: () => this.getTriggerWarnings().has(key),
      searchable: false,
    };
  }

  protected triggerStatus(...keys: SettingsControlKey[]): () => 'warning' | null {
    return () => {
      const warnings = this.getTriggerWarnings();
      return keys.some((key) => warnings.has(key)) ? 'warning' : null;
    };
  }

  /**
   * Sections override this to define their settings declaratively. Obsidian
   * renders, indexes, and persists the returned definitions; it runs on every
   * update() and once at tab registration, so it must stay cheap.
   * @returns SettingDefinitionItem<SettingsControlKey>[]
   */
  abstract getSettingDefinitions(): SettingDefinitionItem<SettingsControlKey>[];
}
