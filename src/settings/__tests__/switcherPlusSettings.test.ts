import { SettingsData } from 'src/types';
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
    const defaults: SettingsData = {
      alwaysNewPaneForSymbols: false,
      useActivePaneForSymbolsOnMobile: false,
      symbolsInLineOrder: true,
      editorListCommand: 'edt ',
      symbolListCommand: '@',
      workspaceListCommand: '+',
      excludeViewTypes: ['empty'],
      referenceViews: ['backlink', 'localgraph', 'outgoing-link', 'outline'],
      includeSidePanelViewTypes: ['backlink', 'image', 'markdown', 'pdf'],
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

    expect(sut.excludeViewTypes).toHaveLength(defaults.excludeViewTypes.length);
    expect(sut.excludeViewTypes).toEqual(
      expect.arrayContaining(defaults.excludeViewTypes),
    );

    expect(sut.referenceViews).toHaveLength(defaults.referenceViews.length);
    expect(sut.referenceViews).toEqual(expect.arrayContaining(defaults.referenceViews));

    expect(sut.includeSidePanelViewTypes).toHaveLength(
      defaults.includeSidePanelViewTypes.length,
    );
    expect(sut.includeSidePanelViewTypes).toEqual(
      expect.arrayContaining(defaults.includeSidePanelViewTypes),
    );
    expect(sut.includeSidePanelViewTypesPlaceholder).toBe(
      defaults.includeSidePanelViewTypes.join('\n'),
    );
  });

  it('should save settings modified settings', async () => {
    const settings: SettingsData = {
      alwaysNewPaneForSymbols: chance.bool(),
      useActivePaneForSymbolsOnMobile: chance.bool(),
      symbolsInLineOrder: chance.bool(),
      editorListCommand: chance.word(),
      symbolListCommand: chance.word(),
      workspaceListCommand: chance.word(),
      excludeViewTypes: ['empty'], // no setter
      referenceViews: ['backlink', 'localgraph', 'outgoing-link', 'outline'], // No setter
      includeSidePanelViewTypes: [chance.word()],
    };

    sut.alwaysNewPaneForSymbols = settings.alwaysNewPaneForSymbols;
    sut.useActivePaneForSymbolsOnMobile = settings.useActivePaneForSymbolsOnMobile;
    sut.symbolsInlineOrder = settings.symbolsInLineOrder;
    sut.editorListCommand = settings.editorListCommand;
    sut.symbolListCommand = settings.symbolListCommand;
    sut.workspaceListCommand = settings.workspaceListCommand;
    sut.includeSidePanelViewTypes = settings.includeSidePanelViewTypes;

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
    const settings: SettingsData = {
      alwaysNewPaneForSymbols: chance.bool(),
      useActivePaneForSymbolsOnMobile: chance.bool(),
      symbolsInLineOrder: chance.bool(),
      editorListCommand: chance.word(),
      symbolListCommand: chance.word(),
      workspaceListCommand: chance.word(),
      excludeViewTypes: [],
      referenceViews: [chance.word(), chance.word(), chance.word()],
      includeSidePanelViewTypes: [chance.word()],
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

    expect(sut.excludeViewTypes).toHaveLength(settings.excludeViewTypes.length);
    expect(sut.excludeViewTypes).toEqual(
      expect.arrayContaining(settings.excludeViewTypes),
    );

    expect(sut.referenceViews).toHaveLength(settings.referenceViews.length);
    expect(sut.referenceViews).toEqual(expect.arrayContaining(settings.referenceViews));

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
