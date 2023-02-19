import { getSystemSwitcherInstance } from 'src/utils';
import type SwitcherPlusPlugin from 'src/main';
import { QuickSwitcherOptions } from 'obsidian';
import {
  Mode,
  PathDisplayFormat,
  RelationType,
  SettingsData,
  SymbolType,
} from 'src/types';

export class SwitcherPlusSettings {
  private readonly data: SettingsData;

  private static get defaults(): SettingsData {
    const enabledSymbolTypes = {} as Record<SymbolType, boolean>;
    enabledSymbolTypes[SymbolType.Link] = true;
    enabledSymbolTypes[SymbolType.Embed] = true;
    enabledSymbolTypes[SymbolType.Tag] = true;
    enabledSymbolTypes[SymbolType.Heading] = true;
    enabledSymbolTypes[SymbolType.Callout] = true;

    return {
      onOpenPreferNewTab: true,
      alwaysNewTabForSymbols: false,
      useActiveTabForSymbolsOnMobile: false,
      symbolsInLineOrder: true,
      editorListCommand: 'edt ',
      symbolListCommand: '@',
      workspaceListCommand: '+',
      headingsListCommand: '#',
      starredListCommand: "'",
      commandListCommand: '>',
      relatedItemsListCommand: '~',
      strictHeadingsOnly: false,
      searchAllHeadings: true,
      headingsSearchDebounceMilli: 250,
      excludeViewTypes: ['empty'],
      referenceViews: ['backlink', 'localgraph', 'outgoing-link', 'outline'],
      limit: 50,
      includeSidePanelViewTypes: ['backlink', 'image', 'markdown', 'pdf'],
      enabledSymbolTypes,
      selectNearestHeading: true,
      excludeFolders: [],
      excludeLinkSubTypes: 0,
      excludeRelatedFolders: [''],
      excludeOpenRelatedFiles: false,
      excludeObsidianIgnoredFiles: false,
      shouldSearchFilenames: false,
      pathDisplayFormat: PathDisplayFormat.FolderWithFilename,
      hidePathIfRoot: true,
      enabledRelatedItems: Object.values(RelationType),
      showOptionalIndicatorIcons: true,
      overrideStandardModeBehaviors: true,
      enabledRibbonCommands: [
        Mode[Mode.HeadingsList] as keyof typeof Mode,
        Mode[Mode.SymbolList] as keyof typeof Mode,
      ],
      enableMatchPriorityAdjustments: false,
      matchPriorityAdjustments: {
        isOpenInEditor: 0,
        isStarred: 0,
        isRecent: 0,
        file: 0,
        alias: 0,
        h1: 0,
      },
      preserveCommandPaletteLastInput: false,
      preserveQuickSwitcherLastInput: false,
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

  get onOpenPreferNewTab(): boolean {
    return this.data.onOpenPreferNewTab;
  }

  set onOpenPreferNewTab(value: boolean) {
    this.data.onOpenPreferNewTab = value;
  }

  get alwaysNewTabForSymbols(): boolean {
    return this.data.alwaysNewTabForSymbols;
  }

  set alwaysNewTabForSymbols(value: boolean) {
    this.data.alwaysNewTabForSymbols = value;
  }

  get useActiveTabForSymbolsOnMobile(): boolean {
    return this.data.useActiveTabForSymbolsOnMobile;
  }

  set useActiveTabForSymbolsOnMobile(value: boolean) {
    this.data.useActiveTabForSymbolsOnMobile = value;
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

  get starredListCommand(): string {
    return this.data.starredListCommand;
  }

  set starredListCommand(value: string) {
    this.data.starredListCommand = value;
  }

  get starredListPlaceholderText(): string {
    return SwitcherPlusSettings.defaults.starredListCommand;
  }

  get commandListCommand(): string {
    return this.data.commandListCommand;
  }

  set commandListCommand(value: string) {
    this.data.commandListCommand = value;
  }

  get commandListPlaceholderText(): string {
    return SwitcherPlusSettings.defaults.commandListCommand;
  }

  get relatedItemsListCommand(): string {
    return this.data.relatedItemsListCommand;
  }

  set relatedItemsListCommand(value: string) {
    this.data.relatedItemsListCommand = value;
  }

  get relatedItemsListPlaceholderText(): string {
    return SwitcherPlusSettings.defaults.relatedItemsListCommand;
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

  get headingsSearchDebounceMilli(): number {
    return this.data.headingsSearchDebounceMilli;
  }

  set headingsSearchDebounceMilli(value: number) {
    this.data.headingsSearchDebounceMilli = value;
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

  get excludeLinkSubTypes(): number {
    return this.data.excludeLinkSubTypes;
  }

  set excludeLinkSubTypes(value: number) {
    this.data.excludeLinkSubTypes = value;
  }

  get excludeRelatedFolders(): Array<string> {
    return this.data.excludeRelatedFolders;
  }

  set excludeRelatedFolders(value: Array<string>) {
    this.data.excludeRelatedFolders = [...new Set(value)];
  }

  get excludeOpenRelatedFiles(): boolean {
    return this.data.excludeOpenRelatedFiles;
  }

  set excludeOpenRelatedFiles(value: boolean) {
    this.data.excludeOpenRelatedFiles = value;
  }

  get excludeObsidianIgnoredFiles(): boolean {
    return this.data.excludeObsidianIgnoredFiles;
  }

  set excludeObsidianIgnoredFiles(value: boolean) {
    this.data.excludeObsidianIgnoredFiles = value;
  }

  get shouldSearchFilenames(): boolean {
    return this.data.shouldSearchFilenames;
  }

  set shouldSearchFilenames(value: boolean) {
    this.data.shouldSearchFilenames = value;
  }

  get pathDisplayFormat(): PathDisplayFormat {
    return this.data.pathDisplayFormat;
  }

  set pathDisplayFormat(value: PathDisplayFormat) {
    this.data.pathDisplayFormat = value;
  }

  get hidePathIfRoot(): boolean {
    return this.data.hidePathIfRoot;
  }

  set hidePathIfRoot(value: boolean) {
    this.data.hidePathIfRoot = value;
  }

  get enabledRelatedItems(): RelationType[] {
    return this.data.enabledRelatedItems;
  }

  set enabledRelatedItems(value: RelationType[]) {
    this.data.enabledRelatedItems = value;
  }

  get showOptionalIndicatorIcons(): boolean {
    return this.data.showOptionalIndicatorIcons;
  }

  set showOptionalIndicatorIcons(value: boolean) {
    this.data.showOptionalIndicatorIcons = value;
  }

  get overrideStandardModeBehaviors(): boolean {
    return this.data.overrideStandardModeBehaviors;
  }

  set overrideStandardModeBehaviors(value: boolean) {
    this.data.overrideStandardModeBehaviors = value;
  }

  get enabledRibbonCommands(): Array<keyof typeof Mode> {
    return this.data.enabledRibbonCommands;
  }

  set enabledRibbonCommands(value: Array<keyof typeof Mode>) {
    // remove any duplicates before storing
    this.data.enabledRibbonCommands = [...new Set(value)];
  }

  get enableMatchPriorityAdjustments(): boolean {
    return this.data.enableMatchPriorityAdjustments;
  }

  set enableMatchPriorityAdjustments(value: boolean) {
    this.data.enableMatchPriorityAdjustments = value;
  }

  get matchPriorityAdjustments(): Record<string, number> {
    return this.data.matchPriorityAdjustments;
  }

  set matchPriorityAdjustments(value: Record<string, number>) {
    this.data.matchPriorityAdjustments = value;
  }

  get preserveCommandPaletteLastInput() {
    return this.data.preserveCommandPaletteLastInput;
  }

  set preserveCommandPaletteLastInput(value: boolean) {
    this.data.preserveCommandPaletteLastInput = value;
  }

  get preserveQuickSwitcherLastInput() {
    return this.data.preserveQuickSwitcherLastInput;
  }

  set preserveQuickSwitcherLastInput(value: boolean) {
    this.data.preserveQuickSwitcherLastInput = value;
  }

  constructor(private plugin: SwitcherPlusPlugin) {
    this.data = SwitcherPlusSettings.defaults;
  }

  async loadSettings(): Promise<void> {
    const copy = <T extends object>(source: T, target: T, keys: Array<keyof T>): void => {
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

  save(): void {
    this.saveSettings().catch((e) => {
      console.log('Switcher++: error saving changes to settings', e);
    });
  }

  isSymbolTypeEnabled(symbol: SymbolType): boolean {
    const { enabledSymbolTypes } = this.data;
    let value = SwitcherPlusSettings.defaults.enabledSymbolTypes[symbol];

    if (Object.prototype.hasOwnProperty.call(enabledSymbolTypes, symbol)) {
      value = enabledSymbolTypes[symbol];
    }

    return value;
  }

  setSymbolTypeEnabled(symbol: SymbolType, isEnabled: boolean): void {
    this.data.enabledSymbolTypes[symbol] = isEnabled;
  }
}
