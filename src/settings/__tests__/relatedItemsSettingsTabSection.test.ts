/* eslint-disable @typescript-eslint/no-explicit-any */
import { SwitcherPlusSettings } from '../switcherPlusSettings';
import { RelatedItemsSettingTabSection } from '../relatedItemsSettingsTabSection';
import { mock, MockProxy } from 'jest-mock-extended';
import { App, InternalPlugins, PluginSettingTab, Setting, TextComponent } from 'obsidian';
import { relatedItemsTrigger } from '@fixtures';

describe('relatedItemsSettingTabSection', () => {
  let mockApp: MockProxy<App>;
  let mockPluginSettingTab: MockProxy<PluginSettingTab>;
  let mockSettings: MockProxy<SwitcherPlusSettings>;
  let mockContainerEl: MockProxy<HTMLElement>;
  let sut: RelatedItemsSettingTabSection;
  let createSettingSpy: jest.SpyInstance;

  beforeAll(() => {
    mockApp = mock<App>({ internalPlugins: mock<InternalPlugins>() });
    mockSettings = mock<SwitcherPlusSettings>({
      relatedItemsListPlaceholderText: relatedItemsTrigger,
      relatedItemsListCommand: relatedItemsTrigger,
    });
  });

  beforeEach(() => {
    mockContainerEl = mock<HTMLElement>();
    mockPluginSettingTab = mock<PluginSettingTab>({ containerEl: mockContainerEl });
    sut = new RelatedItemsSettingTabSection(mockApp, mockPluginSettingTab, mockSettings);
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
      expect.objectContaining({ text: 'Related Items List Mode Settings' }),
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

    expect(setValueSpy).toHaveBeenCalledWith(mockSettings.relatedItemsListCommand);
    expect(setPlaceholderSpy).toHaveBeenCalledWith(
      mockSettings.relatedItemsListPlaceholderText,
    );

    setValueSpy.mockRestore();
    setPlaceholderSpy.mockRestore();
  });

  it('should save modified settings', () => {
    const initialCommandVal = mockSettings.relatedItemsListCommand;
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

    expect(initialCommandVal).toBe(relatedItemsTrigger);
    expect(mockSettings.save).toHaveBeenCalled();
    expect(mockSettings.relatedItemsListCommand).toBe(finalCommandVal);

    mockSettings.relatedItemsListCommand = relatedItemsTrigger;
  });

  it('should fallback to the default trigger when an empty string is set for the trigger', () => {
    const initialCommandVal = mockSettings.relatedItemsListCommand;
    const textComp = new TextComponent(mockContainerEl);
    const setting = mock<Setting>();

    setting.addText.mockImplementationOnce((cb: (component: TextComponent) => any) => {
      cb(textComp);
      return setting;
    });

    createSettingSpy.mockReturnValueOnce(setting);

    sut.display(mockContainerEl);
    textComp.setValue(''); // change the setting here

    expect(initialCommandVal).toBe(relatedItemsTrigger);
    expect(mockSettings.save).toHaveBeenCalled();
    expect(mockSettings.relatedItemsListCommand).toBe(relatedItemsTrigger);

    mockSettings.relatedItemsListCommand = relatedItemsTrigger;
  });
});
