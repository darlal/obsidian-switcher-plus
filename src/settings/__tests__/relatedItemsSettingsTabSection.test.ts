import {
  RelatedItemsSettingsTabSection,
  SettingsTabSection,
  SwitcherPlusSettings,
} from 'src/settings';
import { RelationType } from 'src/types';
import { mock, MockProxy, mockReset } from 'jest-mock-extended';
import { App, PluginSettingTab, Setting, TextAreaComponent } from 'obsidian';

describe('relatedItemsSettingsTabSection', () => {
  let mockApp: MockProxy<App>;
  let mockPluginSettingTab: MockProxy<PluginSettingTab>;
  let config: SwitcherPlusSettings;
  let mockContainerEl: MockProxy<HTMLElement>;
  let sut: RelatedItemsSettingsTabSection;

  beforeAll(() => {
    mockApp = mock<App>();
    mockContainerEl = mock<HTMLElement>();
    mockPluginSettingTab = mock<PluginSettingTab>({ containerEl: mockContainerEl });
    config = new SwitcherPlusSettings(null);

    sut = new RelatedItemsSettingsTabSection(mockApp, mockPluginSettingTab, config);
  });

  it('should display a header for the section', () => {
    const addSectionTitleSpy = jest.spyOn(
      SettingsTabSection.prototype,
      'addSectionTitle',
    );

    sut.display(mockContainerEl);

    expect(addSectionTitleSpy).toHaveBeenCalledWith(
      mockContainerEl,
      'Related Items List Mode Settings',
    );

    addSectionTitleSpy.mockRestore();
  });

  it('should show the mode trigger setting', () => {
    const addTextSettingSpy = jest.spyOn(SettingsTabSection.prototype, 'addTextSetting');

    sut.display(mockContainerEl);

    expect(addTextSettingSpy).toBeCalledWith(
      mockContainerEl,
      'Related Items list mode trigger',
      expect.any(String),
      config.relatedItemsListCommand,
      'relatedItemsListCommand',
      config.relatedItemsListPlaceholderText,
    );

    addTextSettingSpy.mockRestore();
  });

  it('should show the excludeOpenRelatedFiles setting', () => {
    const addToggleSettingSpy = jest.spyOn(
      SettingsTabSection.prototype,
      'addToggleSetting',
    );

    sut.display(mockContainerEl);

    expect(addToggleSettingSpy).toBeCalledWith(
      mockContainerEl,
      'Exclude open files',
      expect.any(String),
      config.excludeOpenRelatedFiles,
      'excludeOpenRelatedFiles',
    );

    addToggleSettingSpy.mockRestore();
  });

  it('should show the enabledRelatedItems setting', () => {
    const createSettingSpy = jest.spyOn(SettingsTabSection.prototype, 'createSetting');

    sut.display(mockContainerEl);

    expect(createSettingSpy).toBeCalledWith(
      mockContainerEl,
      'Show related item types',
      expect.any(String),
    );

    createSettingSpy.mockRestore();
  });

  describe('showEnabledRelatedItems', () => {
    let mockSetting: MockProxy<Setting>;
    let mockTextComp: MockProxy<TextAreaComponent>;
    let mockInputEl: MockProxy<HTMLInputElement>;
    let createSettingSpy: jest.SpyInstance;

    beforeAll(() => {
      mockSetting = mock<Setting>();
      mockInputEl = mock<HTMLInputElement>();
      mockTextComp = mock<TextAreaComponent>({
        inputEl: mockInputEl,
      });

      createSettingSpy = jest
        .spyOn(SettingsTabSection.prototype, 'createSetting')
        .mockReturnValue(mockSetting);

      mockSetting.addTextArea.mockImplementation((cb) => {
        cb(mockTextComp);
        return mockSetting;
      });
    });

    afterAll(() => {
      createSettingSpy.mockRestore();
    });

    afterEach(() => {
      mockReset(mockTextComp);
      mockReset(mockInputEl);
    });

    it('should show the saved enabledRelatedItems setting', () => {
      const { enabledRelatedItems } = config;

      sut.showEnabledRelatedItems(mockContainerEl, config);

      expect(mockTextComp.setValue).toHaveBeenCalledWith(enabledRelatedItems.join('\n'));
    });

    it('should save updated value', () => {
      const enabledTypes = RelationType.Backlink;
      const saveSpy = jest.spyOn(config, 'save');

      let focusoutFn: EventListener;
      mockInputEl.addEventListener.mockImplementation((evtStr, listener) => {
        focusoutFn = listener as EventListener;
      });

      config.enabledRelatedItems = []; // start with no values set
      mockTextComp.getValue.mockReturnValue(enabledTypes);

      sut.showEnabledRelatedItems(mockContainerEl, config);
      focusoutFn(null); // trigger the callback to save

      expect(mockTextComp.getValue).toHaveBeenCalled();
      expect(saveSpy).toHaveBeenCalled();
      expect(config.enabledRelatedItems).toEqual(
        expect.arrayContaining(enabledTypes.split('\n')),
      );

      saveSpy.mockRestore();
    });

    it('should not save changes when invalid related items types are added', () => {
      const enabledTypes = 'invalid type';
      const initialTypes = Object.values(RelationType);
      const saveSpy = jest.spyOn(config, 'save');

      let focusoutFn: EventListener;
      mockInputEl.addEventListener.mockImplementation((evtStr, listener) => {
        focusoutFn = listener as EventListener;
      });

      config.enabledRelatedItems = initialTypes;
      mockTextComp.getValue.mockReturnValue(enabledTypes);

      sut.showEnabledRelatedItems(mockContainerEl, config);
      focusoutFn(null); // trigger the callback to save

      expect(mockTextComp.getValue).toHaveBeenCalled();
      expect(config.enabledRelatedItems).toBe(initialTypes);
      expect(saveSpy).not.toHaveBeenCalled();

      saveSpy.mockRestore();
    });
  });
});
