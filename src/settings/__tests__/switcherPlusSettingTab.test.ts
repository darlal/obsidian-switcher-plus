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
  SettingDefinitionPage,
  ViewRegistry,
} from 'obsidian';
import * as Utils from 'src/utils/utils';
import { findSettingByKey } from '@fixtures';
import { HandlerRegistry } from 'src/switcherPlus/handlerRegistry';

const originalCreateFragment = window.createFragment;

function descriptionText(desc: string | DocumentFragment): string {
  return typeof desc === 'string' ? desc : desc.textContent;
}

/** A small DOM test double; text stays live when description children change. */
function descriptionFragment(): DocumentFragment {
  const children: (Node | string)[] = [];
  const fragment = mock<DocumentFragment>();
  fragment.append.mockImplementation((...nodes) => children.push(...nodes));
  fragment.createDiv.mockImplementation(() => {
    const element = mock<HTMLDivElement>({ dataset: {}, textContent: '', hidden: true });
    children.push(element);
    jest.spyOn(fragment, 'querySelector').mockReturnValue(element);
    return element;
  });
  Object.defineProperty(fragment, 'textContent', {
    get: () =>
      children
        .map((node) => (typeof node === 'string' ? node : node.textContent))
        .join(''),
  });
  return fragment;
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
        const fragment = descriptionFragment();
        callback?.(fragment);
        return fragment;
      });
      realConfig = new SwitcherPlusSettings(null);
      declarativeSut = new SwitcherPlusSettingTab(mockApp, null, realConfig);
      const doc = mock<Document>();
      jest
        .spyOn(doc, 'querySelectorAll')
        .mockReturnValue([] as unknown as NodeListOf<Element>);
      Object.defineProperty(declarativeSut.containerEl, 'ownerDocument', { value: doc });
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
        expect(descriptionText(field.desc)).toContain('⚠ Warning:');
        expect(descriptionText(field.desc)).toContain('Symbol mode');
        expect(descriptionText(field.desc)).toContain('Command mode');
      }
      expect(
        descriptionText(findSettingByKey(definitions, 'headingsListCommand').desc),
      ).not.toContain('Warning:');
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

    it('preserves a static page status and finds trigger conflicts in nested groups', () => {
      const page: SettingDefinitionPage<SettingsControlKey> = {
        type: 'page',
        name: 'Nested page',
        status: 'warning',
        items: [
          {
            type: 'group',
            heading: 'Triggers',
            items: [
              {
                name: 'Symbol trigger',
                control: { type: 'text', key: 'symbolListCommand' },
              },
            ],
          },
        ],
      };
      const generalSpy = jest
        .spyOn(GeneralSettingsTabSection.prototype, 'getSettingDefinitions')
        .mockReturnValue([page]);
      declarativeSut.getSettingDefinitions();
      const status = page.status as () => 'warning' | null;
      expect(status()).toBe('warning');
      realConfig.symbolListCommand = '>';
      expect(status()).toBe('warning');
      realConfig.symbolListCommand = '@';
      expect(status()).toBe('warning');
      generalSpy.mockRestore();
    });

    it('allows saving conflicts and clears warnings when the triggers are changed', async () => {
      declarativeSut.update();
      const saveSpy = jest.spyOn(realConfig, 'saveSettings').mockResolvedValue();
      const updateSpy = jest.spyOn(declarativeSut, 'update');
      await declarativeSut.setControlValue('symbolListCommand', '>');
      expect(realConfig.symbolListCommand).toBe('>');
      expect(
        descriptionText(
          findSettingByKey(
            declarativeSut.settingItems as SettingDefinitionItem<SettingsControlKey>[],
            'symbolListCommand',
          ).desc,
        ),
      ).toContain('Warning:');
      await declarativeSut.setControlValue('symbolListCommand', '》');
      expect(
        descriptionText(
          findSettingByKey(
            declarativeSut.settingItems as SettingDefinitionItem<SettingsControlKey>[],
            'symbolListCommand',
          ).desc,
        ),
      ).not.toContain('Warning:');
      expect(saveSpy).toHaveBeenCalledTimes(2);
      expect(updateSpy).not.toHaveBeenCalled();
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
        expect(descriptionText(findSettingByKey(definitions, key).desc)).toContain(
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
      const desc = descriptionText(
        findSettingByKey(definitions, 'symbolListCommand').desc,
      );
      expect(desc).toContain('same trigger');
      expect(desc).toContain('Exact spellings work separately');
      expect(desc.match(/Warning:/g)).toHaveLength(2);
    });

    it('keeps descriptions when a trigger definition uses a fragment or no description', () => {
      const originalDesc = mock<DocumentFragment>({
        textContent: 'Original description',
      });
      originalDesc.cloneNode.mockReturnValue(
        mock<Node>({ textContent: 'Original description' }),
      );
      const definitions = [
        {
          name: 'Fragment',
          desc: originalDesc,
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
      expect(
        descriptionText(findSettingByKey(result, 'symbolListCommand').desc),
      ).toContain('Original description');
      expect(
        descriptionText(findSettingByKey(result, 'commandListCommand').desc),
      ).toContain('Warning:');
      expect(originalDesc.cloneNode).toHaveBeenCalledWith(true);
      generalSpy.mockRestore();
    });

    it('updates an open subpage clone and retained descriptions without rebuilding the input', async () => {
      const firstDefinitions = declarativeSut.getSettingDefinitions();
      const retained = findSettingByKey(firstDefinitions, 'symbolListCommand')
        .desc as DocumentFragment;
      const originalWarning = retained.querySelector<HTMLElement>('.qsp-trigger-warning');
      const liveClone = mock<HTMLElement>({
        dataset: { triggerKey: 'symbolListCommand' },
        hidden: true,
      });
      jest
        .spyOn(declarativeSut.containerEl.ownerDocument, 'querySelectorAll')
        .mockReturnValue([liveClone] as unknown as NodeListOf<Element>);
      // The host can refresh the root definitions while a subpage retains its originals.
      declarativeSut.getSettingDefinitions();
      const saveSpy = jest.spyOn(realConfig, 'saveSettings').mockResolvedValue();
      const updateSpy = jest.spyOn(declarativeSut, 'update');
      await declarativeSut.setControlValue('symbolListCommand', '>');
      expect(liveClone.textContent).toContain('⚠ Warning:');
      expect(liveClone.hidden).toBe(false);
      expect(originalWarning.textContent).toContain('same trigger');
      expect(descriptionText(retained)).toContain('same trigger');
      expect(updateSpy).not.toHaveBeenCalled();
      await declarativeSut.setControlValue('symbolListCommand', '》');
      expect(liveClone.hidden).toBe(true);
      expect(liveClone.textContent).toBe('');
      expect(originalWarning.hidden).toBe(true);
      saveSpy.mockRestore();
      updateSpy.mockRestore();
    });

    it('marks warning regions for accessible announcements and ignores collected descriptions', async () => {
      const definitions = declarativeSut.getSettingDefinitions();
      const warning = (
        findSettingByKey(definitions, 'escapeCmdChar').desc as DocumentFragment
      ).querySelector('.qsp-trigger-warning');
      expect(warning.setAttribute).toHaveBeenCalledWith('role', 'status');
      expect(warning.setAttribute).toHaveBeenCalledWith('aria-live', 'polite');
      const liveClone = mock<HTMLElement>({ dataset: { triggerKey: 'escapeCmdChar' } });
      jest
        .spyOn(declarativeSut.containerEl.ownerDocument, 'querySelectorAll')
        .mockReturnValue([liveClone] as unknown as NodeListOf<Element>);
      const saveSpy = jest.spyOn(realConfig, 'saveSettings').mockResolvedValue();
      const derefSpy = jest
        .spyOn(WeakRef.prototype, 'deref')
        .mockReturnValueOnce(undefined);
      await declarativeSut.setControlValue('escapeCmdChar', '>');
      expect(liveClone.textContent).toContain('escape character');
      derefSpy.mockRestore();
      saveSpy.mockRestore();
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
