import {
  SettingsTabSection,
  BookmarksSettingsTabSection,
  SwitcherPlusSettings,
  SwitcherPlusSettingTab,
} from 'src/settings';
import { mock, MockProxy } from 'jest-mock-extended';
import { App } from 'obsidian';

describe('bookmarksSettingsTabSection', () => {
  let mockApp: MockProxy<App>;
  let mockPluginSettingTab: MockProxy<SwitcherPlusSettingTab>;
  let config: SwitcherPlusSettings;
  let mockContainerEl: MockProxy<HTMLElement>;
  let sut: BookmarksSettingsTabSection;

  beforeAll(() => {
    mockApp = mock<App>();
    mockContainerEl = mock<HTMLElement>();
    mockPluginSettingTab = mock<SwitcherPlusSettingTab>({ containerEl: mockContainerEl });
    config = new SwitcherPlusSettings(null);

    sut = new BookmarksSettingsTabSection(mockApp, mockPluginSettingTab, config);
  });

  it('should display a header for the section', () => {
    const addSectionTitleSpy = jest.spyOn(
      SettingsTabSection.prototype,
      'addSectionTitle',
    );

    sut.display(mockContainerEl);

    expect(addSectionTitleSpy).toHaveBeenCalledWith(
      mockContainerEl,
      'Bookmarks List Mode Settings',
    );

    addSectionTitleSpy.mockRestore();
  });

  it('should show the mode trigger setting', () => {
    const addTextSettingSpy = jest.spyOn(SettingsTabSection.prototype, 'addTextSetting');

    sut.display(mockContainerEl);

    expect(addTextSettingSpy).toHaveBeenCalledWith(
      mockContainerEl,
      'Bookmarks list mode trigger',
      expect.any(String),
      config.bookmarksListCommand,
      'bookmarksListCommand',
      config.bookmarksListPlaceholderText,
    );

    addTextSettingSpy.mockRestore();
  });
});
