import { LinkType, SymbolType } from 'src/types';
import {
  SymbolSettingsTabSection,
  SwitcherPlusSettings,
  SwitcherPlusSettingTab,
} from 'src/settings';
import { mock, MockProxy } from 'jest-mock-extended';
import {
  App,
  Setting,
  SettingDefinitionPage,
  SettingDefinitionRender,
  ToggleComponent,
  ViewRegistry,
} from 'obsidian';
import { findSettingByKey, findSettingByName, isSettingVisible } from '@fixtures';

describe('symbolSettingsTabSection', () => {
  let mockApp: MockProxy<App>;
  let mockPluginSettingTab: MockProxy<SwitcherPlusSettingTab>;
  let config: SwitcherPlusSettings;
  let mockContainerEl: MockProxy<HTMLElement>;
  let sut: SymbolSettingsTabSection;

  beforeAll(() => {
    mockApp = mock<App>({ viewRegistry: mock<ViewRegistry>() });
    mockContainerEl = mock<HTMLElement>();
    mockPluginSettingTab = mock<SwitcherPlusSettingTab>({ containerEl: mockContainerEl });
    config = new SwitcherPlusSettings(null);
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
