import {
  GeneralSettingsTabSection,
  SettingsTabSection,
  SwitcherPlusSettings,
  SwitcherPlusSettingTab,
} from 'src/settings';
import { mock, mockFn, MockProxy, mockReset } from 'jest-mock-extended';
import { App, Setting, SettingGroup, TextAreaComponent } from 'obsidian';
import { Mode, PathDisplayFormat, TagSource } from 'src/types';

describe('generalSettingsTabSection', () => {
  type addToggleSettingArgs = Parameters<SettingsTabSection['addToggleSetting']>;
  type addDropdownSettingArgs = Parameters<SettingsTabSection['addDropdownSetting']>;
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

      expect(addSectionTitleSpy).toHaveBeenCalledWith(mockContainerEl, 'General');

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

    it('should show setting for standard mode overrides', () => {
      const showStandardModeOverridesSpy = jest
        .spyOn(sut, 'showStandardModeOverrides')
        .mockReturnValueOnce();

      sut.display(mockContainerEl);

      expect(showStandardModeOverridesSpy).toHaveBeenCalled();

      showStandardModeOverridesSpy.mockRestore();
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

    it('should show setting for restore input group', () => {
      const showRestoreInputSpy = jest
        .spyOn(sut, 'showRestoreInput')
        .mockReturnValueOnce();

      sut.display(mockContainerEl);

      expect(showRestoreInputSpy).toHaveBeenCalled();

      showRestoreInputSpy.mockRestore();
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

  describe('showPathDisplayGroup', () => {
    it('should show the pathDisplayFormat setting', () => {
      const showPathDisplayFormatSpy = jest.spyOn(sut, 'showPathDisplayFormat');

      sut.showPathDisplayGroup(mockContainerEl, config);

      expect(showPathDisplayFormatSpy).toHaveBeenCalled();

      showPathDisplayFormatSpy.mockRestore();
    });

    it('should save modified showPathDisplayFormat setting', () => {
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

    it('should show the hidePathIfRoot setting', () => {
      addToggleSettingSpy.mockClear();

      sut.showPathDisplayGroup(mockContainerEl, config);

      expect(addToggleSettingSpy).toHaveBeenCalledWith(
        expect.anything(),
        'Hide path for root items',
        expect.any(String),
        config.hidePathIfRoot,
        'hidePathIfRoot',
      );

      addToggleSettingSpy.mockClear();
    });
  });

  describe('showStandardModeOverrides', () => {
    let createSettingSpy: jest.SpyInstance;

    beforeAll(() => {
      createSettingSpy = jest.spyOn(SettingsTabSection.prototype, 'createSetting');
    });

    afterAll(() => {
      createSettingSpy.mockRestore();
    });

    beforeEach(() => {
      createSettingSpy.mockClear();
      addToggleSettingSpy.mockClear();
    });

    it('should create a setting with title and description "Standard Mode Overrides" in the SettingGroup', () => {
      sut.showStandardModeOverrides(mockContainerEl, config);

      // Verify that createSetting was called with a SettingGroup instance (not containerEl)
      expect(createSettingSpy).toHaveBeenCalled();

      type createSettingArgs = Parameters<SettingsTabSection['createSetting']>;
      const createSettingCall = createSettingSpy.mock.calls.find(
        (call: createSettingArgs) => call[1] === 'Standard Mode Overrides',
      ) as createSettingArgs | undefined;

      expect(createSettingCall?.[0]).toBeInstanceOf(SettingGroup);
      expect(createSettingCall?.[1]).toBe('Standard Mode Overrides');
    });

    it('should call addToggleSetting with SettingGroup instead of containerEl for both override toggles', () => {
      sut.showStandardModeOverrides(mockContainerEl, config);

      // Verify that addToggleSetting was called with a SettingGroup instance (not containerEl)
      const toggleCalls = addToggleSettingSpy.mock.calls.filter(
        (call: addToggleSettingArgs) =>
          call[1] === 'Override Standard mode file open behavior' ||
          call[1] === 'Override Standard mode rendering',
      ) as addToggleSettingArgs[];

      expect(toggleCalls).toHaveLength(2);
      toggleCalls.forEach((call) => {
        expect(call[0]).toBeInstanceOf(SettingGroup);
      });
    });

    it('should show the overrideStandardModeBehaviors setting', () => {
      sut.showStandardModeOverrides(mockContainerEl, config);

      expect(addToggleSettingSpy).toHaveBeenCalledWith(
        expect.anything(),
        'Override Standard mode file open behavior',
        expect.any(String),
        config.overrideStandardModeBehaviors,
        'overrideStandardModeBehaviors',
      );
    });

    it('should show the overrideStandardModeRendering setting', () => {
      sut.showStandardModeOverrides(mockContainerEl, config);

      expect(addToggleSettingSpy).toHaveBeenCalledWith(
        expect.anything(),
        'Override Standard mode rendering',
        expect.any(String),
        config.overrideStandardModeRendering,
        'overrideStandardModeRendering',
      );
    });
  });

  describe('showRestoreInput', () => {
    let createSettingSpy: jest.SpyInstance;

    beforeAll(() => {
      createSettingSpy = jest.spyOn(SettingsTabSection.prototype, 'createSetting');
    });

    afterAll(() => {
      createSettingSpy.mockRestore();
    });

    beforeEach(() => {
      createSettingSpy.mockClear();
      addToggleSettingSpy.mockClear();
    });

    it('should create a setting with title and description "Restore Previous Input" in the SettingGroup', () => {
      sut.showRestoreInput(mockContainerEl, config);

      // Verify that createSetting was called with a SettingGroup instance (not containerEl)
      expect(createSettingSpy).toHaveBeenCalled();

      type createSettingArgs = Parameters<SettingsTabSection['createSetting']>;
      const createSettingCall = createSettingSpy.mock.calls.find(
        (call: createSettingArgs) => call[1] === 'Restore Previous Input',
      ) as createSettingArgs | undefined;

      expect(createSettingCall?.[0]).toBeInstanceOf(SettingGroup);
      expect(createSettingCall?.[1]).toBe('Restore Previous Input');
    });

    it('should call addToggleSetting with SettingGroup instead of containerEl for both restore input toggles', () => {
      sut.showRestoreInput(mockContainerEl, config);

      // Verify that addToggleSetting was called with a SettingGroup instance (not containerEl)
      const toggleCalls = addToggleSettingSpy.mock.calls.filter(
        (call: addToggleSettingArgs) =>
          call[1] === 'Restore previous input in Command Mode' ||
          call[1] === 'Restore previous input',
      ) as addToggleSettingArgs[];

      expect(toggleCalls).toHaveLength(2);
      toggleCalls.forEach((call) => {
        expect(call[0]).toBeInstanceOf(SettingGroup);
      });
    });

    it('should show the preserveCommandPaletteLastInput setting', () => {
      sut.showRestoreInput(mockContainerEl, config);

      expect(addToggleSettingSpy).toHaveBeenCalledWith(
        expect.anything(),
        'Restore previous input in Command Mode',
        expect.any(String),
        config.preserveCommandPaletteLastInput,
        'preserveCommandPaletteLastInput',
      );
    });

    it('should show the preserveQuickSwitcherLastInput setting', () => {
      sut.showRestoreInput(mockContainerEl, config);

      expect(addToggleSettingSpy).toHaveBeenCalledWith(
        expect.anything(),
        'Restore previous input',
        expect.any(String),
        config.preserveQuickSwitcherLastInput,
        'preserveQuickSwitcherLastInput',
      );
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
      mockInputEl.addEventListener.mockImplementation(
        (evtStr: string, listener: EventListenerOrEventListenerObject) => {
          focusoutFn = listener as EventListener;
        },
      );

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
      mockInputEl.addEventListener.mockImplementation(
        (evtStr: string, listener: EventListenerOrEventListenerObject) => {
          focusoutFn = listener as EventListener;
        },
      );

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

  describe('showLauncherButtonOverrides', () => {
    it('should call addDropdownSetting with SettingGroup instead of containerEl', () => {
      const initialValue = Mode[Mode.CommandList];
      config.mobileLauncher.modeString = initialValue;
      config.mobileLauncher.isEnabled = true;

      const addDropdownSettingSpy = jest.spyOn(
        SettingsTabSection.prototype,
        'addDropdownSetting',
      );

      sut.showLauncherButtonOverrides(mockContainerEl, config);

      // Verify that addDropdownSetting was called with a SettingGroup instance (not containerEl)
      expect(addDropdownSettingSpy).toHaveBeenCalled();

      const dropdownCall = addDropdownSettingSpy.mock.calls.find(
        (call: addDropdownSettingArgs) =>
          call[1] === 'New tab and mobile launcher buttons',
      );

      expect(dropdownCall?.[0]).toBeInstanceOf(SettingGroup);

      addDropdownSettingSpy.mockRestore();
    });

    it('should show setting to override the mobile launcher (🔍) button', () => {
      const initialValue = Mode[Mode.CommandList];
      config.mobileLauncher.modeString = initialValue;
      config.mobileLauncher.isEnabled = true;

      const addDropdownSettingSpy = jest.spyOn(
        SettingsTabSection.prototype,
        'addDropdownSetting',
      );

      const showLauncherButtonOverridesSpy = jest.spyOn(
        sut,
        'showLauncherButtonOverrides',
      );

      sut.display(mockContainerEl);

      expect(showLauncherButtonOverridesSpy).toHaveBeenCalledWith(
        mockContainerEl,
        config,
      );
      expect(addDropdownSettingSpy).toHaveBeenCalled();

      showLauncherButtonOverridesSpy.mockRestore();
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

      sut.showLauncherButtonOverrides(mockContainerEl, config);

      // trigger the save
      dropdownSettingOnChangeFn(finalValue, config);

      expect(config.mobileLauncher.modeString).toBe(finalValue);
      expect(configSaveSpy).toHaveBeenCalled();

      addDropdownSettingSpy.mockRestore();
      configSaveSpy.mockRestore();
    });

    it('should call addToggleSetting with SettingGroup instead of containerEl for conditional toggles when enabled', () => {
      config.mobileLauncher.isEnabled = true;

      sut.showLauncherButtonOverrides(mockContainerEl, config);

      // Verify that addToggleSetting was called with a SettingGroup instance (not containerEl)
      const toggleCalls = addToggleSettingSpy.mock.calls.filter(
        (call: addToggleSettingArgs) =>
          call[1] === 'Override default Switcher launch button on mobile platforms' ||
          call[1] === 'Display launch button on the "New tab" page',
      ) as addToggleSettingArgs[];

      expect(toggleCalls.length).toBeGreaterThan(0);
      toggleCalls.forEach((call) => {
        expect(call[0]).toBeInstanceOf(SettingGroup);
      });

      config.mobileLauncher.isEnabled = false;
    });

    it('should save changes to the .isMobileButtonEnabled setting', () => {
      const initialValue = false;
      const finalValue = true;
      config.mobileLauncher.isEnabled = true;
      config.mobileLauncher.isMobileButtonEnabled = initialValue;
      let toggleSettingOnChangeFn: addToggleSettingArgs[5];

      addToggleSettingSpy.mockImplementation((...args: addToggleSettingArgs) => {
        if (args[1] === 'Override default Switcher launch button on mobile platforms') {
          toggleSettingOnChangeFn = args[5];
        }

        return mock<Setting>();
      });

      sut.showLauncherButtonOverrides(mockContainerEl, config);

      // trigger the change/save
      toggleSettingOnChangeFn(finalValue, config);

      expect(config.mobileLauncher.isMobileButtonEnabled).toBe(finalValue);
    });

    it('should save changes to the .isEmptyTabButtonEnabled setting', () => {
      const initialValue = false;
      const finalValue = true;
      config.mobileLauncher.isEnabled = true;
      config.mobileLauncher.isEmptyTabButtonEnabled = initialValue;
      let toggleSettingOnChangeFn: addToggleSettingArgs[5];

      addToggleSettingSpy.mockImplementation((...args: addToggleSettingArgs) => {
        if (args[1] === 'Display launch button on the "New tab" page') {
          toggleSettingOnChangeFn = args[5];
        }

        return mock<Setting>();
      });

      sut.showLauncherButtonOverrides(mockContainerEl, config);

      // trigger the change/save
      toggleSettingOnChangeFn(finalValue, config);

      expect(config.mobileLauncher.isEmptyTabButtonEnabled).toBe(finalValue);
    });

    it('should refresh the settings panel when dropdown value changes', () => {
      const displaySpy = jest.spyOn(mockPluginSettingTab, 'display');
      const finalValue = Mode[Mode.Standard];
      config.mobileLauncher.isEnabled = false;

      type addDropdownSettingArgs = Parameters<SettingsTabSection['addDropdownSetting']>;
      let dropdownSettingOnChangeFn: addDropdownSettingArgs[6];

      const addDropdownSettingSpy = jest
        .spyOn(SettingsTabSection.prototype, 'addDropdownSetting')
        .mockImplementationOnce((...args) => {
          dropdownSettingOnChangeFn = args[6];
          return mock<Setting>();
        });

      const configSaveSpy = jest.spyOn(config, 'save');

      sut.showLauncherButtonOverrides(mockContainerEl, config);

      // trigger the save
      dropdownSettingOnChangeFn(finalValue, config);

      expect(config.mobileLauncher.modeString).toBe(finalValue);
      expect(configSaveSpy).toHaveBeenCalled();
      expect(displaySpy).toHaveBeenCalled();

      addDropdownSettingSpy.mockRestore();
      configSaveSpy.mockRestore();
      displaySpy.mockRestore();
    });
  });

  describe('showMatchPriorityAdjustments', () => {
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

    it('should call addToggleSetting with SettingGroup instead of containerEl', () => {
      sut.showMatchPriorityAdjustments(mockContainerEl, config);

      // Verify that addToggleSetting was called with a SettingGroup instance (not containerEl)
      const toggleCall = addToggleSettingSpy.mock.calls.find(
        (call: addToggleSettingArgs) => call[1] === 'Result priority adjustments',
      ) as addToggleSettingArgs;

      expect(toggleCall[0]).toBeInstanceOf(SettingGroup);
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
      const rejectedPromise = Promise.reject(new Error(errorMsg));
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

      await expect(rejectedPromise).rejects.toBeTruthy();
      expect(saveSettingsSpy).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ message: errorMsg }),
      );

      addToggleSettingSpy.mockReset();
      consoleLogSpy.mockRestore();
    });

    it('should call addSliderSetting with SettingGroup instead of containerEl when enabled', () => {
      const addSliderSettingSpy = jest.spyOn(
        SettingsTabSection.prototype,
        'addSliderSetting',
      );

      config.matchPriorityAdjustments.isEnabled = true;

      sut.showMatchPriorityAdjustments(mockContainerEl, config);

      // Verify that addSliderSetting was called with a SettingGroup instance (not containerEl)
      expect(addSliderSettingSpy).toHaveBeenCalled();

      const sliderCalls = addSliderSettingSpy.mock.calls;
      sliderCalls.forEach((call) => {
        expect(call[0]).toBeInstanceOf(SettingGroup);
      });

      expect(addSliderSettingSpy).not.toHaveBeenCalledWith(
        mockContainerEl,
        expect.any(String),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
      );

      config.matchPriorityAdjustments.isEnabled = false;
      addSliderSettingSpy.mockRestore();
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

    it('should refresh the mainSettingsTab panel when the master toggle changes', async () => {
      const initialEnabledValue = false;
      const finalEnabledValue = true;
      const savePromise = Promise.resolve();

      config.renderMarkdownContentInSuggestions.isEnabled = initialEnabledValue;
      saveSettingsSpy.mockReturnValueOnce(savePromise);
      addToggleSettingSpy.mockImplementation((...args: addToggleSettingArgs) => {
        if (args[1] === 'Display markdown content as Live Preview') {
          toggleSettingOnChangeFn = args[5];
        }

        return mock<Setting>({ nameEl: mock<HTMLElement>() });
      });

      sut.showRenderMarkdownContentAsHTML(mockContainerEl, config);

      // trigger the change/save
      toggleSettingOnChangeFn(finalEnabledValue, config);

      await savePromise;

      expect(saveSettingsSpy).toHaveBeenCalled();
      expect(mockPluginSettingTab.display).toHaveBeenCalled();
      expect(config.renderMarkdownContentInSuggestions.isEnabled).toBe(finalEnabledValue);

      config.renderMarkdownContentInSuggestions.isEnabled = false;
      addToggleSettingSpy.mockReset();
      mockPluginSettingTab.display.mockClear();
    });

    it('should save changes to individual symbol type toggles when master toggle is enabled', () => {
      const initialValue = false;
      const finalValue = true;
      const saveSpy = jest.spyOn(config, 'save').mockReturnValueOnce();

      config.renderMarkdownContentInSuggestions.isEnabled = true;
      config.renderMarkdownContentInSuggestions.renderHeadings = initialValue;
      let headingsToggleOnChangeFn: addToggleSettingArgs[5];

      addToggleSettingSpy.mockImplementation((...args: addToggleSettingArgs) => {
        if (args[1] === 'Headings') {
          headingsToggleOnChangeFn = args[5];
        }

        return mock<Setting>({ nameEl: mock<HTMLElement>() });
      });

      sut.showRenderMarkdownContentAsHTML(mockContainerEl, config);

      // trigger the change/save
      headingsToggleOnChangeFn(finalValue, config);

      expect(config.renderMarkdownContentInSuggestions.renderHeadings).toBe(finalValue);
      expect(saveSpy).toHaveBeenCalled();

      config.renderMarkdownContentInSuggestions.renderHeadings = false;
      config.renderMarkdownContentInSuggestions.isEnabled = false;
      addToggleSettingSpy.mockReset();
      saveSpy.mockRestore();
    });

    it('should log error to the console when setting cannot be saved', async () => {
      const errorMsg = 'showRenderMarkdownContentAsHTML Unit test error';
      const rejectedPromise = Promise.reject(new Error(errorMsg));
      const consoleLogSpy = jest.spyOn(console, 'log').mockReturnValueOnce();

      addToggleSettingSpy.mockImplementation((...args: addToggleSettingArgs) => {
        if (args[1] === 'Display markdown content as Live Preview') {
          toggleSettingOnChangeFn = args[5];
        }

        return mock<Setting>({ nameEl: mock<HTMLElement>() });
      });

      saveSettingsSpy.mockReturnValueOnce(rejectedPromise);

      sut.showRenderMarkdownContentAsHTML(mockContainerEl, config);

      // trigger the change/save
      toggleSettingOnChangeFn(true, config);

      await expect(rejectedPromise).rejects.toBeTruthy();
      expect(saveSettingsSpy).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ message: errorMsg }),
      );

      addToggleSettingSpy.mockReset();
      consoleLogSpy.mockRestore();
    });

    it('should call addToggleSetting with SettingGroup instead of containerEl for master toggle', () => {
      sut.showRenderMarkdownContentAsHTML(mockContainerEl, config);

      // Verify that addToggleSetting was called with a SettingGroup instance (not containerEl)
      const toggleCall = addToggleSettingSpy.mock.calls.find(
        (call: addToggleSettingArgs) =>
          call[1] === 'Display markdown content as Live Preview',
      ) as addToggleSettingArgs;

      expect(toggleCall[0]).toBeInstanceOf(SettingGroup);
    });

    it('should call addToggleSetting with SettingGroup instead of containerEl for conditional child toggles when enabled', () => {
      config.renderMarkdownContentInSuggestions.isEnabled = true;

      sut.showRenderMarkdownContentAsHTML(mockContainerEl, config);

      // Verify that addToggleSetting was called with a SettingGroup instance (not containerEl)
      const childToggleCalls = addToggleSettingSpy.mock.calls.filter(
        (call: addToggleSettingArgs) =>
          call[1] === 'Headings' ||
          call[1] === 'Links' ||
          call[1] === 'Tags' ||
          call[1] === 'Callouts',
      ) as addToggleSettingArgs[];

      expect(childToggleCalls.length).toBeGreaterThan(0);
      childToggleCalls.forEach((call) => {
        expect(call[0]).toBeInstanceOf(SettingGroup);
      });

      config.renderMarkdownContentInSuggestions.isEnabled = false;
    });

    it('should add experimental tag to master toggle nameEl', () => {
      const mockNameEl = mock<HTMLElement>();
      const createSpanSpy = jest
        .spyOn(mockNameEl, 'createSpan')
        .mockReturnValue(mock<HTMLElement>());
      const mockSetting = mock<Setting>({ nameEl: mockNameEl });

      addToggleSettingSpy.mockImplementation((...args: addToggleSettingArgs) => {
        if (args[1] === 'Display markdown content as Live Preview') {
          return mockSetting;
        }
        return mock<Setting>();
      });

      sut.showRenderMarkdownContentAsHTML(mockContainerEl, config);

      expect(createSpanSpy).toHaveBeenCalledWith({
        cls: ['qsp-tag', 'qsp-warning'],
        text: 'Experimental',
      });

      createSpanSpy.mockRestore();
    });

    describe('showQuickOpen', () => {
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
    let toggleSettingOnChangeFn: addToggleSettingArgs[5];
    let saveSettingsSpy: jest.SpyInstance;
    let createSettingSpy: jest.SpyInstance;

    beforeAll(() => {
      saveSettingsSpy = jest.spyOn(config, 'saveSettings');
      createSettingSpy = jest.spyOn(SettingsTabSection.prototype, 'createSetting');
    });

    afterAll(() => {
      saveSettingsSpy.mockRestore();
      createSettingSpy.mockRestore();
    });

    beforeEach(() => {
      createSettingSpy.mockClear();
      addToggleSettingSpy.mockClear();
    });

    it('should create a setting with title and description "Insert link in editor" in the SettingGroup', () => {
      sut.showInsertLinkInEditor(mockContainerEl, config);

      // Verify that createSetting was called with a SettingGroup instance (not containerEl)
      expect(createSettingSpy).toHaveBeenCalled();

      type createSettingArgs = Parameters<SettingsTabSection['createSetting']>;
      const createSettingCall = createSettingSpy.mock.calls.find(
        (call: createSettingArgs) => call[1] === 'Insert link in editor',
      ) as createSettingArgs | undefined;

      expect(createSettingCall?.[0]).toBeInstanceOf(SettingGroup);
      expect(createSettingCall?.[1]).toBe('Insert link in editor');
    });

    it('should not call createSetting with containerEl for the label', () => {
      sut.showInsertLinkInEditor(mockContainerEl, config);

      expect(createSettingSpy).not.toHaveBeenCalledWith(
        mockContainerEl,
        'Insert link in editor',
        expect.any(String),
      );
    });

    it('should call addToggleSetting with SettingGroup instead of containerEl for both toggles', () => {
      sut.showInsertLinkInEditor(mockContainerEl, config);

      // Verify that addToggleSetting was called with a SettingGroup instance (not containerEl)
      const toggleCalls = addToggleSettingSpy.mock.calls.filter(
        (call: addToggleSettingArgs) =>
          call[1] === 'Use filename as alias' || call[1] === 'Use heading as alias',
      ) as addToggleSettingArgs[];

      expect(toggleCalls).toHaveLength(2);
      toggleCalls.forEach((call) => {
        expect(call[0]).toBeInstanceOf(SettingGroup);
      });
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

  describe('showPreferredSourceForTitle', () => {
    let addDropdownSettingSpy: jest.SpyInstance;
    let addTextSettingSpy: jest.SpyInstance;

    beforeAll(() => {
      addDropdownSettingSpy = jest.spyOn(
        SettingsTabSection.prototype,
        'addDropdownSetting',
      );
      addTextSettingSpy = jest.spyOn(SettingsTabSection.prototype, 'addTextSetting');
    });

    afterAll(() => {
      addDropdownSettingSpy.mockRestore();
      addTextSettingSpy.mockRestore();
    });

    beforeEach(() => {
      addDropdownSettingSpy.mockClear();
      addTextSettingSpy.mockClear();
    });

    it('should call addDropdownSetting with SettingGroup instead of containerEl', () => {
      sut.showPreferredSourceForTitle(mockContainerEl, config);

      // Verify that addDropdownSetting was called with a SettingGroup instance (not containerEl)
      expect(addDropdownSettingSpy).toHaveBeenCalled();

      const dropdownCall = addDropdownSettingSpy.mock.calls.find(
        (call: addDropdownSettingArgs) => call[1] === 'Preferred suggestion title source',
      ) as addDropdownSettingArgs | undefined;

      expect(dropdownCall?.[0]).toBeInstanceOf(SettingGroup);
    });

    it('should render dropdown with all three title source options', () => {
      sut.showPreferredSourceForTitle(mockContainerEl, config);

      expect(addDropdownSettingSpy).toHaveBeenCalled();

      const dropdownCall = addDropdownSettingSpy.mock.calls.find(
        (call: addDropdownSettingArgs) => call[1] === 'Preferred suggestion title source',
      ) as addDropdownSettingArgs | undefined;

      expect(dropdownCall?.[0]).toBeInstanceOf(SettingGroup);
      expect(dropdownCall?.[1]).toBe('Preferred suggestion title source');
      expect(dropdownCall?.[4]).toEqual(
        expect.objectContaining({
          Default: 'Default',
          H1: 'First H₁ heading',
          FrontMatter: 'Frontmatter property',
        }),
      );
    });

    it('should not render text input when preferredSourceForTitle is Default', () => {
      config.preferredSourceForTitle = 'Default';

      sut.showPreferredSourceForTitle(mockContainerEl, config);

      expect(addDropdownSettingSpy).toHaveBeenCalled();
      expect(addTextSettingSpy).not.toHaveBeenCalled();
    });

    it('should not render text input when preferredSourceForTitle is H1', () => {
      config.preferredSourceForTitle = 'H1';

      sut.showPreferredSourceForTitle(mockContainerEl, config);

      expect(addDropdownSettingSpy).toHaveBeenCalled();
      expect(addTextSettingSpy).not.toHaveBeenCalled();
    });

    it('should call addTextSetting with SettingGroup instead of containerEl when FrontMatter is selected', () => {
      config.preferredSourceForTitle = 'FrontMatter';

      sut.showPreferredSourceForTitle(mockContainerEl, config);

      expect(addDropdownSettingSpy).toHaveBeenCalled();
      expect(addTextSettingSpy).toHaveBeenCalled();

      type addTextSettingArgs = Parameters<SettingsTabSection['addTextSetting']>;
      const textSettingCall = addTextSettingSpy.mock.calls.find(
        (call: addTextSettingArgs) => call[1] === 'Frontmatter property path',
      ) as addTextSettingArgs | undefined;

      expect(textSettingCall?.[0]).toBeInstanceOf(SettingGroup);
      expect(textSettingCall?.[1]).toBe('Frontmatter property path');
      expect(textSettingCall?.[2]).toEqual(expect.stringContaining('dot notation'));
    });

    it('should refresh the settings page to show the new options when dropdown value changes', () => {
      const displaySpy = jest.spyOn(mockPluginSettingTab, 'display');

      sut.showPreferredSourceForTitle(mockContainerEl, config);

      const dropdownArgs = addDropdownSettingSpy.mock.calls[0] as addDropdownSettingArgs;
      const dropdownSettingOnChangeFn = dropdownArgs[6];
      const saveSpy = jest.spyOn(config, 'save');

      dropdownSettingOnChangeFn?.('FrontMatter', config);

      expect(config.preferredSourceForTitle).toBe('FrontMatter');
      expect(saveSpy).toHaveBeenCalled();
      expect(displaySpy).toHaveBeenCalled();

      saveSpy.mockRestore();
    });
  });

  describe('showTagDisplaySettings', () => {
    type addTextAreaSettingArgs = Parameters<SettingsTabSection['addTextAreaSetting']>;
    let toggleSettingOnChangeFn: addToggleSettingArgs[5];
    let saveSettingsSpy: jest.SpyInstance;
    let addSectionTitleSpy: jest.SpyInstance;
    let addSliderSettingSpy: jest.SpyInstance;
    let addDropdownSettingSpy: jest.SpyInstance;
    let addTextAreaSettingSpy: jest.SpyInstance;
    let addTextSettingSpy: jest.SpyInstance;

    beforeAll(() => {
      saveSettingsSpy = jest.spyOn(config, 'saveSettings');
      addSectionTitleSpy = jest.spyOn(SettingsTabSection.prototype, 'addSectionTitle');
      addSliderSettingSpy = jest
        .spyOn(SettingsTabSection.prototype, 'addSliderSetting')
        .mockReturnValue(mock<Setting>());
      addDropdownSettingSpy = jest
        .spyOn(SettingsTabSection.prototype, 'addDropdownSetting')
        .mockReturnValue(mock<Setting>());
      addTextAreaSettingSpy = jest
        .spyOn(SettingsTabSection.prototype, 'addTextAreaSetting')
        .mockReturnValue(mock<Setting>());
      addTextSettingSpy = jest
        .spyOn(SettingsTabSection.prototype, 'addTextSetting')
        .mockReturnValue(mock<Setting>());
    });

    afterAll(() => {
      saveSettingsSpy.mockRestore();
      addSectionTitleSpy.mockRestore();
      addSliderSettingSpy.mockRestore();
      addDropdownSettingSpy.mockRestore();
      addTextAreaSettingSpy.mockRestore();
      addTextSettingSpy.mockRestore();
    });

    afterEach(() => {
      toggleSettingOnChangeFn = null;
      config.showTagsInSuggestions = false;
      addToggleSettingSpy.mockClear();
      addSectionTitleSpy.mockClear();
      addSliderSettingSpy.mockClear();
      addDropdownSettingSpy.mockClear();
      addTextAreaSettingSpy.mockClear();
      addTextSettingSpy.mockClear();
    });

    it('should show the showTagsInSuggestions master toggle', () => {
      sut.showTagDisplaySettings(mockContainerEl, config);

      expect(addToggleSettingSpy).toHaveBeenCalledWith(
        expect.any(SettingGroup),
        'Show tags in suggestions',
        expect.any(String),
        config.showTagsInSuggestions,
        null,
        expect.any(Function),
      );
    });

    it('should refresh the mainSettingsTab panel when showTagsInSuggestions changes', async () => {
      const initialValue = false;
      const finalValue = true;
      const savePromise = Promise.resolve();

      config.showTagsInSuggestions = initialValue;
      saveSettingsSpy.mockReturnValueOnce(savePromise);
      addToggleSettingSpy.mockImplementation((...args: addToggleSettingArgs) => {
        if (args[1] === 'Show tags in suggestions') {
          toggleSettingOnChangeFn = args[5];
        }

        return mock<Setting>();
      });

      sut.showTagDisplaySettings(mockContainerEl, config);

      // trigger the change/save
      toggleSettingOnChangeFn(finalValue, config);

      await savePromise;

      expect(saveSettingsSpy).toHaveBeenCalled();
      expect(mockPluginSettingTab.display).toHaveBeenCalled();
      expect(config.showTagsInSuggestions).toBe(finalValue);

      mockPluginSettingTab.display.mockClear();
    });

    it('should log error to the console when setting cannot be saved', async () => {
      const errorMsg = 'showTagDisplaySettings Unit test error';
      const rejectedPromise = Promise.reject(new Error(errorMsg));
      const consoleLogSpy = jest.spyOn(console, 'log').mockReturnValueOnce();

      addToggleSettingSpy.mockImplementation((...args: addToggleSettingArgs) => {
        if (args[1] === 'Show tags in suggestions') {
          toggleSettingOnChangeFn = args[5];
        }

        return mock<Setting>();
      });

      saveSettingsSpy.mockReturnValueOnce(rejectedPromise);

      sut.showTagDisplaySettings(mockContainerEl, config);

      // trigger the change/save
      toggleSettingOnChangeFn(true, config);

      await expect(rejectedPromise).rejects.toBeTruthy();
      expect(saveSettingsSpy).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ message: errorMsg }),
      );

      consoleLogSpy.mockRestore();
    });

    it('should show tag source dropdown when master toggle is enabled', () => {
      config.showTagsInSuggestions = true;
      addToggleSettingSpy.mockReturnValue(mock<Setting>());

      sut.showTagDisplaySettings(mockContainerEl, config);

      expect(addDropdownSettingSpy).toHaveBeenCalledWith(
        expect.any(SettingGroup),
        'Tag source',
        expect.any(String),
        config.tagSource,
        expect.objectContaining({
          [TagSource.Both]: 'Both',
          [TagSource.Inline]: 'Inline only',
          [TagSource.Frontmatter]: 'Frontmatter only',
        }),
        null,
        expect.any(Function),
      );
    });

    it('should save tag source setting when changed', () => {
      config.showTagsInSuggestions = true;
      config.tagSource = TagSource.Both;
      const finalValue = TagSource.Inline;
      addToggleSettingSpy.mockReturnValue(mock<Setting>());

      let dropdownOnChangeFn: addDropdownSettingArgs[6];
      addDropdownSettingSpy.mockImplementation((...args: addDropdownSettingArgs) => {
        if (args[1] === 'Tag source') {
          dropdownOnChangeFn = args[6];
        }
        return mock<Setting>();
      });

      const saveSpy = jest.spyOn(config, 'save');

      sut.showTagDisplaySettings(mockContainerEl, config);

      // trigger the change/save
      dropdownOnChangeFn(finalValue, config);

      expect(config.tagSource).toBe(finalValue);
      expect(saveSpy).toHaveBeenCalled();

      config.tagSource = TagSource.Both;
      saveSpy.mockRestore();
    });

    it('should show excluded tags textarea when master toggle is enabled', () => {
      config.showTagsInSuggestions = true;
      addToggleSettingSpy.mockReturnValue(mock<Setting>());

      sut.showTagDisplaySettings(mockContainerEl, config);

      expect(addTextAreaSettingSpy).toHaveBeenCalledWith(
        expect.any(SettingGroup),
        'Excluded tags',
        expect.any(String),
        config.excludeTagsFromDisplay.join('\n'),
        null,
        expect.any(String),
        expect.any(Function),
      );
    });

    it('should save excluded tags setting when changed', () => {
      config.showTagsInSuggestions = true;
      config.excludeTagsFromDisplay = [];
      const finalValue = ['tag1', 'tag2'];
      addToggleSettingSpy.mockReturnValue(mock<Setting>());

      let textAreaOnChangeFn: addTextAreaSettingArgs[6];
      addTextAreaSettingSpy.mockImplementation((...args: addTextAreaSettingArgs) => {
        if (args[1] === 'Excluded tags') {
          textAreaOnChangeFn = args[6];
        }
        return mock<Setting>();
      });

      const saveSpy = jest.spyOn(config, 'save');

      sut.showTagDisplaySettings(mockContainerEl, config);

      // trigger the change/save
      textAreaOnChangeFn(finalValue.join('\n'), config);

      expect(config.excludeTagsFromDisplay).toEqual(finalValue);
      expect(saveSpy).toHaveBeenCalled();

      config.excludeTagsFromDisplay = [];
      saveSpy.mockRestore();
    });

    it('should show max tags slider when master toggle is enabled', () => {
      config.showTagsInSuggestions = true;
      addToggleSettingSpy.mockReturnValue(mock<Setting>());

      sut.showTagDisplaySettings(mockContainerEl, config);

      expect(addSliderSettingSpy).toHaveBeenCalledWith(
        expect.any(SettingGroup),
        'Max tags to display',
        expect.any(String),
        config.maxTagsToDisplay,
        [0, 20, 1, 5],
        'maxTagsToDisplay',
      );
    });

    it('should show tag separator text setting when master toggle is enabled', () => {
      config.showTagsInSuggestions = true;
      addToggleSettingSpy.mockReturnValue(mock<Setting>());

      sut.showTagDisplaySettings(mockContainerEl, config);

      expect(addTextSettingSpy).toHaveBeenCalledWith(
        expect.any(SettingGroup),
        'Tag separator',
        expect.any(String),
        config.tagDisplaySeparator,
        'tagDisplaySeparator',
        ', ',
      );
    });

    it('should show remove hash prefix toggle when master toggle is enabled', () => {
      config.showTagsInSuggestions = true;
      addToggleSettingSpy.mockReturnValue(mock<Setting>());

      sut.showTagDisplaySettings(mockContainerEl, config);

      expect(addToggleSettingSpy).toHaveBeenCalledWith(
        expect.any(SettingGroup),
        'Remove # prefix from tags',
        expect.any(String),
        config.removeHashPrefixFromTags,
        'removeHashPrefixFromTags',
      );
    });

    it('should not show sub-settings when master toggle is disabled', () => {
      config.showTagsInSuggestions = false;

      sut.showTagDisplaySettings(mockContainerEl, config);

      // Master toggle should still be shown
      expect(addToggleSettingSpy).toHaveBeenCalledWith(
        expect.any(SettingGroup),
        'Show tags in suggestions',
        expect.any(String),
        config.showTagsInSuggestions,
        null,
        expect.any(Function),
      );

      // But sub-settings should not be called for tag-specific settings
      // (only the master toggle call should exist)
      expect(addDropdownSettingSpy).not.toHaveBeenCalledWith(
        mockContainerEl,
        'Tag source',
        expect.any(String),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
      );
      expect(addTextAreaSettingSpy).not.toHaveBeenCalledWith(
        mockContainerEl,
        'Excluded tags',
        expect.any(String),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
      );
      expect(addSliderSettingSpy).not.toHaveBeenCalledWith(
        mockContainerEl,
        'Max tags to display',
        expect.any(String),
        expect.anything(),
        expect.anything(),
        expect.anything(),
      );
      expect(addTextSettingSpy).not.toHaveBeenCalledWith(
        mockContainerEl,
        'Tag separator',
        expect.any(String),
        expect.anything(),
        expect.anything(),
        expect.anything(),
      );
    });
  });
});
