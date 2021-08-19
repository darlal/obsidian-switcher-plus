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
    const enabledSymbolTypes = {} as Record<SymbolType, boolean>;
    enabledSymbolTypes[SymbolType.Link] = true;
    enabledSymbolTypes[SymbolType.Embed] = true;
    enabledSymbolTypes[SymbolType.Tag] = true;
    enabledSymbolTypes[SymbolType.Heading] = true;

    const defaults: SettingsData = {
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
    };

    expect(sut.alwaysNewPaneForSymbols).toBe(defaults.alwaysNewPaneForSymbols);
    expect(sut.useActivePaneForSymbolsOnMobile).toBe(
      defaults.useActivePaneForSymbolsOnMobile,
    );
    expect(sut.symbolsInlineOrder).toBe(defaults.symbolsInLineOrder);
    expect(sut.editorListCommand).toBe(defaults.editorListCommand);
    expect(sut.editorListPlaceholderText).toBe(defaults.editorListCommand);
    expect(sut.symbolListCommand).toBe(defaults.symbolListCommand);
    expect(sut.symbolListPlaceholderText).toBe(defaults.symbolListCommand);
    expect(sut.workspaceListCommand).toBe(defaults.workspaceListCommand);
    expect(sut.workspaceListPlaceholderText).toBe(defaults.workspaceListCommand);
    expect(sut.headingsListCommand).toBe(defaults.headingsListCommand);
    expect(sut.headingsListPlaceholderText).toBe(defaults.headingsListCommand);
    expect(sut.strictHeadingsOnly).toBe(defaults.strictHeadingsOnly);
    expect(sut.searchAllHeadings).toBe(defaults.searchAllHeadings);

    expect(sut.excludeViewTypes).toHaveLength(defaults.excludeViewTypes.length);
    expect(sut.excludeViewTypes).toEqual(
      expect.arrayContaining(defaults.excludeViewTypes),
    );

    expect(sut.referenceViews).toHaveLength(defaults.referenceViews.length);
    expect(sut.referenceViews).toEqual(expect.arrayContaining(defaults.referenceViews));
    expect(sut.limit).toBe(defaults.limit);

    expect(sut.includeSidePanelViewTypes).toHaveLength(
      defaults.includeSidePanelViewTypes.length,
    );
    expect(sut.includeSidePanelViewTypes).toEqual(
      expect.arrayContaining(defaults.includeSidePanelViewTypes),
    );
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

  it('should save settings modified settings', async () => {
    const enabledSymbolTypes = {} as Record<SymbolType, boolean>;
    enabledSymbolTypes[SymbolType.Link] = chance.bool();
    enabledSymbolTypes[SymbolType.Embed] = chance.bool();
    enabledSymbolTypes[SymbolType.Tag] = chance.bool();
    enabledSymbolTypes[SymbolType.Heading] = chance.bool();

    const settings: SettingsData = {
      alwaysNewPaneForSymbols: chance.bool(),
      useActivePaneForSymbolsOnMobile: chance.bool(),
      symbolsInLineOrder: chance.bool(),
      editorListCommand: chance.word(),
      symbolListCommand: chance.word(),
      workspaceListCommand: chance.word(),
      headingsListCommand: chance.word(),
      strictHeadingsOnly: chance.bool(),
      searchAllHeadings: chance.bool(),
      excludeViewTypes: ['empty'], // no setter
      referenceViews: ['backlink', 'localgraph', 'outgoing-link', 'outline'], // No setter
      limit: chance.integer(),
      includeSidePanelViewTypes: [chance.word()],
      enabledSymbolTypes,
    };

    sut.alwaysNewPaneForSymbols = settings.alwaysNewPaneForSymbols;
    sut.useActivePaneForSymbolsOnMobile = settings.useActivePaneForSymbolsOnMobile;
    sut.symbolsInlineOrder = settings.symbolsInLineOrder;
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

    let savedSettings: SettingsData;
    const saveDataSpy = jest
      .spyOn(plugin, 'saveData')
      .mockImplementationOnce((data: SettingsData) => {
        savedSettings = data;
        return Promise.resolve();
      });

    await sut.saveSettings();

    expect(savedSettings).toMatchObject(settings);
    expect(saveDataSpy).toHaveBeenCalled();

    saveDataSpy.mockRestore();
  });

  it('should load saved settings', async () => {
    const enabledSymbolTypes = {} as Record<SymbolType, boolean>;
    enabledSymbolTypes[SymbolType.Link] = chance.bool();
    enabledSymbolTypes[SymbolType.Embed] = chance.bool();
    enabledSymbolTypes[SymbolType.Tag] = chance.bool();
    enabledSymbolTypes[SymbolType.Heading] = chance.bool();

    const settings: SettingsData = {
      alwaysNewPaneForSymbols: chance.bool(),
      useActivePaneForSymbolsOnMobile: chance.bool(),
      symbolsInLineOrder: chance.bool(),
      editorListCommand: chance.word(),
      symbolListCommand: chance.word(),
      workspaceListCommand: chance.word(),
      headingsListCommand: chance.word(),
      strictHeadingsOnly: chance.bool(),
      searchAllHeadings: chance.bool(),
      excludeViewTypes: [],
      referenceViews: [chance.word(), chance.word(), chance.word()],
      limit: chance.integer(),
      includeSidePanelViewTypes: [chance.word()],
      enabledSymbolTypes,
    };
    const loadDataSpy = jest.spyOn(plugin, 'loadData').mockResolvedValueOnce(settings);

    await sut.loadSettings();

    expect(loadDataSpy).toHaveBeenCalled();
    expect(sut.alwaysNewPaneForSymbols).toBe(settings.alwaysNewPaneForSymbols);
    expect(sut.useActivePaneForSymbolsOnMobile).toBe(
      settings.useActivePaneForSymbolsOnMobile,
    );
    expect(sut.symbolsInlineOrder).toBe(settings.symbolsInLineOrder);
    expect(sut.editorListCommand).toBe(settings.editorListCommand);
    expect(sut.symbolListCommand).toBe(settings.symbolListCommand);
    expect(sut.workspaceListCommand).toBe(settings.workspaceListCommand);
    expect(sut.headingsListCommand).toBe(settings.headingsListCommand);
    expect(sut.strictHeadingsOnly).toBe(settings.strictHeadingsOnly);
    expect(sut.searchAllHeadings).toBe(settings.searchAllHeadings);

    expect(sut.excludeViewTypes).toHaveLength(settings.excludeViewTypes.length);
    expect(sut.excludeViewTypes).toEqual(
      expect.arrayContaining(settings.excludeViewTypes),
    );

    expect(sut.referenceViews).toHaveLength(settings.referenceViews.length);
    expect(sut.referenceViews).toEqual(expect.arrayContaining(settings.referenceViews));
    expect(sut.limit).toBe(settings.limit);
    expect(sut.isSymbolTypeEnabled(SymbolType.Heading)).toBe(
      settings.enabledSymbolTypes[SymbolType.Heading],
    );
    expect(sut.isSymbolTypeEnabled(SymbolType.Link)).toBe(
      settings.enabledSymbolTypes[SymbolType.Link],
    );
    expect(sut.isSymbolTypeEnabled(SymbolType.Tag)).toBe(
      settings.enabledSymbolTypes[SymbolType.Tag],
    );
    expect(sut.isSymbolTypeEnabled(SymbolType.Embed)).toBe(
      settings.enabledSymbolTypes[SymbolType.Embed],
    );

    expect(sut.includeSidePanelViewTypes).toHaveLength(
      settings.includeSidePanelViewTypes.length,
    );
    expect(sut.includeSidePanelViewTypes).toEqual(
      expect.arrayContaining(settings.includeSidePanelViewTypes),
    );

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
