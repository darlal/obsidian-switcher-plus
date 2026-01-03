import {
  HeadingsSettingsTabSection,
  SettingsTabSection,
  SwitcherPlusSettings,
  SwitcherPlusSettingTab,
} from 'src/settings';
import { mock, MockProxy } from 'jest-mock-extended';
import { App, Setting, SettingGroup, TextAreaComponent, ViewRegistry } from 'obsidian';

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
      'Headings List Mode',
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

  it('should show exclusions group', () => {
    const showExclusionsGroupSpy = jest
      .spyOn(sut, 'showExclusionsGroup')
      .mockReturnValueOnce();

    sut.display(mockContainerEl);

    expect(showExclusionsGroupSpy).toHaveBeenCalled();

    showExclusionsGroupSpy.mockRestore();
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
      const rejectedPromise = Promise.reject(new Error(errorMsg));
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
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ message: errorMsg }),
      );

      addToggleSettingSpy.mockReset();
      consoleLogSpy.mockRestore();
    });

    it('should call addToggleSetting with SettingGroup instead of containerEl for master toggle', () => {
      sut.showHeadingSettings(mockContainerEl, config);

      // Verify that addToggleSetting was called with a SettingGroup instance (not containerEl) for the master toggle
      const toggleCall = addToggleSettingSpy.mock.calls.find(
        (call: addToggleSettingArgs) => call[1] === 'Search Headings',
      ) as addToggleSettingArgs;

      expect(toggleCall[0]).toBeInstanceOf(SettingGroup);

      addToggleSettingSpy.mockReset();
    });

    it('should call addToggleSetting with SettingGroup instead of containerEl for conditional child toggles when enabled', () => {
      config.shouldSearchHeadings = true;

      sut.showHeadingSettings(mockContainerEl, config);

      // Verify that addToggleSetting was called with SettingGroup instances for conditional child toggles
      const strictHeadingsOnlyCall = addToggleSettingSpy.mock.calls.find(
        (call: addToggleSettingArgs) => call[1] === 'Turn off filename fallback',
      ) as addToggleSettingArgs;

      const searchAllHeadingsCall = addToggleSettingSpy.mock.calls.find(
        (call: addToggleSettingArgs) => call[1] === 'Search all headings',
      ) as addToggleSettingArgs;

      expect(strictHeadingsOnlyCall[0]).toBeInstanceOf(SettingGroup);
      expect(searchAllHeadingsCall[0]).toBeInstanceOf(SettingGroup);

      // Verify both child toggles are added to the same group
      expect(strictHeadingsOnlyCall[0]).toBe(searchAllHeadingsCall[0]);

      config.shouldSearchHeadings = false;
      addToggleSettingSpy.mockReset();
    });

    it('should show the strictHeadingsOnly setting', () => {
      config.shouldSearchHeadings = true;
      addToggleSettingSpy.mockReturnValue(mock<Setting>());

      sut.showHeadingSettings(mockContainerEl, config);

      expect(addToggleSettingSpy).toHaveBeenCalledWith(
        expect.any(SettingGroup),
        'Turn off filename fallback',
        expect.any(String),
        config.strictHeadingsOnly,
        'strictHeadingsOnly',
      );

      config.shouldSearchHeadings = false;
      addToggleSettingSpy.mockReset();
    });

    it('should show the searchAllHeadings setting', () => {
      config.shouldSearchHeadings = true;
      addToggleSettingSpy.mockReturnValue(mock<Setting>());

      sut.showHeadingSettings(mockContainerEl, config);

      expect(addToggleSettingSpy).toHaveBeenCalledWith(
        expect.any(SettingGroup),
        'Search all headings',
        expect.any(String),
        config.searchAllHeadings,
        'searchAllHeadings',
      );

      config.shouldSearchHeadings = false;
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
      mockInputEl.addEventListener.mockImplementation(
        (evtStr: string, listener: EventListenerOrEventListenerObject) => {
          focusoutFn = listener as EventListener;
        },
      );

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

  describe('showExclusionsGroup', () => {
    let createSettingSpy: jest.SpyInstance;
    let showExcludeFoldersSpy: jest.SpyInstance;

    beforeAll(() => {
      createSettingSpy = jest
        .spyOn(SettingsTabSection.prototype, 'createSetting')
        .mockReturnValue(mock<Setting>());
      showExcludeFoldersSpy = jest.spyOn(sut, 'showExcludeFolders').mockReturnValueOnce();
    });

    afterAll(() => {
      createSettingSpy.mockRestore();
      showExcludeFoldersSpy.mockRestore();
    });

    it('should create a SettingGroup as a label', () => {
      sut.showExclusionsGroup(mockContainerEl, config);

      // Verify createSetting was called with a SettingGroup
      type createSettingArgs = Parameters<SettingsTabSection['createSetting']>;
      const settingCall = createSettingSpy.mock.calls.find(
        (call: createSettingArgs) => call[1] === 'Exclusions',
      ) as createSettingArgs | undefined;

      expect(settingCall?.[0]).toBeInstanceOf(SettingGroup);
    });

    it('should call showExcludeFolders with SettingGroup', () => {
      sut.showExclusionsGroup(mockContainerEl, config);

      expect(showExcludeFoldersSpy).toHaveBeenCalled();
      type showExcludeFoldersArgs = Parameters<
        HeadingsSettingsTabSection['showExcludeFolders']
      >;
      const excludeFoldersCall = showExcludeFoldersSpy.mock
        .calls[0] as showExcludeFoldersArgs;
      expect(excludeFoldersCall[0]).toBeInstanceOf(SettingGroup);
      expect(excludeFoldersCall[1]).toBe(config);
    });

    it('should call addToggleSetting with SettingGroup for excludeObsidianIgnoredFiles', () => {
      sut.showExclusionsGroup(mockContainerEl, config);

      type addToggleSettingArgs = Parameters<SettingsTabSection['addToggleSetting']>;
      const toggleCall = addToggleSettingSpy.mock.calls.find(
        (call: addToggleSettingArgs) => call[1] === 'Hide Obsidian "Excluded files"',
      ) as addToggleSettingArgs | undefined;

      expect(toggleCall?.[0]).toBeInstanceOf(SettingGroup);
      expect(toggleCall?.[1]).toBe('Hide Obsidian "Excluded files"');
      expect(toggleCall?.[4]).toBe('excludeObsidianIgnoredFiles');

      addToggleSettingSpy.mockClear();
    });

    it('should add both settings to the same group', () => {
      sut.showExclusionsGroup(mockContainerEl, config);

      type showExcludeFoldersArgs = Parameters<
        HeadingsSettingsTabSection['showExcludeFolders']
      >;
      type addToggleSettingArgs = Parameters<SettingsTabSection['addToggleSetting']>;
      const excludeFoldersCall = showExcludeFoldersSpy.mock
        .calls[0] as showExcludeFoldersArgs;
      const toggleCall = addToggleSettingSpy.mock.calls.find(
        (call: addToggleSettingArgs) => call[1] === 'Hide Obsidian "Excluded files"',
      ) as addToggleSettingArgs | undefined;

      expect(excludeFoldersCall[0]).toBeInstanceOf(SettingGroup);
      expect(toggleCall?.[0]).toBeInstanceOf(SettingGroup);
      expect(excludeFoldersCall[0]).toEqual(toggleCall?.[0]);

      addToggleSettingSpy.mockClear();
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

    it('should work with SettingGroup container', () => {
      const mockGroup = new SettingGroup(mockContainerEl);

      sut.showExcludeFolders(mockGroup, config);

      expect(mockTextComp.setValue).toHaveBeenCalledWith(excludedPaths);
      expect(createSettingSpy).toHaveBeenCalledWith(
        mockGroup,
        'Exclude folders',
        expect.any(String),
      );
    });

    it('should save updated value', () => {
      const saveSpy = jest.spyOn(config, 'save');

      let focusoutFn: EventListener;
      mockInputEl.addEventListener.mockImplementation(
        (evtStr: string, listener: EventListenerOrEventListenerObject) => {
          focusoutFn = listener as EventListener;
        },
      );

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

    it('should preserve TextArea focusout handler when used in group', () => {
      const saveSpy = jest.spyOn(config, 'save');
      const validateSpy = jest
        .spyOn(sut, 'validateExcludeFolderList')
        .mockReturnValue(true);

      let focusoutFn: EventListener;
      mockInputEl.addEventListener.mockImplementation(
        (evtStr: string, listener: EventListenerOrEventListenerObject) => {
          if (evtStr === 'focusout') {
            focusoutFn = listener as EventListener;
          }
        },
      );

      config.excludeFolders = [];
      mockTextComp.getValue.mockReturnValue(excludedPaths);

      const mockGroup = new SettingGroup(mockContainerEl);
      sut.showExcludeFolders(mockGroup, config);

      // Verify focusout handler was attached
      expect(mockInputEl.addEventListener).toHaveBeenCalledWith(
        'focusout',
        expect.any(Function),
      );

      // Trigger the focusout handler
      focusoutFn(null);

      // Verify validation and save were called
      expect(validateSpy).toHaveBeenCalled();
      expect(saveSpy).toHaveBeenCalled();
      expect(config.excludeFolders).toEqual(
        expect.arrayContaining(excludedPaths.split('\n')),
      );

      saveSpy.mockRestore();
      validateSpy.mockRestore();
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
