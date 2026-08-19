import {
  HeadingsSettingsTabSection,
  SettingsControlKey,
  SettingsTabSection,
  SwitcherPlusSettings,
  SwitcherPlusSettingTab,
} from 'src/settings';
import { mock, MockProxy } from 'jest-mock-extended';
import {
  App,
  ButtonComponent,
  Setting,
  SettingDefinition,
  SettingDefinitionAction,
  SettingDefinitionGroup,
  SettingDefinitionList,
  SettingDefinitionPage,
  SettingDefinitionRender,
  SettingGroup,
  TextAreaComponent,
  ViewRegistry,
} from 'obsidian';
import {
  findListByHeading,
  findSettingByKey,
  findSettingByName,
  isSettingVisible,
} from '@fixtures';
import * as Utils from 'src/utils/utils';
import * as ListEntryModal from 'src/settings/listEntryModal';
import type { ListEntryModalOptions } from 'src/settings/listEntryModal';

/**
 * Structural view of the MockButtonComponent instances that the mocked Setting
 * pushes onto its `components` array, exposing only the members exercised by
 * the showSearchHeadingLevels tests.
 */
type TestButton = {
  text: string;
  isCta: boolean;
  onClickCB: (evt: MouseEvent) => unknown;
};

describe('headingsSettingsTabSection', () => {
  let mockApp: MockProxy<App>;
  let mockPluginSettingTab: MockProxy<SwitcherPlusSettingTab>;
  let config: SwitcherPlusSettings;
  let mockContainerEl: MockProxy<HTMLElement>;
  let addToggleSettingSpy: jest.SpyInstance;
  let addSliderSettingSpy: jest.SpyInstance;
  let sut: HeadingsSettingsTabSection;

  const findByKey = (key: SettingsControlKey) =>
    findSettingByKey(sut.getSettingDefinitions(), key);

  const findByName = (name: string) =>
    findSettingByName(sut.getSettingDefinitions(), name);

  beforeAll(() => {
    mockApp = mock<App>({
      viewRegistry: mock<ViewRegistry>({
        typeByExtension: { canvas: 'canvas', pdf: 'pdf' },
      }),
    });
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

    it('should route save failures through notifyError', async () => {
      const errorMsg = 'showHeadingOptions Unit test error';
      const rejectedPromise = Promise.reject(new Error(errorMsg));
      const notifyErrorSpy = jest.spyOn(Utils, 'notifyError').mockReturnValueOnce();

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
      expect(notifyErrorSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ message: errorMsg }),
      );

      addToggleSettingSpy.mockReset();
      notifyErrorSpy.mockRestore();
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

      // Verify that addToggleSetting was called with a SettingGroup instance for the conditional child toggle
      const strictHeadingsOnlyCall = addToggleSettingSpy.mock.calls.find(
        (call: addToggleSettingArgs) => call[1] === 'Turn off filename fallback',
      ) as addToggleSettingArgs;

      expect(strictHeadingsOnlyCall[0]).toBeInstanceOf(SettingGroup);

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
  });

  describe('showSearchHeadingLevels', () => {
    let createSettingSpy: jest.SpyInstance;
    let saveSpy: jest.SpyInstance;
    let mockSetting: Setting;

    beforeEach(() => {
      // Runtime resolves to MockSetting via the obsidian manual mock.
      mockSetting = new Setting(mockContainerEl);
      createSettingSpy = jest
        .spyOn(SettingsTabSection.prototype, 'createSetting')
        .mockReturnValue(mockSetting);
      saveSpy = jest.spyOn(config, 'save').mockReturnValue(undefined);
    });

    afterEach(() => {
      createSettingSpy.mockRestore();
      saveSpy.mockRestore();
      config.searchAllHeadings = true; // reset shared config to default
    });

    it('should render six buttons labeled H1 through H6', () => {
      config.searchAllHeadings = true;

      sut.showSearchHeadingLevels(mockContainerEl, config);

      const buttons = mockSetting.components as unknown as TestButton[];
      expect(buttons.map((c) => c.text)).toEqual(['H1', 'H2', 'H3', 'H4', 'H5', 'H6']);
    });

    it('should mark every level active when the value is boolean true', () => {
      config.searchAllHeadings = true;

      sut.showSearchHeadingLevels(mockContainerEl, config);

      const buttons = mockSetting.components as unknown as TestButton[];
      expect(buttons.map((c) => c.isCta)).toEqual([true, true, true, true, true, true]);
    });

    it('should mark no levels active when the value is boolean false (first H1 only)', () => {
      config.searchAllHeadings = false;

      sut.showSearchHeadingLevels(mockContainerEl, config);

      const buttons = mockSetting.components as unknown as TestButton[];
      expect(buttons.map((c) => c.isCta)).toEqual([
        false,
        false,
        false,
        false,
        false,
        false,
      ]);
    });

    it('should mark the configured levels active when the value is an array', () => {
      config.searchAllHeadings = [2, 4];

      sut.showSearchHeadingLevels(mockContainerEl, config);

      const buttons = mockSetting.components as unknown as TestButton[];
      expect(buttons.map((c) => c.isCta)).toEqual([
        false,
        true,
        false,
        true,
        false,
        false,
      ]);
    });

    it('should add a level and save when an inactive button is clicked', () => {
      config.searchAllHeadings = [2];

      sut.showSearchHeadingLevels(mockContainerEl, config);

      const buttons = mockSetting.components as unknown as TestButton[];
      // click H4 (index 3)
      buttons[3].onClickCB(null);

      expect(buttons[3].isCta).toBe(true);
      expect(config.searchAllHeadings).toEqual([2, 4]);
      expect(saveSpy).toHaveBeenCalled();
    });

    it('should remove a level and save when an active button is clicked', () => {
      config.searchAllHeadings = [1, 2];

      sut.showSearchHeadingLevels(mockContainerEl, config);

      const buttons = mockSetting.components as unknown as TestButton[];
      // click H1 (index 0)
      buttons[0].onClickCB(null);

      expect(buttons[0].isCta).toBe(false);
      expect(config.searchAllHeadings).toEqual([2]);
      expect(saveSpy).toHaveBeenCalled();
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

    it('should call showErrorPopup with the settingName, intro, and rows containing qsp-warning regex + error segments', () => {
      const popupSpy = jest
        .spyOn(SettingsTabSection.prototype, 'showErrorPopup')
        .mockImplementation(() => {});

      sut.validateExcludeFolderList('Exclude folders', ['**', '[unterminated']);

      expect(popupSpy).toHaveBeenCalledTimes(1);
      expect(popupSpy).toHaveBeenCalledWith(
        'Exclude folders',
        'Changes not saved. The following regex contain errors:',
        [
          [
            { text: '**', cls: 'qsp-warning' },
            { text: expect.stringContaining('SyntaxError') as unknown as string },
          ],
          [
            { text: '[unterminated', cls: 'qsp-warning' },
            { text: expect.stringContaining('SyntaxError') as unknown as string },
          ],
        ],
      );

      popupSpy.mockRestore();
    });
  });
  describe('getSettingDefinitions', () => {
    it('should return a single page for the section', () => {
      const [page] = sut.getSettingDefinitions();

      expect(page).toEqual(
        expect.objectContaining({ type: 'page', name: 'Headings Mode' }),
      );
    });

    it('should show the mode trigger as the page display value', () => {
      const [page] = sut.getSettingDefinitions() as SettingDefinitionPage[];

      expect((page.displayValue as () => string)()).toBe(config.headingsListCommand);
    });

    it('should define the mode trigger setting', () => {
      const definitions = sut.getSettingDefinitions();

      expect(findSettingByKey(definitions, 'headingsListCommand')).toEqual(
        expect.objectContaining({
          name: 'Headings list mode trigger',
          control: {
            type: 'text',
            key: 'headingsListCommand',
            placeholder: config.headingsListPlaceholderText,
          },
        }),
      );
    });

    it('should define the max recent files slider', () => {
      const definitions = sut.getSettingDefinitions();

      expect(findSettingByKey(definitions, 'maxRecentFileSuggestionsOnInit')).toEqual(
        expect.objectContaining({
          name: 'Max recent files to show',
          control: {
            type: 'slider',
            key: 'maxRecentFileSuggestionsOnInit',
            min: 0,
            max: 75,
            step: 1,
            defaultValue: 25,
          },
        }),
      );
    });

    it('should define the filename and bookmark search toggles', () => {
      const definitions = sut.getSettingDefinitions();

      expect(findSettingByKey(definitions, 'shouldSearchFilenames').control).toEqual({
        type: 'toggle',
        key: 'shouldSearchFilenames',
      });
      expect(findSettingByKey(definitions, 'shouldSearchBookmarks').control).toEqual({
        type: 'toggle',
        key: 'shouldSearchBookmarks',
      });
    });
  });

  describe('getSettingDefinitions exclusions settings', () => {
    let openModalMock: jest.SpyInstance<Setting, [App, ListEntryModalOptions]>;
    const getList = () =>
      findListByHeading(sut.getSettingDefinitions(), 'Exclude folders');

    // Runs the add affordance and returns the options it opened the modal with.
    const runAddItem = () => {
      getList().addItem.action(null);
      return openModalMock.mock.calls[0][1];
    };

    // Taps a row and returns the options it opened the modal with.
    const runRowAction = (index: number) => {
      (getList().items[index] as SettingDefinitionAction).action(null, index);
      return openModalMock.mock.calls[0][1];
    };

    const pageItems = () => {
      const [page] = sut.getSettingDefinitions() as [
        SettingDefinitionPage<SettingsControlKey>,
      ];

      return page.items;
    };

    beforeEach(() => {
      openModalMock = jest
        .spyOn(ListEntryModal, 'openListEntryModal')
        .mockReturnValue(mock<Setting>());
      mockPluginSettingTab.update.mockReset();
      config.excludeFolders = ['^Archive'];
      jest.spyOn(config, 'save').mockReturnValue();
    });

    afterEach(() => {
      openModalMock.mockRestore();
      (config.save as jest.Mock).mockRestore();
      config.excludeFolders = [];
    });

    it('should place the Exclusions block at page level in reading order', () => {
      const tail = pageItems().slice(-3);

      expect((tail[1] as SettingDefinitionList<SettingsControlKey>).heading).toBe(
        'Exclude folders',
      );
      expect((tail[2] as SettingDefinition<SettingsControlKey>).name).toBe(
        'Hide Obsidian "Excluded files"',
      );
    });

    it('should no longer wrap the exclusions in a group', () => {
      const headings = pageItems().map(
        (item) => (item as SettingDefinitionGroup<SettingsControlKey>).heading,
      );

      expect(headings).not.toContain('Exclusions');
    });

    it('should explain the setting in the add dialog', () => {
      const { desc } = runAddItem();

      expect(desc).toEqual(expect.stringContaining('Vault Root'));
    });

    it('should render one non-searchable row per stored pattern, in order', () => {
      config.excludeFolders = ['^Archive', '^Templates/.*'];

      expect(getList().items).toEqual([
        { name: '^Archive', searchable: false, action: expect.any(Function) },
        { name: '^Templates/.*', searchable: false, action: expect.any(Function) },
      ]);
    });

    it('should remove the entry at the deleted index, save, and rebuild the tab', () => {
      config.excludeFolders = ['^Archive', '^Templates/.*'];

      getList().onDelete(0);

      expect(config.excludeFolders).toEqual(['^Templates/.*']);
      expect(config.save).toHaveBeenCalled();
      expect(mockPluginSettingTab.update).toHaveBeenCalled();
    });

    it('should append the submitted pattern, save, and rebuild the tab', () => {
      const { onSubmit } = runAddItem();

      onSubmit('^Templates/.*');

      expect(config.excludeFolders).toEqual(['^Archive', '^Templates/.*']);
      expect(config.save).toHaveBeenCalled();
      expect(mockPluginSettingTab.update).toHaveBeenCalled();
    });

    it('should not normalize the entry because whitespace can be part of the pattern', () => {
      const { normalize, onSubmit } = runAddItem();

      expect(normalize).toBeUndefined();

      onSubmit(' ^Draft ');

      expect(config.excludeFolders).toEqual(['^Archive', ' ^Draft ']);
    });

    it('should offer no datalist because patterns are not drawn from a known set', () => {
      const { suggestions, options } = runAddItem();

      expect(suggestions).toBeUndefined();
      expect(options).toBeUndefined();
    });

    it('should reject a pattern that does not compile, naming it', () => {
      const { validate } = runAddItem();

      expect(validate('[unclosed')).toEqual(expect.stringContaining('[unclosed'));
    });

    it('should accept a pattern that compiles', () => {
      const { validate } = runAddItem();

      expect(validate('^Templates/.*')).toBeUndefined();
    });

    it('should reject a duplicate pattern', () => {
      const { validate } = runAddItem();

      expect(validate('^Archive')).toEqual(expect.stringContaining('^Archive'));
    });

    it('should open the modal prefilled when a row is tapped and replace in place', () => {
      config.excludeFolders = ['^Archive', '^Templates/.*'];
      const { initialValue, onSubmit } = runRowAction(1);

      expect(initialValue).toBe('^Templates/.*');

      onSubmit('^Temp');

      expect(config.excludeFolders).toEqual(['^Archive', '^Temp']);
    });

    it('should define the Obsidian excluded files toggle', () => {
      const setting = findByKey('excludeObsidianIgnoredFiles');

      expect(setting.control).toEqual({
        type: 'toggle',
        key: 'excludeObsidianIgnoredFiles',
      });
    });
  });
  describe('getSettingDefinitions search headings settings', () => {
    // Every setting gated behind the shouldSearchHeadings master toggle.
    const dependentKeys = [
      'strictHeadingsOnly',
      'showHeadingBreadcrumbs',
      'headingBreadcrumbSeparator',
      'maxBreadcrumbDepth',
    ] as const;

    it('should bind the master toggle to shouldSearchHeadings', () => {
      const setting = findByKey('shouldSearchHeadings');

      expect(setting.control).toEqual({ type: 'toggle', key: 'shouldSearchHeadings' });
    });

    // The heading levels row is a render row, so it is the one dependent
    // addressed by name rather than by control key.
    const dependentVisibility = () => {
      const definitions = sut.getSettingDefinitions();
      const dependents = [
        ...dependentKeys.map((key) => findSettingByKey(definitions, key)),
        findSettingByName(definitions, 'Include heading levels'),
      ];

      return dependents.map(isSettingVisible);
    };

    it('should hide every dependent setting when heading search is disabled', () => {
      config.shouldSearchHeadings = false;

      expect(dependentVisibility()).toEqual([false, false, false, false, false]);
    });

    it('should show every dependent setting when heading search is enabled', () => {
      config.shouldSearchHeadings = true;

      expect(dependentVisibility()).toEqual([true, true, true, true, true]);
    });

    it('should hide the breadcrumb detail settings when breadcrumbs are disabled', () => {
      config.shouldSearchHeadings = true;
      config.showHeadingBreadcrumbs = false;
      const definitions = sut.getSettingDefinitions();

      const visibility = (
        ['headingBreadcrumbSeparator', 'maxBreadcrumbDepth'] as const
      ).map((key) => isSettingVisible(findSettingByKey(definitions, key)));

      expect(visibility).toEqual([false, false]);
      expect(
        isSettingVisible(findSettingByKey(definitions, 'showHeadingBreadcrumbs')),
      ).toBe(true);
    });

    it('should define the filename fallback and breadcrumb settings', () => {
      config.shouldSearchHeadings = true;
      const definitions = sut.getSettingDefinitions();
      const controls = dependentKeys.map(
        (key) => findSettingByKey(definitions, key).control,
      );

      expect(controls).toEqual([
        { type: 'toggle', key: 'strictHeadingsOnly' },
        { type: 'toggle', key: 'showHeadingBreadcrumbs' },
        { type: 'text', key: 'headingBreadcrumbSeparator' },
        {
          type: 'slider',
          key: 'maxBreadcrumbDepth',
          min: 0,
          max: 6,
          step: 1,
          defaultValue: 0,
        },
      ]);
    });
  });
  describe('getSettingDefinitions heading levels row', () => {
    const getHeadingLevelsRow = () =>
      findByName('Include heading levels') as SettingDefinitionRender;

    const renderWithButtons = (buttons: MockProxy<ButtonComponent>[]) => {
      const mockSetting = mock<Setting>();
      let callIndex = 0;
      mockSetting.addButton.mockImplementation((cb) => {
        cb(buttons[callIndex]);
        callIndex += 1;
        return mockSetting;
      });

      getHeadingLevelsRow().render(mockSetting, null);

      return mockSetting;
    };

    it('should add one button per heading level', () => {
      const buttons = Array.from({ length: 6 }, () => mock<ButtonComponent>());

      const mockSetting = renderWithButtons(buttons);

      expect(mockSetting.addButton).toHaveBeenCalledTimes(6);
      buttons.forEach((btn, idx) => {
        expect(btn.setButtonText).toHaveBeenCalledWith(`H${idx + 1}`);
      });
    });

    it('should highlight only the enabled heading levels', () => {
      config.searchAllHeadings = [1, 3];
      const buttons = Array.from({ length: 6 }, () => mock<ButtonComponent>());

      renderWithButtons(buttons);

      expect(buttons[0].setCta).toHaveBeenCalled();
      expect(buttons[2].setCta).toHaveBeenCalled();
      expect(buttons[1].setCta).not.toHaveBeenCalled();
    });

    it('should add a level and persist when an unselected button is clicked', () => {
      config.searchAllHeadings = [1];
      const saveSpy = jest.spyOn(config, 'save').mockReturnValue();
      const buttons = Array.from({ length: 6 }, () => mock<ButtonComponent>());
      const clickHandlers: Array<() => void> = [];
      buttons.forEach((btn, idx) => {
        btn.onClick.mockImplementation((cb) => {
          clickHandlers[idx] = cb as () => void;
          return btn;
        });
      });

      renderWithButtons(buttons);
      clickHandlers[2]();

      expect(config.searchAllHeadings).toEqual([1, 3]);
      expect(buttons[2].setCta).toHaveBeenCalled();
      expect(saveSpy).toHaveBeenCalled();

      saveSpy.mockRestore();
    });

    it('should remove a level and persist when a selected button is clicked', () => {
      config.searchAllHeadings = [1, 3];
      const saveSpy = jest.spyOn(config, 'save').mockReturnValue();
      const buttons = Array.from({ length: 6 }, () => mock<ButtonComponent>());
      const clickHandlers: Array<() => void> = [];
      buttons.forEach((btn, idx) => {
        btn.onClick.mockImplementation((cb) => {
          clickHandlers[idx] = cb as () => void;
          return btn;
        });
      });

      renderWithButtons(buttons);
      clickHandlers[0]();

      expect(config.searchAllHeadings).toEqual([3]);
      expect(buttons[0].removeCta).toHaveBeenCalled();
      expect(saveSpy).toHaveBeenCalled();

      saveSpy.mockRestore();
    });
  });

  describe('getSettingDefinitions file extension list', () => {
    let openModalMock: jest.SpyInstance<Setting, [App, ListEntryModalOptions]>;
    const getList = () =>
      findListByHeading(sut.getSettingDefinitions(), 'File extension override');

    // Runs the add affordance and returns the options it opened the modal with.
    const runAddItem = () => {
      getList().addItem.action(null);
      return openModalMock.mock.calls[0][1];
    };

    // Taps a row and returns the options it opened the modal with.
    const runRowAction = (index: number) => {
      (getList().items[index] as SettingDefinitionAction).action(null, index);
      return openModalMock.mock.calls[0][1];
    };

    beforeEach(() => {
      openModalMock = jest
        .spyOn(ListEntryModal, 'openListEntryModal')
        .mockReturnValue(mock<Setting>());
      mockPluginSettingTab.update.mockReset();
      config.fileExtAllowList = ['canvas'];
      jest.spyOn(config, 'save').mockReturnValue();
    });

    afterEach(() => {
      openModalMock.mockRestore();
      (config.save as jest.Mock).mockRestore();
      config.fileExtAllowList = ['canvas'];
    });

    it('should explain the setting in the add dialog', () => {
      const { desc } = runAddItem();

      expect(desc).toEqual(expect.stringContaining('Show attachments'));
    });

    it('should render one non-searchable row per stored extension, in order', () => {
      config.fileExtAllowList = ['canvas', 'pdf'];

      expect(getList().items).toEqual([
        { name: 'canvas', searchable: false, action: expect.any(Function) },
        { name: 'pdf', searchable: false, action: expect.any(Function) },
      ]);
    });

    it('should remove the entry at the deleted index, save, and rebuild the tab', () => {
      config.fileExtAllowList = ['canvas', 'pdf'];

      getList().onDelete(1);

      expect(config.fileExtAllowList).toEqual(['canvas']);
      expect(config.save).toHaveBeenCalled();
      expect(mockPluginSettingTab.update).toHaveBeenCalled();
    });

    it('should not offer reordering because no consumer reads the order', () => {
      expect(getList().onReorder).toBeUndefined();
    });

    it('should offer the registered extensions as datalist suggestions', () => {
      const { suggestions } = runAddItem();

      expect(suggestions).toEqual(['canvas', 'pdf']);
    });

    it('should append the submitted extension, save, and rebuild the tab', () => {
      const { onSubmit } = runAddItem();

      onSubmit('pdf');

      expect(config.fileExtAllowList).toEqual(['canvas', 'pdf']);
      expect(config.save).toHaveBeenCalled();
      expect(mockPluginSettingTab.update).toHaveBeenCalled();
    });

    it('should accept an unregistered extension, which is the whole point of the allow list', () => {
      const { validate, normalize } = runAddItem();

      expect(normalize('  base  ')).toBe('base');
      expect(validate('base')).toBeUndefined();
    });

    it('should reject a duplicate extension', () => {
      const { validate } = runAddItem();

      expect(validate('canvas')).toEqual(expect.stringContaining('canvas'));
    });

    it('should open the modal prefilled when a row is tapped', () => {
      const { initialValue, title } = runRowAction(0);

      expect(initialValue).toBe('canvas');
      expect(title).toEqual(expect.stringContaining('Edit'));
    });

    it('should replace the edited entry in place, save, and rebuild the tab', () => {
      config.fileExtAllowList = ['canvas', 'pdf'];
      const { onSubmit } = runRowAction(0);

      onSubmit('base');

      expect(config.fileExtAllowList).toEqual(['base', 'pdf']);
      expect(config.save).toHaveBeenCalled();
      expect(mockPluginSettingTab.update).toHaveBeenCalled();
    });

    it('should not reject the entry being edited as its own duplicate', () => {
      config.fileExtAllowList = ['canvas', 'pdf'];
      const { validate } = runRowAction(0);

      expect(validate('canvas')).toBeUndefined();
      expect(validate('pdf')).toEqual(expect.stringContaining('pdf'));
    });
  });
});
