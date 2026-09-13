import {
  GeneralSettingsTabSection,
  SettingsControlKey,
  SwitcherPlusSettings,
  SwitcherPlusSettingTab,
} from 'src/settings';
import { mock, mockFn, MockProxy, mockReset } from 'jest-mock-extended';
import {
  App,
  DropdownComponent,
  Setting,
  SettingDefinitionControl,
  SettingDefinitionGroup,
  SettingDefinitionList,
  SettingDefinitionPage,
  SettingDefinitionRender,
  ToggleComponent,
} from 'obsidian';
import {
  findListByHeading,
  findSettingByKey,
  findSettingByName,
  flattenSettingDefinitions,
  isSettingVisible,
} from '@fixtures';
import * as ListEntryModal from 'src/settings/listEntryModal';
import type { ListEntryModalOptions } from 'src/settings/listEntryModal';
import { getModeNames } from 'src/utils';
import { PathDisplayFormat, TagSource } from 'src/types';

describe('generalSettingsTabSection', () => {
  let mockApp: MockProxy<App>;
  let mockPluginSettingTab: MockProxy<SwitcherPlusSettingTab>;
  let mockContainerEl: MockProxy<HTMLElement>;
  let config: SwitcherPlusSettings;
  let sut: GeneralSettingsTabSection;

  const findByKey = (key: SettingsControlKey) =>
    findSettingByKey(sut.getSettingDefinitions(), key);

  const findByName = (name: string) =>
    findSettingByName(sut.getSettingDefinitions(), name);

  beforeAll(() => {
    mockApp = mock<App>();
    mockContainerEl = mock<HTMLElement>();
    config = new SwitcherPlusSettings(null);
    mockPluginSettingTab = mock<SwitcherPlusSettingTab>({
      containerEl: mockContainerEl,
      plugin: { registerRibbonCommandIcons: mockFn() },
    });

    sut = new GeneralSettingsTabSection(mockApp, mockPluginSettingTab, config);
  });

  describe('getSettingDefinitions', () => {
    it('should return a flat list of items rather than a page', () => {
      const definitions = sut.getSettingDefinitions();

      expect(
        definitions.every((item) => (item as SettingDefinitionPage).type !== 'page'),
      ).toBe(true);
    });

    it('should define the standalone toggle settings', () => {
      expect(findByKey('onOpenPreferNewTab').control).toEqual({
        type: 'toggle',
        key: 'onOpenPreferNewTab',
      });
      expect(findByKey('showOptionalIndicatorIcons').control).toEqual({
        type: 'toggle',
        key: 'showOptionalIndicatorIcons',
      });
      expect(findByKey('showModeTriggerInstructions').control).toEqual({
        type: 'toggle',
        key: 'showModeTriggerInstructions',
      });
      expect(findByKey('shouldCloseModalOnBackspace').control).toEqual({
        type: 'toggle',
        key: 'shouldCloseModalOnBackspace',
      });
    });

    it('should define the mode trigger escape character setting', () => {
      expect(findByKey('escapeCmdChar').control).toEqual({
        type: 'text',
        key: 'escapeCmdChar',
      });
    });

    it('should define the nested quick open and quick filter toggles', () => {
      expect(findByKey('quickOpen.isEnabled').control).toEqual({
        type: 'toggle',
        key: 'quickOpen.isEnabled',
      });
      expect(findByKey('quickFilters.shouldResetActiveFacets').control).toEqual({
        type: 'toggle',
        key: 'quickFilters.shouldResetActiveFacets',
      });
    });

    it('should define the standard mode override settings', () => {
      const subtitle =
        'Configure how Switcher++ overrides the default Obsidian Switcher behavior in Standard mode.';

      expect(findByName(subtitle)).toEqual({
        name: subtitle,
      });
      expect(findByKey('overrideStandardModeBehaviors').control).toEqual({
        type: 'toggle',
        key: 'overrideStandardModeBehaviors',
      });
      expect(findByKey('overrideStandardModeRendering').control).toEqual({
        type: 'toggle',
        key: 'overrideStandardModeRendering',
      });
    });

    it('should define the restore previous input settings', () => {
      expect(findByKey('preserveCommandPaletteLastInput').control).toEqual({
        type: 'toggle',
        key: 'preserveCommandPaletteLastInput',
      });
      expect(findByKey('preserveQuickSwitcherLastInput').control).toEqual({
        type: 'toggle',
        key: 'preserveQuickSwitcherLastInput',
      });
    });

    it('should define the insert link in editor settings', () => {
      expect(findByKey('insertLinkInEditor.useBasenameAsAlias').control).toEqual({
        type: 'toggle',
        key: 'insertLinkInEditor.useBasenameAsAlias',
      });
      expect(findByKey('insertLinkInEditor.useHeadingAsAlias').control).toEqual({
        type: 'toggle',
        key: 'insertLinkInEditor.useHeadingAsAlias',
      });
    });

    it('should define the path display settings with every format option', () => {
      const formatControl = findByKey('pathDisplayFormatString').control;

      expect(formatControl).toEqual({
        type: 'dropdown',
        key: 'pathDisplayFormatString',
        options: {
          [PathDisplayFormat.None.toString()]: 'Hide path',
          [PathDisplayFormat.Full.toString()]: 'Full path',
          [PathDisplayFormat.FolderOnly.toString()]: 'Only parent folder',
          [PathDisplayFormat.FolderWithFilename.toString()]: 'Parent folder & filename',
          [PathDisplayFormat.FolderPathFilenameOptional.toString()]:
            'Parent folder path (filename optional)',
        },
      });
      expect(findByKey('hidePathIfRoot').control).toEqual({
        type: 'toggle',
        key: 'hidePathIfRoot',
      });
    });
  });
  describe('getSettingDefinitions title source settings', () => {
    it('should define the title source dropdown', () => {
      expect(findByKey('preferredSourceForTitle').control).toEqual({
        type: 'dropdown',
        key: 'preferredSourceForTitle',
        options: {
          H1: 'First H₁ heading',
          Default: 'Default',
          FrontMatter: 'Frontmatter property',
        },
      });
    });

    it('should hide the property path input unless FrontMatter is selected', () => {
      config.preferredSourceForTitle = 'Default';
      expect(isSettingVisible(findByKey('frontmatterTitleProperty'))).toBe(false);
    });

    it('should show the property path input when FrontMatter is selected', () => {
      config.preferredSourceForTitle = 'FrontMatter';
      expect(isSettingVisible(findByKey('frontmatterTitleProperty'))).toBe(true);
    });

    it('should bind the property path input to frontmatterTitleProperty', () => {
      expect(findByKey('frontmatterTitleProperty').control).toEqual({
        type: 'text',
        key: 'frontmatterTitleProperty',
        placeholder: 'title',
      });
    });
  });
  describe('getSettingDefinitions tag display settings', () => {
    // Every setting gated behind the showTagsInSuggestions master toggle.
    const dependentKeys: SettingsControlKey[] = [
      'tagSource',
      'maxTagsToDisplay',
      'tagDisplaySeparator',
      'removeHashPrefixFromTags',
    ];

    const dependentVisibility = () => {
      const definitions = sut.getSettingDefinitions();

      return dependentKeys.map((key) =>
        isSettingVisible(findSettingByKey(definitions, key)),
      );
    };

    it('should bind the master toggle to showTagsInSuggestions', () => {
      const setting = findByKey('showTagsInSuggestions');

      expect(setting.control).toEqual({
        type: 'toggle',
        key: 'showTagsInSuggestions',
      });
    });

    it('should hide every dependent when tags are not shown', () => {
      config.showTagsInSuggestions = false;

      expect(dependentVisibility()).toEqual([false, false, false, false]);
    });

    it('should show every dependent when tags are shown', () => {
      config.showTagsInSuggestions = true;

      expect(dependentVisibility()).toEqual([true, true, true, true]);
    });

    it('should define the dependent tag settings', () => {
      const definitions = sut.getSettingDefinitions();
      const controls = dependentKeys.map(
        (key) => findSettingByKey(definitions, key).control,
      );

      expect(controls).toEqual([
        {
          type: 'dropdown',
          key: 'tagSource',
          options: {
            [TagSource.Both]: 'Both',
            [TagSource.Inline]: 'Inline only',
            [TagSource.Frontmatter]: 'Frontmatter only',
          },
        },
        {
          type: 'slider',
          key: 'maxTagsToDisplay',
          min: 0,
          max: 20,
          step: 1,
          defaultValue: 5,
        },
        { type: 'text', key: 'tagDisplaySeparator', placeholder: ', ' },
        { type: 'toggle', key: 'removeHashPrefixFromTags' },
      ]);
    });
  });
  describe('getSettingDefinitions live preview settings', () => {
    // Every per symbol type toggle gated behind the live preview master toggle.
    const dependentKeys: SettingsControlKey[] = [
      'renderMarkdownContentInSuggestions.renderHeadings',
      'renderMarkdownContentInSuggestions.renderLinks',
      'renderMarkdownContentInSuggestions.renderTags',
      'renderMarkdownContentInSuggestions.renderCallouts',
    ];

    it('should mark the master toggle as experimental in its description', () => {
      const master = findByKey('renderMarkdownContentInSuggestions.isEnabled');

      expect(master.desc).toEqual(expect.stringContaining('Experimental'));
      expect(master.control).toEqual({
        type: 'toggle',
        key: 'renderMarkdownContentInSuggestions.isEnabled',
      });
    });

    it('should hide the per type toggles when live preview is disabled', () => {
      config.renderMarkdownContentInSuggestions.isEnabled = false;
      const definitions = sut.getSettingDefinitions();

      dependentKeys.forEach((key) => {
        expect(isSettingVisible(findSettingByKey(definitions, key))).toBe(false);
      });
    });

    it('should define a toggle for each renderable symbol type', () => {
      const definitions = sut.getSettingDefinitions();
      const controls = dependentKeys.map(
        (key) => findSettingByKey(definitions, key).control,
      );

      expect(controls).toEqual([
        { type: 'toggle', key: 'renderMarkdownContentInSuggestions.renderHeadings' },
        { type: 'toggle', key: 'renderMarkdownContentInSuggestions.renderLinks' },
        { type: 'toggle', key: 'renderMarkdownContentInSuggestions.renderTags' },
        { type: 'toggle', key: 'renderMarkdownContentInSuggestions.renderCallouts' },
      ]);
    });
  });
  describe('getSettingDefinitions match priority settings', () => {
    // The dot path key generated for every entry in both adjustment collections.
    const expectedSliderKeys = (): SettingsControlKey[] => {
      const { adjustments, fileExtAdjustments } = config.matchPriorityAdjustments;

      return [
        ...Object.keys(adjustments).map(
          (key) => `matchPriorityAdjustments.adjustments.${key}.value` as const,
        ),
        ...Object.keys(fileExtAdjustments).map(
          (key) => `matchPriorityAdjustments.fileExtAdjustments.${key}.value` as const,
        ),
      ];
    };

    it('should bind the master toggle to the nested isEnabled key', () => {
      const setting = findByKey('matchPriorityAdjustments.isEnabled');

      expect(setting.control).toEqual({
        type: 'toggle',
        key: 'matchPriorityAdjustments.isEnabled',
      });
    });

    it('should define one slider per adjustment across both collections', () => {
      const sliderKeys = flattenSettingDefinitions(sut.getSettingDefinitions())
        .map((item) => (item as SettingDefinitionControl).control?.key)
        .filter((key) => key?.endsWith('.value'));

      expect(sliderKeys).toEqual(expectedSliderKeys());
    });

    it('should bind each slider to its generated dot path key', () => {
      const [firstKey] = Object.keys(config.matchPriorityAdjustments.adjustments);
      const slider = findByKey(`matchPriorityAdjustments.adjustments.${firstKey}.value`);

      expect(slider.control).toEqual({
        type: 'slider',
        key: `matchPriorityAdjustments.adjustments.${firstKey}.value`,
        min: -1,
        max: 1,
        step: 0.05,
        defaultValue: 0,
      });
    });

    it('should label each slider from its adjustment data', () => {
      const [firstKey] = Object.keys(config.matchPriorityAdjustments.adjustments);
      const { label } = config.matchPriorityAdjustments.adjustments[firstKey];
      const slider = findByKey(`matchPriorityAdjustments.adjustments.${firstKey}.value`);

      expect(slider.name).toBe(label);
    });

    it('should hide every slider when adjustments are disabled', () => {
      config.matchPriorityAdjustments.isEnabled = false;
      const definitions = sut.getSettingDefinitions();

      expectedSliderKeys().forEach((key) => {
        expect(isSettingVisible(findSettingByKey(definitions, key))).toBe(false);
      });
    });
  });
  describe('getSettingDefinitions ribbon commands list', () => {
    let openModalMock: jest.SpyInstance<Setting, [App, ListEntryModalOptions]>;
    const getList = () =>
      findListByHeading(sut.getSettingDefinitions(), 'Show ribbon icons');

    const runAddItem = () => {
      getList().addItem.action(null);
      return openModalMock.mock.calls[0][1];
    };

    beforeEach(() => {
      openModalMock = jest
        .spyOn(ListEntryModal, 'openListEntryModal')
        .mockReturnValue(mock<Setting>());
      mockReset(mockPluginSettingTab.plugin);
      mockPluginSettingTab.update.mockReset();
      config.enabledRibbonCommands = [getModeNames()[0]];
      jest.spyOn(config, 'save').mockReturnValue();
    });

    afterEach(() => {
      openModalMock.mockRestore();
      (config.save as jest.Mock).mockRestore();
    });

    it('should name the list with a heading', () => {
      expect(getList().heading).toBe('Show ribbon icons');
    });

    it('should explain the setting in the add dialog', () => {
      const { desc } = runAddItem();

      expect(desc).toEqual(
        expect.stringContaining('icon in the ribbon menu to launch specific modes'),
      );
    });

    it('should render one non-searchable row per enabled command, in ribbon order', () => {
      const [first, second] = getModeNames();
      config.enabledRibbonCommands = [second, first];

      expect(getList().items).toEqual([
        { name: second, searchable: false },
        { name: first, searchable: false },
      ]);
    });

    it('should offer only the modes not already enabled', () => {
      const { options } = runAddItem();

      expect(options).toEqual(getModeNames().slice(1));
    });

    it('should append the submitted mode, save, re-register the icons, and rebuild the tab', () => {
      const [first, second] = getModeNames();
      const { onSubmit } = runAddItem();

      onSubmit(second);

      expect(config.enabledRibbonCommands).toEqual([first, second]);
      expect(config.save).toHaveBeenCalled();
      expect(mockPluginSettingTab.plugin.registerRibbonCommandIcons).toHaveBeenCalled();
      expect(mockPluginSettingTab.update).toHaveBeenCalled();
    });

    it('should remove the deleted command, save, re-register the icons, and rebuild the tab', () => {
      const [first, second] = getModeNames();
      config.enabledRibbonCommands = [first, second];

      getList().onDelete(0);

      expect(config.enabledRibbonCommands).toEqual([second]);
      expect(config.save).toHaveBeenCalled();
      expect(mockPluginSettingTab.plugin.registerRibbonCommandIcons).toHaveBeenCalled();
      expect(mockPluginSettingTab.update).toHaveBeenCalled();
    });

    it('should move the command to the new index, save, re-register the icons, and rebuild the tab', () => {
      const [first, second, third] = getModeNames();
      config.enabledRibbonCommands = [first, second, third];

      getList().onReorder(0, 2);

      expect(config.enabledRibbonCommands).toEqual([second, third, first]);
      expect(config.save).toHaveBeenCalled();
      expect(mockPluginSettingTab.plugin.registerRibbonCommandIcons).toHaveBeenCalled();
      expect(mockPluginSettingTab.update).toHaveBeenCalled();
    });

    it('should omit the add affordance once every mode is enabled', () => {
      config.enabledRibbonCommands = getModeNames();

      expect(getList().addItem).toBeUndefined();
    });
  });

  describe('getSettingDefinitions launcher settings', () => {
    const modeRowName = 'Mode for new tab and mobile launcher buttons';
    const mobileToggleName =
      'Override default Switcher launch button on mobile platforms';
    const emptyTabToggleName = 'Display launch button on the "New tab" page';

    const findRow = (name: string) => findByName(name) as SettingDefinitionRender;

    const renderRow = (row: SettingDefinitionRender) => {
      const mockSetting = mock<Setting>();
      const mockDropdown = mock<DropdownComponent>();
      const mockToggle = mock<ToggleComponent>();
      let dropdownChange: (value: string) => void;
      let toggleChange: (value: boolean) => void;

      mockDropdown.onChange.mockImplementation((cb) => {
        dropdownChange = cb;
        return mockDropdown;
      });
      mockToggle.onChange.mockImplementation((cb) => {
        toggleChange = cb;
        return mockToggle;
      });
      mockSetting.addDropdown.mockImplementation((cb) => {
        cb(mockDropdown);
        return mockSetting;
      });
      mockSetting.addToggle.mockImplementation((cb) => {
        cb(mockToggle);
        return mockSetting;
      });

      row.render(mockSetting, null);

      return { mockDropdown, mockToggle, dropdownChange, toggleChange };
    };

    it('should offer a do not override option alongside every mode', () => {
      const { mockDropdown } = renderRow(findRow(modeRowName));
      const [options] = mockDropdown.addOptions.mock.calls[0];

      expect(options.disabled).toBe('Do not override');
      getModeNames().forEach((name) => {
        expect(options[name]).toBe(name);
      });
    });

    it('should disable the override and refresh the buttons when set to disabled', () => {
      const saveSpy = jest.spyOn(config, 'save').mockReturnValue();
      const { dropdownChange } = renderRow(findRow(modeRowName));

      dropdownChange('disabled');

      expect(config.mobileLauncher.isEnabled).toBe(false);
      expect(saveSpy).toHaveBeenCalled();
      expect(
        mockPluginSettingTab.plugin.updateLauncherButtonOverrides,
      ).toHaveBeenCalledWith(false);

      saveSpy.mockRestore();
    });

    it('should store the selected mode and refresh the buttons', () => {
      const saveSpy = jest.spyOn(config, 'save').mockReturnValue();
      const [modeName] = getModeNames();
      const { dropdownChange } = renderRow(findRow(modeRowName));

      dropdownChange(modeName);

      expect(config.mobileLauncher.isEnabled).toBe(true);
      expect(config.mobileLauncher.modeString).toBe(modeName);
      expect(
        mockPluginSettingTab.plugin.updateLauncherButtonOverrides,
      ).toHaveBeenCalledWith(true);

      saveSpy.mockRestore();
    });

    it('should refresh dom state on a launcher mode change so the dependent toggle visibility predicates re-evaluate', () => {
      const saveSpy = jest.spyOn(config, 'save').mockReturnValue();
      const [modeName] = getModeNames();
      const { dropdownChange } = renderRow(findRow(modeRowName));

      dropdownChange(modeName);

      expect(mockPluginSettingTab.refreshDomState).toHaveBeenCalled();

      saveSpy.mockRestore();
    });

    it('should hide the dependent launcher toggles when the override is disabled', () => {
      config.mobileLauncher.isEnabled = false;

      [mobileToggleName, emptyTabToggleName].forEach((name) => {
        expect(isSettingVisible(findRow(name))).toBe(false);
      });
    });

    it('should persist and refresh when a dependent launcher toggle changes', () => {
      const saveSpy = jest.spyOn(config, 'save').mockReturnValue();
      config.mobileLauncher.isEnabled = true;
      config.mobileLauncher.isMobileButtonEnabled = false;

      const { toggleChange } = renderRow(findRow(mobileToggleName));
      toggleChange(true);

      expect(config.mobileLauncher.isMobileButtonEnabled).toBe(true);
      expect(saveSpy).toHaveBeenCalled();
      expect(
        mockPluginSettingTab.plugin.updateLauncherButtonOverrides,
      ).toHaveBeenCalledWith(true);

      saveSpy.mockRestore();
    });
  });

  describe('getSettingDefinitions excluded tags list', () => {
    let openModalMock: jest.SpyInstance<Setting, [App, ListEntryModalOptions]>;
    const getList = () => findListByHeading(sut.getSettingDefinitions(), 'Excluded tags');

    // Runs the add affordance and returns the options it opened the modal with.
    const runAddItem = () => {
      getList().addItem.action(null);
      return openModalMock.mock.calls[0][1];
    };

    beforeEach(() => {
      openModalMock = jest
        .spyOn(ListEntryModal, 'openListEntryModal')
        .mockReturnValue(mock<Setting>());
      mockPluginSettingTab.update.mockReset();
      config.showTagsInSuggestions = true;
      config.excludeTagsFromDisplay = ['draft'];
      jest.spyOn(config, 'save').mockReturnValue();
    });

    afterEach(() => {
      openModalMock.mockRestore();
      (config.save as jest.Mock).mockRestore();
      config.excludeTagsFromDisplay = [];
    });

    it('should sit at root level immediately after the tag display group', () => {
      const definitions = sut.getSettingDefinitions();
      const groupIdx = definitions.findIndex(
        (item) =>
          (item as SettingDefinitionGroup<SettingsControlKey>).heading ===
          'Show tags in suggestions',
      );

      expect(
        (definitions[groupIdx + 1] as SettingDefinitionList<SettingsControlKey>).heading,
      ).toBe('Excluded tags');
    });

    it('should name the list with a heading rather', () => {
      expect(getList().heading).toBe('Excluded tags');
    });

    it('should explain the setting in the add dialog', () => {
      const { desc } = runAddItem();

      expect(desc).toEqual(expect.stringContaining('without the # prefix'));
    });

    it('should hide the list when tags are not shown', () => {
      config.showTagsInSuggestions = false;

      expect((getList().visible as () => boolean)()).toBe(false);
    });

    it('should show the list when tags are shown', () => {
      expect((getList().visible as () => boolean)()).toBe(true);
    });

    it('should render one non-searchable row per stored tag, in order', () => {
      config.excludeTagsFromDisplay = ['draft', 'wip'];

      expect(getList().items).toEqual([
        { name: 'draft', searchable: false },
        { name: 'wip', searchable: false },
      ]);
    });

    it('should remove the entry at the deleted index, save, and rebuild the tab', () => {
      config.excludeTagsFromDisplay = ['draft', 'wip'];

      getList().onDelete(1);

      expect(config.excludeTagsFromDisplay).toEqual(['draft']);
      expect(config.save).toHaveBeenCalled();
      expect(mockPluginSettingTab.update).toHaveBeenCalled();
    });

    it('should not offer reordering because no consumer reads the order', () => {
      expect(getList().onReorder).toBeUndefined();
    });

    it('should strip a leading hash so the stored tag matches how tags are compared', () => {
      const { normalize } = runAddItem();

      expect(normalize('  #wip ')).toBe('wip');
    });

    it('should append the submitted tag, save, and rebuild the tab', () => {
      const { onSubmit } = runAddItem();

      onSubmit('wip');

      expect(config.excludeTagsFromDisplay).toEqual(['draft', 'wip']);
      expect(config.save).toHaveBeenCalled();
      expect(mockPluginSettingTab.update).toHaveBeenCalled();
    });

    it('should offer no datalist because vault tags are not enumerated here', () => {
      const { suggestions, options } = runAddItem();

      expect(suggestions).toBeUndefined();
      expect(options).toBeUndefined();
    });

    it('should reject an empty or duplicate tag', () => {
      const { validate } = runAddItem();

      expect(validate('')).toEqual(expect.stringContaining('Enter'));
      expect(validate('draft')).toEqual(expect.stringContaining('draft'));
    });
  });
});
