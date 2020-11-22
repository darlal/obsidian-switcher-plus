/* eslint-disable import/no-unresolved */
import { PluginSettingTab, Setting } from 'obsidian';

class SettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl, plugin: { settings } } = this;

    containerEl.empty();
    SettingTab.setAlwaysNewPaneForSymbols(containerEl, settings);
  }

  static setAlwaysNewPaneForSymbols(containerEl, settings) {
    new Setting(containerEl)
      .setName('Open Symbols in new pane')
      .setDesc('Enabled, always open a new pane when navigating to Symbols. Disabled, navigate in an already open pane (if one exists)')
      .addToggle((toggle) => toggle.setValue(settings.alwaysNewPaneForSymbols)
        .onChange((value) => {
          settings.alwaysNewPaneForSymbols = value;
          settings.saveSettings();
        }));
  }
}

export { SettingTab as default };
