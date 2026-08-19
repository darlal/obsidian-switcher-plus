import {
  LinkType,
  Mode,
  PathDisplayFormat,
  RelationType,
  SettingsData,
  SymbolType,
  TagSource,
} from 'src/types';
import SwitcherPlusPlugin from 'src/main';
import {
  NESTED_CONTROL_KEYS,
  SettingsControlKey,
  SwitcherPlusSettings,
  getFacetMap,
} from 'src/settings';
import { Chance } from 'chance';
import {
  App,
  QuickSwitcherOptions,
  InstalledPlugin,
  QuickSwitcherPluginInstance,
  InternalPlugins,
} from 'obsidian';
import { mock, mockClear, MockProxy, mockReset } from 'jest-mock-extended';
import { merge } from 'ts-deepmerge';
import * as Utils from 'src/utils/utils';

const chance = new Chance();
const sidePanelOptions = ['backlink', 'image', 'markdown', 'pdf'];

function getDefaultSettingsData(): SettingsData {
  const enabledSymbolTypes = {} as Record<SymbolType, boolean>;
  enabledSymbolTypes[SymbolType.Link] = true;
  enabledSymbolTypes[SymbolType.Embed] = true;
  enabledSymbolTypes[SymbolType.Tag] = true;
  enabledSymbolTypes[SymbolType.Heading] = true;
  enabledSymbolTypes[SymbolType.Callout] = true;

  const data: SettingsData = {
    version: '2.0.0',
    enabledSymbolTypes,
    excludeViewTypes: ['empty'],
    referenceViews: ['backlink', 'localgraph', 'outgoing-link', 'outline'],
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
    recentCommandDisplayOrder: 'desc',
    maxRecentCommands: 25,
    vaultListCommand: 'vault ',
    relatedItemsListCommand: '~',
    relatedItemsListActiveEditorCommand: '^ ',
    shouldSearchHeadings: true,
    strictHeadingsOnly: false,
    searchAllHeadings: [1, 2, 3, 4, 5, 6],
    headingsSearchDebounceMilli: 250,
    limit: 50,
    selectNearestHeading: true,
    excludeLinkSubTypes: LinkType.None,
    includeSidePanelViewTypes: sidePanelOptions,
    excludeFolders: [],
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
    isFileExtensionIndicatorsEnabled: true,
    excludeFileExtensionIndicators: ['md'],
    overrideStandardModeBehaviors: true,
    overrideStandardModeRendering: true,
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
    frontmatterTitleProperty: 'title',
    closeWhenEmptyKeys: [{ modifiers: null, key: 'Backspace' }],
    navigateToHotkeySelectorKeys: { modifiers: ['Ctrl', 'Shift'], key: 'h' },
    togglePinnedCommandKeys: { modifiers: ['Ctrl', 'Shift'], key: 'p' },
    escapeCmdChar: '!',
    mobileLauncher: {
      isEnabled: false,
      isMobileButtonEnabled: true,
      isEmptyTabButtonEnabled: true,
      modeString: Mode[Mode.HeadingsList],
      iconName: '',
      coreLauncherButtonIconSelector: 'span.clickable-icon',
      coreLauncherButtonSelector:
        '.mobile-navbar-action.mobile-navbar-action-quick-switcher',
    },
    showModeTriggerInstructions: true,
    renderMarkdownContentInSuggestions: {
      isEnabled: false,
      renderHeadings: false,
      renderLinks: false,
      renderTags: false,
      renderCallouts: false,
      toggleContentRenderingKeys: { modifiers: ['Shift', 'Ctrl'], key: 'm' },
    },
    quickOpen: {
      isEnabled: true,
      modifiers: ['Alt'],
      keyList: ['1', '2', '3', '4', '5', '6', '7', '8', '9'],
    },
    openDefaultApp: {
      isEnabled: true,
      openInDefaultAppKeys: { modifiers: ['Shift', 'Ctrl'], key: 'o' },
      excludeFileExtensions: [],
    },
    fulltextSearch: {
      isEnabled: true,
      searchKeys: { modifiers: ['Mod', 'Shift'], key: 'f' },
    },
    openInBackground: {
      isEnabled: true,
      openKeys: [
        {
          openType: 'tab',
          hotkey: { modifiers: ['Mod', 'Shift'], key: 't' },
        },
        {
          openType: 'vertical',
          hotkey: null,
        },
        {
          openType: 'horizontal',
          hotkey: null,
        },
        {
          openType: 'window',
          hotkey: null,
        },
      ],
    },
    saveWorkspaceAndSwitchKeys: { modifiers: ['Mod', 'Shift'], key: 's' },
    showHeadingBreadcrumbs: true,
    headingBreadcrumbSeparator: ' > ',
    maxBreadcrumbDepth: 0,
    showHeadingBreadcrumbsInSymbolMode: false,
    showTagsInSuggestions: false,
    tagSource: TagSource.Both,
    excludeTagsFromDisplay: [],
    tagDisplaySeparator: ' ',
    removeHashPrefixFromTags: false,
    maxTagsToDisplay: 0,
  };

  return data;
}

function getTransientSettingsData(): SettingsData {
  const enabledSymbolTypes = {} as Record<SymbolType, boolean>;
  enabledSymbolTypes[SymbolType.Link] = chance.bool();
  enabledSymbolTypes[SymbolType.Embed] = chance.bool();
  enabledSymbolTypes[SymbolType.Tag] = chance.bool();
  enabledSymbolTypes[SymbolType.Heading] = chance.bool();
  enabledSymbolTypes[SymbolType.Callout] = chance.bool();

  const ribbonCommands = Object.values(Mode).filter((v) => isNaN(Number(v))) as Array<
    keyof typeof Mode
  >;
  const enabledRibbonCommands = chance.pickset(ribbonCommands, 3);

  const data: SettingsData = {
    version: '2.0.0',
    enabledSymbolTypes,
    excludeViewTypes: [chance.word(), chance.word()],
    referenceViews: [chance.word(), chance.word()],
    onOpenPreferNewTab: chance.bool(),
    alwaysNewTabForSymbols: chance.bool(),
    useActiveTabForSymbolsOnMobile: chance.bool(),
    symbolsInLineOrder: chance.bool(),
    editorListCommand: chance.word(),
    symbolListCommand: chance.word(),
    symbolListActiveEditorCommand: chance.word(),
    workspaceListCommand: chance.word(),
    headingsListCommand: chance.word(),
    bookmarksListCommand: chance.word(),
    commandListCommand: chance.word(),
    recentCommandDisplayOrder: chance.pickone(['asc', 'desc']),
    maxRecentCommands: chance.integer({ min: 1, max: 100 }),
    vaultListCommand: chance.word(),
    shouldSearchHeadings: chance.bool(),
    strictHeadingsOnly: chance.bool(),
    searchAllHeadings: [1, 2, 3],
    headingsSearchDebounceMilli: chance.millisecond(),
    limit: chance.integer(),
    selectNearestHeading: chance.bool(),
    relatedItemsListCommand: chance.word(),
    relatedItemsListActiveEditorCommand: chance.word(),
    excludeLinkSubTypes: LinkType.Block,
    includeSidePanelViewTypes: [
      chance.word(),
      chance.word(),
      chance.pickone(sidePanelOptions),
    ],
    excludeFolders: [`path/to/${chance.word()}`, `${chance.word()}`, `/${chance.word()}`],
    excludeRelatedFolders: [`path/to/${chance.word()}`],
    excludeOpenRelatedFiles: chance.bool(),
    excludeObsidianIgnoredFiles: chance.bool(),
    shouldSearchFilenames: chance.bool(),
    shouldSearchBookmarks: chance.bool(),
    shouldSearchRecentFiles: chance.bool(),
    pathDisplayFormat: PathDisplayFormat.Full,
    hidePathIfRoot: chance.bool(),
    enabledRelatedItems: chance.pickset(Object.values(RelationType), 2),
    showOptionalIndicatorIcons: chance.bool(),
    isFileExtensionIndicatorsEnabled: chance.bool(),
    excludeFileExtensionIndicators: ['md'],
    overrideStandardModeBehaviors: chance.bool(),
    overrideStandardModeRendering: chance.bool(),
    enabledRibbonCommands,
    fileExtAllowList: [],
    matchPriorityAdjustments: {
      isEnabled: chance.bool(),
      adjustments: {
        h2: { value: 0.5, label: chance.sentence() },
        isOpenInEditor: { value: 0.5, label: chance.sentence() },
      },
      fileExtAdjustments: {
        canvas: { value: 0.5, label: chance.word() },
      },
    },
    quickFilters: {
      resetKey: chance.letter(),
      resetModifiers: chance.pickset(['Alt', 'Ctrl', 'Meta', 'Shift'], 2),
      keyList: [chance.letter()],
      modifiers: [chance.pickone(['Alt', 'Ctrl', 'Meta'])],
      facetList: {},
      shouldResetActiveFacets: chance.bool(),
      shouldShowFacetInstructions: chance.bool(),
    },
    preserveCommandPaletteLastInput: chance.bool(),
    preserveQuickSwitcherLastInput: chance.bool(),
    shouldCloseModalOnBackspace: chance.bool(),
    maxRecentFileSuggestionsOnInit: chance.integer(),
    orderEditorListByAccessTime: chance.bool(),
    insertLinkInEditor: {
      isEnabled: chance.bool(),
      keymap: {
        modifiers: chance.pickset(['Meta', 'Shift'], 1),
        key: chance.letter(),
        purpose: chance.sentence(),
      },
      insertableEditorTypes: ['markdown'],
      useBasenameAsAlias: chance.bool(),
      useHeadingAsAlias: chance.bool(),
    },
    removeDefaultTabBinding: chance.bool(),
    navigationKeys: {
      nextKeys: [
        {
          modifiers: chance.pickset(['Alt', 'Ctrl', 'Meta', 'Shift'], 2),
          key: chance.letter(),
        },
      ],
      prevKeys: [
        {
          modifiers: chance.pickset(['Alt', 'Ctrl', 'Meta', 'Shift'], 2),
          key: chance.letter(),
        },
      ],
    },
    preferredSourceForTitle: chance.pickone(['Default', 'H1', 'FrontMatter']),
    frontmatterTitleProperty: chance.word(),
    closeWhenEmptyKeys: [
      {
        modifiers: chance.pickset(['Alt', 'Ctrl'], 1),
        key: chance.letter(),
      },
    ],
    navigateToHotkeySelectorKeys: {
      modifiers: chance.pickset(['Alt', 'Ctrl'], 1),
      key: chance.letter(),
    },
    togglePinnedCommandKeys: {
      modifiers: chance.pickset(['Alt', 'Ctrl'], 1),
      key: chance.letter(),
    },
    escapeCmdChar: chance.letter(),
    mobileLauncher: {
      isEnabled: false,
      isMobileButtonEnabled: true,
      isEmptyTabButtonEnabled: true,
      modeString: Mode[Mode.CommandList],
      iconName: '',
      coreLauncherButtonIconSelector: '',
      coreLauncherButtonSelector: '',
    },
    showModeTriggerInstructions: chance.bool(),
    renderMarkdownContentInSuggestions: {
      isEnabled: false,
      renderHeadings: false,
      renderLinks: false,
      renderTags: false,
      renderCallouts: false,
      toggleContentRenderingKeys: { modifiers: ['Shift', 'Ctrl'], key: 'm' },
    },
    quickOpen: {
      isEnabled: true,
      modifiers: chance.pickset(['Alt', 'Ctrl'], 1),
      keyList: [chance.letter()],
    },
    openDefaultApp: {
      isEnabled: chance.bool(),
      openInDefaultAppKeys: {
        modifiers: chance.pickset(['Alt', 'Ctrl'], 1),
        key: chance.letter(),
      },
      excludeFileExtensions: [],
    },
    fulltextSearch: {
      isEnabled: chance.bool(),
      searchKeys: { modifiers: chance.pickset(['Alt', 'Ctrl'], 1), key: chance.letter() },
    },
    openInBackground: {
      isEnabled: chance.bool(),
      openKeys: [
        {
          openType: 'tab',
          hotkey: { modifiers: chance.pickset(['Alt', 'Ctrl'], 1), key: chance.letter() },
        },
      ],
    },
    saveWorkspaceAndSwitchKeys: {
      modifiers: chance.pickset(['Alt', 'Ctrl'], 1),
      key: chance.letter(),
    },
    showHeadingBreadcrumbs: chance.bool(),
    headingBreadcrumbSeparator: chance.string(),
    maxBreadcrumbDepth: chance.integer({ min: 0, max: 10 }),
    showHeadingBreadcrumbsInSymbolMode: chance.bool(),
    showTagsInSuggestions: chance.bool(),
    tagSource: chance.pickone(Object.values(TagSource)),
    excludeTagsFromDisplay: chance.n(
      () => chance.word(),
      chance.integer({ min: 0, max: 5 }),
    ),
    tagDisplaySeparator: chance.string(),
    removeHashPrefixFromTags: chance.bool(),
    maxTagsToDisplay: chance.integer({ min: 0, max: 20 }),
  };

  return data;
}

describe('SwitcherPlusSettings', () => {
  let mockApp: MockProxy<App>;
  let mockPlugin: MockProxy<SwitcherPlusPlugin>;
  let sut: SwitcherPlusSettings;

  beforeAll(() => {
    mockApp = mock<App>({ internalPlugins: mock<InternalPlugins>() });
    mockPlugin = mock<SwitcherPlusPlugin>({ app: mockApp });
  });

  beforeEach(() => {
    sut = new SwitcherPlusSettings(mockPlugin);
  });

  it('should return default settings', () => {
    const defaults = getDefaultSettingsData();

    expect(sut).toEqual(expect.objectContaining(defaults));
    expect(sut.editorListPlaceholderText).toBe(defaults.editorListCommand);
    expect(sut.symbolListPlaceholderText).toBe(defaults.symbolListCommand);
    expect(sut.workspaceListPlaceholderText).toBe(defaults.workspaceListCommand);
    expect(sut.headingsListPlaceholderText).toBe(defaults.headingsListCommand);
    expect(sut.bookmarksListPlaceholderText).toBe(defaults.bookmarksListCommand);
    expect(sut.commandListPlaceholderText).toBe(defaults.commandListCommand);
    expect(sut.relatedItemsListPlaceholderText).toBe(defaults.relatedItemsListCommand);
    expect(sut.includeSidePanelViewTypesPlaceholder).toBe(
      defaults.includeSidePanelViewTypes.join('\n'),
    );
  });

  it('should save modified settings', async () => {
    const settings = getTransientSettingsData();

    const props = Object.getOwnPropertyDescriptors(Object.getPrototypeOf(sut));
    Object.keys(settings).forEach((key) => {
      // check if a setter is defined on sut for this key
      if (props[key]?.set) {
        type IndexedType = { [key: string]: unknown };

        // copy value to sut since a setter exists
        (sut as SwitcherPlusSettings & IndexedType)[key] = (
          settings as SettingsData & IndexedType
        )[key];
      }
    });

    sut.enabledSymbolTypes = settings.enabledSymbolTypes;

    let savedSettings: SettingsData;
    mockPlugin.saveData.mockImplementationOnce((data: SettingsData) => {
      savedSettings = data;
      return Promise.resolve();
    });

    await sut.saveSettings();

    expect(savedSettings).toEqual(expect.objectContaining(settings));
    expect(mockPlugin.saveData).toHaveBeenCalled();

    mockPlugin.saveData.mockReset();
  });

  it('should load saved settings', async () => {
    const defaults = getDefaultSettingsData();
    const settings = getTransientSettingsData();

    // these keys get merged
    settings['matchPriorityAdjustments'] = defaults['matchPriorityAdjustments'];
    settings['quickFilters'] = defaults['quickFilters'];

    mockPlugin.loadData.mockResolvedValueOnce(settings);

    await sut.loadSettings();

    expect(sut).toEqual(expect.objectContaining(settings));

    expect(mockPlugin.loadData).toHaveBeenCalled();

    mockPlugin.loadData.mockReset();
  });

  it('should load saved settings, even with missing data keys', async () => {
    const defaults = getDefaultSettingsData();
    const settings = getTransientSettingsData();

    // these keys get merged
    settings['matchPriorityAdjustments'] = defaults['matchPriorityAdjustments'];
    settings['quickFilters'] = defaults['quickFilters'];

    const { enabledSymbolTypes, ...prunedSettings } = settings;

    mockPlugin.loadData.mockResolvedValueOnce(prunedSettings);

    await sut.loadSettings();

    expect(sut).toEqual(expect.objectContaining(prunedSettings));
    expect(sut.enabledSymbolTypes).toEqual(defaults.enabledSymbolTypes);

    expect(mockPlugin.loadData).toHaveBeenCalled();

    mockPlugin.loadData.mockReset();
  });

  it('should use default data if settings cannot be loaded', async () => {
    const defaults = getDefaultSettingsData();
    mockPlugin.loadData.mockResolvedValueOnce(null);

    await sut.loadSettings();

    expect(sut).toEqual(expect.objectContaining(defaults));
    expect(sut.editorListPlaceholderText).toBe(defaults.editorListCommand);
    expect(sut.symbolListPlaceholderText).toBe(defaults.symbolListCommand);
    expect(sut.workspaceListPlaceholderText).toBe(defaults.workspaceListCommand);
    expect(sut.headingsListPlaceholderText).toBe(defaults.headingsListCommand);
    expect(sut.includeSidePanelViewTypesPlaceholder).toBe(
      defaults.includeSidePanelViewTypes.join('\n'),
    );

    expect(mockPlugin.loadData).toHaveBeenCalled();
  });

  describe('pathDisplayFormatString', () => {
    it('should expose the stored numeric enum in the string form the dropdown requires', () => {
      expect(sut.pathDisplayFormatString).toBe(
        SwitcherPlusSettings.defaults.pathDisplayFormat.toString(),
      );
    });

    it('should convert a string back to the numeric enum when written', () => {
      sut.pathDisplayFormatString = PathDisplayFormat.Full.toString();

      expect(sut.pathDisplayFormat).toBe(PathDisplayFormat.Full);
    });

    it('should leave the stored value numeric so that no data migration is needed', () => {
      sut.pathDisplayFormatString = PathDisplayFormat.None.toString();

      expect(typeof sut.pathDisplayFormat).toBe('number');
    });

    it('should stay in sync when a write is made through the pathDisplayFormat accessor', () => {
      sut.pathDisplayFormat = PathDisplayFormat.FolderPathFilenameOptional;

      expect(sut.pathDisplayFormatString).toBe(
        PathDisplayFormat.FolderPathFilenameOptional.toString(),
      );
    });
  });

  describe('enabledSymbolTypes', () => {
    it('should expose the stored symbol type record', () => {
      expect(sut.enabledSymbolTypes).toEqual(
        SwitcherPlusSettings.defaults.enabledSymbolTypes,
      );
    });

    it('should write through the accessor', () => {
      const expected = { [SymbolType.Tag]: false } as Record<SymbolType, boolean>;

      sut.enabledSymbolTypes = expected;

      expect(sut.enabledSymbolTypes).toBe(expected);
    });

    it('should preserve a disabled symbol type from saved data on load', async () => {
      const savedData = {
        enabledSymbolTypes: { [SymbolType.Tag]: false },
      } as unknown as SettingsData;
      mockPlugin.loadData.mockResolvedValueOnce(savedData);

      await sut.loadSettings();

      expect(sut.enabledSymbolTypes[SymbolType.Tag]).toBe(false);

      mockPlugin.loadData.mockReset();
    });

    it('should fill in a symbol type key that is absent from saved data on load', async () => {
      // A data.json written before SymbolType.Callout existed has no key for it.
      const savedData = {
        enabledSymbolTypes: {
          [SymbolType.Link]: true,
          [SymbolType.Embed]: true,
          [SymbolType.Tag]: true,
          [SymbolType.Heading]: true,
        },
      } as unknown as SettingsData;
      mockPlugin.loadData.mockResolvedValueOnce(savedData);

      await sut.loadSettings();

      expect(sut.enabledSymbolTypes[SymbolType.Callout]).toBe(
        SwitcherPlusSettings.defaults.enabledSymbolTypes[SymbolType.Callout],
      );

      mockPlugin.loadData.mockReset();
    });

    it('should not mutate the static defaults when merging saved data on load', async () => {
      const savedData = {
        enabledSymbolTypes: { [SymbolType.Heading]: false },
      } as unknown as SettingsData;
      mockPlugin.loadData.mockResolvedValueOnce(savedData);

      await sut.loadSettings();

      expect(SwitcherPlusSettings.defaults.enabledSymbolTypes[SymbolType.Heading]).toBe(
        true,
      );

      mockPlugin.loadData.mockReset();
    });
  });

  it('should load built-in system switcher settings', () => {
    const builtInOptions = mock<QuickSwitcherOptions>({
      showAllFileTypes: chance.bool(),
      showAttachments: chance.bool(),
      showExistingOnly: chance.bool(),
    });

    const pluginInstance = mock<QuickSwitcherPluginInstance>({
      id: 'switcher',
      options: builtInOptions,
      QuickSwitcherModal: null,
    });

    const builtInSwitcherPlugin = mock<InstalledPlugin>({
      enabled: true,
      instance: pluginInstance,
    });

    const mockInternalPlugins = mockApp.internalPlugins as MockProxy<InternalPlugins>;
    mockInternalPlugins.getPluginById.mockReturnValue(builtInSwitcherPlugin);

    expect(sut.builtInSystemOptions).toMatchObject(builtInOptions);
    expect(sut.showAllFileTypes).toBe(builtInOptions.showAllFileTypes);
    expect(sut.showAttachments).toBe(builtInOptions.showAttachments);
    expect(sut.showExistingOnly).toBe(builtInOptions.showExistingOnly);
    expect(mockInternalPlugins.getPluginById).toHaveBeenCalled();

    mockInternalPlugins.getPluginById.mockReset();
  });

  test('.loadSettings() should route failures through logError', async () => {
    const logErrorSpy = jest.spyOn(Utils, 'logError').mockReturnValueOnce();

    const error = new Error('loadSettings unit test error');
    mockPlugin.loadData.mockRejectedValueOnce(error);

    await sut.loadSettings();

    expect(logErrorSpy).toHaveBeenCalledWith(expect.any(String), error);

    logErrorSpy.mockRestore();
  });

  test('.loadSettings() should merge the "matchPriorityAdjustments" saved values with the default values', async () => {
    const defaults = getDefaultSettingsData();
    const settings = getTransientSettingsData();

    mockPlugin.loadData.mockResolvedValueOnce(settings);

    await sut.loadSettings();

    const key = 'matchPriorityAdjustments';
    const expected = merge(defaults[key], settings[key]);

    expect(sut.matchPriorityAdjustments).toEqual(expected);
  });

  it('should route fire-and-forget save failures through logError', async () => {
    const logErrorSpy = jest.spyOn(Utils, 'logError').mockReturnValueOnce();

    const errorMsg = 'saveData() unit test mock error';
    const rejectedPromise = Promise.reject(new Error(errorMsg));
    mockPlugin.saveData.mockReturnValueOnce(rejectedPromise);

    sut.save();

    await expect(rejectedPromise).rejects.toBeTruthy();
    expect(mockPlugin.saveData).toHaveBeenCalled();
    expect(logErrorSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ message: errorMsg }),
    );

    logErrorSpy.mockRestore();
  });

  test('updateDataAndLoadSettings() should update settings', async () => {
    mockPlugin.loadData.mockResolvedValueOnce({});
    const transformDataFileSpy = jest.spyOn(SwitcherPlusSettings, 'transformDataFile');

    await sut.updateDataAndLoadSettings();

    expect(transformDataFileSpy).toHaveBeenCalled();
    expect(mockPlugin.loadData).toHaveBeenCalled();

    transformDataFileSpy.mockRestore();
  });

  test('data object versions should match', () => {
    expect(getDefaultSettingsData().version).toEqual(sut.version);
    expect(getTransientSettingsData().version).toEqual(sut.version);
  });

  describe('transformDataFileToV1', () => {
    const mockDefaults = mock<SettingsData>({
      bookmarksListCommand: chance.word(),
    });

    beforeEach(() => {
      mockReset(mockPlugin);
    });

    it('should return false if data is null', async () => {
      mockClear(mockPlugin);
      mockPlugin.loadData.mockResolvedValueOnce(null);

      const result = await SwitcherPlusSettings.transformDataFileToV2(null, null);

      expect(result).toBe(false);
      expect(mockPlugin.saveData).not.toHaveBeenCalled();
    });

    it('should route failures through logError', async () => {
      const logErrorSpy = jest.spyOn(Utils, 'logError').mockReturnValueOnce();

      const error = 'transformDataFileToV1 unit test error';
      mockPlugin.loadData.mockRejectedValueOnce(error);

      const result = await SwitcherPlusSettings.transformDataFileToV1(mockPlugin, null);

      expect(result).toBe(false);
      expect(logErrorSpy).toHaveBeenCalledWith(expect.any(String), error);

      logErrorSpy.mockRestore();
    });

    it('should set the version to 1.0.0', async () => {
      const data = {};
      mockPlugin.loadData.mockResolvedValueOnce(data);

      let savedData: SettingsData;
      mockPlugin.saveData.mockImplementationOnce((input) => {
        savedData = input;
        return Promise.resolve();
      });

      const result = await SwitcherPlusSettings.transformDataFileToV1(
        mockPlugin,
        mockDefaults,
      );

      expect(savedData).toHaveProperty('version', '1.0.0');
      expect(result).toBe(true);
    });

    it('should rename starredListCommand to bookmarksListCommand', async () => {
      const value = chance.word();
      const data = { starredListCommand: value };
      mockPlugin.loadData.mockResolvedValueOnce(data);

      let savedData: SettingsData;
      mockPlugin.saveData.mockImplementationOnce((input) => {
        savedData = input;
        return Promise.resolve();
      });

      const result = await SwitcherPlusSettings.transformDataFileToV1(
        mockPlugin,
        mockDefaults,
      );

      expect(savedData).not.toHaveProperty('starredListCommand');
      expect(savedData).toHaveProperty('bookmarksListCommand', value);
      expect(result).toBe(true);
    });

    it("should use the default bookmarksListCommand if the starredListCommand doesn't exist", async () => {
      const starredListCommand: string = null;
      const data = { starredListCommand };
      mockPlugin.loadData.mockResolvedValueOnce(data);

      let savedData: SettingsData;
      mockPlugin.saveData.mockImplementationOnce((input) => {
        savedData = input;
        return Promise.resolve();
      });

      const result = await SwitcherPlusSettings.transformDataFileToV1(
        mockPlugin,
        mockDefaults,
      );

      expect(result).toBe(true);
      expect(savedData).toHaveProperty(
        'bookmarksListCommand',
        mockDefaults.bookmarksListCommand,
      );
    });

    it('should rename isStarred in matchPriorityAdjustments to isBookmarked', async () => {
      const value = chance.word();
      const data = { matchPriorityAdjustments: { isStarred: value } };
      mockPlugin.loadData.mockResolvedValueOnce(data);

      let savedData: SettingsData;
      mockPlugin.saveData.mockImplementationOnce((input) => {
        savedData = input;
        return Promise.resolve();
      });

      const result = await SwitcherPlusSettings.transformDataFileToV1(
        mockPlugin,
        mockDefaults,
      );

      expect(result).toBe(true);
      expect(savedData.matchPriorityAdjustments).not.toHaveProperty('isStarred');
      expect(savedData.matchPriorityAdjustments).toHaveProperty('isBookmarked', value);
    });
  });

  describe('transformDataFileToV2', () => {
    beforeEach(() => {
      mockReset(mockPlugin);
    });

    it('should return false if data is null', async () => {
      mockClear(mockPlugin);
      mockPlugin.loadData.mockResolvedValueOnce(null);

      const result = await SwitcherPlusSettings.transformDataFileToV2(null, null);

      expect(result).toBe(false);
      expect(mockPlugin.saveData).not.toHaveBeenCalled();
    });

    it('should route failures through logError', async () => {
      const logErrorSpy = jest.spyOn(Utils, 'logError').mockReturnValueOnce();

      const error = 'transformDataFileToV2 unit test error';
      mockPlugin.loadData.mockRejectedValueOnce(error);

      const result = await SwitcherPlusSettings.transformDataFileToV2(mockPlugin, null);

      expect(result).toBe(false);
      expect(logErrorSpy).toHaveBeenCalledWith(expect.any(String), error);

      logErrorSpy.mockRestore();
    });

    it('should transform matchPriorityAdjustments', async () => {
      const isEnabled = true;
      const v1Adjustments = {
        isOpenInEditor: 0.2,
        isRecent: 0.3,
        alias: 0.4,
        h1: 0.5,
      };

      const v1Data = {
        version: '1.0.0',
        enableMatchPriorityAdjustments: isEnabled,
        matchPriorityAdjustments: v1Adjustments,
      };

      mockPlugin.loadData.mockResolvedValueOnce(v1Data);

      let savedData: SettingsData;
      mockPlugin.saveData.mockImplementationOnce((input) => {
        savedData = input;
        return Promise.resolve();
      });

      const result = await SwitcherPlusSettings.transformDataFileToV2(
        mockPlugin,
        mock<SettingsData>({
          matchPriorityAdjustments: {
            adjustments: {
              isOpenInEditor: { value: 0, label: 'Open items' },
              isRecent: { value: 0, label: 'Recent items' },
              alias: { value: 0, label: 'Aliases' },
              h1: { value: 0, label: undefined },
            },
          },
        }),
      );

      const expected = {
        isEnabled,
        adjustments: {
          isOpenInEditor: { value: v1Adjustments.isOpenInEditor, label: 'Open items' },
          isRecent: { value: v1Adjustments.isRecent, label: 'Recent items' },
          alias: { value: v1Adjustments.alias, label: 'Aliases' },
          h1: { value: v1Adjustments.h1, label: '' },
        },
      };

      expect(savedData.version).toBe('2.0.0');
      expect(savedData).not.toHaveProperty('enableMatchPriorityAdjustments');
      expect(savedData.matchPriorityAdjustments).toEqual(expected);
      expect(result).toBe(true);
    });

    it('should transform quickFilters', async () => {
      const testFacet1 = {
        id: 'testFacet1',
        mode: Mode.BookmarksList,
        label: chance.sentence(),
        isActive: chance.bool(),
        isAvailable: chance.bool(),
      };

      const testFacet2 = {
        id: 'testFacet2',
        mode: Mode.CommandList,
        label: chance.sentence(),
        isActive: chance.bool(),
        isAvailable: chance.bool(),
      };

      const v1Data = {
        version: '1.0.0',
        quickFilters: {
          facetList: [testFacet1, testFacet2],
        },
      };

      mockPlugin.loadData.mockResolvedValueOnce(v1Data);

      let savedData: SettingsData;
      mockPlugin.saveData.mockImplementationOnce((input) => {
        savedData = input;
        return Promise.resolve();
      });

      const result = await SwitcherPlusSettings.transformDataFileToV2(
        mockPlugin,
        mock<SettingsData>(),
      );

      const expected = {
        facetList: { testFacet1, testFacet2 },
      };

      expect(savedData.version).toBe('2.0.0');
      expect(savedData.quickFilters).toEqual(expected);
      expect(result).toBe(true);
    });
  });

  describe('shouldRenderSymbolAsHTML', () => {
    it('should return false when isEnabled is false', () => {
      // Arrange
      sut.renderMarkdownContentInSuggestions.isEnabled = false;
      sut.renderMarkdownContentInSuggestions.renderHeadings = true;
      sut.renderMarkdownContentInSuggestions.renderLinks = true;
      sut.renderMarkdownContentInSuggestions.renderTags = true;
      sut.renderMarkdownContentInSuggestions.renderCallouts = true;

      // Act & Assert
      expect(sut.shouldRenderSymbolAsHTML(SymbolType.Heading)).toBe(false);
      expect(sut.shouldRenderSymbolAsHTML(SymbolType.Link)).toBe(false);
      expect(sut.shouldRenderSymbolAsHTML(SymbolType.Tag)).toBe(false);
      expect(sut.shouldRenderSymbolAsHTML(SymbolType.Callout)).toBe(false);
    });

    it('should return false for unsupported symbol types', () => {
      // Arrange
      sut.renderMarkdownContentInSuggestions.isEnabled = true;
      sut.renderMarkdownContentInSuggestions.renderHeadings = true;
      sut.renderMarkdownContentInSuggestions.renderLinks = true;
      sut.renderMarkdownContentInSuggestions.renderTags = true;
      sut.renderMarkdownContentInSuggestions.renderCallouts = true;

      // Act & Assert
      expect(sut.shouldRenderSymbolAsHTML(SymbolType.Embed)).toBe(false);
      expect(sut.shouldRenderSymbolAsHTML(SymbolType.CanvasNode)).toBe(false);
      expect(sut.shouldRenderSymbolAsHTML(SymbolType.BaseView)).toBe(false);
    });

    describe('when feature is enabled globally', () => {
      beforeEach(() => {
        sut.renderMarkdownContentInSuggestions.isEnabled = true;
      });

      it('should return true when Heading setting is true', () => {
        // Arrange
        sut.renderMarkdownContentInSuggestions.renderHeadings = true;

        // Act
        const result = sut.shouldRenderSymbolAsHTML(SymbolType.Heading);

        // Assert
        expect(result).toBe(true);
      });

      it('should return false when Heading setting is false', () => {
        // Arrange
        sut.renderMarkdownContentInSuggestions.renderHeadings = false;

        // Act
        const result = sut.shouldRenderSymbolAsHTML(SymbolType.Heading);

        // Assert
        expect(result).toBe(false);
      });

      it('should return true when Link setting is true', () => {
        // Arrange
        sut.renderMarkdownContentInSuggestions.renderLinks = true;

        // Act
        const result = sut.shouldRenderSymbolAsHTML(SymbolType.Link);

        // Assert
        expect(result).toBe(true);
      });

      it('should return false when Link setting is false', () => {
        // Arrange
        sut.renderMarkdownContentInSuggestions.renderLinks = false;

        // Act
        const result = sut.shouldRenderSymbolAsHTML(SymbolType.Link);

        // Assert
        expect(result).toBe(false);
      });

      it('should return true when Tag setting is true', () => {
        // Arrange
        sut.renderMarkdownContentInSuggestions.renderTags = true;

        // Act
        const result = sut.shouldRenderSymbolAsHTML(SymbolType.Tag);

        // Assert
        expect(result).toBe(true);
      });

      it('should return false when Tag setting is false', () => {
        // Arrange
        sut.renderMarkdownContentInSuggestions.renderTags = false;

        // Act
        const result = sut.shouldRenderSymbolAsHTML(SymbolType.Tag);

        // Assert
        expect(result).toBe(false);
      });

      it('should return true when Callout setting is true', () => {
        // Arrange
        sut.renderMarkdownContentInSuggestions.renderCallouts = true;

        // Act
        const result = sut.shouldRenderSymbolAsHTML(SymbolType.Callout);

        // Assert
        expect(result).toBe(true);
      });

      it('should return false when Callout setting is false', () => {
        // Arrange
        sut.renderMarkdownContentInSuggestions.renderCallouts = false;

        // Act
        const result = sut.shouldRenderSymbolAsHTML(SymbolType.Callout);

        // Assert
        expect(result).toBe(false);
      });

      it('should return correct values for multiple symbol types independently', () => {
        // Arrange
        sut.renderMarkdownContentInSuggestions.renderHeadings = true;
        sut.renderMarkdownContentInSuggestions.renderLinks = false;
        sut.renderMarkdownContentInSuggestions.renderTags = true;
        sut.renderMarkdownContentInSuggestions.renderCallouts = false;

        // Act & Assert
        expect(sut.shouldRenderSymbolAsHTML(SymbolType.Heading)).toBe(true);
        expect(sut.shouldRenderSymbolAsHTML(SymbolType.Link)).toBe(false);
        expect(sut.shouldRenderSymbolAsHTML(SymbolType.Tag)).toBe(true);
        expect(sut.shouldRenderSymbolAsHTML(SymbolType.Callout)).toBe(false);
      });

      it('should handle all symbol types correctly with mixed settings', () => {
        // Arrange
        sut.renderMarkdownContentInSuggestions.renderHeadings = true;
        sut.renderMarkdownContentInSuggestions.renderLinks = true;
        sut.renderMarkdownContentInSuggestions.renderTags = false;
        sut.renderMarkdownContentInSuggestions.renderCallouts = false;

        // Act & Assert
        expect(sut.shouldRenderSymbolAsHTML(SymbolType.Heading)).toBe(true);
        expect(sut.shouldRenderSymbolAsHTML(SymbolType.Link)).toBe(true);
        expect(sut.shouldRenderSymbolAsHTML(SymbolType.Tag)).toBe(false);
        expect(sut.shouldRenderSymbolAsHTML(SymbolType.Callout)).toBe(false);
        expect(sut.shouldRenderSymbolAsHTML(SymbolType.Embed)).toBe(false);
        expect(sut.shouldRenderSymbolAsHTML(SymbolType.CanvasNode)).toBe(false);
        expect(sut.shouldRenderSymbolAsHTML(SymbolType.BaseView)).toBe(false);
      });

      describe('unsupported symbol types', () => {
        beforeEach(() => {
          // Set all render settings to true to ensure unsupported types still return false
          sut.renderMarkdownContentInSuggestions.renderHeadings = true;
          sut.renderMarkdownContentInSuggestions.renderLinks = true;
          sut.renderMarkdownContentInSuggestions.renderTags = true;
          sut.renderMarkdownContentInSuggestions.renderCallouts = true;
        });

        it('should return false for Embed symbol type', () => {
          // Act
          const result = sut.shouldRenderSymbolAsHTML(SymbolType.Embed);

          // Assert
          expect(result).toBe(false);
        });

        it('should return false for CanvasNode symbol type', () => {
          // Act
          const result = sut.shouldRenderSymbolAsHTML(SymbolType.CanvasNode);

          // Assert
          expect(result).toBe(false);
        });

        it('should return false for BaseView symbol type', () => {
          // Act
          const result = sut.shouldRenderSymbolAsHTML(SymbolType.BaseView);

          // Assert
          expect(result).toBe(false);
        });
      });
    });
  });

  describe('searchAllHeadings', () => {
    it('should round-trip an array of heading levels', () => {
      const sut = new SwitcherPlusSettings(null);

      sut.searchAllHeadings = [1, 2];

      expect(sut.searchAllHeadings).toEqual([1, 2]);
    });

    it('should normalize a stored boolean true to all heading levels', () => {
      const sut = new SwitcherPlusSettings(null);

      sut.searchAllHeadings = true;

      expect(sut.searchAllHeadings).toEqual([1, 2, 3, 4, 5, 6]);
    });

    it('should normalize a stored boolean false to an empty array (first H1 only)', () => {
      const sut = new SwitcherPlusSettings(null);

      sut.searchAllHeadings = false;

      expect(sut.searchAllHeadings).toEqual([]);
    });
  });
  describe('readControlValue', () => {
    let config: SwitcherPlusSettings;

    beforeEach(() => {
      config = new SwitcherPlusSettings(null);
    });

    it('should read a top level key through its accessor', () => {
      config.symbolListCommand = '@@';

      expect(config.readControlValue('symbolListCommand')).toBe('@@');
    });

    it('should read a nested key using a dot path', () => {
      config.mobileLauncher.isEnabled = false;

      expect(config.readControlValue('mobileLauncher.isEnabled')).toBe(false);
    });

    it('should read a deeply nested key using a dot path', () => {
      const key = 'matchPriorityAdjustments.adjustments.isBookmarked.value';
      config.matchPriorityAdjustments.adjustments.isBookmarked.value = 0.5;

      expect(config.readControlValue(key)).toBe(0.5);
    });

    it('should return undefined when an intermediate segment is missing', () => {
      expect(
        config.readControlValue('mobileLauncher.doesNotExist.value'),
      ).toBeUndefined();
    });

    it('should read a symbol type through its dot path', () => {
      const key: SettingsControlKey = `enabledSymbolTypes.${SymbolType.Tag}`;
      config.enabledSymbolTypes[SymbolType.Tag] = false;

      expect(config.readControlValue(key)).toBe(false);
    });
  });

  describe('writeControlValue', () => {
    let config: SwitcherPlusSettings;

    beforeEach(() => {
      config = new SwitcherPlusSettings(null);
    });

    it('should write a top level key through its accessor', () => {
      config.writeControlValue('symbolListCommand', '$$');

      expect(config.symbolListCommand).toBe('$$');
    });

    it('should write a nested key using a dot path', () => {
      config.writeControlValue('mobileLauncher.isEnabled', false);

      expect(config.mobileLauncher.isEnabled).toBe(false);
    });

    it('should write a deeply nested key using a dot path', () => {
      const key = 'matchPriorityAdjustments.adjustments.isBookmarked.value';

      config.writeControlValue(key, 0.25);

      expect(config.matchPriorityAdjustments.adjustments.isBookmarked.value).toBe(0.25);
    });

    it('should not throw when an intermediate segment is missing', () => {
      expect(() => {
        config.writeControlValue('mobileLauncher.doesNotExist.value', 1);
      }).not.toThrow();
    });

    it('should not throw when the path breaks before the final segment', () => {
      expect(() => {
        config.writeControlValue('mobileLauncher.doesNotExist.deeper.value', 1);
      }).not.toThrow();
    });

    it('should write a symbol type through its dot path', () => {
      const key: SettingsControlKey = `enabledSymbolTypes.${SymbolType.Callout}`;

      config.writeControlValue(key, false);

      expect(config.enabledSymbolTypes[SymbolType.Callout]).toBe(false);
    });
  });
  describe('nested control key dot paths', () => {
    // NESTED_CONTROL_KEYS is the single declaration literal paths NestedControlKey is
    // derived from. So this test walks exactly what the settings controls bind to.
    // This catches the case where renaming a field in SettingsData leaves a stale path
    // that still compiles and reads undefined forever.
    const { enabledSymbolTypes, matchPriorityAdjustments } =
      SwitcherPlusSettings.defaults;

    const symbolTypeKeys = Object.keys(enabledSymbolTypes).map(
      (symbolType) => `enabledSymbolTypes.${symbolType}` as SettingsControlKey,
    );

    const adjustmentKeys = (['adjustments', 'fileExtAdjustments'] as const).flatMap(
      (group) =>
        Object.keys(matchPriorityAdjustments[group]).map(
          (name) => `matchPriorityAdjustments.${group}.${name}.value`,
        ),
    );

    it.each([...NESTED_CONTROL_KEYS, ...symbolTypeKeys, ...adjustmentKeys])(
      'should resolve %s to a stored value',
      (key) => {
        const config = new SwitcherPlusSettings(null);

        const value = config.readControlValue(key);

        expect(value).toBeDefined();
      },
    );

    // The @ts-expect-error is the assertion: it stops compiling if either ever becomes
    // a valid control key.
    it('should not accept a container label symbol type as a control key', () => {
      const config = new SwitcherPlusSettings(null);
      // @ts-expect-error -- CanvasNode is a container label, it has no stored key
      const canvasNodeKey: SettingsControlKey = `enabledSymbolTypes.${SymbolType.CanvasNode}`;
      // @ts-expect-error -- BaseView is a container label, it has no stored key
      const baseViewKey: SettingsControlKey = `enabledSymbolTypes.${SymbolType.BaseView}`;

      expect(config.readControlValue(canvasNodeKey)).toBeUndefined();
      expect(config.readControlValue(baseViewKey)).toBeUndefined();
    });
  });
});
