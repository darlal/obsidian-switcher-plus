import { Chance } from 'chance';
import { mock, MockProxy } from 'jest-mock-extended';
import {
  App, QuickSwitcherOptions, InstalledPlugin, QuickSwitcherPluginInstance,
  InternalPlugins,
} from 'obsidian';
import SwitcherPlusPlugin from 'src/main';
import { SwitcherPlusSettings } from 'src/settings';
import { LinkType, SettingsData, SymbolType } from 'src/types';

const chance = new Chance();

function transientSettingsData(useDefault: boolean): SettingsData {
  const standardIncludeOpenFiles = useDefault ? true : chance.bool();
  const alwaysNewPaneForSymbols = useDefault ? false : chance.bool();
  const useActivePaneForSymbolsOnMobile = useDefault ? false : chance.bool();
  const symbolsInLineOrder = useDefault ? true : chance.bool();
  const editorListCommand = useDefault ? 'edt ' : chance.word();
  const symbolListCommand = useDefault ? '@' : chance.word();
  const workspaceListCommand = useDefault ? '+' : chance.word();
  const headingsListCommand = useDefault ? '#' : chance.word();
  const strictHeadingsOnly = useDefault ? false : chance.bool();
  const searchAllHeadings = useDefault ? true : chance.bool();
  const excludeViewTypes = ['empty'];
  const referenceViews = ['backlink', 'localgraph', 'outgoing-link', 'outline'];
  const limit = useDefault ? 50 : chance.integer();
  const selectNearestHeading = useDefault ? true : chance.bool();

  const sidePanelOptions = ['backlink', 'image', 'markdown', 'pdf'];
  const includeSidePanelViewTypes = useDefault
    ? sidePanelOptions
    : [chance.word(), chance.word(), chance.pickone(sidePanelOptions)];

  const enabledSymbolTypes = {} as Record<SymbolType, boolean>;
  enabledSymbolTypes[SymbolType.Link] = useDefault ? true : chance.bool();
  enabledSymbolTypes[SymbolType.Embed] = useDefault ? true : chance.bool();
  enabledSymbolTypes[SymbolType.Tag] = useDefault ? true : chance.bool();
  enabledSymbolTypes[SymbolType.Heading] = useDefault ? true : chance.bool();

  const excludedFolders = [
    `path/to/${chance.word()}`,
    `${chance.word()}`,
    `/${chance.word()}`,
  ];
  const excludeFolders = useDefault ? [] : excludedFolders;
  const excludeLinkSubTypes = useDefault ? 0 : LinkType.Block;

  const data: SettingsData = {
    standardIncludeOpenFiles,
    alwaysNewPaneForSymbols,
    useActivePaneForSymbolsOnMobile,
    symbolsInLineOrder,
    editorListCommand,
    symbolListCommand,
    workspaceListCommand,
    headingsListCommand,
    strictHeadingsOnly,
    searchAllHeadings,
    excludeViewTypes,
    referenceViews,
    limit,
    includeSidePanelViewTypes,
    enabledSymbolTypes,
    selectNearestHeading,
    excludeFolders,
    excludeLinkSubTypes,
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
    const { enabledSymbolTypes, ...defaults } = transientSettingsData(true);

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
  });

  it('should save modified settings', async () => {
    const settings = transientSettingsData(false);

    sut.alwaysNewPaneForSymbols = settings.alwaysNewPaneForSymbols;
    sut.useActivePaneForSymbolsOnMobile = settings.useActivePaneForSymbolsOnMobile;
    sut.symbolsInLineOrder = settings.symbolsInLineOrder;
    sut.editorListCommand = settings.editorListCommand;
    sut.symbolListCommand = settings.symbolListCommand;
    sut.workspaceListCommand = settings.workspaceListCommand;
    sut.headingsListCommand = settings.headingsListCommand;
    sut.strictHeadingsOnly = settings.strictHeadingsOnly;
    sut.searchAllHeadings = settings.searchAllHeadings;
    sut.includeSidePanelViewTypes = settings.includeSidePanelViewTypes;
    sut.limit = settings.limit;
    sut.selectNearestHeading = settings.selectNearestHeading;
    sut.excludeFolders = settings.excludeFolders;
    sut.excludeLinkSubTypes = settings.excludeLinkSubTypes;

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
});
