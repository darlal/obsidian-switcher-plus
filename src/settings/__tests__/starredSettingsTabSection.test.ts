/* eslint-disable @typescript-eslint/no-explicit-any */
import { SwitcherPlusSettings } from '../switcherPlusSettings';
import { StarredSettingTabSection } from '../starredSettingsTabSection';
import { mock, MockProxy } from 'jest-mock-extended';
import { App, InternalPlugins, PluginSettingTab, Setting, TextComponent } from 'obsidian';
import { starredTrigger } from '@fixtures';

describe('starredSettingTabSection', () => {
  let mockApp: MockProxy<App>;
  let mockPluginSettingTab: MockProxy<PluginSettingTab>;
  let mockSettings: MockProxy<SwitcherPlusSettings>;
  let mockContainerEl: MockProxy<HTMLElement>;
  let sut: StarredSettingTabSection;
  let createSettingSpy: jest.SpyInstance;

  beforeAll(() => {
    mockApp = mock<App>({ internalPlugins: mock<InternalPlugins>() });
    mockSettings = mock<SwitcherPlusSettings>({
      starredListPlaceholderText: starredTrigger,
      starredListCommand: starredTrigger,
    });
  });

  beforeEach(() => {
    mockContainerEl = mock<HTMLElement>();
    mockPluginSettingTab = mock<PluginSettingTab>({ containerEl: mockContainerEl });
    sut = new StarredSettingTabSection(mockApp, mockPluginSettingTab, mockSettings);
    createSettingSpy = jest.spyOn(sut, 'createSetting');
  });

  afterEach(() => {
    createSettingSpy.mockRestore();
  });

  it('should display a header for the section', () => {
    createSettingSpy.mockReturnValueOnce(mock<Setting>());

    sut.display(mockContainerEl);

    expect(mockContainerEl.createEl).toHaveBeenCalledWith(
      'h2',
      expect.objectContaining({ text: 'Starred List Mode Settings' }),
    );
  });

  it('should load setting for mode trigger', () => {
    const textComp = new TextComponent(mockContainerEl);
    const setValueSpy = jest.spyOn(textComp, 'setValue');
    const setPlaceholderSpy = jest.spyOn(textComp, 'setPlaceholder');
    const setting = mock<Setting>();

    setting.addText.mockImplementationOnce((cb: (component: TextComponent) => any) => {
      cb(textComp);
      return setting;
    });

    createSettingSpy.mockReturnValueOnce(setting);

    sut.display(mockContainerEl);

    expect(setValueSpy).toHaveBeenCalledWith(mockSettings.starredListCommand);
    expect(setPlaceholderSpy).toHaveBeenCalledWith(
      mockSettings.starredListPlaceholderText,
    );

    setValueSpy.mockRestore();
    setPlaceholderSpy.mockRestore();
  });

  it('should save modified settings', () => {
    const initialCommandVal = mockSettings.starredListCommand;
    const finalCommandVal = 'foo';
    const textComp = new TextComponent(mockContainerEl);
    const setting = mock<Setting>();

    setting.addText.mockImplementationOnce((cb: (component: TextComponent) => any) => {
      cb(textComp);
      return setting;
    });

    createSettingSpy.mockReturnValueOnce(setting);

    sut.display(mockContainerEl);
    textComp.setValue(finalCommandVal); // change the setting here

    expect(initialCommandVal).toBe(starredTrigger);
    expect(mockSettings.save).toHaveBeenCalled();
    expect(mockSettings.starredListCommand).toBe(finalCommandVal);

    mockSettings.starredListCommand = starredTrigger;
  });

  it('should fallback to the default trigger when an empty string is set for the trigger', () => {
    const initialCommandVal = mockSettings.starredListCommand;
    const textComp = new TextComponent(mockContainerEl);
    const setting = mock<Setting>();

    setting.addText.mockImplementationOnce((cb: (component: TextComponent) => any) => {
      cb(textComp);
      return setting;
    });

    createSettingSpy.mockReturnValueOnce(setting);

    sut.display(mockContainerEl);
    textComp.setValue(''); // change the setting here

    expect(initialCommandVal).toBe(starredTrigger);
    expect(mockSettings.save).toHaveBeenCalled();
    expect(mockSettings.starredListCommand).toBe(starredTrigger);

    mockSettings.starredListCommand = starredTrigger;
  });
});
