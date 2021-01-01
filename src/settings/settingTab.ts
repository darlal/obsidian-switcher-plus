import { App, PluginSettingTab, Setting } from 'obsidian';
import { Settings } from 'src/settings';
import type SwitcherPlusPlugin from '../main';

class SettingTab extends PluginSettingTab {
  constructor(app: App, private plugin: SwitcherPlusPlugin, private settings: Settings) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl, settings } = this;

    containerEl.empty();
    SettingTab.setAlwaysNewPaneForSymbols(containerEl, settings);
  }

  static setAlwaysNewPaneForSymbols(containerEl: HTMLElement, settings: Settings): void {
    new Setting(containerEl)
      .setName('Open Symbols in new pane')
      .setDesc(
        'Enabled, always open a new pane when navigating to Symbols. Disabled, navigate in an already open pane (if one exists)',
      )
      .addToggle((toggle) =>
        toggle.setValue(settings.alwaysNewPaneForSymbols).onChange((value) => {
          settings.alwaysNewPaneForSymbols = value;
          settings.saveSettings();
        }),
      );
  }
}

export { SettingTab as default };
