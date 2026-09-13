import {
  CommandListSettingsTabSection,
  SwitcherPlusSettings,
  SwitcherPlusSettingTab,
} from 'src/settings';
import { MAX_STORED_RECENT_COMMANDS } from 'src/Handlers';
import { mock, MockProxy } from 'jest-mock-extended';
import { App } from 'obsidian';
import { findSettingByKey } from '@fixtures';

describe('commandListSettingsTabSection', () => {
  let mockApp: MockProxy<App>;
  let mockPluginSettingTab: MockProxy<SwitcherPlusSettingTab>;
  let config: SwitcherPlusSettings;
  let mockContainerEl: MockProxy<HTMLElement>;
  let sut: CommandListSettingsTabSection;

  beforeAll(() => {
    mockApp = mock<App>();
    mockContainerEl = mock<HTMLElement>();
    mockPluginSettingTab = mock<SwitcherPlusSettingTab>({ containerEl: mockContainerEl });
    config = new SwitcherPlusSettings(null);

    sut = new CommandListSettingsTabSection(mockApp, mockPluginSettingTab, config);
  });

  describe('getSettingDefinitions', () => {
    it('should return a single page for the section', () => {
      const [page] = sut.getSettingDefinitions();

      expect(page).toEqual(
        expect.objectContaining({ type: 'page', name: 'Command Mode' }),
      );
    });

    it('should define the mode trigger setting', () => {
      const definitions = sut.getSettingDefinitions();

      expect(findSettingByKey(definitions, 'commandListCommand')).toEqual({
        name: 'Command list mode trigger',
        desc: expect.any(String),
        control: {
          type: 'text',
          key: 'commandListCommand',
          placeholder: config.commandListPlaceholderText,
          validate: expect.any(Function),
        },
      });
    });

    it('should define the max recent commands slider with the stored command limit', () => {
      const definitions = sut.getSettingDefinitions();

      expect(findSettingByKey(definitions, 'maxRecentCommands')).toEqual({
        name: 'Max recent commands',
        desc: expect.any(String),
        control: {
          type: 'slider',
          key: 'maxRecentCommands',
          min: 0,
          max: MAX_STORED_RECENT_COMMANDS,
          step: 1,
          defaultValue: 25,
        },
      });
    });

    it('should define the recent command display order dropdown', () => {
      const definitions = sut.getSettingDefinitions();

      expect(findSettingByKey(definitions, 'recentCommandDisplayOrder')).toEqual({
        name: 'Recent commands display order',
        desc: expect.any(String),
        control: {
          type: 'dropdown',
          key: 'recentCommandDisplayOrder',
          options: {
            desc: 'Most recent first (descending)',
            asc: 'Most recent last (ascending)',
          },
        },
      });
    });
  });
});
