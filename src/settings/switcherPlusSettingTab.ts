import { App, PluginSettingTab, Setting } from 'obsidian';
import { SwitcherPlusSettings } from 'src/settings';
import type SwitcherPlusPlugin from '../main';

export class SwitcherPlusSettingTab extends PluginSettingTab {
  constructor(
    app: App,
    plugin: SwitcherPlusPlugin,
    private settings: SwitcherPlusSettings,
  ) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl, settings } = this;

    containerEl.empty();
    SwitcherPlusSettingTab.setAlwaysNewPaneForSymbols(containerEl, settings);
    SwitcherPlusSettingTab.setSymbolsInLineOrder(containerEl, settings);
    SwitcherPlusSettingTab.setShowExistingOnly(containerEl, settings);
    SwitcherPlusSettingTab.setEditorListCommand(containerEl, settings);
    SwitcherPlusSettingTab.setSymbolListCommand(containerEl, settings);
    this.setIncludeSidePanelViews(containerEl, settings);
  }

  static setAlwaysNewPaneForSymbols(
    containerEl: HTMLElement,
    settings: SwitcherPlusSettings,
  ): void {
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

  static setSymbolsInLineOrder(
    containerEl: HTMLElement,
    settings: SwitcherPlusSettings,
  ): void {
    new Setting(containerEl)
      .setName('List symbols in order they appear')
      .setDesc(
        'Enabled, symbols will be displayed in the (line) order they appear in the source text, indented under any preceding heading. Disabled, symbols will be grouped by type: Headings, Tags, Links, Embeds.',
      )
      .addToggle((toggle) =>
        toggle.setValue(settings.symbolsInlineOrder).onChange((value) => {
          settings.symbolsInlineOrder = value;
          settings.saveSettings();
        }),
      );
  }

  static setShowExistingOnly(
    containerEl: HTMLElement,
    settings: SwitcherPlusSettings,
  ): void {
    new Setting(containerEl)
      .setName('Show existing only')
      .setDesc('Whether to show links to files that are not yet created.')
      .addToggle((toggle) =>
        toggle.setValue(settings.showExistingOnly).onChange((value) => {
          settings.showExistingOnly = value;
          settings.saveSettings();
        }),
      );
  }

  static setEditorListCommand(
    containerEl: HTMLElement,
    settings: SwitcherPlusSettings,
  ): void {
    new Setting(containerEl)
      .setName('Editor list mode trigger')
      .setDesc('Character that will trigger editor list mode in the switcher')
      .addText((text) =>
        text
          .setPlaceholder(settings.editorListPlaceholderText)
          .setValue(settings.editorListCommand)
          .onChange(async (value) => {
            settings.editorListCommand = value;
            settings.saveSettings();
          }),
      );
  }

  static setSymbolListCommand(
    containerEl: HTMLElement,
    settings: SwitcherPlusSettings,
  ): void {
    new Setting(containerEl)
      .setName('Symbol list mode trigger')
      .setDesc('Character that will trigger symbol list mode in the switcher')
      .addText((text) =>
        text
          .setPlaceholder(settings.symbolListPlaceholderText)
          .setValue(settings.symbolListCommand)
          .onChange(async (value) => {
            settings.symbolListCommand = value;
            settings.saveSettings();
          }),
      );
  }

  private setIncludeSidePanelViews(
    containerEl: HTMLElement,
    settings: SwitcherPlusSettings,
  ): void {
    const viewsListing = Object.keys((this.app as any).viewRegistry.viewByType)
      .sort()
      .join(' ');

    new Setting(containerEl)
      .setName('Include side panel views')
      .setDesc(
        `When in Editor list mode, show the following view types from the side panels. Add one view type per line. Available view types: ${viewsListing}`,
      )
      .addTextArea((textArea) =>
        textArea
          .setPlaceholder(settings.includeSidePanelViewTypesPlaceholder)
          .setValue(settings.includeSidePanelViewTypes.join('\n'))
          .onChange(async (value) => {
            settings.includeSidePanelViewTypes = value.split('\n');
            settings.saveSettings();
          }),
      );
  }
}
