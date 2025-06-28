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
  let addSliderSettingSpy: jest.SpyInstance;
  let sut: HeadingsSettingsTabSection;

  beforeAll(() => {
    mockApp = mock<App>({ viewRegistry: mock<ViewRegistry>() });
    mockContainerEl = mock<HTMLElement>();
    mockPluginSettingTab = mock<SwitcherPlusSettingTab>({ containerEl: mockContainerEl });
    config = new SwitcherPlusSettings(null);

    addToggleSettingSpy = jest
      .spyOn(SettingsTabSection.prototype, 'addToggleSetting')
      .mockReturnValue(mock<Setting>());

    addSliderSettingSpy = jest
      .spyOn(SettingsTabSection.prototype, 'addSliderSetting')
      .mockReturnValue(mock<Setting>());

    sut = new HeadingsSettingsTabSection(mockApp, mockPluginSettingTab, config);
  });

  afterAll(() => {
    addToggleSettingSpy.mockRestore();
    addSliderSettingSpy.mockRestore();
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

  it('should show the shouldSearchFilenames setting', () => {
    sut.display(mockContainerEl);

    expect(addToggleSettingSpy).toHaveBeenCalledWith(
      mockContainerEl,
      'Search Filenames',
      expect.any(String),
      config.shouldSearchFilenames,
      'shouldSearchFilenames',
    );

    addToggleSettingSpy.mockClear();
  });

  it('should show the shouldSearchBookmarks setting', () => {
    sut.display(mockContainerEl);

    expect(addToggleSettingSpy).toHaveBeenCalledWith(
      mockContainerEl,
      'Search Bookmarks',
      expect.any(String),
      config.shouldSearchBookmarks,
      'shouldSearchBookmarks',
    );

    addToggleSettingSpy.mockClear();
  });

  it('should show the maxRecentFileSuggestionsOnInit setting', () => {
    sut.display(mockContainerEl);

    expect(addSliderSettingSpy).toHaveBeenCalledWith(
      mockContainerEl,
      'Max recent files to show',
      expect.any(String),
      config.maxRecentFileSuggestionsOnInit,
      expect.any(Array),
      'maxRecentFileSuggestionsOnInit',
    );

    addToggleSettingSpy.mockClear();
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

    addToggleSettingSpy.mockClear();
  });

  it('should show file extension override settings', () => {
    const showFileExtAllowListSpy = jest
      .spyOn(sut, 'showFileExtAllowList')
      .mockReturnValueOnce();

    sut.display(mockContainerEl);

    expect(showFileExtAllowListSpy).toHaveBeenCalled();

    showFileExtAllowListSpy.mockRestore();
  });

  it('should show setting to change Heading options', () => {
    const showHeadingSettingsSpy = jest
      .spyOn(sut, 'showHeadingSettings')
      .mockReturnValueOnce();

    sut.display(mockContainerEl);

    expect(showHeadingSettingsSpy).toHaveBeenCalled();

    showHeadingSettingsSpy.mockRestore();
  });

  describe('showHeadingOptions', () => {
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

    it('should refresh the mainSettingsTab panel when the search headings setting is changes', async () => {
      const initialEnabledValue = false;
      const finalEnabledValue = true;
      const savePromise = Promise.resolve();

      config.shouldSearchHeadings = initialEnabledValue;
      saveSettingsSpy.mockReturnValueOnce(savePromise);
      addToggleSettingSpy.mockImplementation((...args: addToggleSettingArgs) => {
        if (args[1] === 'Search Headings') {
          toggleSettingOnChangeFn = args[5];
        }

        return mock<Setting>();
      });

      sut.showHeadingSettings(mockContainerEl, config);

      // trigger the change/save
      toggleSettingOnChangeFn(finalEnabledValue, config);

      await savePromise;

      expect(saveSettingsSpy).toHaveBeenCalled();
      expect(mockPluginSettingTab.display).toHaveBeenCalled();
      expect(config.shouldSearchHeadings).toBe(finalEnabledValue);

      config.shouldSearchHeadings = false;
      addToggleSettingSpy.mockReset();
      mockPluginSettingTab.display.mockClear();
    });

    it('should log error to the console when setting cannot be saved', async () => {
      const errorMsg = 'showHeadingOptions Unit test error';
      const rejectedPromise = Promise.reject(errorMsg);
      const consoleLogSpy = jest.spyOn(console, 'log').mockReturnValueOnce();

      addToggleSettingSpy.mockImplementation((...args: addToggleSettingArgs) => {
        if (args[1] === 'Search Headings') {
          toggleSettingOnChangeFn = args[5];
        }

        return mock<Setting>();
      });

      saveSettingsSpy.mockReturnValueOnce(rejectedPromise);

      sut.showHeadingSettings(mockContainerEl, config);

      // trigger the change/save
      toggleSettingOnChangeFn(true, config);

      await expect(rejectedPromise).rejects.toBeTruthy();
      expect(saveSettingsSpy).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.any(String), errorMsg);

      addToggleSettingSpy.mockReset();
      consoleLogSpy.mockRestore();
    });

    it('should show the strictHeadingsOnly setting', () => {
      addToggleSettingSpy.mockReturnValue(mock<Setting>());

      sut.showHeadingSettings(mockContainerEl, config);

      expect(addToggleSettingSpy).toHaveBeenCalledWith(
        mockContainerEl,
        'Turn off filename fallback',
        expect.any(String),
        config.strictHeadingsOnly,
        'strictHeadingsOnly',
      );

      addToggleSettingSpy.mockReset();
    });

    it('should show the searchAllHeadings setting', () => {
      addToggleSettingSpy.mockReturnValue(mock<Setting>());

      sut.showHeadingSettings(mockContainerEl, config);

      expect(addToggleSettingSpy).toHaveBeenCalledWith(
        mockContainerEl,
        'Search all headings',
        expect.any(String),
        config.searchAllHeadings,
        'searchAllHeadings',
      );

      addToggleSettingSpy.mockReset();
    });
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
