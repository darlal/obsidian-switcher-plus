import {
  HeadingsSettingsTabSection,
  SettingsTabSection,
  SwitcherPlusSettings,
  SwitcherPlusSettingTab,
} from 'src/settings';
import { mock, MockProxy } from 'jest-mock-extended';
import { App, Setting, TextAreaComponent, ViewRegistry } from 'obsidian';

describe('headingsSettingsTabSection', () => {
  let mockApp: MockProxy<App>;
  let mockPluginSettingTab: MockProxy<SwitcherPlusSettingTab>;
  let config: SwitcherPlusSettings;
  let mockContainerEl: MockProxy<HTMLElement>;
  let addToggleSettingSpy: jest.SpyInstance;
  let sut: HeadingsSettingsTabSection;

  beforeAll(() => {
    mockApp = mock<App>({ viewRegistry: mock<ViewRegistry>() });
    mockContainerEl = mock<HTMLElement>();
    mockPluginSettingTab = mock<SwitcherPlusSettingTab>({ containerEl: mockContainerEl });
    config = new SwitcherPlusSettings(null);

    addToggleSettingSpy = jest.spyOn(SettingsTabSection.prototype, 'addToggleSetting');

    sut = new HeadingsSettingsTabSection(mockApp, mockPluginSettingTab, config);
  });

  afterAll(() => {
    addToggleSettingSpy.mockRestore();
  });

  it('should display a header for the section', () => {
    const addSectionTitleSpy = jest.spyOn(
      SettingsTabSection.prototype,
      'addSectionTitle',
    );

    sut.display(mockContainerEl);

    expect(addSectionTitleSpy).toHaveBeenCalledWith(
      mockContainerEl,
      'Headings List Mode Settings',
    );

    addSectionTitleSpy.mockRestore();
  });

  it('should show the mode trigger setting', () => {
    const addTextSettingSpy = jest.spyOn(SettingsTabSection.prototype, 'addTextSetting');

    sut.display(mockContainerEl);

    expect(addTextSettingSpy).toHaveBeenCalledWith(
      mockContainerEl,
      'Headings list mode trigger',
      expect.any(String),
      config.headingsListCommand,
      'headingsListCommand',
      config.headingsListPlaceholderText,
    );

    addTextSettingSpy.mockRestore();
  });

  it('should show the strictHeadingsOnly setting', () => {
    sut.display(mockContainerEl);

    expect(addToggleSettingSpy).toHaveBeenCalledWith(
      mockContainerEl,
      'Show headings only',
      expect.any(String),
      config.strictHeadingsOnly,
      'strictHeadingsOnly',
    );

    addToggleSettingSpy.mockReset();
  });

  it('should show the searchAllHeadings setting', () => {
    sut.display(mockContainerEl);

    expect(addToggleSettingSpy).toHaveBeenCalledWith(
      mockContainerEl,
      'Search all headings',
      expect.any(String),
      config.searchAllHeadings,
      'searchAllHeadings',
    );

    addToggleSettingSpy.mockReset();
  });

  it('should show the shouldSearchFilenames setting', () => {
    sut.display(mockContainerEl);

    expect(addToggleSettingSpy).toHaveBeenCalledWith(
      mockContainerEl,
      'Search filenames',
      expect.any(String),
      config.shouldSearchFilenames,
      'shouldSearchFilenames',
    );

    addToggleSettingSpy.mockReset();
  });

  it('should show the excludeObsidianIgnoredFiles setting', () => {
    sut.display(mockContainerEl);

    expect(addToggleSettingSpy).toHaveBeenCalledWith(
      mockContainerEl,
      'Hide Obsidian "Excluded files"',
      expect.any(String),
      config.excludeObsidianIgnoredFiles,
      'excludeObsidianIgnoredFiles',
    );

    addToggleSettingSpy.mockReset();
  });

  it('should show file extension override settings', () => {
    const showFileExtAllowListSpy = jest
      .spyOn(sut, 'showFileExtAllowList')
      .mockReturnValueOnce();

    sut.display(mockContainerEl);

    expect(showFileExtAllowListSpy).toHaveBeenCalled();

    showFileExtAllowListSpy.mockRestore();
  });

  describe('showFileExtAllowList setting', () => {
    const allowList = 'foo\nbar';
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

      config.fileExtAllowList = allowList.split('\n');
    });

    afterAll(() => {
      config.fileExtAllowList = ['canvas'];
      createSettingSpy.mockRestore();
    });

    it('should show the fileExtAllowList setting', () => {
      sut.showFileExtAllowList(mockContainerEl, config);

      expect(mockTextComp.setValue).toHaveBeenCalledWith(allowList);
      expect(createSettingSpy).toHaveBeenCalledWith(
        mockContainerEl,
        'File extension override',
        expect.any(String),
      );
    });

    it('should save updated value', () => {
      const saveSpy = jest.spyOn(config, 'save');

      let focusoutFn: EventListener;
      mockInputEl.addEventListener.mockImplementation((evtStr, listener) => {
        focusoutFn = listener as EventListener;
      });

      config.fileExtAllowList = []; // start with no values set
      mockTextComp.getValue.mockReturnValue(allowList);

      sut.showFileExtAllowList(mockContainerEl, config);
      focusoutFn(null); // trigger the callback to save

      expect(mockTextComp.getValue).toHaveBeenCalled();
      expect(saveSpy).toHaveBeenCalled();
      expect(config.fileExtAllowList).toEqual(
        expect.arrayContaining(allowList.split('\n')),
      );

      saveSpy.mockRestore();
    });
  });

  describe('excludeFolders setting', () => {
    const excludedPaths = 'foo\nbar';
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

      config.excludeFolders = excludedPaths.split('\n');
    });

    afterAll(() => {
      config.excludeFolders = [];
      createSettingSpy.mockRestore();
    });

    it('should show the excludeFolders setting', () => {
      sut.showExcludeFolders(mockContainerEl, config);

      expect(mockTextComp.setValue).toHaveBeenCalledWith(excludedPaths);
      expect(createSettingSpy).toHaveBeenCalledWith(
        mockContainerEl,
        'Exclude folders',
        expect.any(String),
      );
    });

    it('should save updated value', () => {
      const saveSpy = jest.spyOn(config, 'save');

      let focusoutFn: EventListener;
      mockInputEl.addEventListener.mockImplementation((evtStr, listener) => {
        focusoutFn = listener as EventListener;
      });

      config.excludeFolders = []; // start with no values set
      mockTextComp.getValue.mockReturnValue(excludedPaths);

      sut.showExcludeFolders(mockContainerEl, config);
      focusoutFn(null); // trigger the callback to save

      expect(mockTextComp.getValue).toHaveBeenCalled();
      expect(saveSpy).toHaveBeenCalled();
      expect(config.excludeFolders).toEqual(
        expect.arrayContaining(excludedPaths.split('\n')),
      );

      saveSpy.mockRestore();
    });

    it('should not validate invalid exclude regex', () => {
      const result = sut.validateExcludeFolderList('test', ['**']);

      expect(result).toBe(false);
    });

    it('should not throw falsy input', () => {
      expect(() => sut.validateExcludeFolderList(null, [])).not.toThrow();
    });
  });
});
