import { getSystemSwitcherInstance } from 'src/utils';
import type SwitcherPlusPlugin from 'src/main';
import { Hotkey, QuickSwitcherOptions } from 'obsidian';
import { getFacetMap } from './facetConstants';
import {
  FacetSettingsData,
  InsertLinkConfig,
  MatchPriorityData,
  MobileLauncherConfig,
  Mode,
  NavigationKeysConfig,
  PathDisplayFormat,
  RelationType,
  SettingsData,
  SymbolType,
  TitleSource,
} from 'src/types';
import merge from 'ts-deepmerge';

export class SwitcherPlusSettings {
  private readonly data: SettingsData;

  static get defaults(): SettingsData {
    const enabledSymbolTypes = {} as Record<SymbolType, boolean>;
    enabledSymbolTypes[SymbolType.Link] = true;
    enabledSymbolTypes[SymbolType.Embed] = true;
    enabledSymbolTypes[SymbolType.Tag] = true;
    enabledSymbolTypes[SymbolType.Heading] = true;
    enabledSymbolTypes[SymbolType.Callout] = true;

    return {
      version: '2.0.0',
      onOpenPreferNewTab: true,
      alwaysNewTabForSymbols: false,
      useActiveTabForSymbolsOnMobile: false,
      symbolsInLineOrder: true,
      editorListCommand: 'edt ',
      symbolListCommand: '@',
      symbolListActiveEditorCommand: '$ ',
      workspaceListCommand: '+',
      headingsListCommand: '#',
      bookmarksListCommand: "'",
      commandListCommand: '>',
      vaultListCommand: 'vault ',
      relatedItemsListCommand: '~',
      relatedItemsListActiveEditorCommand: '^ ',
      shouldSearchHeadings: true,
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
      shouldSearchBookmarks: false,
      shouldSearchRecentFiles: true,
      pathDisplayFormat: PathDisplayFormat.FolderWithFilename,
      hidePathIfRoot: true,
      enabledRelatedItems: Object.values(RelationType),
      showOptionalIndicatorIcons: true,
      overrideStandardModeBehaviors: true,
      enabledRibbonCommands: [
        Mode[Mode.HeadingsList] as keyof typeof Mode,
        Mode[Mode.SymbolList] as keyof typeof Mode,
      ],
      fileExtAllowList: ['canvas'],
      matchPriorityAdjustments: {
        isEnabled: false,
        adjustments: {
          isOpenInEditor: { value: 0, label: 'Open items' },
          isBookmarked: { value: 0, label: 'Bookmarked items' },
          isRecent: { value: 0, label: 'Recent items' },
          isAttachment: { value: 0, label: 'Attachment file types' },
          file: { value: 0, label: 'Filenames' },
          alias: { value: 0, label: 'Aliases' },
          unresolved: { value: 0, label: 'Unresolved filenames' },
          h1: { value: 0, label: 'H₁ headings' },
        },
        fileExtAdjustments: {
          canvas: { value: 0, label: 'Canvas files' },
        },
      },
      quickFilters: {
        resetKey: '0',
        keyList: ['1', '2', '3', '4', '5', '6', '7', '8', '9'],
        modifiers: ['Ctrl', 'Alt'],
        facetList: getFacetMap(),
        shouldResetActiveFacets: false,
        shouldShowFacetInstructions: true,
      },
      preserveCommandPaletteLastInput: false,
      preserveQuickSwitcherLastInput: false,
      shouldCloseModalOnBackspace: false,
      maxRecentFileSuggestionsOnInit: 25,
      orderEditorListByAccessTime: true,
      insertLinkInEditor: {
        isEnabled: true,
        keymap: {
          modifiers: ['Mod'],
          key: 'i',
          purpose: 'insert in editor',
        },
        insertableEditorTypes: ['markdown'],
        useBasenameAsAlias: true,
        useHeadingAsAlias: true,
      },
      removeDefaultTabBinding: true,
      navigationKeys: {
        nextKeys: [
          { modifiers: ['Ctrl'], key: 'n' },
          { modifiers: ['Ctrl'], key: 'j' },
        ],
        prevKeys: [
          { modifiers: ['Ctrl'], key: 'p' },
          { modifiers: ['Ctrl'], key: 'k' },
        ],
      },
      preferredSourceForTitle: 'H1',
      closeWhenEmptyKeys: [{ modifiers: null, key: 'Backspace' }],
      escapeCmdChar: '!',
      mobileLauncher: {
        isEnabled: false,
        modeString: Mode[Mode.HeadingsList],
        iconName: '',
        coreLauncherButtonIconSelector: 'span.clickable-icon',
        coreLauncherButtonSelector:
          '.mobile-navbar-action:has(span.clickable-icon svg.svg-icon.lucide-plus-circle)',
      },
      allowCreateNewFileInModeNames: [
        Mode[Mode.Standard] as keyof typeof Mode,
        Mode[Mode.HeadingsList] as keyof typeof Mode,
      ],
    };
  }

  // this is a builtin system setting as well, but it's different from the others
  // in that it's not a user option. It doesn't live on the plugin instance, instead
  // it sourced from the switcher modal instance
  shouldShowAlias: boolean;

  get version(): string {
    return this.data.version;
  }

  set version(value: string) {
    this.data.version = value;
  }

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

  get symbolListActiveEditorCommand(): string {
    return this.data.symbolListActiveEditorCommand;
  }

  set symbolListActiveEditorCommand(value: string) {
    this.data.symbolListActiveEditorCommand = value;
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

  get bookmarksListCommand(): string {
    return this.data.bookmarksListCommand;
  }

  set bookmarksListCommand(value: string) {
    this.data.bookmarksListCommand = value;
  }

  get bookmarksListPlaceholderText(): string {
    return SwitcherPlusSettings.defaults.bookmarksListCommand;
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

  get vaultListCommand(): string {
    return this.data.vaultListCommand;
  }

  set vaultListCommand(value: string) {
    this.data.vaultListCommand = value;
  }

  get vaultListPlaceholderText(): string {
    return SwitcherPlusSettings.defaults.vaultListCommand;
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

  get relatedItemsListActiveEditorCommand(): string {
    return this.data.relatedItemsListActiveEditorCommand;
  }

  set relatedItemsListActiveEditorCommand(value: string) {
    this.data.relatedItemsListActiveEditorCommand = value;
  }

  get shouldSearchHeadings(): boolean {
    return this.data.shouldSearchHeadings;
  }

  set shouldSearchHeadings(value: boolean) {
    this.data.shouldSearchHeadings = value;
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

  set excludeViewTypes(value: Array<string>) {
    this.data.excludeViewTypes = value;
  }

  get referenceViews(): Array<string> {
    return this.data.referenceViews;
  }

  set referenceViews(value: Array<string>) {
    this.data.referenceViews = value;
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

  get shouldSearchBookmarks(): boolean {
    return this.data.shouldSearchBookmarks;
  }

  set shouldSearchBookmarks(value: boolean) {
    this.data.shouldSearchBookmarks = value;
  }

  get shouldSearchRecentFiles(): boolean {
    return this.data.shouldSearchRecentFiles;
  }

  set shouldSearchRecentFiles(value: boolean) {
    this.data.shouldSearchRecentFiles = value;
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

  get fileExtAllowList(): Array<string> {
    return this.data.fileExtAllowList;
  }

  set fileExtAllowList(value: Array<string>) {
    this.data.fileExtAllowList = value;
  }

  get matchPriorityAdjustments(): SettingsData['matchPriorityAdjustments'] {
    return this.data.matchPriorityAdjustments;
  }

  set matchPriorityAdjustments(value: SettingsData['matchPriorityAdjustments']) {
    this.data.matchPriorityAdjustments = value;
  }

  get quickFilters(): FacetSettingsData {
    return this.data.quickFilters;
  }

  set quickFilters(value: FacetSettingsData) {
    this.data.quickFilters = value;
  }

  get preserveCommandPaletteLastInput(): boolean {
    return this.data.preserveCommandPaletteLastInput;
  }

  set preserveCommandPaletteLastInput(value: boolean) {
    this.data.preserveCommandPaletteLastInput = value;
  }

  get preserveQuickSwitcherLastInput(): boolean {
    return this.data.preserveQuickSwitcherLastInput;
  }

  set preserveQuickSwitcherLastInput(value: boolean) {
    this.data.preserveQuickSwitcherLastInput = value;
  }

  get shouldCloseModalOnBackspace(): boolean {
    return this.data.shouldCloseModalOnBackspace;
  }

  set shouldCloseModalOnBackspace(value: boolean) {
    this.data.shouldCloseModalOnBackspace = value;
  }

  get maxRecentFileSuggestionsOnInit(): number {
    return this.data.maxRecentFileSuggestionsOnInit;
  }

  set maxRecentFileSuggestionsOnInit(value: number) {
    this.data.maxRecentFileSuggestionsOnInit = value;
  }

  get orderEditorListByAccessTime(): boolean {
    return this.data.orderEditorListByAccessTime;
  }

  set orderEditorListByAccessTime(value: boolean) {
    this.data.orderEditorListByAccessTime = value;
  }

  get insertLinkInEditor(): InsertLinkConfig {
    return this.data.insertLinkInEditor;
  }

  set insertLinkInEditor(value: InsertLinkConfig) {
    this.data.insertLinkInEditor = value;
  }

  get removeDefaultTabBinding(): boolean {
    return this.data.removeDefaultTabBinding;
  }

  set removeDefaultTabBinding(value: boolean) {
    this.data.removeDefaultTabBinding = value;
  }

  get navigationKeys(): NavigationKeysConfig {
    return this.data.navigationKeys;
  }

  set navigationKeys(value: NavigationKeysConfig) {
    this.data.navigationKeys = value;
  }

  get preferredSourceForTitle(): TitleSource {
    return this.data.preferredSourceForTitle;
  }

  set preferredSourceForTitle(value: TitleSource) {
    this.data.preferredSourceForTitle = value;
  }

  get closeWhenEmptyKeys(): Hotkey[] {
    return this.data.closeWhenEmptyKeys;
  }

  set closeWhenEmptyKeys(value: Hotkey[]) {
    this.data.closeWhenEmptyKeys = value;
  }

  get escapeCmdChar(): string {
    return this.data.escapeCmdChar;
  }

  set escapeCmdChar(value: string) {
    this.data.escapeCmdChar = value;
  }

  get mobileLauncher(): MobileLauncherConfig {
    return this.data.mobileLauncher;
  }

  set mobileLauncher(value: MobileLauncherConfig) {
    this.data.mobileLauncher = value;
  }

  get allowCreateNewFileInModeNames(): Array<keyof typeof Mode> {
    return this.data.allowCreateNewFileInModeNames;
  }

  set allowCreateNewFileInModeNames(value: Array<keyof typeof Mode>) {
    // remove any duplicates before storing
    this.data.allowCreateNewFileInModeNames = [...new Set(value)];
  }

  constructor(private plugin: SwitcherPlusPlugin) {
    this.data = SwitcherPlusSettings.defaults;
  }

  async updateDataAndLoadSettings(): Promise<void> {
    await SwitcherPlusSettings.transformDataFile(
      this.plugin,
      SwitcherPlusSettings.defaults,
    );
    return await this.loadSettings();
  }

  async loadSettings(): Promise<void> {
    const copy = <T extends SettingsData>(
      savedData: T,
      defaultData: T,
      keys: Array<keyof T>,
    ): void => {
      const keysToMerge = ['matchPriorityAdjustments', 'quickFilters'];

      const deepMerge = (key: keyof T) => {
        return merge.withOptions(
          { mergeArrays: false },
          defaultData[key],
          savedData[key],
        ) as T[keyof T];
      };

      for (const key of keys) {
        if (key in savedData) {
          defaultData[key] = keysToMerge.includes(key as string)
            ? deepMerge(key)
            : savedData[key];
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

  static async transformDataFile(
    plugin: SwitcherPlusPlugin,
    defaults: SettingsData,
  ): Promise<void> {
    await SwitcherPlusSettings.transformDataFileToV1(plugin, defaults);
    await SwitcherPlusSettings.transformDataFileToV2(plugin, defaults);
  }

  static async transformDataFileToV1(
    plugin: SwitcherPlusPlugin,
    defaults: SettingsData,
  ): Promise<boolean> {
    let isTransformed = false;

    try {
      const data = (await plugin?.loadData()) as Record<string, unknown>;
      if (data && typeof data === 'object') {
        const versionKey = 'version';

        if (!Object.prototype.hasOwnProperty.call(data, versionKey)) {
          // rename from starred to bookmarks
          const starredCommandKey = 'starredListCommand';
          if (Object.prototype.hasOwnProperty.call(data, starredCommandKey)) {
            data['bookmarksListCommand'] =
              data[starredCommandKey] ?? defaults.bookmarksListCommand;
            delete data[starredCommandKey];
          }

          // rename isStarred to isBookmarked
          const isStarredKey = 'isStarred';
          const adjustments = data['matchPriorityAdjustments'] as Record<string, number>;
          if (
            adjustments &&
            Object.prototype.hasOwnProperty.call(adjustments, isStarredKey)
          ) {
            adjustments['isBookmarked'] = adjustments[isStarredKey];
            delete adjustments[isStarredKey];
          }

          data[versionKey] = '1.0.0';
          await plugin?.saveData(data);
          isTransformed = true;
        }
      }
    } catch (error) {
      console.log('Switcher++: error transforming data.json to v1.0.0', error);
    }

    return isTransformed;
  }

  static async transformDataFileToV2(
    plugin: SwitcherPlusPlugin,
    defaults: SettingsData,
  ): Promise<boolean> {
    let isTransformed = false;

    try {
      const data = (await plugin?.loadData()) as Record<string, unknown>;
      if (data && typeof data === 'object') {
        const versionKey = 'version';

        if (data[versionKey] === '1.0.0') {
          const matchPriorityAdjustmentsKey = 'matchPriorityAdjustments';
          if (Object.prototype.hasOwnProperty.call(data, matchPriorityAdjustmentsKey)) {
            // Convert matchPriorityAdjustments to key/object pairs
            // Version <= 1.0.0 type was Record<string, number>
            const oldAdjustments = data[matchPriorityAdjustmentsKey] as Record<
              string,
              number
            >;

            const adjustments: Record<string, MatchPriorityData> = {};
            data[matchPriorityAdjustmentsKey] = {
              isEnabled: !!data['enableMatchPriorityAdjustments'],
              adjustments,
            };

            delete data['enableMatchPriorityAdjustments'];

            Object.entries(oldAdjustments).forEach(([key, value]) => {
              const label =
                defaults.matchPriorityAdjustments.adjustments[key]?.label ?? '';
              adjustments[key] = { value, label };
            });
          }

          const quickFiltersKey = 'quickFilters';
          if (Object.prototype.hasOwnProperty.call(data, quickFiltersKey)) {
            // convert .facetList from Array<Object> to Record<string, Object>
            const facetListKey = 'facetList';
            type UnknownRecord = Record<string, unknown>;
            const quickFiltersData = data[quickFiltersKey] as UnknownRecord;
            const oldFacetList = quickFiltersData[facetListKey] as UnknownRecord[];

            const facetList = oldFacetList?.reduce((facetMap, oldFacet) => {
              const facetId = oldFacet['id'] as string;
              facetMap[facetId] = oldFacet;
              return facetMap;
            }, {} as UnknownRecord);

            quickFiltersData[facetListKey] = facetList;
          }

          data[versionKey] = '2.0.0';
          await plugin?.saveData(data);
          isTransformed = true;
        }
      }
    } catch (error) {
      console.log('Switcher++: error transforming data.json to v2.0.0', error);
    }

    return isTransformed;
  }
}
