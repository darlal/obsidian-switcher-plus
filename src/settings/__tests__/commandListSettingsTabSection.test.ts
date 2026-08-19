import {
  CommandListSettingsTabSection,
  SettingsTabSection,
  SwitcherPlusSettings,
  SwitcherPlusSettingTab,
} from 'src/settings';
import { MAX_STORED_RECENT_COMMANDS } from 'src/Handlers';
import { mock, MockProxy } from 'jest-mock-extended';
import { App, Setting } from 'obsidian';
import { findSettingByKey } from '@fixtures';

describe('commandListSettingsTabSection', () => {
  let mockApp: MockProxy<App>;
  let mockPluginSettingTab: MockProxy<SwitcherPlusSettingTab>;
  let config: SwitcherPlusSettings;
  let mockContainerEl: MockProxy<HTMLElement>;
  let sut: CommandListSettingsTabSection;
  let addSliderSettingSpy: jest.SpyInstance;

  beforeAll(() => {
    mockApp = mock<App>();
    mockContainerEl = mock<HTMLElement>();
    mockPluginSettingTab = mock<SwitcherPlusSettingTab>({ containerEl: mockContainerEl });
    config = new SwitcherPlusSettings(null);

    addSliderSettingSpy = jest
      .spyOn(SettingsTabSection.prototype, 'addSliderSetting')
      .mockReturnValue(mock<Setting>());

    sut = new CommandListSettingsTabSection(mockApp, mockPluginSettingTab, config);
  });

  afterAll(() => {
    addSliderSettingSpy.mockRestore();
  });

  it('should display a header for the section', () => {
    const addSectionTitleSpy = jest.spyOn(
      SettingsTabSection.prototype,
      'addSectionTitle',
    );

    sut.display(mockContainerEl);

    expect(addSectionTitleSpy).toHaveBeenCalledWith(mockContainerEl, 'Command List Mode');

    addSectionTitleSpy.mockRestore();
  });

  it('should show the mode trigger setting', () => {
    const addTextSettingSpy = jest.spyOn(SettingsTabSection.prototype, 'addTextSetting');

    sut.display(mockContainerEl);

    expect(addTextSettingSpy).toHaveBeenCalledWith(
      mockContainerEl,
      'Command list mode trigger',
      expect.any(String),
      config.commandListCommand,
      'commandListCommand',
      config.commandListPlaceholderText,
    );

    addTextSettingSpy.mockRestore();
  });

  it('should show the maxRecentCommands setting', () => {
    sut.display(mockContainerEl);

    expect(addSliderSettingSpy).toHaveBeenCalledWith(
      mockContainerEl,
      'Max recent commands',
      expect.any(String),
      config.maxRecentCommands,
      expect.any(Array),
      'maxRecentCommands',
    );

    addSliderSettingSpy.mockClear();
  });

  it('should allow the maxRecentCommands slider to reach the full stored history size', () => {
    const expectedLimits = [0, MAX_STORED_RECENT_COMMANDS, 1, 25];

    sut.display(mockContainerEl);

    expect(addSliderSettingSpy).toHaveBeenCalledWith(
      mockContainerEl,
      'Max recent commands',
      expect.any(String),
      config.maxRecentCommands,
      expectedLimits,
      'maxRecentCommands',
    );

    addSliderSettingSpy.mockClear();
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
