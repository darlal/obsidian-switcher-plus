import { App, PluginSettingTab, Setting } from 'obsidian';
import { SymbolType } from 'src/types';
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
    SwitcherPlusSettingTab.setHeadingsModeSettingsGroup(containerEl, settings);
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
    SwitcherPlusSettingTab.setEnabledSymbolTypes(containerEl, settings);
  }

  private static setWorkspaceModeSettingsGroup(
    containerEl: HTMLElement,
    settings: SwitcherPlusSettings,
  ): void {
    new Setting(containerEl).setName('Workspace List Mode Settings').setHeading();

    SwitcherPlusSettingTab.setWorkspaceListCommand(containerEl, settings);
  }

  private static setHeadingsModeSettingsGroup(
    containerEl: HTMLElement,
    settings: SwitcherPlusSettings,
  ): void {
    new Setting(containerEl).setName('Headings List Mode Settings').setHeading();

    SwitcherPlusSettingTab.setHeadingsListCommand(containerEl, settings);
    SwitcherPlusSettingTab.setStrictHeadingsOnly(containerEl, settings);
    SwitcherPlusSettingTab.setSearchAllHeadings(containerEl, settings);
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

  private static setEnabledSymbolTypes(
    containerEl: HTMLElement,
    settings: SwitcherPlusSettings,
  ): void {
    new Setting(containerEl).setName('Show Headings').addToggle((toggle) =>
      toggle
        .setValue(settings.isSymbolTypeEnabled(SymbolType.Heading))
        .onChange((value) => {
          settings.setSymbolTypeEnabled(SymbolType.Heading, value);
          SwitcherPlusSettingTab.saveChanges(settings);
        }),
    );

    new Setting(containerEl).setName('Show Tags').addToggle((toggle) =>
      toggle.setValue(settings.isSymbolTypeEnabled(SymbolType.Tag)).onChange((value) => {
        settings.setSymbolTypeEnabled(SymbolType.Tag, value);
        SwitcherPlusSettingTab.saveChanges(settings);
      }),
    );

    new Setting(containerEl).setName('Show Links').addToggle((toggle) =>
      toggle.setValue(settings.isSymbolTypeEnabled(SymbolType.Link)).onChange((value) => {
        settings.setSymbolTypeEnabled(SymbolType.Link, value);
        SwitcherPlusSettingTab.saveChanges(settings);
      }),
    );

    new Setting(containerEl).setName('Show Embeds').addToggle((toggle) =>
      toggle
        .setValue(settings.isSymbolTypeEnabled(SymbolType.Embed))
        .onChange((value) => {
          settings.setSymbolTypeEnabled(SymbolType.Embed, value);
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

  private static setHeadingsListCommand(
    containerEl: HTMLElement,
    settings: SwitcherPlusSettings,
  ): void {
    new Setting(containerEl)
      .setName('Headings list mode trigger')
      .setDesc('Character that will trigger headings list mode in the switcher')
      .addText((text) =>
        text
          .setPlaceholder(settings.headingsListPlaceholderText)
          .setValue(settings.headingsListCommand)
          .onChange((value) => {
            settings.headingsListCommand = value;
            SwitcherPlusSettingTab.saveChanges(settings);
          }),
      );
  }

  private static setStrictHeadingsOnly(
    containerEl: HTMLElement,
    settings: SwitcherPlusSettings,
  ): void {
    new Setting(containerEl)
      .setName('Show headings only')
      .setDesc(
        'Enabled, only show suggestions where there is a match in the first H1 contained in the file. Disabled, if there is not a match in the first H1, fallback to showing suggestions where there is a filename match.',
      )
      .addToggle((toggle) =>
        toggle.setValue(settings.strictHeadingsOnly).onChange((value) => {
          settings.strictHeadingsOnly = value;
          SwitcherPlusSettingTab.saveChanges(settings);
        }),
      );
  }

  private static setSearchAllHeadings(
    containerEl: HTMLElement,
    settings: SwitcherPlusSettings,
  ): void {
    new Setting(containerEl)
      .setName('Search all headings')
      .setDesc(
        'Enabled, search through all headings contained in each file. Disabled, only search through the first H1 in each file.',
      )
      .addToggle((toggle) =>
        toggle.setValue(settings.searchAllHeadings).onChange((value) => {
          settings.searchAllHeadings = value;
          SwitcherPlusSettingTab.saveChanges(settings);
        }),
      );
  }
}
