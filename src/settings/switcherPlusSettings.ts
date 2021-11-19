import { SettingsData, SymbolType } from 'src/types';
import { getSystemSwitcherInstance } from 'src/utils';
import type SwitcherPlusPlugin from 'src/main';
import { QuickSwitcherOptions } from 'obsidian';

export class SwitcherPlusSettings {
  private data: SettingsData;

  private static get defaults(): SettingsData {
    const enabledSymbolTypes = {} as Record<SymbolType, boolean>;
    enabledSymbolTypes[SymbolType.Link] = true;
    enabledSymbolTypes[SymbolType.Embed] = true;
    enabledSymbolTypes[SymbolType.Tag] = true;
    enabledSymbolTypes[SymbolType.Heading] = true;

    return {
      alwaysNewPaneForSymbols: false,
      useActivePaneForSymbolsOnMobile: false,
      symbolsInLineOrder: true,
      editorListCommand: 'edt ',
      symbolListCommand: '@',
      workspaceListCommand: '+',
      headingsListCommand: '#',
      strictHeadingsOnly: false,
      searchAllHeadings: true,
      excludeViewTypes: ['empty'],
      referenceViews: ['backlink', 'localgraph', 'outgoing-link', 'outline'],
      limit: 50,
      includeSidePanelViewTypes: ['backlink', 'image', 'markdown', 'pdf'],
      enabledSymbolTypes,
      selectNearestHeading: true,
      excludeFolders: [],
    };
  }

  // this is a builtin system setting as well, but it's different from the others
  // in that it's not a user option. It doesn't live on the plugin instance, instead
  // it sourced from the switcher modal instance
  shouldShowAlias: boolean;

  get builtInSystemOptions(): QuickSwitcherOptions {
    return getSystemSwitcherInstance(this.plugin.app)?.options;
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

  get useActivePaneForSymbolsOnMobile(): boolean {
    return this.data.useActivePaneForSymbolsOnMobile;
  }

  set useActivePaneForSymbolsOnMobile(value: boolean) {
    this.data.useActivePaneForSymbolsOnMobile = value;
  }

  get symbolsInLineOrder(): boolean {
    return this.data.symbolsInLineOrder;
  }

  set symbolsInLineOrder(value: boolean) {
    this.data.symbolsInLineOrder = value;
  }

  get editorListPlaceholderText(): string {
    return SwitcherPlusSettings.defaults.editorListCommand;
  }

  get editorListCommand(): string {
    return this.data.editorListCommand;
  }

  set editorListCommand(value: string) {
    this.data.editorListCommand = value;
  }

  get symbolListPlaceholderText(): string {
    return SwitcherPlusSettings.defaults.symbolListCommand;
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
    return SwitcherPlusSettings.defaults.workspaceListCommand;
  }

  get headingsListCommand(): string {
    return this.data.headingsListCommand;
  }

  set headingsListCommand(value: string) {
    this.data.headingsListCommand = value;
  }

  get headingsListPlaceholderText(): string {
    return SwitcherPlusSettings.defaults.headingsListCommand;
  }

  get strictHeadingsOnly(): boolean {
    return this.data.strictHeadingsOnly;
  }

  set strictHeadingsOnly(value: boolean) {
    this.data.strictHeadingsOnly = value;
  }

  get searchAllHeadings(): boolean {
    return this.data.searchAllHeadings;
  }

  set searchAllHeadings(value: boolean) {
    this.data.searchAllHeadings = value;
  }

  get excludeViewTypes(): Array<string> {
    return this.data.excludeViewTypes;
  }

  get referenceViews(): Array<string> {
    return this.data.referenceViews;
  }

  get limit(): number {
    return this.data.limit;
  }

  set limit(value: number) {
    this.data.limit = value;
  }

  get includeSidePanelViewTypes(): Array<string> {
    return this.data.includeSidePanelViewTypes;
  }

  set includeSidePanelViewTypes(value: Array<string>) {
    // remove any duplicates before storing
    this.data.includeSidePanelViewTypes = [...new Set(value)];
  }

  get includeSidePanelViewTypesPlaceholder(): string {
    return SwitcherPlusSettings.defaults.includeSidePanelViewTypes.join('\n');
  }

  get selectNearestHeading(): boolean {
    return this.data.selectNearestHeading;
  }

  set selectNearestHeading(value: boolean) {
    this.data.selectNearestHeading = value;
  }

  get excludeFolders(): Array<string> {
    return this.data.excludeFolders;
  }

  set excludeFolders(value: Array<string>) {
    // remove any duplicates before storing
    this.data.excludeFolders = [...new Set(value)];
  }

  constructor(private plugin: SwitcherPlusPlugin) {
    this.data = SwitcherPlusSettings.defaults;
  }

  async loadSettings(): Promise<void> {
    const copy = <T>(source: T, target: T, keys: Array<keyof T>): void => {
      for (const key of keys) {
        if (key in source) {
          target[key] = source[key];
        }
      }
    };

    try {
      const savedData = (await this.plugin?.loadData()) as SettingsData;
      if (savedData) {
        const keys = Object.keys(SwitcherPlusSettings.defaults) as Array<
          keyof SettingsData
        >;
        copy(savedData, this.data, keys);
      }
    } catch (err) {
      console.log('Switcher++: error loading settings, using defaults. ', err);
    }
  }

  async saveSettings(): Promise<void> {
    const { plugin, data } = this;
    await plugin?.saveData(data);
  }

  isSymbolTypeEnabled(symbol: SymbolType): boolean {
    return this.data.enabledSymbolTypes[symbol];
  }

  setSymbolTypeEnabled(symbol: SymbolType, isEnabled: boolean): void {
    this.data.enabledSymbolTypes[symbol] = isEnabled;
  }
}
