import {
  Facet,
  LinkType,
  Mode,
  PathDisplayFormat,
  RelationType,
  SettingsData,
  SymbolType,
} from 'src/types';
import SwitcherPlusPlugin from 'src/main';
import { FACETS_ALL, SwitcherPlusSettings } from 'src/settings';
import { Chance } from 'chance';
import {
  App,
  QuickSwitcherOptions,
  InstalledPlugin,
  QuickSwitcherPluginInstance,
  InternalPlugins,
} from 'obsidian';
import { mock, MockProxy } from 'jest-mock-extended';

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
    version: '1.0.0',
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
    relatedItemsListCommand: '~',
    relatedItemsListActiveEditorCommand: '^ ',
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
    enableMatchPriorityAdjustments: false,
    matchPriorityAdjustments: {
      isOpenInEditor: 0,
      isBookmarked: 0,
      isRecent: 0,
      file: 0,
      alias: 0,
      h1: 0,
    },
    quickFilters: {
      resetKey: '0',
      keyList: ['1', '2', '3', '4', '5', '6', '7', '8', '9'],
      modifiers: ['Ctrl', 'Alt'],
      facetList: FACETS_ALL.map((v) => Object.assign({}, v)),
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
    closeWhenEmptyKeys: [{ modifiers: null, key: 'Backspace' }],
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
    version: '1.0.0',
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
    pathDisplayFormat: PathDisplayFormat.Full,
    hidePathIfRoot: chance.bool(),
    enabledRelatedItems: chance.pickset(Object.values(RelationType), 2),
    showOptionalIndicatorIcons: chance.bool(),
    overrideStandardModeBehaviors: chance.bool(),
    enabledRibbonCommands,
    fileExtAllowList: [],
    enableMatchPriorityAdjustments: chance.bool(),
    matchPriorityAdjustments: { h2: 0.5, isOpenInEditor: 0.5 },
    quickFilters: {
      resetKey: chance.letter(),
      resetModifiers: chance.pickset(['Alt', 'Ctrl', 'Meta', 'Shift'], 2),
      keyList: [chance.letter()],
      modifiers: [chance.pickone(['Alt', 'Ctrl', 'Meta'])],
      facetList: [],
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
    closeWhenEmptyKeys: [
      {
        modifiers: chance.pickset(['Alt', 'Ctrl'], 1),
        key: chance.letter(),
      },
    ],
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
    const settings = getTransientSettingsData();
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

  describe('updateDataFile v1.0.0', () => {
    const mockDefaults = mock<SettingsData>({
      quickFilters: { facetList: [mock<Facet>()] },
    });

    it('should log errors to the console', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockReturnValueOnce();

      const error = 'updateDataFile v1.0.0 unit test error';
      mockPlugin.loadData.mockRejectedValueOnce(error);

      await SwitcherPlusSettings.updateDataFile(mockPlugin, mockDefaults);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Switcher++: error updating data.json file',
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

      await SwitcherPlusSettings.updateDataFile(mockPlugin, mockDefaults);

      expect(savedData).toHaveProperty('version', '1.0.0');
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

      await SwitcherPlusSettings.updateDataFile(mockPlugin, mockDefaults);

      expect(savedData).not.toHaveProperty('starredListCommand');
      expect(savedData).toHaveProperty('bookmarksListCommand', value);
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

      await SwitcherPlusSettings.updateDataFile(mockPlugin, mockDefaults);

      expect(savedData.matchPriorityAdjustments).not.toHaveProperty('isStarred');
      expect(savedData.matchPriorityAdjustments).toHaveProperty('isBookmarked', value);
    });

    it('should add new facets to the facetList property in quickFilters', async () => {
      const facetList: Facet[] = [mock<Facet>()];
      const data = { quickFilters: { facetList } };
      mockPlugin.loadData.mockResolvedValueOnce(data);

      let savedData: SettingsData;
      mockPlugin.saveData.mockImplementationOnce((input) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        savedData = input;
        return Promise.resolve();
      });

      await SwitcherPlusSettings.updateDataFile(mockPlugin, mockDefaults);

      expect(savedData.quickFilters.facetList).toHaveLength(2);
    });

    it('.updateDataAndLoadSettings() should update settings', async () => {
      const updateDataSpy = jest.spyOn(sut, 'updateDataAndLoadSettings');
      mockPlugin.loadData.mockResolvedValueOnce({});

      await sut.updateDataAndLoadSettings();

      expect(updateDataSpy).toHaveBeenCalled();
      expect(mockPlugin.loadData).toHaveBeenCalled();

      updateDataSpy.mockRestore();
    });
  });
});
