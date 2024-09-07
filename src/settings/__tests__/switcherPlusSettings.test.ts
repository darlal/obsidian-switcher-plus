import {
  LinkType,
  Mode,
  PathDisplayFormat,
  RelationType,
  SettingsData,
  SymbolType,
} from 'src/types';
import SwitcherPlusPlugin from 'src/main';
import { SwitcherPlusSettings, getFacetMap } from 'src/settings';
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
    vaultListCommand: 'vault ',
    relatedItemsListCommand: '~',
    relatedItemsListActiveEditorCommand: '^ ',
    shouldSearchHeadings: true,
    strictHeadingsOnly: false,
    searchAllHeadings: true,
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
    navigateToHotkeySelectorKeys: { modifiers: ['Ctrl', 'Shift'], key: 'h' },
    togglePinnedCommandKeys: { modifiers: ['Ctrl', 'Shift'], key: 'p' },
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
    showModeTriggerInstructions: true,
    renderMarkdownContentInSuggestions: {
      isEnabled: false,
      renderHeadings: false,
      toggleContentRenderingKeys: { modifiers: ['Shift', 'Ctrl'], key: 'm' },
    },
    quickOpen: {
      isEnabled: true,
      modifiers: ['Alt'],
      keyList: ['1', '2', '3', '4', '5', '6', '7', '8', '9'],
    },
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
    vaultListCommand: chance.word(),
    shouldSearchHeadings: chance.bool(),
    strictHeadingsOnly: chance.bool(),
    searchAllHeadings: chance.bool(),
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
    overrideStandardModeBehaviors: chance.bool(),
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
    preferredSourceForTitle: chance.pickone(['Default', 'H1']),
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
      modeString: Mode[Mode.CommandList],
      iconName: '',
      coreLauncherButtonIconSelector: '',
      coreLauncherButtonSelector: '',
    },
    allowCreateNewFileInModeNames: [Mode[Mode.CommandList] as keyof typeof Mode],
    showModeTriggerInstructions: chance.bool(),
    renderMarkdownContentInSuggestions: {
      isEnabled: false,
      renderHeadings: false,
      toggleContentRenderingKeys: { modifiers: ['Shift', 'Ctrl'], key: 'm' },
    },
    quickOpen: {
      isEnabled: true,
      modifiers: chance.pickset(['Alt', 'Ctrl'], 1),
      keyList: [chance.letter()],
    },
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
    // extract enabledSymbolTypes to handle separately, because it's not exposed
    // on SwitcherPlusSettings directly
    const { enabledSymbolTypes, ...defaults } = getDefaultSettingsData();

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

    expect(sut.isSymbolTypeEnabled(SymbolType.Embed)).toBe(
      enabledSymbolTypes[SymbolType.Embed],
    );
    expect(sut.isSymbolTypeEnabled(SymbolType.Heading)).toBe(
      enabledSymbolTypes[SymbolType.Heading],
    );
    expect(sut.isSymbolTypeEnabled(SymbolType.Link)).toBe(
      enabledSymbolTypes[SymbolType.Link],
    );
    expect(sut.isSymbolTypeEnabled(SymbolType.Tag)).toBe(
      enabledSymbolTypes[SymbolType.Tag],
    );
    expect(sut.isSymbolTypeEnabled(SymbolType.Callout)).toBe(
      enabledSymbolTypes[SymbolType.Callout],
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

    sut.setSymbolTypeEnabled(
      SymbolType.Heading,
      settings.enabledSymbolTypes[SymbolType.Heading],
    );

    sut.setSymbolTypeEnabled(
      SymbolType.Link,
      settings.enabledSymbolTypes[SymbolType.Link],
    );

    sut.setSymbolTypeEnabled(SymbolType.Tag, settings.enabledSymbolTypes[SymbolType.Tag]);

    sut.setSymbolTypeEnabled(
      SymbolType.Embed,
      settings.enabledSymbolTypes[SymbolType.Embed],
    );

    sut.setSymbolTypeEnabled(
      SymbolType.Callout,
      settings.enabledSymbolTypes[SymbolType.Callout],
    );

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

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { enabledSymbolTypes, ...prunedSettings } = settings;

    mockPlugin.loadData.mockResolvedValueOnce(settings);

    await sut.loadSettings();

    expect(sut).toEqual(expect.objectContaining(prunedSettings));
    expect(sut.isSymbolTypeEnabled(SymbolType.Heading)).toBe(
      enabledSymbolTypes[SymbolType.Heading],
    );
    expect(sut.isSymbolTypeEnabled(SymbolType.Link)).toBe(
      enabledSymbolTypes[SymbolType.Link],
    );
    expect(sut.isSymbolTypeEnabled(SymbolType.Tag)).toBe(
      enabledSymbolTypes[SymbolType.Tag],
    );
    expect(sut.isSymbolTypeEnabled(SymbolType.Embed)).toBe(
      enabledSymbolTypes[SymbolType.Embed],
    );
    expect(sut.isSymbolTypeEnabled(SymbolType.Callout)).toBe(
      enabledSymbolTypes[SymbolType.Callout],
    );

    expect(mockPlugin.loadData).toHaveBeenCalled();

    mockPlugin.loadData.mockReset();
  });

  it('should load saved settings, even with missing data keys', async () => {
    const defaults = getDefaultSettingsData();
    const settings = getTransientSettingsData();

    // these keys get merged
    settings['matchPriorityAdjustments'] = defaults['matchPriorityAdjustments'];
    settings['quickFilters'] = defaults['quickFilters'];

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { enabledSymbolTypes, ...prunedSettings } = settings;

    mockPlugin.loadData.mockResolvedValueOnce(prunedSettings);

    await sut.loadSettings();

    expect(sut).toEqual(expect.objectContaining(prunedSettings));
    expect(sut.isSymbolTypeEnabled(SymbolType.Heading)).toBe(
      defaults.enabledSymbolTypes[SymbolType.Heading],
    );
    expect(sut.isSymbolTypeEnabled(SymbolType.Link)).toBe(
      defaults.enabledSymbolTypes[SymbolType.Link],
    );
    expect(sut.isSymbolTypeEnabled(SymbolType.Tag)).toBe(
      defaults.enabledSymbolTypes[SymbolType.Tag],
    );
    expect(sut.isSymbolTypeEnabled(SymbolType.Embed)).toBe(
      defaults.enabledSymbolTypes[SymbolType.Embed],
    );
    expect(sut.isSymbolTypeEnabled(SymbolType.Callout)).toBe(
      defaults.enabledSymbolTypes[SymbolType.Callout],
    );

    expect(mockPlugin.loadData).toHaveBeenCalled();

    mockPlugin.loadData.mockReset();
  });

  it('should use default data if settings cannot be loaded', async () => {
    const { enabledSymbolTypes, ...defaults } = getDefaultSettingsData();
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

    expect(sut.isSymbolTypeEnabled(SymbolType.Embed)).toBe(
      enabledSymbolTypes[SymbolType.Embed],
    );
    expect(sut.isSymbolTypeEnabled(SymbolType.Heading)).toBe(
      enabledSymbolTypes[SymbolType.Heading],
    );
    expect(sut.isSymbolTypeEnabled(SymbolType.Link)).toBe(
      enabledSymbolTypes[SymbolType.Link],
    );
    expect(sut.isSymbolTypeEnabled(SymbolType.Tag)).toBe(
      enabledSymbolTypes[SymbolType.Tag],
    );
    expect(sut.isSymbolTypeEnabled(SymbolType.Callout)).toBe(
      enabledSymbolTypes[SymbolType.Callout],
    );

    expect(mockPlugin.loadData).toHaveBeenCalled();
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

  test('.loadSettings() should log errors to the console', async () => {
    const consoleLogSpy = jest.spyOn(console, 'log').mockReturnValueOnce();

    const error = new Error('loadSettings unit test error');
    mockPlugin.loadData.mockRejectedValueOnce(error);

    await sut.loadSettings();

    expect(consoleLogSpy).toHaveBeenCalledWith(
      'Switcher++: error loading settings, using defaults. ',
      error,
    );

    consoleLogSpy.mockRestore();
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

  it('should log errors to console on fire and forget save operation', () => {
    const consoleLogSpy = jest.spyOn(console, 'log');

    const error = new Error('saveData() unit test mock error');
    mockPlugin.saveData.mockRejectedValueOnce(error);

    const logPromise = new Promise<void>((resolve, _r) => {
      consoleLogSpy.mockImplementationOnce(() => {
        resolve();
      });
    });

    sut.save();

    return logPromise.finally(() => {
      expect(mockPlugin.saveData).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Switcher++: error saving changes to settings',
        error,
      );

      consoleLogSpy.mockRestore();
    });
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

    it('should log errors to the console', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockReturnValueOnce();

      const error = 'transformDataFileToV1 unit test error';
      mockPlugin.loadData.mockRejectedValueOnce(error);

      const result = await SwitcherPlusSettings.transformDataFileToV1(mockPlugin, null);

      expect(result).toBe(false);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Switcher++: error transforming data.json to v1.0.0',
        error,
      );

      consoleLogSpy.mockRestore();
    });

    it('should set the version to 1.0.0', async () => {
      const data = {};
      mockPlugin.loadData.mockResolvedValueOnce(data);

      let savedData: SettingsData;
      mockPlugin.saveData.mockImplementationOnce((input) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
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
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
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
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
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
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
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

    it('should log errors to the console', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockReturnValueOnce();

      const error = 'transformDataFileToV2 unit test error';
      mockPlugin.loadData.mockRejectedValueOnce(error);

      const result = await SwitcherPlusSettings.transformDataFileToV2(mockPlugin, null);

      expect(result).toBe(false);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Switcher++: error transforming data.json to v2.0.0',
        error,
      );

      consoleLogSpy.mockRestore();
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
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
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
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
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
});
