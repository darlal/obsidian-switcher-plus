import {
  HeadingsSettingsTabSection,
  SettingsControlKey,
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
  ViewRegistry,
} from 'obsidian';
import {
  findListByHeading,
  findSettingByKey,
  findSettingByName,
  isSettingVisible,
} from '@fixtures';
import * as ListEntryModal from 'src/settings/listEntryModal';
import type { ListEntryModalOptions } from 'src/settings/listEntryModal';

describe('headingsSettingsTabSection', () => {
  let mockApp: MockProxy<App>;
  let mockPluginSettingTab: MockProxy<SwitcherPlusSettingTab>;
  let config: SwitcherPlusSettings;
  let mockContainerEl: MockProxy<HTMLElement>;
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

    sut = new HeadingsSettingsTabSection(mockApp, mockPluginSettingTab, config);
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
            validate: expect.any(Function),
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
