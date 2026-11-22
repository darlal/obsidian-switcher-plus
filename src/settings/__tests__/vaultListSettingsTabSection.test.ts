import {
  VaultListSettingsTabSection,
  SwitcherPlusSettings,
  SwitcherPlusSettingTab,
} from 'src/settings';
import { mock, MockProxy } from 'jest-mock-extended';
import type SwitcherPlusPlugin from 'src/main';
import { getCommandDefinitions } from 'src/switcherPlus/commandDefinitions';
import { App, SettingDefinitionControl, SettingDefinitionPage } from 'obsidian';
import { findSettingByKey, flattenSettingDefinitions } from '@fixtures';

describe('vaultListSettingsTabSection', () => {
  let mockApp: MockProxy<App>;
  let mockPluginSettingTab: MockProxy<SwitcherPlusSettingTab>;
  let config: SwitcherPlusSettings;
  let mockContainerEl: MockProxy<HTMLElement>;
  let sut: VaultListSettingsTabSection;

  beforeAll(() => {
    mockApp = mock<App>();
    mockContainerEl = mock<HTMLElement>();
    config = new SwitcherPlusSettings(null);
    mockPluginSettingTab = mock<SwitcherPlusSettingTab>({
      containerEl: mockContainerEl,
      plugin: mock<SwitcherPlusPlugin>({
        commandDefinitions: getCommandDefinitions(config),
      }),
    });

    sut = new VaultListSettingsTabSection(mockApp, mockPluginSettingTab, config);
  });

  describe('getSettingDefinitions', () => {
    it('should return a single page for the section', () => {
      const [page] = sut.getSettingDefinitions();

      expect(page).toEqual(expect.objectContaining({ type: 'page', name: 'Vault Mode' }));
    });

    it('should not flag the page with a status when the trigger has no conflict', () => {
      const [page] = sut.getSettingDefinitions() as SettingDefinitionPage[];

      expect((page.status as () => string)()).toBeNull();
    });

    it('should flag the page with a warning status when the trigger conflicts', () => {
      const conflictConfig = new SwitcherPlusSettings(null);
      const conflictSut = new VaultListSettingsTabSection(
        mockApp,
        mock<SwitcherPlusSettingTab>({
          plugin: mock<SwitcherPlusPlugin>({
            commandDefinitions: getCommandDefinitions(conflictConfig),
          }),
        }),
        conflictConfig,
      );

      const [page] = conflictSut.getSettingDefinitions() as SettingDefinitionPage[];

      conflictConfig.vaultListCommand = conflictConfig.editorListCommand;

      expect((page.status as () => string)()).toBe('warning');
    });

    it('should describe the page as experimental', () => {
      const [page] = sut.getSettingDefinitions() as SettingDefinitionPage[];

      expect(page.desc).toBe('Experimental.');
    });

    it('should include a text only row stating the mode is experimental', () => {
      const definitions = sut.getSettingDefinitions();

      const rows = flattenSettingDefinitions(definitions).filter(
        (item) => item.name === 'Experimental',
      );

      expect(rows).toEqual([{ name: 'Experimental', desc: expect.any(String) }]);
    });

    it('should show the mode trigger as the page display value', () => {
      const [page] = sut.getSettingDefinitions() as SettingDefinitionPage[];

      expect((page.displayValue as () => string)()).toBe(config.vaultListCommand);
    });

    it('should define the mode trigger setting', () => {
      const definitions = sut.getSettingDefinitions();

      expect(findSettingByKey(definitions, 'vaultListCommand')).toEqual({
        name: 'Vault list mode trigger',
        desc: expect.any(String),
        control: {
          type: 'text',
          key: 'vaultListCommand',
          placeholder: config.vaultListPlaceholderText,
        },
      });
    });

    it('should define exactly the expected settings', () => {
      const keys = flattenSettingDefinitions(sut.getSettingDefinitions()).map(
        (item) => (item as SettingDefinitionControl).control?.key,
      );

      expect(keys.filter(Boolean)).toEqual(['vaultListCommand']);
    });
  });
});
