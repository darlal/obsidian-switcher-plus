import {
  GeneralSettingsTabSection,
  SettingsTabSection,
  SwitcherPlusSettings,
} from 'src/settings';
import { mock, MockProxy } from 'jest-mock-extended';
import { App, PluginSettingTab, Setting } from 'obsidian';
import { PathDisplayFormat } from 'src/types';

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

  it('should show the onOpenPreferNewTab setting', () => {
    const addToggleSettingSpy = jest.spyOn(
      SettingsTabSection.prototype,
      'addToggleSetting',
    );

    sut.display(mockContainerEl);

    expect(addToggleSettingSpy).toBeCalledWith(
      mockContainerEl,
      'Default to open in new tab',
      expect.any(String),
      config.onOpenPreferNewTab,
      'onOpenPreferNewTab',
    );

    addToggleSettingSpy.mockRestore();
  });

  it('should show the overrideStandardModeBehaviors setting', () => {
    const addToggleSettingSpy = jest.spyOn(
      SettingsTabSection.prototype,
      'addToggleSetting',
    );

    sut.display(mockContainerEl);

    expect(addToggleSettingSpy).toBeCalledWith(
      mockContainerEl,
      'Override Standard mode behavior',
      expect.any(String),
      config.overrideStandardModeBehaviors,
      'overrideStandardModeBehaviors',
    );

    addToggleSettingSpy.mockRestore();
  });

  describe('setPathDisplayFormat', () => {
    it('should show the pathDisplayFormat setting', () => {
      const addDropdownSettingSpy = jest.spyOn(
        SettingsTabSection.prototype,
        'addDropdownSetting',
      );

      const setPathDisplayFormatSpy = jest.spyOn(sut, 'setPathDisplayFormat');

      sut.display(mockContainerEl);

      expect(setPathDisplayFormatSpy).toHaveBeenCalledWith(mockContainerEl, config);
      expect(addDropdownSettingSpy).toHaveBeenCalled();

      setPathDisplayFormatSpy.mockRestore();
      setPathDisplayFormatSpy.mockRestore();
    });

    it('should save modified setting', () => {
      config.pathDisplayFormat = PathDisplayFormat.None;
      const finalValue = PathDisplayFormat.Full;

      let onChangeFn: (v: string, c: SwitcherPlusSettings) => void;
      const addDropdownSettingSpy = jest
        .spyOn(SettingsTabSection.prototype, 'addDropdownSetting')
        .mockImplementationOnce((_c, _n, _d, _i, _o, _k, onChange) => {
          onChangeFn = onChange;
          return mock<Setting>();
        });

      const configSaveSpy = jest.spyOn(config, 'save');

      sut.setPathDisplayFormat(mockContainerEl, config);
      // trigger the save
      onChangeFn(finalValue.toString(), config);

      expect(config.pathDisplayFormat).toBe(finalValue);
      expect(configSaveSpy).toHaveBeenCalled();

      addDropdownSettingSpy.mockRestore();
      configSaveSpy.mockRestore();
    });
  });
});
