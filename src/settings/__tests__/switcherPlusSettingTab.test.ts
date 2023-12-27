import {
  SwitcherPlusSettingTab,
  SwitcherPlusSettings,
  GeneralSettingsTabSection,
  SymbolSettingsTabSection,
  HeadingsSettingsTabSection,
  EditorSettingsTabSection,
  RelatedItemsSettingsTabSection,
  BookmarksSettingsTabSection,
  CommandListSettingsTabSection,
  WorkspaceSettingsTabSection,
  VaultListSettingsTabSection,
} from 'src/settings';
import { mock, MockProxy } from 'jest-mock-extended';
import { App, ViewRegistry } from 'obsidian';

describe('SwitcherPlusSettingTab', () => {
  let mockApp: MockProxy<App>;
  let mockConfig: MockProxy<SwitcherPlusSettings>;
  let mockContainerEl: MockProxy<HTMLElement>;
  let sut: SwitcherPlusSettingTab;

  beforeAll(() => {
    mockApp = mock<App>({ viewRegistry: mock<ViewRegistry>() });
    mockConfig = mock<SwitcherPlusSettings>();

    sut = new SwitcherPlusSettingTab(mockApp, null, mockConfig);
    mockContainerEl = sut.containerEl as MockProxy<HTMLElement>;
  });

  describe('display', () => {
    let displayTabSectionSpy: jest.SpyInstance;

    beforeAll(() => {
      displayTabSectionSpy = jest.spyOn(sut, 'displayTabSection').mockReturnValue();
    });

    afterAll(() => {
      displayTabSectionSpy.mockRestore();
    });

    afterEach(() => {
      displayTabSectionSpy.mockClear();
    });

    it('should display a title header', () => {
      sut.display();

      expect(mockContainerEl.createEl).toHaveBeenCalledWith('h2', {
        text: 'Quick Switcher++ Settings',
      });
    });

    it('should display all the different setting tab sections', () => {
      const expected = [
        [GeneralSettingsTabSection],
        [SymbolSettingsTabSection],
        [HeadingsSettingsTabSection],
        [EditorSettingsTabSection],
        [RelatedItemsSettingsTabSection],
        [BookmarksSettingsTabSection],
        [CommandListSettingsTabSection],
        [WorkspaceSettingsTabSection],
        [VaultListSettingsTabSection],
      ];

      sut.display();

      expect(displayTabSectionSpy.mock.calls).toEqual(expected);
    });
  });

  describe('displayTabSection', () => {
    it('should display a setting tab section', () => {
      const sectionClass = GeneralSettingsTabSection;
      const sectionDisplaySpy = jest
        .spyOn(sectionClass['prototype'], 'display')
        .mockReturnValue();

      sut.displayTabSection(sectionClass);

      expect(sectionDisplaySpy).toHaveBeenCalledWith(mockContainerEl);

      sectionDisplaySpy.mockRestore();
    });
  });
});
