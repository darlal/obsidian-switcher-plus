import {
  SwitcherPlusSettingTab,
  SwitcherPlusSettings,
  GeneralSettingsTabSection,
  BookmarksSettingsTabSection,
  WorkspaceSettingsTabSection,
  SettingsControlKey,
} from 'src/settings';
import { mock, MockProxy } from 'jest-mock-extended';
import {
  App,
  SettingDefinitionItem,
  SettingDefinitionPage,
  ViewRegistry,
} from 'obsidian';
import * as Utils from 'src/utils/utils';
import { findSettingByKey } from '@fixtures';
import { HandlerRegistry } from 'src/switcherPlus/handlerRegistry';

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

    it('warns on duplicate trigger fields without replacing native text controls', () => {
      realConfig.symbolListCommand = '>';
      const definitions = declarativeSut.getSettingDefinitions();
      for (const key of ['symbolListCommand', 'commandListCommand'] as const) {
        const field = findSettingByKey(definitions, key);
        expect(field.control.type).toBe('text');
        expect(field.control).not.toHaveProperty('validate');
        expect(field).not.toHaveProperty('render');
        expect(field.desc).toContain('Warning:');
        expect(field.desc).toContain('Symbol mode');
        expect(field.desc).toContain('Command mode');
      }
      expect(findSettingByKey(definitions, 'headingsListCommand').desc).not.toContain(
        'Warning:',
      );
    });

    it('allows saving conflicts and clears warnings when the triggers are changed', async () => {
      const saveSpy = jest.spyOn(realConfig, 'saveSettings').mockResolvedValue();
      const updateSpy = jest.spyOn(declarativeSut, 'update');
      await declarativeSut.setControlValue('symbolListCommand', '>');
      expect(realConfig.symbolListCommand).toBe('>');
      expect(
        findSettingByKey(
          declarativeSut.settingItems as SettingDefinitionItem<SettingsControlKey>[],
          'symbolListCommand',
        ).desc,
      ).toContain('Warning:');
      await declarativeSut.setControlValue('symbolListCommand', '》');
      expect(
        findSettingByKey(
          declarativeSut.settingItems as SettingDefinitionItem<SettingsControlKey>[],
          'symbolListCommand',
        ).desc,
      ).not.toContain('Warning:');
      expect(saveSpy).toHaveBeenCalledTimes(2);
      expect(updateSpy).toHaveBeenCalledTimes(2);
      saveSpy.mockRestore();
      updateSpy.mockRestore();
    });

    it('warns on the escape field and affected triggers without constructing handlers', () => {
      realConfig.escapeCmdChar = '＞';
      realConfig.symbolListCommand = '》';
      const initializeSpy = jest.spyOn(HandlerRegistry, 'initialize');
      const definitions = declarativeSut.getSettingDefinitions();
      for (const key of [
        'escapeCmdChar',
        'symbolListCommand',
        'commandListCommand',
      ] as const) {
        expect(findSettingByKey(definitions, key).desc).toContain('escape character');
      }
      expect(initializeSpy).not.toHaveBeenCalled();
      initializeSpy.mockRestore();
    });

    it('combines duplicate and folded fallback warnings on the affected fields', () => {
      realConfig.commandListCommand = '》';
      realConfig.symbolListCommand = '》';
      realConfig.headingsListCommand = '＞';
      const definitions = declarativeSut.getSettingDefinitions();
      const desc = findSettingByKey(definitions, 'symbolListCommand').desc as string;
      expect(desc).toContain('same trigger');
      expect(desc).toContain('Exact spellings work separately');
      expect(desc.match(/Warning:/g)).toHaveLength(2);
    });

    it('keeps descriptions when a trigger definition uses a fragment or no description', () => {
      const definitions = [
        {
          name: 'Fragment',
          desc: { textContent: 'Original description' } as DocumentFragment,
          control: { type: 'text' as const, key: 'symbolListCommand' as const },
        },
        {
          name: 'No description',
          control: { type: 'text' as const, key: 'commandListCommand' as const },
        },
      ];
      const generalSpy = jest
        .spyOn(GeneralSettingsTabSection.prototype, 'getSettingDefinitions')
        .mockReturnValue(definitions);
      declarativeSut.modeTabSections = [];
      realConfig.symbolListCommand = '>';
      const result = declarativeSut.getSettingDefinitions();
      expect(findSettingByKey(result, 'symbolListCommand').desc).toContain(
        'Original description',
      );
      expect(findSettingByKey(result, 'commandListCommand').desc).toContain('Warning:');
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
