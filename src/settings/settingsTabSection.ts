import { SettingsControlKey, SwitcherPlusSettings } from './switcherPlusSettings';
import { SwitcherPlusSettingTab } from './switcherPlusSettingTab';
import {
  App,
  SettingDefinitionControl,
  SettingDefinitionEmpty,
  SettingDefinitionGroup,
  SettingDefinitionItem,
} from 'obsidian';

import {
  analyzeTriggerConflicts,
  getConfiguredTriggers,
  groupTriggerWarnings,
} from 'src/utils';

export abstract class SettingsTabSection {
  constructor(
    protected app: App,
    protected mainSettingsTab: SwitcherPlusSettingTab,
    protected config: SwitcherPlusSettings,
  ) {}

  private getTriggerWarnings(): Map<string, string[]> {
    return groupTriggerWarnings(
      analyzeTriggerConflicts(
        getConfiguredTriggers(this.mainSettingsTab.plugin.commandDefinitions),
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

  /**
   * Wraps a mode trigger row and its conflict warning in an untitled group so the
   * warning renders inside the trigger's own card. It also gives each warning row
   * its own sibling list, which keeps Obsidian from flagging two warnings on one
   * page as duplicate setting keys.
   * @param setting - The mode trigger text control row; its name comes from the
   * command definition that owns the setting.
   * @returns The group containing the trigger row followed by its warning row.
   */
  protected triggerGroup(
    setting: Omit<SettingDefinitionControl<SettingsControlKey>, 'name'>,
  ): SettingDefinitionGroup<SettingsControlKey> {
    const { key } = setting.control;
    return {
      type: 'group',
      items: [{ ...setting, name: this.triggerName(key) }, this.triggerWarning(key)],
    };
  }

  /**
   * Reads a trigger row's label from the command definition that owns the setting,
   * so the row and the conflict messages that refer to it always use the same name.
   * @param key - The mode trigger setting.
   * @returns The label for the trigger's settings row.
   */
  protected triggerName(key: SettingsControlKey): string {
    const owner = this.mainSettingsTab.plugin.commandDefinitions.find(
      ({ parserCommand }) => parserCommand.settingsTriggerKey === key,
    );

    if (!owner) {
      throw new Error(`No command definition owns the trigger setting "${key}"`);
    }

    return owner.parserCommand.settingsTriggerName;
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
