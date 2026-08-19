import { LinkType, SymbolType } from 'src/types';
import {
  SymbolSettingsTabSection,
  SettingsTabSection,
  SwitcherPlusSettings,
  SwitcherPlusSettingTab,
} from 'src/settings';
import { mock, mockClear, MockProxy } from 'jest-mock-extended';
import {
  App,
  Setting,
  SettingDefinitionPage,
  SettingDefinitionRender,
  SettingGroup,
  ToggleComponent,
  ViewRegistry,
} from 'obsidian';
import { findSettingByKey, findSettingByName, isSettingVisible } from '@fixtures';
import * as Utils from 'src/utils/utils';

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
      config.enabledSymbolTypes[SymbolType.Link] = true;
      sut.display(mockContainerEl);

      // Verify that addToggleSetting was called with a SettingGroup
      const toggleCall = addToggleSettingSpy.mock.calls.find(
        (call: Parameters<SettingsTabSection['addToggleSetting']>) =>
          call[1] === 'Links to headings',
      ) as Parameters<SettingsTabSection['addToggleSetting']>;

      expect(toggleCall[0]).toBeInstanceOf(SettingGroup);
    });

    it('should show the symbol type setting for Links to blocks', () => {
      config.enabledSymbolTypes[SymbolType.Link] = true;
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
    const mockConfig = mock<SwitcherPlusSettings>({
      enabledSymbolTypes: {},
    });

    beforeAll(() => {
      sut = new SymbolSettingsTabSection(mockApp, mockPluginSettingTab, mockConfig);
    });

    it('should save settings changes', () => {
      let toggleSettingOnChangeFn: (v: boolean) => void;
      const initialEnabledValue = false;
      const finalEnabledValue = true;

      mockConfig.enabledSymbolTypes[SymbolType.Callout] = initialEnabledValue;
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

      expect(mockConfig.enabledSymbolTypes[SymbolType.Callout]).toBe(finalEnabledValue);

      expect(mockConfig.save).toHaveBeenCalled();

      addToggleSettingSpy.mockReset();
    });
  });

  describe('showEnableLinksToggle', () => {
    const mockConfig = mock<SwitcherPlusSettings>({
      enabledSymbolTypes: {},
    });
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
      mockConfig.enabledSymbolTypes[SymbolType.Link] = initialEnabledValue;

      sut.showEnableLinksToggle(mockContainerEl, mockConfig);

      // trigger the change/save
      toggleSettingOnChangeFn(finalEnabledValue, mockConfig);

      await savePromise;

      expect(mockConfig.saveSettings).toHaveBeenCalled();
      expect(mockPluginSettingTab.display).toHaveBeenCalled();
      expect(mockConfig.enabledSymbolTypes[SymbolType.Link]).toBe(finalEnabledValue);

      addToggleSettingSpy.mockReset();
      mockPluginSettingTab.display.mockClear();
    });

    it('should route save failures through notifyError', async () => {
      const initialEnabledValue = false;
      const finalEnabledValue = true;
      const errorMsg = 'showEnableLinksToggle Unit test error';
      const rejectedPromise = Promise.reject(new Error(errorMsg));
      const notifyErrorSpy = jest.spyOn(Utils, 'notifyError').mockReturnValueOnce();

      addToggleSettingSpy.mockImplementation((...args: addToggleSettingArgs) => {
        if (args[1] === 'Show Links') {
          toggleSettingOnChangeFn = args[5];
        }

        return mock<Setting>();
      });

      mockConfig.saveSettings.mockReturnValueOnce(rejectedPromise);
      mockConfig.enabledSymbolTypes[SymbolType.Link] = initialEnabledValue;

      sut.showEnableLinksToggle(mockContainerEl, mockConfig);

      // trigger the change/save
      toggleSettingOnChangeFn(finalEnabledValue, mockConfig);

      await expect(rejectedPromise).rejects.toBeTruthy();
      expect(mockConfig.saveSettings).toHaveBeenCalled();
      expect(notifyErrorSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ message: errorMsg }),
      );

      addToggleSettingSpy.mockReset();
      notifyErrorSpy.mockRestore();
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

      mockConfig.enabledSymbolTypes[SymbolType.Link] = initialEnabledValue;

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

  describe('getSettingDefinitions', () => {
    beforeAll(() => {
      sut = new SymbolSettingsTabSection(mockApp, mockPluginSettingTab, config);
    });

    it('should return a single page for the section', () => {
      const [page] = sut.getSettingDefinitions();

      expect(page).toEqual(
        expect.objectContaining({ type: 'page', name: 'Symbol Mode' }),
      );
    });

    it('should show the mode trigger as the page display value', () => {
      const [page] = sut.getSettingDefinitions() as SettingDefinitionPage[];

      expect((page.displayValue as () => string)()).toBe(config.symbolListCommand);
    });

    it('should define both mode trigger settings', () => {
      const definitions = sut.getSettingDefinitions();

      expect(findSettingByKey(definitions, 'symbolListCommand')).toEqual(
        expect.objectContaining({
          name: 'Symbol list mode trigger',
          control: {
            type: 'text',
            key: 'symbolListCommand',
            placeholder: config.symbolListPlaceholderText,
          },
        }),
      );
      expect(findSettingByKey(definitions, 'symbolListActiveEditorCommand')).toEqual(
        expect.objectContaining({
          name: 'Symbol list mode trigger - Active editor only',
          control: {
            type: 'text',
            key: 'symbolListActiveEditorCommand',
            placeholder: config.symbolListActiveEditorCommand,
          },
        }),
      );
    });

    it('should define the standalone toggle settings', () => {
      const definitions = sut.getSettingDefinitions();

      expect(findSettingByKey(definitions, 'symbolsInLineOrder').control).toEqual({
        type: 'toggle',
        key: 'symbolsInLineOrder',
      });
      expect(findSettingByKey(definitions, 'selectNearestHeading').control).toEqual({
        type: 'toggle',
        key: 'selectNearestHeading',
      });
      expect(
        findSettingByKey(definitions, 'showHeadingBreadcrumbsInSymbolMode').control,
      ).toEqual({ type: 'toggle', key: 'showHeadingBreadcrumbsInSymbolMode' });
    });

    it('should define the tab navigation settings', () => {
      const definitions = sut.getSettingDefinitions();

      expect(findSettingByKey(definitions, 'alwaysNewTabForSymbols').control).toEqual({
        type: 'toggle',
        key: 'alwaysNewTabForSymbols',
      });
      expect(
        findSettingByKey(definitions, 'useActiveTabForSymbolsOnMobile').control,
      ).toEqual({ type: 'toggle', key: 'useActiveTabForSymbolsOnMobile' });
    });
  });
  describe('getSettingDefinitions symbol type toggles', () => {
    beforeAll(() => {
      sut = new SymbolSettingsTabSection(mockApp, mockPluginSettingTab, config);
    });

    it('should bind each symbol type toggle to its dot path key', () => {
      const definitions = sut.getSettingDefinitions();
      const expected = [
        ['Show Headings', SymbolType.Heading],
        ['Show Tags', SymbolType.Tag],
        ['Show Embeds', SymbolType.Embed],
        ['Show Callouts', SymbolType.Callout],
      ] as const;

      expected.forEach(([name, symbolType]) => {
        const key = `enabledSymbolTypes.${symbolType}` as const;

        expect(findSettingByKey(definitions, key)).toEqual(
          expect.objectContaining({
            name,
            control: { type: 'toggle', key },
          }),
        );
      });
    });
  });

  describe('getSettingDefinitions links settings', () => {
    const findLinkSetting = (name: string) =>
      findSettingByName(sut.getSettingDefinitions(), name) as SettingDefinitionRender;

    beforeAll(() => {
      sut = new SymbolSettingsTabSection(mockApp, mockPluginSettingTab, config);
    });

    it('should bind the Show Links toggle to the Link symbol type key', () => {
      const key = `enabledSymbolTypes.${SymbolType.Link}` as const;

      expect(findSettingByKey(sut.getSettingDefinitions(), key)).toEqual(
        expect.objectContaining({
          name: 'Show Links',
          control: { type: 'toggle', key },
        }),
      );
    });

    it('should hide the sub link toggles when links are disabled', () => {
      config.enabledSymbolTypes[SymbolType.Link] = false;
      const subToggle = findLinkSetting('Links to headings');

      expect(isSettingVisible(subToggle)).toBe(false);

      config.enabledSymbolTypes[SymbolType.Link] = true;
    });

    it('should show the sub link toggles when links are enabled', () => {
      config.enabledSymbolTypes[SymbolType.Link] = true;
      const subToggle = findLinkSetting('Links to headings');

      expect(isSettingVisible(subToggle)).toBe(true);
    });

    it('should seed a sub link toggle from the exclusion bitmask', () => {
      config.excludeLinkSubTypes = LinkType.Block;
      const mockSetting = mock<Setting>();
      const mockToggle = mock<ToggleComponent>();
      mockSetting.addToggle.mockImplementation((cb) => {
        cb(mockToggle);
        return mockSetting;
      });

      findLinkSetting('Links to blocks').render(mockSetting, null);

      expect(mockToggle.setValue).toHaveBeenCalledWith(false);
    });

    it('should persist a sub link change through saveEnableSubLinkChange', () => {
      const saveSubLinkSpy = jest.spyOn(sut, 'saveEnableSubLinkChange').mockReturnValue();
      const mockSetting = mock<Setting>();
      const mockToggle = mock<ToggleComponent>();
      let onChange: (value: boolean) => void;
      mockToggle.onChange.mockImplementation((cb) => {
        onChange = cb;
        return mockToggle;
      });
      mockSetting.addToggle.mockImplementation((cb) => {
        cb(mockToggle);
        return mockSetting;
      });

      findLinkSetting('Links to headings').render(mockSetting, null);
      onChange(false);

      expect(saveSubLinkSpy).toHaveBeenCalledWith(LinkType.Heading, false);

      saveSubLinkSpy.mockRestore();
    });
  });
});
