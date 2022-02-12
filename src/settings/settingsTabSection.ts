import { SwitcherPlusSettings } from './switcherPlusSettings';
import { App, PluginSettingTab, Setting } from 'obsidian';

export abstract class SettingsTabSection {
  constructor(
    private app: App,
    private mainSettingsTab: PluginSettingTab,
    protected settings: SwitcherPlusSettings,
  ) {}

  public abstract display(containerEl: HTMLElement): void;

  public createSetting(containerEl: HTMLElement, name: string, desc: string): Setting {
    const setting = new Setting(containerEl);
    setting.setName(name);
    setting.setDesc(desc);

    return setting;
  }
}
