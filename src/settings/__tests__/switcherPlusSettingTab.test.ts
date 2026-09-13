import {
  SwitcherPlusSettingTab,
  SwitcherPlusSettings,
  GeneralSettingsTabSection,
  BookmarksSettingsTabSection,
  WorkspaceSettingsTabSection,
  SettingsControlKey,
} from 'src/settings';
import { mock, MockProxy } from 'jest-mock-extended';
import { App, SettingDefinitionPage, ViewRegistry } from 'obsidian';
import * as Utils from 'src/utils/utils';

describe('SwitcherPlusSettingTab', () => {
  let mockApp: MockProxy<App>;

  beforeAll(() => {
    mockApp = mock<App>({ viewRegistry: mock<ViewRegistry>() });
  });

  describe('declarative settings', () => {
    let realConfig: SwitcherPlusSettings;
    let declarativeSut: SwitcherPlusSettingTab;

    beforeEach(() => {
      realConfig = new SwitcherPlusSettings(null);
      declarativeSut = new SwitcherPlusSettingTab(mockApp, null, realConfig);
    });

    it('should read a control value from the config', () => {
      realConfig.symbolListCommand = '@@';

      expect(declarativeSut.getControlValue('symbolListCommand')).toBe('@@');
    });

    it('should write a control value to the config', async () => {
      const saveSettingsSpy = jest.spyOn(realConfig, 'saveSettings').mockResolvedValue();

      await declarativeSut.setControlValue('symbolListCommand', '$$');

      expect(realConfig.symbolListCommand).toBe('$$');
      expect(saveSettingsSpy).toHaveBeenCalled();

      saveSettingsSpy.mockRestore();
    });

    it('should log an error when saving a control value fails', async () => {
      const expectedError = new Error('save failed');
      const saveSettingsSpy = jest
        .spyOn(realConfig, 'saveSettings')
        .mockRejectedValue(expectedError);
      const logErrorSpy = jest.spyOn(Utils, 'logError').mockReturnValue();

      await declarativeSut.setControlValue('symbolListCommand', '$$');

      expect(logErrorSpy).toHaveBeenCalledWith(expect.any(String), expectedError);

      saveSettingsSpy.mockRestore();
      logErrorSpy.mockRestore();
    });

    it('should still emit the mode heading when there are no mode sections', () => {
      const generalDefinition = { name: 'General setting' };
      const generalSpy = jest
        .spyOn(GeneralSettingsTabSection.prototype, 'getSettingDefinitions')
        .mockReturnValue([generalDefinition]);

      declarativeSut.modeTabSections = [];

      expect(declarativeSut.getSettingDefinitions()).toEqual([
        generalDefinition,
        { type: 'group', heading: 'Custom mode behaviors', items: [] },
      ]);

      generalSpy.mockRestore();
    });

    it('should keep the general settings flat and group the mode pages under a heading', () => {
      const generalDefinition = { name: 'General setting' };
      const bookmarksPage: SettingDefinitionPage<SettingsControlKey> = {
        type: 'page',
        name: 'Bookmarks Mode',
      };
      const workspacePage: SettingDefinitionPage<SettingsControlKey> = {
        type: 'page',
        name: 'Workspace Mode',
      };
      const generalSpy = jest
        .spyOn(GeneralSettingsTabSection.prototype, 'getSettingDefinitions')
        .mockReturnValue([generalDefinition]);
      const bookmarksSpy = jest
        .spyOn(BookmarksSettingsTabSection.prototype, 'getSettingDefinitions')
        .mockReturnValue([bookmarksPage]);
      const workspaceSpy = jest
        .spyOn(WorkspaceSettingsTabSection.prototype, 'getSettingDefinitions')
        .mockReturnValue([workspacePage]);

      declarativeSut.modeTabSections = [
        BookmarksSettingsTabSection,
        WorkspaceSettingsTabSection,
      ];

      expect(declarativeSut.getSettingDefinitions()).toEqual([
        generalDefinition,
        {
          type: 'group',
          heading: 'Custom mode behaviors',
          items: [bookmarksPage, workspacePage],
        },
      ]);

      generalSpy.mockRestore();
      bookmarksSpy.mockRestore();
      workspaceSpy.mockRestore();
    });
  });
});
