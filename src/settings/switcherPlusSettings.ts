import { SettingsData } from 'src/types';
import { getSystemSwitcherInstance } from 'src/utils';
import type SwitcherPlusPlugin from 'src/main';
import { QuickSwitcherOptions } from 'obsidian';

export class SwitcherPlusSettings {
  private data: SettingsData;

  private static get defaultSettingsData(): SettingsData {
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
    };
  }

  // this is a builtin system setting as well, but it's different from the others
  // in that it's not a user option. It doesn't live on the plugin instance, instead
  // it sourced from the switcher modal instance
  public shouldShowAlias: boolean;

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

  get headingsListCommand(): string {
    return this.data.headingsListCommand;
  }

  set headingsListCommand(value: string) {
    this.data.headingsListCommand = value;
  }

  get headingsListPlaceholderText(): string {
    return SwitcherPlusSettings.defaultSettingsData.headingsListCommand;
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

  get limit(): number {
    return this.data.limit;
  }

  set limit(value: number) {
    this.data.limit = value;
  }

  constructor(private plugin: SwitcherPlusPlugin) {
    this.data = SwitcherPlusSettings.defaultSettingsData;
  }

  async loadSettings(): Promise<void> {
    const { plugin } = this;
    const savedData = (await plugin?.loadData()) as SettingsData;
    this.data = { ...SwitcherPlusSettings.defaultSettingsData, ...savedData };
  }

  async saveSettings(): Promise<void> {
    const { plugin, data } = this;
    await plugin?.saveData(data);
  }
}
