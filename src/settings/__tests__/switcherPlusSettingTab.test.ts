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
  SettingDefinitionGroup,
  SettingDefinitionItem,
  SettingDefinitionEmpty,
  SettingDefinitionPage,
  ViewRegistry,
} from 'obsidian';
import * as Utils from 'src/utils/utils';
import { findSettingByKey, flattenSettingDefinitions, isSettingVisible } from '@fixtures';
import { HandlerRegistry } from 'src/switcherPlus/handlerRegistry';

const originalCreateFragment = window.createFragment;

function descriptionText(desc: string | DocumentFragment): string {
  return typeof desc === 'string' ? desc : desc.textContent;
}

function warningAfter(
  items: SettingDefinitionItem<SettingsControlKey>[],
  key: SettingsControlKey,
): SettingDefinitionEmpty {
  const leaves = flattenSettingDefinitions(items);
  const field = findSettingByKey(items, key);
  return leaves[leaves.indexOf(field) + 1] as SettingDefinitionEmpty;
}

describe('SwitcherPlusSettingTab', () => {
  let mockApp: MockProxy<App>;

  beforeAll(() => {
    mockApp = mock<App>({ viewRegistry: mock<ViewRegistry>() });
  });

  afterAll(() => {
    window.createFragment = originalCreateFragment;
  });

  describe('declarative settings', () => {
    let realConfig: SwitcherPlusSettings;
    let declarativeSut: SwitcherPlusSettingTab;

    beforeEach(() => {
      window.createFragment = jest.fn((callback) => {
        const fragment = mock<DocumentFragment>({ textContent: '' });
        fragment.createSpan.mockImplementation((options: { text: string }) => {
          fragment.textContent = options.text;
          return mock<HTMLSpanElement>();
        });
        callback?.(fragment);
        return fragment;
      });
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

    it('adds a hidden warning immediately after every trigger, including Vault and escape', () => {
      const definitions = declarativeSut.getSettingDefinitions();
      for (const key of [
        'escapeCmdChar',
        'editorListCommand',
        'symbolListCommand',
        'symbolListActiveEditorCommand',
        'relatedItemsListCommand',
        'relatedItemsListActiveEditorCommand',
        'commandListCommand',
        'headingsListCommand',
        'bookmarksListCommand',
        'workspaceListCommand',
        'vaultListCommand',
      ] as const) {
        const warning = warningAfter(definitions, key);
        expect(warning.name).toBe('⚠ Warning');
        expect(isSettingVisible(warning)).toBe(false);
      }
    });

    it('warns on duplicate trigger fields without replacing native text controls', () => {
      realConfig.symbolListCommand = '>';
      const definitions = declarativeSut.getSettingDefinitions();
      for (const key of ['symbolListCommand', 'commandListCommand'] as const) {
        const field = findSettingByKey(definitions, key);
        expect(field.control.type).toBe('text');
        expect(field.control).not.toHaveProperty('validate');
        expect(field).not.toHaveProperty('render');
        const warning = warningAfter(definitions, key);
        expect(warning.name).toBe('⚠ Warning');
        expect(warning.searchable).toBe(false);
        expect(warning).not.toHaveProperty('control');
        expect(warning).not.toHaveProperty('render');
        expect(isSettingVisible(warning)).toBe(true);
        expect(typeof field.desc).toBe('string');
        expect(descriptionText(warningAfter(definitions, key).desc)).toContain(
          'Symbol mode',
        );
        expect(descriptionText(warningAfter(definitions, key).desc)).toContain(
          'Command mode',
        );
      }
      expect(descriptionText(warningAfter(definitions, 'headingsListCommand').desc)).toBe(
        '',
      );
    });

    it('flags both mode pages for a secondary trigger conflict and clears the indicators', async () => {
      const definitions = declarativeSut.getSettingDefinitions();
      const modeGroup = definitions.find(
        (item): item is SettingDefinitionGroup<SettingsControlKey> =>
          'heading' in item && item.heading === 'Custom mode behaviors',
      );
      const pages = modeGroup.items as SettingDefinitionPage<SettingsControlKey>[];
      const symbolPage = pages.find((page) => page.name === 'Symbol Mode');
      const commandPage = pages.find((page) => page.name === 'Command Mode');
      const editorPage = pages.find((page) => page.name === 'Editor Mode');
      const vaultPage = pages.find((page) => page.name === 'Vault Mode');
      const status = (page: SettingDefinitionPage<SettingsControlKey>) =>
        (page.status as () => 'warning' | null)();
      const saveSpy = jest.spyOn(realConfig, 'saveSettings').mockResolvedValue();

      expect(status(symbolPage)).toBeNull();
      expect(status(commandPage)).toBeNull();
      expect(status(vaultPage)).toBe('warning');
      await declarativeSut.setControlValue('symbolListActiveEditorCommand', '>');
      expect(realConfig.symbolListCommand).toBe('@');
      expect(status(symbolPage)).toBe('warning');
      expect(status(commandPage)).toBe('warning');
      expect(status(editorPage)).toBeNull();
      await declarativeSut.setControlValue('symbolListActiveEditorCommand', '@@');
      expect(status(symbolPage)).toBeNull();
      expect(status(commandPage)).toBeNull();
      expect(status(vaultPage)).toBe('warning');
      expect(vaultPage.desc).toBe('Experimental.');
      saveSpy.mockRestore();
    });

    it('flags escape conflicts on mode pages without warning on distinguishable spellings', () => {
      realConfig.symbolListCommand = '》';
      const definitions = declarativeSut.getSettingDefinitions();
      const modeGroup = definitions.find(
        (item): item is SettingDefinitionGroup<SettingsControlKey> =>
          'heading' in item && item.heading === 'Custom mode behaviors',
      );
      const pages = modeGroup.items as SettingDefinitionPage<SettingsControlKey>[];
      const symbolPage = pages.find((page) => page.name === 'Symbol Mode');
      const commandPage = pages.find((page) => page.name === 'Command Mode');
      const status = (page: SettingDefinitionPage<SettingsControlKey>) =>
        (page.status as () => 'warning' | null)();

      expect(status(symbolPage)).toBeNull();
      expect(status(commandPage)).toBeNull();
      realConfig.escapeCmdChar = '＞';
      expect(status(symbolPage)).toBe('warning');
      expect(status(commandPage)).toBe('warning');
    });

    it('allows saving conflicts and clears warnings when the triggers are changed', async () => {
      declarativeSut.update();
      const saveSpy = jest.spyOn(realConfig, 'saveSettings').mockResolvedValue();
      const updateSpy = jest.spyOn(declarativeSut, 'update');
      await declarativeSut.setControlValue('symbolListCommand', '>');
      expect(realConfig.symbolListCommand).toBe('>');
      expect(
        descriptionText(
          warningAfter(
            declarativeSut.settingItems as SettingDefinitionItem<SettingsControlKey>[],
            'symbolListCommand',
          ).desc,
        ),
      ).toContain('same trigger');
      await declarativeSut.setControlValue('symbolListCommand', '》');
      expect(
        descriptionText(
          warningAfter(
            declarativeSut.settingItems as SettingDefinitionItem<SettingsControlKey>[],
            'symbolListCommand',
          ).desc,
        ),
      ).toBe('');
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
        expect(descriptionText(warningAfter(definitions, key).desc)).toContain(
          'escape character',
        );
      }
      expect(initializeSpy).not.toHaveBeenCalled();
      initializeSpy.mockRestore();
    });

    it('combines duplicate and folded fallback warnings on the affected fields', () => {
      realConfig.commandListCommand = '》';
      realConfig.symbolListCommand = '》';
      realConfig.headingsListCommand = '＞';
      const definitions = declarativeSut.getSettingDefinitions();
      const desc = descriptionText(warningAfter(definitions, 'symbolListCommand').desc);
      expect(desc).toContain('same trigger');
      expect(desc).toContain('Exact spellings work separately');
      expect(desc.split('\n\n')).toHaveLength(2);
    });

    it('refreshes rendered mode statuses when the root escape control changes', async () => {
      const renderedStatuses = new Map<string, string>();
      const render = (items: SettingDefinitionItem<SettingsControlKey>[]) => {
        for (const item of items) {
          if ('items' in item && item.items) {
            render(item.items);
            if (item.type === 'page' && typeof item.status === 'function') {
              renderedStatuses.set(item.name, item.status());
            }
          }
        }
      };
      // Native status callbacks are evaluated on render, not on config writes.
      const update = declarativeSut.update.bind(declarativeSut);
      const updateSpy = jest.spyOn(declarativeSut, 'update').mockImplementation(() => {
        update();
        render(
          declarativeSut.settingItems as SettingDefinitionItem<SettingsControlKey>[],
        );
      });
      const saveSpy = jest.spyOn(realConfig, 'saveSettings').mockResolvedValue();
      declarativeSut.update();
      expect(renderedStatuses.get('Command Mode')).toBeNull();

      await declarativeSut.setControlValue('escapeCmdChar', '>');
      expect(renderedStatuses.get('Command Mode')).toBe('warning');
      await declarativeSut.setControlValue('escapeCmdChar', '!');
      expect(renderedStatuses.get('Command Mode')).toBeNull();
      expect(renderedStatuses.get('Vault Mode')).toBe('warning');
      saveSpy.mockRestore();
      updateSpy.mockRestore();
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
