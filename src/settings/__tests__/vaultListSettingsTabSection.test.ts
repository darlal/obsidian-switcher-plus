import {
  SettingsTabSection,
  VaultListSettingsTabSection,
  SwitcherPlusSettings,
  SwitcherPlusSettingTab,
} from 'src/settings';
import { mock, MockProxy } from 'jest-mock-extended';
import { App, Setting } from 'obsidian';

describe('vaultListSettingsTabSection', () => {
  let mockApp: MockProxy<App>;
  let mockPluginSettingTab: MockProxy<SwitcherPlusSettingTab>;
  let config: SwitcherPlusSettings;
  let mockContainerEl: MockProxy<HTMLElement>;
  let sut: VaultListSettingsTabSection;
  let addSectionTitleSpy: jest.SpyInstance;

  beforeAll(() => {
    mockApp = mock<App>();
    mockContainerEl = mock<HTMLElement>();
    mockPluginSettingTab = mock<SwitcherPlusSettingTab>({ containerEl: mockContainerEl });
    config = new SwitcherPlusSettings(null);

    addSectionTitleSpy = jest
      .spyOn(SettingsTabSection.prototype, 'addSectionTitle')
      .mockReturnValue(mock<Setting>({ nameEl: mock<HTMLElement>() }));

    sut = new VaultListSettingsTabSection(mockApp, mockPluginSettingTab, config);
  });

  afterAll(() => {
    addSectionTitleSpy.mockRestore();
  });

  afterEach(() => {
    addSectionTitleSpy.mockClear();
  });

  it('should display a header for the section', () => {
    sut.display(mockContainerEl);

    expect(addSectionTitleSpy).toHaveBeenCalledWith(
      mockContainerEl,
      'Vault List Mode Settings',
    );
  });

  it('should show the mode trigger setting', () => {
    const addTextSettingSpy = jest.spyOn(SettingsTabSection.prototype, 'addTextSetting');

    sut.display(mockContainerEl);

    expect(addTextSettingSpy).toHaveBeenCalledWith(
      mockContainerEl,
      'Vault list mode trigger',
      expect.any(String),
      config.vaultListCommand,
      'vaultListCommand',
      config.vaultListPlaceholderText,
    );

    addTextSettingSpy.mockRestore();
  });
});
