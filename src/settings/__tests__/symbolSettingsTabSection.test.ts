import { LinkType, SymbolType } from 'src/types';
import {
  SymbolSettingsTabSection,
  SettingsTabSection,
  SwitcherPlusSettings,
  SwitcherPlusSettingTab,
} from 'src/settings';
import { mock, mockClear, MockProxy } from 'jest-mock-extended';
import { App, Setting, ViewRegistry } from 'obsidian';

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
        'Symbol List Mode Settings',
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

    it('should show the alwaysNewTabForSymbols setting', () => {
      sut.display(mockContainerEl);

      expect(addToggleSettingSpy).toHaveBeenCalledWith(
        mockContainerEl,
        'Open Symbols in new tab',
        expect.any(String),
        config.alwaysNewTabForSymbols,
        'alwaysNewTabForSymbols',
      );
    });

    it('should show the useActiveTabForSymbolsOnMobile setting', () => {
      sut.display(mockContainerEl);

      expect(addToggleSettingSpy).toHaveBeenCalledWith(
        mockContainerEl,
        'Open Symbols in active tab on mobile devices',
        expect.any(String),
        config.useActiveTabForSymbolsOnMobile,
        'useActiveTabForSymbolsOnMobile',
      );
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

      expect(addToggleSettingSpy).toHaveBeenCalledWith(
        mockContainerEl,
        'Show Links',
        expect.any(String),
        true,
        null,
        expect.any(Function),
      );
    });

    it('should show the symbol type setting for Links to headings', () => {
      sut.display(mockContainerEl);

      expect(addToggleSettingSpy).toHaveBeenCalledWith(
        mockContainerEl,
        'Links to headings',
        expect.any(String),
        true,
        null,
        expect.any(Function),
      );
    });

    it('should show the symbol type setting for Links to blocks', () => {
      sut.display(mockContainerEl);

      expect(addToggleSettingSpy).toHaveBeenCalledWith(
        mockContainerEl,
        'Links to blocks',
        expect.any(String),
        true,
        null,
        expect.any(Function),
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
      const errorMsg = 'Unit test error';
      const rejectedPromise = Promise.reject(errorMsg);
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

      try {
        await rejectedPromise;
      } catch (e) {
        /* noop */
      }

      expect(mockConfig.saveSettings).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Switcher++: error saving "Show Links" setting. ',
        errorMsg,
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
