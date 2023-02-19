import {
  LinkType,
  Mode,
  PathDisplayFormat,
  RelationType,
  SettingsData,
  SymbolType,
} from 'src/types';
import SwitcherPlusPlugin from 'src/main';
import { SwitcherPlusSettings } from 'src/settings';
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

function transientSettingsData(useDefault: boolean): SettingsData {
  const sidePanelOptions = ['backlink', 'image', 'markdown', 'pdf'];

  const enabledSymbolTypes = {} as Record<SymbolType, boolean>;
  enabledSymbolTypes[SymbolType.Link] = true;
  enabledSymbolTypes[SymbolType.Embed] = true;
  enabledSymbolTypes[SymbolType.Tag] = true;
  enabledSymbolTypes[SymbolType.Heading] = true;
  enabledSymbolTypes[SymbolType.Callout] = true;

  const data: SettingsData = {
    enabledSymbolTypes,
    excludeViewTypes: ['empty'],
    referenceViews: ['backlink', 'localgraph', 'outgoing-link', 'outline'],
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
    limit: 50,
    selectNearestHeading: true,
    excludeLinkSubTypes: LinkType.None,
    includeSidePanelViewTypes: sidePanelOptions,
    excludeFolders: [],
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

  if (!useDefault) {
    data.onOpenPreferNewTab = chance.bool();
    data.alwaysNewTabForSymbols = chance.bool();
    data.useActiveTabForSymbolsOnMobile = chance.bool();
    data.symbolsInLineOrder = chance.bool();
    data.editorListCommand = chance.word();
    data.symbolListCommand = chance.word();
    data.workspaceListCommand = chance.word();
    data.headingsListCommand = chance.word();
    data.starredListCommand = chance.word();
    data.commandListCommand = chance.word();
    data.strictHeadingsOnly = chance.bool();
    data.searchAllHeadings = chance.bool();
    data.headingsSearchDebounceMilli = chance.millisecond();
    data.limit = chance.integer();
    data.selectNearestHeading = chance.bool();
    data.starredListCommand = chance.word();
    data.relatedItemsListCommand = chance.word();
    data.excludeLinkSubTypes = LinkType.Block;
    data.excludeOpenRelatedFiles = chance.bool();
    data.excludeObsidianIgnoredFiles = chance.bool();
    data.shouldSearchFilenames = chance.bool();
    data.pathDisplayFormat = PathDisplayFormat.Full;
    data.hidePathIfRoot = chance.bool();
    data.enabledRelatedItems = chance.pickset(Object.values(RelationType), 2);
    data.showOptionalIndicatorIcons = chance.bool();
    data.overrideStandardModeBehaviors = chance.bool();
    data.enableMatchPriorityAdjustments = chance.bool();
    data.matchPriorityAdjustments = { h2: 0.5, isOpenInEditor: 0.5 };

    const ribbonCommands = Object.values(Mode).filter((v) => isNaN(Number(v))) as Array<
      keyof typeof Mode
    >;
    data.enabledRibbonCommands = chance.pickset(ribbonCommands, 3);

    data.includeSidePanelViewTypes = [
      chance.word(),
      chance.word(),
      chance.pickone(sidePanelOptions),
    ];

    data.excludeFolders = [
      `path/to/${chance.word()}`,
      `${chance.word()}`,
      `/${chance.word()}`,
    ];

    data.excludeRelatedFolders = [`path/to/${chance.word()}`];

    enabledSymbolTypes[SymbolType.Link] = chance.bool();
    enabledSymbolTypes[SymbolType.Embed] = chance.bool();
    enabledSymbolTypes[SymbolType.Tag] = chance.bool();
    enabledSymbolTypes[SymbolType.Heading] = chance.bool();
    enabledSymbolTypes[SymbolType.Callout] = chance.bool();
  }

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
    const { enabledSymbolTypes, ...defaults } = transientSettingsData(true);

    expect(sut).toEqual(expect.objectContaining(defaults));
    expect(sut.editorListPlaceholderText).toBe(defaults.editorListCommand);
    expect(sut.symbolListPlaceholderText).toBe(defaults.symbolListCommand);
    expect(sut.workspaceListPlaceholderText).toBe(defaults.workspaceListCommand);
    expect(sut.headingsListPlaceholderText).toBe(defaults.headingsListCommand);
    expect(sut.starredListPlaceholderText).toBe(defaults.starredListCommand);
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
    const settings = transientSettingsData(false);

    sut.onOpenPreferNewTab = settings.onOpenPreferNewTab;
    sut.alwaysNewTabForSymbols = settings.alwaysNewTabForSymbols;
    sut.useActiveTabForSymbolsOnMobile = settings.useActiveTabForSymbolsOnMobile;
    sut.symbolsInLineOrder = settings.symbolsInLineOrder;
    sut.editorListCommand = settings.editorListCommand;
    sut.symbolListCommand = settings.symbolListCommand;
    sut.workspaceListCommand = settings.workspaceListCommand;
    sut.headingsListCommand = settings.headingsListCommand;
    sut.starredListCommand = settings.starredListCommand;
    sut.commandListCommand = settings.commandListCommand;
    sut.relatedItemsListCommand = settings.relatedItemsListCommand;
    sut.strictHeadingsOnly = settings.strictHeadingsOnly;
    sut.searchAllHeadings = settings.searchAllHeadings;
    sut.headingsSearchDebounceMilli = settings.headingsSearchDebounceMilli;
    sut.includeSidePanelViewTypes = settings.includeSidePanelViewTypes;
    sut.limit = settings.limit;
    sut.selectNearestHeading = settings.selectNearestHeading;
    sut.excludeFolders = settings.excludeFolders;
    sut.excludeLinkSubTypes = settings.excludeLinkSubTypes;
    sut.excludeRelatedFolders = settings.excludeRelatedFolders;
    sut.excludeOpenRelatedFiles = settings.excludeOpenRelatedFiles;
    sut.excludeObsidianIgnoredFiles = settings.excludeObsidianIgnoredFiles;
    sut.shouldSearchFilenames = settings.shouldSearchFilenames;
    sut.pathDisplayFormat = settings.pathDisplayFormat;
    sut.hidePathIfRoot = settings.hidePathIfRoot;
    sut.enabledRelatedItems = settings.enabledRelatedItems;
    sut.showOptionalIndicatorIcons = settings.showOptionalIndicatorIcons;
    sut.overrideStandardModeBehaviors = settings.overrideStandardModeBehaviors;
    sut.enabledRibbonCommands = settings.enabledRibbonCommands;
    sut.enableMatchPriorityAdjustments = settings.enableMatchPriorityAdjustments;
    sut.matchPriorityAdjustments = settings.matchPriorityAdjustments;

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
    const settings = transientSettingsData(false);
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
    const defaults = transientSettingsData(true);
    const settings = transientSettingsData(false);

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
    const { enabledSymbolTypes, ...defaults } = transientSettingsData(true);
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

  it('should log errors to console on fire and forget save operation', () => {
    // Promise used to trigger the error condition
    const saveDataPromise = Promise.resolve();

    mockPlugin.saveData.mockImplementationOnce((_data: SettingsData) => {
      // throw to simulate saveData() failing. This happens first
      return saveDataPromise.then(() => {
        throw new Error('saveData() unit test mock error');
      });
    });

    // Promise used to track the call to console.log
    let consoleLogPromiseResolveFn: (value: void | PromiseLike<void>) => void;
    const consoleLogPromise = new Promise<void>((resolve, _reject) => {
      consoleLogPromiseResolveFn = resolve;
    });

    const consoleLogSpy = jest
      .spyOn(console, 'log')
      .mockImplementation((message: string) => {
        if (message.startsWith('Switcher++: error saving changes to settings')) {
          // resolve the consoleLogPromise. This happens second and will allow
          // allPromises to resolve itself
          consoleLogPromiseResolveFn();
        }
      });

    // wait for the other promises to resolve before this promise can resolve
    const allPromises = Promise.all([saveDataPromise, consoleLogPromise]);

    sut.save();

    // when all the promises are resolved check expectations and clean up
    return allPromises.finally(() => {
      expect(mockPlugin.saveData).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalled();

      consoleLogSpy.mockRestore();
    });
  });
});
