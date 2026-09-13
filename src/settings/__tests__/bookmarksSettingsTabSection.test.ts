import {
  BookmarksSettingsTabSection,
  SwitcherPlusSettings,
  SwitcherPlusSettingTab,
} from 'src/settings';
import { mock, MockProxy } from 'jest-mock-extended';
import { App, SettingDefinitionControl, SettingDefinitionPage } from 'obsidian';
import { findSettingByKey, flattenSettingDefinitions } from '@fixtures';

describe('bookmarksSettingsTabSection', () => {
  let mockApp: MockProxy<App>;
  let mockPluginSettingTab: MockProxy<SwitcherPlusSettingTab>;
  let config: SwitcherPlusSettings;
  let mockContainerEl: MockProxy<HTMLElement>;
  let sut: BookmarksSettingsTabSection;

  beforeAll(() => {
    mockApp = mock<App>();
    mockContainerEl = mock<HTMLElement>();
    mockPluginSettingTab = mock<SwitcherPlusSettingTab>({ containerEl: mockContainerEl });
    config = new SwitcherPlusSettings(null);

    sut = new BookmarksSettingsTabSection(mockApp, mockPluginSettingTab, config);
  });

  describe('getSettingDefinitions', () => {
    it('should return a single page for the section', () => {
      const [page] = sut.getSettingDefinitions();

      expect(page).toEqual(
        expect.objectContaining({ type: 'page', name: 'Bookmarks Mode' }),
      );
    });

    it('should show the mode trigger as the page display value', () => {
      const [page] = sut.getSettingDefinitions() as SettingDefinitionPage[];

      expect((page.displayValue as () => string)()).toBe(config.bookmarksListCommand);
    });

    it('should define the mode trigger setting', () => {
      const definitions = sut.getSettingDefinitions();

      expect(findSettingByKey(definitions, 'bookmarksListCommand')).toEqual({
        name: 'Bookmarks list mode trigger',
        desc: expect.any(String),
        control: {
          type: 'text',
          key: 'bookmarksListCommand',
          placeholder: config.bookmarksListPlaceholderText,
          validate: expect.any(Function),
        },
      });
    });

    it('should define exactly the expected settings', () => {
      const keys = flattenSettingDefinitions(sut.getSettingDefinitions()).map(
        (item) => (item as SettingDefinitionControl).control?.key,
      );

      expect(keys).toEqual(['bookmarksListCommand']);
    });
  });
});
