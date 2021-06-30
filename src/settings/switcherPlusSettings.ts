import type SwitcherPlusPlugin from '../main';

interface SettingsData {
  alwaysNewPaneForSymbols: boolean;
  symbolsInLineOrder: boolean;
  showExistingOnly: boolean;
  editorListCommand: string;
  symbolListCommand: string;
  excludeViewTypes: Array<string>;
  referenceViews: Array<string>;
  includeSidePanelViewTypes: Array<string>;
}

export class SwitcherPlusSettings {
  private data: SettingsData;

  private static get defaultData(): SettingsData {
    return {
      alwaysNewPaneForSymbols: false,
      symbolsInLineOrder: true,
      showExistingOnly: false,
      editorListCommand: 'edt ',
      symbolListCommand: '@',
      excludeViewTypes: ['empty'],
      referenceViews: ['backlink', 'outline', 'localgraph'],
      includeSidePanelViewTypes: ['markdown', 'image', 'pdf'],
    };
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

  get showExistingOnly(): boolean {
    return this.data.showExistingOnly;
  }

  set showExistingOnly(value: boolean) {
    this.data.showExistingOnly = value;
  }

  get editorListPlaceholderText(): string {
    return SwitcherPlusSettings.defaultData.editorListCommand;
  }

  get editorListCommand(): string {
    return this.data.editorListCommand;
  }

  set editorListCommand(value: string) {
    this.data.editorListCommand = value;
  }

  get symbolListPlaceholderText(): string {
    return SwitcherPlusSettings.defaultData.symbolListCommand;
  }

  get symbolListCommand(): string {
    return this.data.symbolListCommand;
  }

  set symbolListCommand(value: string) {
    this.data.symbolListCommand = value;
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
    return SwitcherPlusSettings.defaultData.includeSidePanelViewTypes.join('\n');
  }

  constructor(private plugin: SwitcherPlusPlugin) {
    this.data = SwitcherPlusSettings.defaultData;
  }

  async loadSettings(): Promise<void> {
    const { plugin } = this;
    const savedData = (await plugin.loadData()) as SettingsData;
    this.data = { ...SwitcherPlusSettings.defaultData, ...savedData };
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
