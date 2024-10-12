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
      const showEnabledRibbonCommandsSpy = jest
        .spyOn(sut, 'showEnabledRibbonCommands')
        .mockReturnValueOnce();

      sut.display(mockContainerEl);

      expect(showEnabledRibbonCommandsSpy).toHaveBeenCalled();

      showEnabledRibbonCommandsSpy.mockRestore();
    });

    it('should show setting to change match priority adjustments', () => {
      const showMatchPriorityAdjustmentsSpy = jest
        .spyOn(sut, 'showMatchPriorityAdjustments')
        .mockReturnValueOnce();

      sut.display(mockContainerEl);

      expect(showMatchPriorityAdjustmentsSpy).toHaveBeenCalled();

      showMatchPriorityAdjustmentsSpy.mockRestore();
    });

    it('should show the showModeTriggerInstructions setting', () => {
      sut.display(mockContainerEl);

      expect(addToggleSettingSpy).toHaveBeenCalledWith(
        mockContainerEl,
        'Display mode trigger instructions',
        expect.any(String),
        config.showModeTriggerInstructions,
        'showModeTriggerInstructions',
      );
    });
  });

  describe('showPathDisplayFormat', () => {
    it('should show the pathDisplayFormat setting', () => {
      const addDropdownSettingSpy = jest.spyOn(
        SettingsTabSection.prototype,
        'addDropdownSetting',
      );

      const showPathDisplayFormatSpy = jest.spyOn(sut, 'showPathDisplayFormat');

      sut.display(mockContainerEl);

      expect(showPathDisplayFormatSpy).toHaveBeenCalledWith(mockContainerEl, config);
      expect(addDropdownSettingSpy).toHaveBeenCalled();

      showPathDisplayFormatSpy.mockRestore();
      addDropdownSettingSpy.mockRestore();
    });

    it('should save modified setting', () => {
      config.pathDisplayFormat = PathDisplayFormat.None;
      const finalValue = PathDisplayFormat.Full;

      type addDropdownSettingArgs = Parameters<SettingsTabSection['addDropdownSetting']>;
      let dropdownSettingOnChangeFn: addDropdownSettingArgs[6];

      // let onChangeFn: (v: string, c: SwitcherPlusSettings) => void;
      const addDropdownSettingSpy = jest
        .spyOn(SettingsTabSection.prototype, 'addDropdownSetting')
        .mockImplementationOnce((...args) => {
          dropdownSettingOnChangeFn = args[6];
          return mock<Setting>();
        });

      const configSaveSpy = jest.spyOn(config, 'save');

      sut.showPathDisplayFormat(mockContainerEl, config);

      // trigger the save
      dropdownSettingOnChangeFn(finalValue.toString(), config);

      expect(config.pathDisplayFormat).toBe(finalValue);
      expect(configSaveSpy).toHaveBeenCalled();

      addDropdownSettingSpy.mockRestore();
      configSaveSpy.mockRestore();
    });
  });

  describe('showEnabledRibbonCommands', () => {
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

      sut.showEnabledRibbonCommands(mockContainerEl, config);

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

      sut.showEnabledRibbonCommands(mockContainerEl, config);
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

      sut.showEnabledRibbonCommands(mockContainerEl, config);
      focusoutFn(null); // trigger the callback to save

      expect(mockTextComp.getValue).toHaveBeenCalled();
      expect(config.enabledRibbonCommands).toEqual(initialCommands);
      expect(saveSpy).not.toHaveBeenCalled();

      saveSpy.mockRestore();
    });
  });

  describe('showOverrideMobileLauncher', () => {
    it('should show setting to override the mobile launcher (plus) button', () => {
      const initialValue = Mode[Mode.CommandList];
      config.mobileLauncher.modeString = initialValue;
      config.mobileLauncher.isEnabled = true;

      const addDropdownSettingSpy = jest.spyOn(
        SettingsTabSection.prototype,
        'addDropdownSetting',
      );

      const showOverrideMobileLauncherSpy = jest.spyOn(sut, 'showOverrideMobileLauncher');

      sut.display(mockContainerEl);

      expect(showOverrideMobileLauncherSpy).toHaveBeenCalledWith(mockContainerEl, config);
      expect(addDropdownSettingSpy).toHaveBeenCalledWith(
        mockContainerEl,
        expect.any(String),
        expect.any(String),
        initialValue,
        expect.anything(),
        null,
        expect.any(Function),
      );

      showOverrideMobileLauncherSpy.mockRestore();
      addDropdownSettingSpy.mockRestore();
    });

    it('should save modified setting', () => {
      const finalValue = Mode[Mode.Standard];
      config.mobileLauncher.modeString = Mode[Mode.CommandList];
      config.mobileLauncher.isEnabled = true;

      type addDropdownSettingArgs = Parameters<SettingsTabSection['addDropdownSetting']>;
      let dropdownSettingOnChangeFn: addDropdownSettingArgs[6];

      const addDropdownSettingSpy = jest
        .spyOn(SettingsTabSection.prototype, 'addDropdownSetting')
        .mockImplementationOnce((...args) => {
          dropdownSettingOnChangeFn = args[6];
          return mock<Setting>();
        });

      const configSaveSpy = jest.spyOn(config, 'save');

      sut.showOverrideMobileLauncher(mockContainerEl, config);

      // trigger the save
      dropdownSettingOnChangeFn(finalValue, config);

      expect(config.mobileLauncher.modeString).toBe(finalValue);
      expect(configSaveSpy).toHaveBeenCalled();

      addDropdownSettingSpy.mockRestore();
      configSaveSpy.mockRestore();
    });
  });

  describe('showMatchPriorityAdjustments', () => {
    type addToggleSettingArgs = Parameters<SettingsTabSection['addToggleSetting']>;
    let toggleSettingOnChangeFn: addToggleSettingArgs[5];
    let saveSettingsSpy: jest.SpyInstance;

    beforeAll(() => {
      saveSettingsSpy = jest.spyOn(config, 'saveSettings');
    });

    afterAll(() => {
      saveSettingsSpy.mockRestore();
    });

    afterEach(() => {
      toggleSettingOnChangeFn = null;
    });

    it('should refresh the mainSettingsTab panel when the enable result priority setting changes', async () => {
      const initialEnabledValue = false;
      const finalEnabledValue = true;
      const savePromise = Promise.resolve();

      config.matchPriorityAdjustments.isEnabled = initialEnabledValue;
      saveSettingsSpy.mockReturnValueOnce(savePromise);
      addToggleSettingSpy.mockImplementation((...args: addToggleSettingArgs) => {
        if (args[1] === 'Result priority adjustments') {
          toggleSettingOnChangeFn = args[5];
        }

        return mock<Setting>();
      });

      sut.showMatchPriorityAdjustments(mockContainerEl, config);

      // trigger the change/save
      toggleSettingOnChangeFn(finalEnabledValue, config);

      await savePromise;

      expect(saveSettingsSpy).toHaveBeenCalled();
      expect(mockPluginSettingTab.display).toHaveBeenCalled();
      expect(config.matchPriorityAdjustments.isEnabled).toBe(finalEnabledValue);

      config.matchPriorityAdjustments.isEnabled = false;
      addToggleSettingSpy.mockReset();
      mockPluginSettingTab.display.mockClear();
    });

    it('should log error to the console when setting cannot be saved', async () => {
      const errorMsg = 'showMatchPriorityAdjustments Unit test error';
      const rejectedPromise = Promise.reject(errorMsg);
      const consoleLogSpy = jest.spyOn(console, 'log').mockReturnValueOnce();

      addToggleSettingSpy.mockImplementation((...args: addToggleSettingArgs) => {
        if (args[1] === 'Result priority adjustments') {
          toggleSettingOnChangeFn = args[5];
        }

        return mock<Setting>();
      });

      saveSettingsSpy.mockReturnValueOnce(rejectedPromise);

      sut.showMatchPriorityAdjustments(mockContainerEl, config);

      // trigger the change/save
      toggleSettingOnChangeFn(true, config);

      try {
        await rejectedPromise;
      } catch (e) {
        /* noop */
      }

      expect(saveSettingsSpy).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Switcher++: error saving "Result Priority Adjustments" setting. ',
        errorMsg,
      );

      addToggleSettingSpy.mockReset();
      consoleLogSpy.mockRestore();
    });

    it('should save Result Priority Adjustments settings changes', () => {
      type addSliderSettingArgs = Parameters<SettingsTabSection['addSliderSetting']>;
      let sliderSettingOnChangeFn: addSliderSettingArgs[6];
      const fieldToAdjustKey = 'alias';
      const fieldToAdjustName = 'Aliases';
      const initialValue = 0;
      const finalValue = 0.5;
      const saveSpy = jest.spyOn(config, 'save').mockReturnValueOnce();
      const adjustmentData =
        config.matchPriorityAdjustments.adjustments[fieldToAdjustKey];

      const addSliderSettingSpy = jest
        .spyOn(SettingsTabSection.prototype, 'addSliderSetting')
        .mockImplementation((...args: addSliderSettingArgs) => {
          if (args[1] === fieldToAdjustName) {
            sliderSettingOnChangeFn = args[6];
          }

          return mock<Setting>();
        });

      config.matchPriorityAdjustments.isEnabled = true;
      adjustmentData.value = initialValue;

      sut.showMatchPriorityAdjustments(mockContainerEl, config);

      // trigger the change/save
      sliderSettingOnChangeFn(finalValue, config);

      expect(saveSpy).toHaveBeenCalled();
      expect(adjustmentData.value).toBe(finalValue);

      config.matchPriorityAdjustments.isEnabled = false;
      adjustmentData.value = 0;
      addSliderSettingSpy.mockRestore();
      saveSpy.mockRestore();
    });
  });

  describe('showResetFacetEachSession', () => {
    type addToggleSettingArgs = Parameters<SettingsTabSection['addToggleSetting']>;
    let toggleSettingOnChangeFn: addToggleSettingArgs[5];
    let saveSettingsSpy: jest.SpyInstance;

    beforeAll(() => {
      saveSettingsSpy = jest.spyOn(config, 'saveSettings');
    });

    afterAll(() => {
      saveSettingsSpy.mockRestore();
    });

    it('should save changes to the shouldResetActiveFacets setting', () => {
      const initialValue = false;
      const finalValue = true;

      config.quickFilters.shouldResetActiveFacets = initialValue;
      addToggleSettingSpy.mockImplementation((...args: addToggleSettingArgs) => {
        if (args[1] === 'Reset active Quick Filters') {
          toggleSettingOnChangeFn = args[5];
        }

        return mock<Setting>();
      });

      sut.showResetFacetEachSession(mockContainerEl, config);

      // trigger the change/save
      toggleSettingOnChangeFn(finalValue, config);

      expect(saveSettingsSpy).toHaveBeenCalled();
      expect(config.quickFilters.shouldResetActiveFacets).toBe(finalValue);

      config.quickFilters.shouldResetActiveFacets = false;
      addToggleSettingSpy.mockReset();
      mockPluginSettingTab.display.mockClear();
    });
  });

  describe('showRenderMarkdownContentAsHTML', () => {
    type addToggleSettingArgs = Parameters<SettingsTabSection['addToggleSetting']>;
    let toggleSettingOnChangeFn: addToggleSettingArgs[5];
    let saveSettingsSpy: jest.SpyInstance;

    beforeAll(() => {
      saveSettingsSpy = jest.spyOn(config, 'saveSettings');
    });

    afterAll(() => {
      saveSettingsSpy.mockRestore();
    });

    it('should save changes to the renderMarkdownContentInSuggestions setting', () => {
      const initialValue = false;
      const finalValue = true;

      config.renderMarkdownContentInSuggestions.renderHeadings = initialValue;
      addToggleSettingSpy.mockImplementation((...args: addToggleSettingArgs) => {
        if (args[1] === 'Display Headings as Live Preview') {
          toggleSettingOnChangeFn = args[5];
        }

        return mock<Setting>({ nameEl: mock<HTMLElement>() });
      });

      sut.showRenderMarkdownContentAsHTML(mockContainerEl, config);

      // trigger the change/save
      toggleSettingOnChangeFn(finalValue, config);

      expect(saveSettingsSpy).toHaveBeenCalled();
      expect(config.renderMarkdownContentInSuggestions.renderHeadings).toBe(finalValue);

      config.renderMarkdownContentInSuggestions.renderHeadings = false;
      addToggleSettingSpy.mockReset();
    });

    describe('showQuickOpen', () => {
      type addToggleSettingArgs = Parameters<SettingsTabSection['addToggleSetting']>;
      let toggleSettingOnChangeFn: addToggleSettingArgs[5];
      let saveSettingsSpy: jest.SpyInstance;

      beforeAll(() => {
        saveSettingsSpy = jest.spyOn(config, 'saveSettings');
      });

      afterAll(() => {
        saveSettingsSpy.mockRestore();
      });

      it('should save changes to the enable QuickOpen setting', () => {
        const initialValue = false;
        const finalValue = true;

        config.quickOpen.isEnabled = initialValue;
        addToggleSettingSpy.mockImplementation((...args: addToggleSettingArgs) => {
          if (args[1] === 'Enable quick open hotkeys for top results') {
            toggleSettingOnChangeFn = args[5];
          }

          return mock<Setting>();
        });

        sut.showQuickOpen(mockContainerEl, config);

        // trigger the change/save
        toggleSettingOnChangeFn(finalValue, config);

        expect(saveSettingsSpy).toHaveBeenCalled();
        expect(config.quickOpen.isEnabled).toBe(finalValue);

        config.quickOpen.isEnabled = false;
        addToggleSettingSpy.mockReset();
      });
    });
  });

  describe('showInsertLinkInEditor', () => {
    type addToggleSettingArgs = Parameters<SettingsTabSection['addToggleSetting']>;
    let toggleSettingOnChangeFn: addToggleSettingArgs[5];
    let saveSettingsSpy: jest.SpyInstance;

    beforeAll(() => {
      saveSettingsSpy = jest.spyOn(config, 'saveSettings');
    });

    afterAll(() => {
      saveSettingsSpy.mockRestore();
    });

    it.each([
      {
        settingKey: 'useBasenameAsAlias',
        settingName: 'Use filename as alias',
      },
      {
        settingKey: 'useHeadingAsAlias',
        settingName: 'Use heading as alias',
      },
    ])('should save changes to $settingKey setting', ({ settingKey, settingName }) => {
      const initialValue = false;
      const finalValue = true;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const insertConfig = config.insertLinkInEditor as Record<string, any>;
      insertConfig[settingKey] = initialValue;

      addToggleSettingSpy.mockImplementation((...args: addToggleSettingArgs) => {
        if (args[1] === settingName) {
          toggleSettingOnChangeFn = args[5];
        }

        return mock<Setting>();
      });

      sut.showInsertLinkInEditor(mockContainerEl, config);

      // trigger the change/save
      toggleSettingOnChangeFn(finalValue, config);

      expect(saveSettingsSpy).toHaveBeenCalled();
      expect(insertConfig[settingKey]).toBe(finalValue);

      addToggleSettingSpy.mockReset();
    });
  });
});
