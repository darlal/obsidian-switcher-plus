import {
  GeneralSettingsTabSection,
  SettingsTabSection,
  SwitcherPlusSettings,
} from 'src/settings';
import { mock, MockProxy } from 'jest-mock-extended';
import { App, PluginSettingTab } from 'obsidian';

describe('generalSettingsTabSection', () => {
  let mockApp: MockProxy<App>;
  let mockPluginSettingTab: MockProxy<PluginSettingTab>;
  let mockContainerEl: MockProxy<HTMLElement>;
  let config: SwitcherPlusSettings;
  let sut: GeneralSettingsTabSection;

  beforeAll(() => {
    mockApp = mock<App>();
    mockContainerEl = mock<HTMLElement>();
    mockPluginSettingTab = mock<PluginSettingTab>({ containerEl: mockContainerEl });
    config = new SwitcherPlusSettings(null);

    sut = new GeneralSettingsTabSection(mockApp, mockPluginSettingTab, config);
  });

  it('should display a header for the section', () => {
    const addSectionTitleSpy = jest.spyOn(
      SettingsTabSection.prototype,
      'addSectionTitle',
    );

    sut.display(mockContainerEl);

    expect(addSectionTitleSpy).toHaveBeenCalledWith(mockContainerEl, 'General Settings');

    addSectionTitleSpy.mockRestore();
  });

  it('should show the onOpenPreferNewPane setting', () => {
    const addToggleSettingSpy = jest.spyOn(
      SettingsTabSection.prototype,
      'addToggleSetting',
    );

    sut.display(mockContainerEl);

    expect(addToggleSettingSpy).toBeCalledWith(
      mockContainerEl,
      'Default to open in new pane',
      expect.any(String),
      config.onOpenPreferNewPane,
      'onOpenPreferNewPane',
    );

    addToggleSettingSpy.mockRestore();
  });
});
