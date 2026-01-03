import { LinkType, SymbolType } from 'src/types';
import {
  SymbolSettingsTabSection,
  SettingsTabSection,
  SwitcherPlusSettings,
  SwitcherPlusSettingTab,
} from 'src/settings';
import { mock, mockClear, MockProxy } from 'jest-mock-extended';
import { App, Setting, SettingGroup, ViewRegistry } from 'obsidian';

describe('symbolSettingsTabSection', () => {
  let mockApp: MockProxy<App>;
  let mockPluginSettingTab: MockProxy<SwitcherPlusSettingTab>;
  let config: SwitcherPlusSettings;
  let mockContainerEl: MockProxy<HTMLElement>;
  let addToggleSettingSpy: jest.SpyInstance;
  let sut: SymbolSettingsTabSection;

  beforeAll(() => {
    mockApp = mock<App>({ viewRegistry: mock<ViewRegistry>() });
    mockContainerEl = mock<HTMLElement>();
    mockPluginSettingTab = mock<SwitcherPlusSettingTab>({ containerEl: mockContainerEl });
    config = new SwitcherPlusSettings(null);
    addToggleSettingSpy = jest.spyOn(SettingsTabSection.prototype, 'addToggleSetting');
  });

  afterAll(() => {
    addToggleSettingSpy.mockRestore();
  });

  describe('display settings', () => {
    beforeAll(() => {
      sut = new SymbolSettingsTabSection(mockApp, mockPluginSettingTab, config);
    });

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
        'Symbol List Mode',
      );

      addSectionTitleSpy.mockRestore();
    });

    it('should show the mode trigger setting', () => {
      const addTextSettingSpy = jest.spyOn(
        SettingsTabSection.prototype,
        'addTextSetting',
      );

      sut.display(mockContainerEl);

      expect(addTextSettingSpy).toHaveBeenCalledWith(
        mockContainerEl,
        'Symbol list mode trigger',
        expect.any(String),
        config.symbolListCommand,
        'symbolListCommand',
        config.symbolListPlaceholderText,
      );

      addTextSettingSpy.mockRestore();
    });

    it('should show the symbolsInLineOrder setting', () => {
      sut.display(mockContainerEl);

      expect(addToggleSettingSpy).toHaveBeenCalledWith(
        mockContainerEl,
        'List symbols as indented outline',
        expect.any(String),
        config.symbolsInLineOrder,
        'symbolsInLineOrder',
      );
    });

    it('should call showSymbolTabBehaviorGroup', () => {
      const showSymbolTabBehaviorGroupSpy = jest
        .spyOn(sut, 'showSymbolTabNavigationBehavior')
        .mockReturnValueOnce();

      sut.display(mockContainerEl);

      expect(showSymbolTabBehaviorGroupSpy).toHaveBeenCalledWith(mockContainerEl, config);

      showSymbolTabBehaviorGroupSpy.mockRestore();
    });

    it('should show the selectNearestHeading setting', () => {
      sut.display(mockContainerEl);

      expect(addToggleSettingSpy).toHaveBeenCalledWith(
        mockContainerEl,
        'Auto-select nearest heading',
        expect.any(String),
        config.selectNearestHeading,
        'selectNearestHeading',
      );
    });

    it('should show the symbol type setting for Headings', () => {
      sut.display(mockContainerEl);

      expect(addToggleSettingSpy).toHaveBeenCalledWith(
        mockContainerEl,
        'Show Headings',
        expect.any(String),
        true,
        null,
        expect.any(Function),
      );
    });

    it('should show the symbol type setting for Tags', () => {
      sut.display(mockContainerEl);

      expect(addToggleSettingSpy).toHaveBeenCalledWith(
        mockContainerEl,
        'Show Tags',
        expect.any(String),
        true,
        null,
        expect.any(Function),
      );
    });

    it('should show the symbol type setting for Embeds', () => {
      sut.display(mockContainerEl);

      expect(addToggleSettingSpy).toHaveBeenCalledWith(
        mockContainerEl,
        'Show Embeds',
        expect.any(String),
        true,
        null,
        expect.any(Function),
      );
    });

    it('should show the symbol type setting for Callouts', () => {
      sut.display(mockContainerEl);

      expect(addToggleSettingSpy).toHaveBeenCalledWith(
        mockContainerEl,
        'Show Callouts',
        expect.any(String),
        true,
        null,
        expect.any(Function),
      );
    });

    it('should show the symbol type setting for Links', () => {
      sut.display(mockContainerEl);

      // Verify that addToggleSetting was called with a SettingGroup
      const toggleCall = addToggleSettingSpy.mock.calls.find(
        (call: Parameters<SettingsTabSection['addToggleSetting']>) =>
          call[1] === 'Show Links',
      ) as Parameters<SettingsTabSection['addToggleSetting']>;

      expect(toggleCall[0]).toBeInstanceOf(SettingGroup);
    });

    it('should show the symbol type setting for Links to headings', () => {
      config.setSymbolTypeEnabled(SymbolType.Link, true);
      sut.display(mockContainerEl);

      // Verify that addToggleSetting was called with a SettingGroup
      const toggleCall = addToggleSettingSpy.mock.calls.find(
        (call: Parameters<SettingsTabSection['addToggleSetting']>) =>
          call[1] === 'Links to headings',
      ) as Parameters<SettingsTabSection['addToggleSetting']>;

      expect(toggleCall[0]).toBeInstanceOf(SettingGroup);
    });

    it('should show the symbol type setting for Links to blocks', () => {
      config.setSymbolTypeEnabled(SymbolType.Link, true);
      sut.display(mockContainerEl);

      // Verify that addToggleSetting was called with a SettingGroup
      const toggleCall = addToggleSettingSpy.mock.calls.find(
        (call: Parameters<SettingsTabSection['addToggleSetting']>) =>
          call[1] === 'Links to blocks',
      ) as Parameters<SettingsTabSection['addToggleSetting']>;

      expect(toggleCall[0]).toBeInstanceOf(SettingGroup);
    });
  });

  describe('showSymbolTabNavigationBehavior', () => {
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

    it('should create a setting with title and description in the SettingGroup', () => {
      sut.showSymbolTabNavigationBehavior(mockContainerEl, config);

      // Verify that createSetting was called with a SettingGroup instance
      expect(createSettingSpy).toHaveBeenCalled();

      type createSettingArgs = Parameters<SettingsTabSection['createSetting']>;
      const createSettingCall = createSettingSpy.mock.calls.find(
        (call: createSettingArgs) => call[1] === 'Symbol Tab navigation behavior',
      ) as createSettingArgs | undefined;

      expect(createSettingCall?.[0]).toBeInstanceOf(SettingGroup);
    });

    it('should show the alwaysNewTabForSymbols setting', () => {
      sut.showSymbolTabNavigationBehavior(mockContainerEl, config);

      expect(addToggleSettingSpy).toHaveBeenCalledWith(
        expect.any(SettingGroup),
        'Open Symbols in new tab',
        expect.any(String),
        config.alwaysNewTabForSymbols,
        'alwaysNewTabForSymbols',
      );
    });

    it('should show the useActiveTabForSymbolsOnMobile setting', () => {
      sut.showSymbolTabNavigationBehavior(mockContainerEl, config);

      expect(addToggleSettingSpy).toHaveBeenCalledWith(
        expect.any(SettingGroup),
        'Open Symbols in active tab on mobile devices',
        expect.any(String),
        config.useActiveTabForSymbolsOnMobile,
        'useActiveTabForSymbolsOnMobile',
      );
    });
  });

  describe('showEnableSymbolTypesToggle', () => {
    const mockConfig = mock<SwitcherPlusSettings>();

    beforeAll(() => {
      sut = new SymbolSettingsTabSection(mockApp, mockPluginSettingTab, mockConfig);
    });

    it('should save settings changes', () => {
      let toggleSettingOnChangeFn: (v: boolean) => void;
      const initialEnabledValue = false;
      const finalEnabledValue = true;

      mockConfig.isSymbolTypeEnabled.mockReturnValue(initialEnabledValue);
      addToggleSettingSpy.mockImplementation((...args: unknown[]) => {
        if (args[1] === 'Show Callouts') {
          const onChangeFn = args[5] as (v: boolean) => void;
          toggleSettingOnChangeFn = onChangeFn;
        }
      });

      sut.showEnableSymbolTypesToggle(mockContainerEl, mockConfig);

      if (toggleSettingOnChangeFn) {
        // trigger the change/save
        toggleSettingOnChangeFn(finalEnabledValue);
      }

      expect(mockConfig.setSymbolTypeEnabled).toHaveBeenLastCalledWith(
        SymbolType.Callout,
        finalEnabledValue,
      );

      expect(mockConfig.save).toHaveBeenCalled();

      addToggleSettingSpy.mockReset();
    });
  });

  describe('showEnableLinksToggle', () => {
    const mockConfig = mock<SwitcherPlusSettings>();
    type addToggleSettingArgs = Parameters<SettingsTabSection['addToggleSetting']>;
    let toggleSettingOnChangeFn: addToggleSettingArgs[5];

    beforeAll(() => {
      sut = new SymbolSettingsTabSection(mockApp, mockPluginSettingTab, mockConfig);
    });

    afterEach(() => {
      mockClear(mockConfig);
      toggleSettingOnChangeFn = null;
    });

    it('should refresh the mainSettingsTab panel when the Links setting changes', async () => {
      const initialEnabledValue = false;
      const finalEnabledValue = true;
      const savePromise = Promise.resolve();

      addToggleSettingSpy.mockImplementation((...args: addToggleSettingArgs) => {
        if (args[1] === 'Show Links') {
          toggleSettingOnChangeFn = args[5];
        }

        return mock<Setting>();
      });

      mockConfig.saveSettings.mockReturnValueOnce(savePromise);
      mockConfig.isSymbolTypeEnabled.mockReturnValue(initialEnabledValue);

      sut.showEnableLinksToggle(mockContainerEl, mockConfig);

      // trigger the change/save
      toggleSettingOnChangeFn(finalEnabledValue, mockConfig);

      await savePromise;

      expect(mockConfig.saveSettings).toHaveBeenCalled();
      expect(mockPluginSettingTab.display).toHaveBeenCalled();
      expect(mockConfig.setSymbolTypeEnabled).toHaveBeenLastCalledWith(
        SymbolType.Link,
        finalEnabledValue,
      );

      addToggleSettingSpy.mockReset();
      mockPluginSettingTab.display.mockClear();
    });

    it('should log error to the console when setting cannot be saved', async () => {
      const initialEnabledValue = false;
      const finalEnabledValue = true;
      const errorMsg = 'showEnableLinksToggle Unit test error';
      const rejectedPromise = Promise.reject(new Error(errorMsg));
      const consoleLogSpy = jest.spyOn(console, 'log').mockReturnValueOnce();

      addToggleSettingSpy.mockImplementation((...args: addToggleSettingArgs) => {
        if (args[1] === 'Show Links') {
          toggleSettingOnChangeFn = args[5];
        }

        return mock<Setting>();
      });

      mockConfig.saveSettings.mockReturnValueOnce(rejectedPromise);
      mockConfig.isSymbolTypeEnabled.mockReturnValue(initialEnabledValue);

      sut.showEnableLinksToggle(mockContainerEl, mockConfig);

      // trigger the change/save
      toggleSettingOnChangeFn(finalEnabledValue, mockConfig);

      await expect(rejectedPromise).rejects.toBeTruthy();
      expect(mockConfig.saveSettings).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ message: errorMsg }),
      );

      addToggleSettingSpy.mockReset();
      consoleLogSpy.mockRestore();
    });

    it('should save sublink type settings changes', () => {
      const initialEnabledValue = true;
      const finalEnabledValue = false;
      const saveEnableSubLinkChangeSpy = jest
        .spyOn(sut, 'saveEnableSubLinkChange')
        .mockReturnValue();

      addToggleSettingSpy.mockImplementation((...args: addToggleSettingArgs) => {
        if (args[1] === 'Links to blocks') {
          toggleSettingOnChangeFn = args[5];
        }

        return mock<Setting>();
      });

      mockConfig.isSymbolTypeEnabled.mockReturnValue(initialEnabledValue);

      sut.showEnableLinksToggle(mockContainerEl, mockConfig);

      // trigger the change/save
      toggleSettingOnChangeFn(finalEnabledValue, mockConfig);

      expect(saveEnableSubLinkChangeSpy).toHaveBeenLastCalledWith(
        LinkType.Block,
        finalEnabledValue,
      );

      addToggleSettingSpy.mockReset();
      saveEnableSubLinkChangeSpy.mockRestore();
    });
  });

  describe('saveEnableSubLinkChange', () => {
    const mockConfig = mock<SwitcherPlusSettings>();

    beforeAll(() => {
      sut = new SymbolSettingsTabSection(mockApp, mockPluginSettingTab, mockConfig);
    });

    it('should remove enabled sublink types from the exclusion list and save changes', () => {
      mockConfig.excludeLinkSubTypes = LinkType.Heading | LinkType.Block;

      sut.saveEnableSubLinkChange(LinkType.Block, true);

      const { excludeLinkSubTypes } = mockConfig;
      expect(excludeLinkSubTypes & LinkType.Heading).toBe(LinkType.Heading);
      expect(excludeLinkSubTypes & LinkType.Block).toBe(0);
      expect(mockConfig.save).toHaveBeenCalled();
    });

    it('should add disabled sublink types to the exclusion list and save changes', () => {
      mockConfig.excludeLinkSubTypes = LinkType.Heading;

      sut.saveEnableSubLinkChange(LinkType.Block, false);

      const { excludeLinkSubTypes } = mockConfig;
      expect(excludeLinkSubTypes & LinkType.Heading).toBe(LinkType.Heading);
      expect(excludeLinkSubTypes & LinkType.Block).toBe(LinkType.Block);
      expect(mockConfig.save).toHaveBeenCalled();
    });
  });
});
