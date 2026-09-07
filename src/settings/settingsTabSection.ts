import { SettingsControlKey, SwitcherPlusSettings } from './switcherPlusSettings';
import { SwitcherPlusSettingTab } from './switcherPlusSettingTab';
import { App, SettingDefinitionItem } from 'obsidian';

export abstract class SettingsTabSection {
  constructor(
    protected app: App,
    protected mainSettingsTab: SwitcherPlusSettingTab,
    protected config: SwitcherPlusSettings,
  ) {}

  /**
   * Sections override this to define their settings declaratively. Obsidian
   * renders, indexes, and persists the returned definitions; it runs on every
   * update() and once at tab registration, so it must stay cheap.
   * @returns SettingDefinitionItem<SettingsControlKey>[]
   */
  abstract getSettingDefinitions(): SettingDefinitionItem<SettingsControlKey>[];
}
