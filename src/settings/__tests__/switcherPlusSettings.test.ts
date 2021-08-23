import { SettingsData, SymbolType } from 'src/types';
import SwitcherPlusPlugin from 'src/main';
import { SwitcherPlusSettings } from 'src/settings';
import { Chance } from 'chance';
import {
  App,
  QuickSwitcherOptions,
  InstalledPlugin,
  QuickSwitcherPluginInstance,
} from 'obsidian';

const chance = new Chance();

function transientSettingsData(useDefault: boolean): SettingsData {
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

  const data: SettingsData = {
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
  };

  return data;
}

describe('SwitcherPlusSettings', () => {
  let app: App;
  let plugin: SwitcherPlusPlugin;
  let sut: SwitcherPlusSettings;

  beforeAll(() => {
    app = new App();
    plugin = new SwitcherPlusPlugin(app, null);
  });

  beforeEach(() => {
    sut = new SwitcherPlusSettings(plugin);
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
    sut.selectNearestHeading = settings.selectNearestHeading;

    let savedSettings: SettingsData;
    const saveDataSpy = jest
      .spyOn(plugin, 'saveData')
      .mockImplementationOnce((data: SettingsData) => {
        savedSettings = data;
        return Promise.resolve();
      });

    await sut.saveSettings();

    expect(savedSettings).toEqual(expect.objectContaining(settings));
    expect(saveDataSpy).toHaveBeenCalled();

    saveDataSpy.mockRestore();
  });

  it('should load saved settings', async () => {
    const settings = transientSettingsData(false);
    const { enabledSymbolTypes, ...prunedSettings } = settings;
    const loadDataSpy = jest.spyOn(plugin, 'loadData').mockResolvedValueOnce(settings);

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

    expect(loadDataSpy).toHaveBeenCalled();

    loadDataSpy.mockRestore();
  });

  it('should load saved settings, even with missing data keys', async () => {
    const defaults = transientSettingsData(true);
    const settings = transientSettingsData(false);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { enabledSymbolTypes, ...prunedSettings } = settings;
    const loadDataSpy = jest
      .spyOn(plugin, 'loadData')
      .mockResolvedValueOnce(prunedSettings);

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

    expect(loadDataSpy).toHaveBeenCalled();

    loadDataSpy.mockRestore();
  });

  it('should load built-in system switcher settings', () => {
    const builtInOptions: QuickSwitcherOptions = {
      showAllFileTypes: chance.bool(),
      showAttachments: chance.bool(),
      showExistingOnly: chance.bool(),
    };
    const pluginInstance: QuickSwitcherPluginInstance = {
      id: 'switcher',
      options: builtInOptions,
      QuickSwitcherModal: null,
    };
    const builtInSwitcherPlugin: InstalledPlugin = {
      enabled: true,
      instance: pluginInstance,
    };

    const getPluginByIdSpy = jest
      .spyOn(app.internalPlugins, 'getPluginById')
      .mockReturnValue(builtInSwitcherPlugin);

    expect(sut.builtInSystemOptions).toMatchObject(builtInOptions);
    expect(sut.showAllFileTypes).toBe(builtInOptions.showAllFileTypes);
    expect(sut.showAttachments).toBe(builtInOptions.showAttachments);
    expect(sut.showExistingOnly).toBe(builtInOptions.showExistingOnly);
    expect(getPluginByIdSpy).toHaveBeenCalled();

    getPluginByIdSpy.mockRestore();
  });
});
