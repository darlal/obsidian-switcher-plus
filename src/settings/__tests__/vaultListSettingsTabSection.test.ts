import {
  VaultListSettingsTabSection,
  SwitcherPlusSettings,
  SwitcherPlusSettingTab,
} from 'src/settings';
import { mock, MockProxy } from 'jest-mock-extended';
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
    mockPluginSettingTab = mock<SwitcherPlusSettingTab>({ containerEl: mockContainerEl });
    config = new SwitcherPlusSettings(null);

    sut = new VaultListSettingsTabSection(mockApp, mockPluginSettingTab, config);
  });

  describe('getSettingDefinitions', () => {
    it('should return a single page for the section', () => {
      const [page] = sut.getSettingDefinitions();

      expect(page).toEqual(expect.objectContaining({ type: 'page', name: 'Vault Mode' }));
    });

    it('should flag the page as experimental with a warning status', () => {
      const [page] = sut.getSettingDefinitions() as SettingDefinitionPage[];

      expect((page.status as () => string)()).toBe('warning');
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
          validate: expect.any(Function),
        },
      });
    });

    it('should define exactly the expected settings', () => {
      const keys = flattenSettingDefinitions(sut.getSettingDefinitions()).map(
        (item) => (item as SettingDefinitionControl).control?.key,
      );

      expect(keys).toEqual(['vaultListCommand']);
    });
  });
});
