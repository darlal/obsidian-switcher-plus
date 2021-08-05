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
    SwitcherPlusSettingTab.setSymbolModeSettingsGroup(containerEl, settings);
    this.setEditorModeSettingsGroup(containerEl, settings);
    SwitcherPlusSettingTab.setWorkspaceModeSettingsGroup(containerEl, settings);
  }

  private setEditorModeSettingsGroup(
    containerEl: HTMLElement,
    settings: SwitcherPlusSettings,
  ): void {
    new Setting(containerEl).setName('Editor List Mode Settings').setHeading();

    SwitcherPlusSettingTab.setEditorListCommand(containerEl, settings);
    this.setIncludeSidePanelViews(containerEl, settings);
  }

  private static setSymbolModeSettingsGroup(
    containerEl: HTMLElement,
    settings: SwitcherPlusSettings,
  ): void {
    new Setting(containerEl).setName('Symbol List Mode Settings').setHeading();

    SwitcherPlusSettingTab.setSymbolListCommand(containerEl, settings);
    SwitcherPlusSettingTab.setSymbolsInLineOrder(containerEl, settings);
    SwitcherPlusSettingTab.setAlwaysNewPaneForSymbols(containerEl, settings);
    SwitcherPlusSettingTab.setUseActivePaneForSymbolsOnMobile(containerEl, settings);
  }

  private static setWorkspaceModeSettingsGroup(
    containerEl: HTMLElement,
    settings: SwitcherPlusSettings,
  ): void {
    new Setting(containerEl).setName('Workspace List Mode Settings').setHeading();

    SwitcherPlusSettingTab.setWorkspaceListCommand(containerEl, settings);
  }

  private static saveChanges(settings: SwitcherPlusSettings) {
    settings.saveSettings().catch((e) => {
      console.log('Switcher++: error saving changes to settings');
      console.log(e);
    });
  }

  private static setAlwaysNewPaneForSymbols(
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
          SwitcherPlusSettingTab.saveChanges(settings);
        }),
      );
  }

  private static setUseActivePaneForSymbolsOnMobile(
    containerEl: HTMLElement,
    settings: SwitcherPlusSettings,
  ): void {
    new Setting(containerEl)
      .setName('Open Symbols in active pane on mobile devices')
      .setDesc(
        'Enabled, navigate to the target file and symbol in the active editor pane. Disabled, open a new pane when navigating to Symbols, even on mobile devices.',
      )
      .addToggle((toggle) =>
        toggle.setValue(settings.useActivePaneForSymbolsOnMobile).onChange((value) => {
          settings.useActivePaneForSymbolsOnMobile = value;
          SwitcherPlusSettingTab.saveChanges(settings);
        }),
      );
  }

  private static setSymbolsInLineOrder(
    containerEl: HTMLElement,
    settings: SwitcherPlusSettings,
  ): void {
    new Setting(containerEl)
      .setName('List symbols as indented outline')
      .setDesc(
        'Enabled, symbols will be displayed in the (line) order they appear in the source text, indented under any preceding heading. Disabled, symbols will be grouped by type: Headings, Tags, Links, Embeds.',
      )
      .addToggle((toggle) =>
        toggle.setValue(settings.symbolsInlineOrder).onChange((value) => {
          settings.symbolsInlineOrder = value;
          SwitcherPlusSettingTab.saveChanges(settings);
        }),
      );
  }

  private static setEditorListCommand(
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
          .onChange((value) => {
            settings.editorListCommand = value;
            SwitcherPlusSettingTab.saveChanges(settings);
          }),
      );
  }

  private static setSymbolListCommand(
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
          .onChange((value) => {
            settings.symbolListCommand = value;
            SwitcherPlusSettingTab.saveChanges(settings);
          }),
      );
  }

  private setIncludeSidePanelViews(
    containerEl: HTMLElement,
    settings: SwitcherPlusSettings,
  ): void {
    const viewsListing = Object.keys(this.app.viewRegistry.viewByType).sort().join(' ');

    new Setting(containerEl)
      .setName('Include side panel views')
      .setDesc(
        `When in Editor list mode, show the following view types from the side panels. Add one view type per line. Available view types: ${viewsListing}`,
      )
      .addTextArea((textArea) =>
        textArea
          .setPlaceholder(settings.includeSidePanelViewTypesPlaceholder)
          .setValue(settings.includeSidePanelViewTypes.join('\n'))
          .onChange((value) => {
            settings.includeSidePanelViewTypes = value.split('\n');
            SwitcherPlusSettingTab.saveChanges(settings);
          }),
      );
  }
  private static setWorkspaceListCommand(
    containerEl: HTMLElement,
    settings: SwitcherPlusSettings,
  ): void {
    new Setting(containerEl)
      .setName('Workspace list mode trigger')
      .setDesc('Character that will trigger workspace list mode in the switcher')
      .addText((text) =>
        text
          .setPlaceholder(settings.workspaceListPlaceholderText)
          .setValue(settings.workspaceListCommand)
          .onChange((value) => {
            settings.workspaceListCommand = value;
            SwitcherPlusSettingTab.saveChanges(settings);
          }),
      );
  }
}
