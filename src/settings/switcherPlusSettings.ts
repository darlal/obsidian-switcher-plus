import { BuiltInSystemOptions } from 'src/types';
import { getSystemSwitcherInstance } from 'src/utils';
import type SwitcherPlusPlugin from 'src/main';

interface SettingsData {
  alwaysNewPaneForSymbols: boolean;
  symbolsInLineOrder: boolean;
  editorListCommand: string;
  symbolListCommand: string;
  workspaceListCommand: string;
  excludeViewTypes: Array<string>;
  referenceViews: Array<string>;
  includeSidePanelViewTypes: Array<string>;
}

export class SwitcherPlusSettings {
  private data: SettingsData;

  private static get defaultSettingsData(): SettingsData {
    return {
      alwaysNewPaneForSymbols: false,
      symbolsInLineOrder: true,
      editorListCommand: 'edt ',
      symbolListCommand: '@',
      workspaceListCommand: '+',
      excludeViewTypes: ['empty'],
      referenceViews: ['backlink', 'localgraph', 'outgoing-link', 'outline'],
      includeSidePanelViewTypes: ['backlink', 'image', 'markdown', 'pdf'],
    };
  }

  get builtInSystemOptions(): BuiltInSystemOptions {
    return getSystemSwitcherInstance(this.plugin.app)?.options as BuiltInSystemOptions;
  }

  get showAllFileTypes(): boolean {
    // forward to core switcher settings
    return this.builtInSystemOptions?.showAllFileTypes;
  }

  get showAttachments(): boolean {
    // forward to core switcher settings
    return this.builtInSystemOptions?.showAttachments;
  }

  get showExistingOnly(): boolean {
    // forward to core switcher settings
    return this.builtInSystemOptions?.showExistingOnly;
  }

  get alwaysNewPaneForSymbols(): boolean {
    return this.data.alwaysNewPaneForSymbols;
  }

  set alwaysNewPaneForSymbols(value: boolean) {
    this.data.alwaysNewPaneForSymbols = value;
  }

  get symbolsInlineOrder(): boolean {
    return this.data.symbolsInLineOrder;
  }

  set symbolsInlineOrder(value: boolean) {
    this.data.symbolsInLineOrder = value;
  }

  get editorListPlaceholderText(): string {
    return SwitcherPlusSettings.defaultSettingsData.editorListCommand;
  }

  get editorListCommand(): string {
    return this.data.editorListCommand;
  }

  set editorListCommand(value: string) {
    this.data.editorListCommand = value;
  }

  get symbolListPlaceholderText(): string {
    return SwitcherPlusSettings.defaultSettingsData.symbolListCommand;
  }

  get symbolListCommand(): string {
    return this.data.symbolListCommand;
  }

  set symbolListCommand(value: string) {
    this.data.symbolListCommand = value;
  }

  get workspaceListCommand(): string {
    return this.data.workspaceListCommand;
  }

  set workspaceListCommand(value: string) {
    this.data.workspaceListCommand = value;
  }

  get workspaceListPlaceholderText(): string {
    return SwitcherPlusSettings.defaultSettingsData.workspaceListCommand;
  }

  get excludeViewTypes(): Array<string> {
    return this.data.excludeViewTypes;
  }

  get referenceViews(): Array<string> {
    return this.data.referenceViews;
  }

  get includeSidePanelViewTypes(): Array<string> {
    return this.data.includeSidePanelViewTypes;
  }

  set includeSidePanelViewTypes(value: Array<string>) {
    // remove any duplicates before storing
    this.data.includeSidePanelViewTypes = [...new Set(value)];
  }

  get includeSidePanelViewTypesPlaceholder(): string {
    return SwitcherPlusSettings.defaultSettingsData.includeSidePanelViewTypes.join('\n');
  }

  constructor(private plugin: SwitcherPlusPlugin) {
    this.data = SwitcherPlusSettings.defaultSettingsData;
  }

  async loadSettings(): Promise<void> {
    const { plugin } = this;
    const savedData = (await plugin.loadData()) as SettingsData;
    this.data = { ...SwitcherPlusSettings.defaultSettingsData, ...savedData };
  }

  saveSettings(): void {
    const { plugin, data } = this;
    if (plugin && data) {
      plugin.saveData(data).catch(() => {
        console.log('Switcher++: Error saving settings data');
      });
    }
  }
}
