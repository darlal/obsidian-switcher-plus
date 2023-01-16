import {
  GeneralSettingsTabSection,
  SettingsTabSection,
  SwitcherPlusSettings,
  SwitcherPlusSettingTab,
} from 'src/settings';
import { mock, mockFn, MockProxy, mockReset } from 'jest-mock-extended';
import { App, Setting, TextAreaComponent } from 'obsidian';
import { Mode, PathDisplayFormat } from 'src/types';

describe('generalSettingsTabSection', () => {
  let mockApp: MockProxy<App>;
  let mockPluginSettingTab: MockProxy<SwitcherPlusSettingTab>;
  let mockContainerEl: MockProxy<HTMLElement>;
  let config: SwitcherPlusSettings;
  let addToggleSettingSpy: jest.SpyInstance;
  let sut: GeneralSettingsTabSection;

  beforeAll(() => {
    mockApp = mock<App>();
    mockContainerEl = mock<HTMLElement>();
    config = new SwitcherPlusSettings(null);
    addToggleSettingSpy = jest.spyOn(SettingsTabSection.prototype, 'addToggleSetting');
    mockPluginSettingTab = mock<SwitcherPlusSettingTab>({
      containerEl: mockContainerEl,
      plugin: { registerRibbonCommandIcons: mockFn() },
    });

    sut = new GeneralSettingsTabSection(mockApp, mockPluginSettingTab, config);
  });

  afterAll(() => {
    addToggleSettingSpy.mockRestore();
  });

  describe('display settings', () => {
    beforeEach(() => {
      addToggleSettingSpy.mockClear();
    });

    it('should display a header for the section', () => {
      const addSectionTitleSpy = jest.spyOn(
        SettingsTabSection.prototype,
        'addSectionTitle',
      );

      sut.display(mockContainerEl);

      expect(addSectionTitleSpy).toHaveBeenCalledWith(
        mockContainerEl,
        'General Settings',
      );

      addSectionTitleSpy.mockRestore();
    });

    it('should show the onOpenPreferNewTab setting', () => {
      sut.display(mockContainerEl);

      expect(addToggleSettingSpy).toHaveBeenCalledWith(
        mockContainerEl,
        'Default to open in new tab',
        expect.any(String),
        config.onOpenPreferNewTab,
        'onOpenPreferNewTab',
      );
    });

    it('should show the overrideStandardModeBehaviors setting', () => {
      sut.display(mockContainerEl);

      expect(addToggleSettingSpy).toHaveBeenCalledWith(
        mockContainerEl,
        'Override Standard mode behavior',
        expect.any(String),
        config.overrideStandardModeBehaviors,
        'overrideStandardModeBehaviors',
      );
    });

    it('should show path settings', () => {
      const setPathDisplayFormatSpy = jest
        .spyOn(sut, 'setPathDisplayFormat')
        .mockReturnValueOnce();

      sut.display(mockContainerEl);

      expect(setPathDisplayFormatSpy).toHaveBeenCalled();

      setPathDisplayFormatSpy.mockRestore();
    });

    it('should show the hidePathIfRoot setting', () => {
      sut.display(mockContainerEl);

      expect(addToggleSettingSpy).toHaveBeenCalledWith(
        mockContainerEl,
        'Hide path for root items',
        expect.any(String),
        config.hidePathIfRoot,
        'hidePathIfRoot',
      );
    });

    it('should show the showOptionalIndicatorIcons setting', () => {
      sut.display(mockContainerEl);

      expect(addToggleSettingSpy).toHaveBeenCalledWith(
        mockContainerEl,
        'Show indicator icons',
        expect.any(String),
        config.showOptionalIndicatorIcons,
        'showOptionalIndicatorIcons',
      );
    });

    it('should show setting to change ribbon commands', () => {
      const setEnabledRibbonCommandsSpy = jest
        .spyOn(sut, 'setEnabledRibbonCommands')
        .mockReturnValueOnce();

      sut.display(mockContainerEl);

      expect(setEnabledRibbonCommandsSpy).toHaveBeenCalled();

      setEnabledRibbonCommandsSpy.mockRestore();
    });
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

  describe('setEnabledRibbonCommands', () => {
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

    it('should show the enabledRibbonCommands setting', () => {
      const { enabledRibbonCommands } = config;

      sut.setEnabledRibbonCommands(mockContainerEl, config);

      expect(mockTextComp.setValue).toHaveBeenCalledWith(
        enabledRibbonCommands.join('\n'),
      );
    });

    it('should save updated value', () => {
      const enabledCommands = `${Mode[Mode.Standard]}\n${Mode[Mode.SymbolList]}`;
      const saveSpy = jest.spyOn(config, 'save');

      let focusoutFn: EventListener;
      mockInputEl.addEventListener.mockImplementation((evtStr, listener) => {
        focusoutFn = listener as EventListener;
      });

      config.enabledRibbonCommands = []; // start with no values set
      mockTextComp.getValue.mockReturnValue(enabledCommands);

      sut.setEnabledRibbonCommands(mockContainerEl, config);
      focusoutFn(null); // trigger the callback to save

      expect(mockTextComp.getValue).toHaveBeenCalled();
      expect(saveSpy).toHaveBeenCalled();
      expect(config.enabledRibbonCommands).toEqual(
        expect.arrayContaining(enabledCommands.split('\n')),
      );

      saveSpy.mockRestore();
    });

    it('should not save changes when invalid related items types are added', () => {
      const enabledCommands = 'invalid type';
      const initialCommands = [Mode[Mode.CommandList]] as Array<keyof typeof Mode>;
      const saveSpy = jest.spyOn(config, 'save');

      let focusoutFn: EventListener;
      mockInputEl.addEventListener.mockImplementation((evtStr, listener) => {
        focusoutFn = listener as EventListener;
      });

      config.enabledRibbonCommands = initialCommands;
      mockTextComp.getValue.mockReturnValue(enabledCommands);

      sut.setEnabledRibbonCommands(mockContainerEl, config);
      focusoutFn(null); // trigger the callback to save

      expect(mockTextComp.getValue).toHaveBeenCalled();
      expect(config.enabledRibbonCommands).toEqual(initialCommands);
      expect(saveSpy).not.toHaveBeenCalled();

      saveSpy.mockRestore();
    });
  });
});
