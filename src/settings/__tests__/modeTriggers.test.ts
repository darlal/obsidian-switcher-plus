import { mock } from 'jest-mock-extended';
import { App, Setting, SettingDefinitionAction, SettingDefinitionPage } from 'obsidian';
import { SwitcherPlusSettings, SwitcherPlusSettingTab } from 'src/settings';
import { CommandListSettingsTabSection } from '../commandListSettingsTabSection';
import { getCommandDefinitions, HandlerRegistry, InputParser } from 'src/switcherPlus';
import { Mode, TriggerSettingKey } from 'src/types';
import { findListByHeading, findSettingByKey } from 'src/__fixtures__';
import {
  displayTrigger,
  getModeTriggers,
  isValidTrigger,
  migrateModeTriggers,
  TRIGGER_LABELS,
  validateModeTrigger,
} from '../modeTriggers';
import * as ListEntryModal from '../listEntryModal';
import type { ListEntryModalOptions } from '../listEntryModal';

describe('mode triggers', () => {
  let config: SwitcherPlusSettings;
  beforeEach(() => {
    config = new SwitcherPlusSettings(null);
  });

  it('keeps literal multi-character triggers and significant spaces', () => {
    config.triggerAliases = { editorListCommand: ['ed ', '编辑 ', 'ed ', '', '\n'] };
    expect(getModeTriggers(config, 'editorListCommand')).toEqual([
      'edt ',
      'ed ',
      '编辑 ',
    ]);
    expect(displayTrigger(' edt ')).toBe('␠edt␠');
    expect(isValidTrigger(null)).toBe(false);
    expect(isValidTrigger('   ')).toBe(false);
    expect(isValidTrigger('>\t')).toBe(false);
  });

  it('accepts unchanged primary and alias values but rejects conflicts', () => {
    config.triggerAliases = { commandListCommand: ['》', 'cmd '] };
    expect(
      validateModeTrigger(config, 'commandListCommand', '>', 'primary'),
    ).toBeUndefined();
    expect(validateModeTrigger(config, 'commandListCommand', '》', 0)).toBeUndefined();
    expect(validateModeTrigger(config, 'commandListCommand', ' ', -1)).toContain('Enter');
    expect(validateModeTrigger(config, 'commandListCommand', '>\n》', -1)).toContain(
      'line breaks',
    );
    expect(validateModeTrigger(config, 'commandListCommand', '>', -1)).toContain(
      'already',
    );
    expect(validateModeTrigger(config, 'commandListCommand', '》', 'primary')).toContain(
      'already',
    );
    expect(validateModeTrigger(config, 'commandListCommand', '#', -1)).toContain(
      'Headings Mode',
    );
    expect(validateModeTrigger(config, 'commandListCommand', 'new ', -1)).toBeUndefined();
  });

  it('migrates the multiline preview once and preserves primary launch triggers', () => {
    const data = SwitcherPlusSettings.defaults;
    data.commandListCommand = '>\r\n》\n\n》';
    data.editorListCommand = 'edt \n编辑 ';
    data.triggerAliases = { commandListCommand: ['>', 'cmd ', '》'] };
    migrateModeTriggers(data);
    expect(data.commandListCommand).toBe('>');
    expect(data.editorListCommand).toBe('edt ');
    expect(data.triggerAliases).toEqual({
      commandListCommand: ['》', 'cmd '],
      editorListCommand: ['编辑 '],
    });
    const snapshot = JSON.stringify(data);
    migrateModeTriggers(data);
    expect(JSON.stringify(data)).toBe(snapshot);
  });

  it('tolerates older data and malformed aliases without interpreting separators', () => {
    const data = SwitcherPlusSettings.defaults;
    data.commandListCommand = '>》';
    data.triggerAliases = undefined;
    migrateModeTriggers(data);
    expect(data.commandListCommand).toBe('>》');
    expect(data.triggerAliases).toEqual({});
    data.commandListCommand = '\n';
    data.editorListCommand = undefined;
    data.triggerAliases = { commandListCommand: '>,' as unknown as string[] };
    migrateModeTriggers(data);
    expect(data.commandListCommand).toBe('');
    expect(data.triggerAliases).toEqual({});
  });

  it.each(Object.keys(TRIGGER_LABELS) as TriggerSettingKey[])(
    'parses a primary and an alias for %s',
    (key) => {
      config.triggerAliases = { [key]: ['别名 '] };
      const definitions = getCommandDefinitions(config);
      const target = definitions.find((def) =>
        def.parserCommand.getCommandStrs?.().includes('别名 '),
      );
      const parser = new InputParser(mock<HandlerRegistry>(), config, definitions);
      for (const trigger of [config[key], '别名 ']) {
        const result = parser.parse(trigger + 'query');
        expect(result.resolvedCommands[0].cmdDef).toBe(target);
        expect(result.resolvedCommands[0].filterText).toBe('query');
      }
      expect(target.parserCommand.getCommandStr()).toBe(config[key]);
    },
  );

  it('retains longest-match and escape behavior for aliases', () => {
    config.triggerAliases = { commandListCommand: ['>>', '》'] };
    const parser = new InputParser(
      mock<HandlerRegistry>(),
      config,
      getCommandDefinitions(config),
    );
    expect(parser.parse('>>daily').resolvedCommands[0].cmdStr).toBe('>>');
    expect(parser.parse('!》daily').resolvedCommands).toEqual([]);
    expect(parser.parse('!》daily').cleanInput).toBe('》daily');
  });

  it('refreshes handler lookup after adding and removing aliases', () => {
    HandlerRegistry.reset();
    HandlerRegistry.initialize(mock<App>(), config, getCommandDefinitions(config));
    const registry = HandlerRegistry.getInstance();
    expect(registry.getHandler('》')).toBeNull();
    config.triggerAliases = { commandListCommand: ['》'] };
    registry.refreshCommandStrings(getCommandDefinitions(config));
    expect(registry.getHandler('》')).toBe(registry.getHandler(Mode.CommandList));
    config.triggerAliases = {};
    registry.refreshCommandStrings(getCommandDefinitions(config));
    expect(registry.getHandler('》')).toBeNull();
    HandlerRegistry.reset();
  });

  describe('declarative alias editor', () => {
    let section: CommandListSettingsTabSection;
    let tab: ReturnType<typeof mock<SwitcherPlusSettingTab>>;
    let openModal: jest.SpyInstance<Setting, [App, ListEntryModalOptions]>;
    const getList = () =>
      findListByHeading(section.getSettingDefinitions(), 'Additional triggers');
    const getPage = () =>
      section.getSettingDefinitions()[0].items[1] as SettingDefinitionPage;
    const getModePage = () => section.getSettingDefinitions()[0] as SettingDefinitionPage;
    beforeEach(() => {
      tab = mock<SwitcherPlusSettingTab>();
      section = new CommandListSettingsTabSection(mock<App>(), tab, config);
      openModal = jest
        .spyOn(ListEntryModal, 'openListEntryModal')
        .mockReturnValue(mock<Setting>());
      jest.spyOn(config, 'save').mockImplementation(() => {});
    });
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('leaves a native validated primary field and an optional empty alias page', () => {
      const setting = findSettingByKey(
        section.getSettingDefinitions(),
        'commandListCommand',
      );
      expect(setting.control.type).toBe('text');
      if (setting.control.type !== 'text') throw new Error('Expected text control');
      expect(setting.control.validate('>')).toBeUndefined();
      expect((getModePage().displayValue as () => string)()).toBe('>');
      expect((getPage().displayValue as () => string)()).toBe('>');
      expect(getList().items).toEqual([]);
    });

    it('adds, edits and deletes individual aliases while preserving other modes', () => {
      config.triggerAliases = { editorListCommand: ['编辑 '] };
      getList().addItem.action(null);
      const add = openModal.mock.calls[0][1];
      expect(add.initialValue).toBeUndefined();
      expect(add.validate('>')).toContain('already');
      expect(add.preview('')).toContain('empty');
      expect(add.preview('cmd ')).toContain('cmd␠');
      add.onSubmit('》');
      expect(config.triggerAliases.commandListCommand).toEqual(['》']);
      expect(tab.update).toHaveBeenCalled();
      expect((getModePage().displayValue as () => string)()).toBe('>, 》');
      expect((getPage().displayValue as () => string)()).toBe('>, 》');
      (getList().items[0] as SettingDefinitionAction).action(null, 0);
      const edit = openModal.mock.calls[1][1];
      expect(edit.initialValue).toBe('》');
      expect(edit.validate('》')).toBeUndefined();
      edit.onSubmit('cmd ');
      expect(config.triggerAliases.commandListCommand).toEqual(['cmd ']);
      getList().addItem.action(null);
      openModal.mock.calls[2][1].onSubmit('》');
      getList().onDelete(0);
      expect(config.triggerAliases.commandListCommand).toEqual(['》']);
      getList().onDelete(0);
      expect(config.triggerAliases).toEqual({ editorListCommand: ['编辑 '] });
      expect(config.commandListCommand).toBe('>');
    });
  });
});
