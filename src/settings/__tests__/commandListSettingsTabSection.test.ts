import {
  CommandListSettingsTabSection,
  SettingsTabSection,
  SwitcherPlusSettings,
  SwitcherPlusSettingTab,
} from 'src/settings';
import { mock, MockProxy } from 'jest-mock-extended';
import { App, Setting } from 'obsidian';

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

    expect(addSectionTitleSpy).toHaveBeenCalledWith(
      mockContainerEl,
      'Command List Mode Settings',
    );

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
});
