/* eslint-disable @typescript-eslint/no-explicit-any */
import { SwitcherPlusSettings } from '../switcherPlusSettings';
import { CommandListSettingTabSection } from '../commandListSettingsTabSection';
import { mock, MockProxy } from 'jest-mock-extended';
import { App, InternalPlugins, PluginSettingTab, Setting, TextComponent } from 'obsidian';
import { commandTrigger } from '@fixtures';

describe('commandListSettingTabSection', () => {
  let mockApp: MockProxy<App>;
  let mockPluginSettingTab: MockProxy<PluginSettingTab>;
  let mockSettings: MockProxy<SwitcherPlusSettings>;
  let mockContainerEl: MockProxy<HTMLElement>;
  let sut: CommandListSettingTabSection;
  let createSettingSpy: jest.SpyInstance;

  beforeAll(() => {
    mockApp = mock<App>({ internalPlugins: mock<InternalPlugins>() });
    mockSettings = mock<SwitcherPlusSettings>({
      commandListPlaceholderText: commandTrigger,
      commandListCommand: commandTrigger,
    });
  });

  beforeEach(() => {
    mockContainerEl = mock<HTMLElement>();
    mockPluginSettingTab = mock<PluginSettingTab>({ containerEl: mockContainerEl });
    sut = new CommandListSettingTabSection(mockApp, mockPluginSettingTab, mockSettings);
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
      expect.objectContaining({ text: 'Command List Mode Settings' }),
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

    expect(setValueSpy).toHaveBeenCalledWith(mockSettings.commandListCommand);
    expect(setPlaceholderSpy).toHaveBeenCalledWith(
      mockSettings.commandListPlaceholderText,
    );

    setValueSpy.mockRestore();
    setPlaceholderSpy.mockRestore();
  });

  it('should save modified settings', () => {
    const initialCommandVal = mockSettings.commandListCommand;
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

    expect(initialCommandVal).toBe(commandTrigger);
    expect(mockSettings.save).toHaveBeenCalled();
    expect(mockSettings.commandListCommand).toBe(finalCommandVal);

    mockSettings.commandListCommand = commandTrigger;
  });

  it('should fallback to the default trigger when an empty string is set for the trigger', () => {
    const initialCommandVal = mockSettings.commandListCommand;
    const textComp = new TextComponent(mockContainerEl);
    const setting = mock<Setting>();

    setting.addText.mockImplementationOnce((cb: (component: TextComponent) => any) => {
      cb(textComp);
      return setting;
    });

    createSettingSpy.mockReturnValueOnce(setting);

    sut.display(mockContainerEl);
    textComp.setValue(''); // change the setting here

    expect(initialCommandVal).toBe(commandTrigger);
    expect(mockSettings.save).toHaveBeenCalled();
    expect(mockSettings.commandListCommand).toBe(commandTrigger);

    mockSettings.commandListCommand = commandTrigger;
  });
});
