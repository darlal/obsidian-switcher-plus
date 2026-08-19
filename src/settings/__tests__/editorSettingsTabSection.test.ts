import {
  EditorSettingsTabSection,
  SettingsTabSection,
  SwitcherPlusSettings,
  SwitcherPlusSettingTab,
} from 'src/settings';
import { mock, MockProxy } from 'jest-mock-extended';
import { App, Setting, ViewRegistry } from 'obsidian';
import { findListByHeading, findSettingByKey } from '@fixtures';
import * as ListEntryModal from 'src/settings/listEntryModal';
import type { ListEntryModalOptions } from 'src/settings/listEntryModal';

describe('editorSettingsTabSection', () => {
  let mockApp: MockProxy<App>;
  let mockPluginSettingTab: MockProxy<SwitcherPlusSettingTab>;
  let config: SwitcherPlusSettings;
  let mockContainerEl: MockProxy<HTMLElement>;
  let sut: EditorSettingsTabSection;
  const viewTypeName = 'mock-view-type';

  beforeAll(() => {
    mockApp = mock<App>({ viewRegistry: mock<ViewRegistry>() });
    mockApp.viewRegistry.viewByType = { [viewTypeName]: null };
    mockContainerEl = mock<HTMLElement>();
    mockPluginSettingTab = mock<SwitcherPlusSettingTab>({ containerEl: mockContainerEl });
    config = new SwitcherPlusSettings(null);

    sut = new EditorSettingsTabSection(mockApp, mockPluginSettingTab, config);
  });

  it('should display a header for the section', () => {
    const addSectionTitleSpy = jest.spyOn(
      SettingsTabSection.prototype,
      'addSectionTitle',
    );

    sut.display(mockContainerEl);

    expect(addSectionTitleSpy).toHaveBeenCalledWith(mockContainerEl, 'Editor List Mode');

    addSectionTitleSpy.mockRestore();
  });

  it('should show the mode trigger setting', () => {
    const addTextSettingSpy = jest.spyOn(SettingsTabSection.prototype, 'addTextSetting');

    sut.display(mockContainerEl);

    expect(addTextSettingSpy).toHaveBeenCalledWith(
      mockContainerEl,
      'Editor list mode trigger',
      expect.any(String),
      config.editorListCommand,
      'editorListCommand',
      config.editorListPlaceholderText,
    );

    addTextSettingSpy.mockRestore();
  });

  it('should show the includeSidePanelViewTypes setting', () => {
    const addTextAreaSettingSpy = jest.spyOn(
      SettingsTabSection.prototype,
      'addTextAreaSetting',
    );

    sut.display(mockContainerEl);

    expect(addTextAreaSettingSpy).toHaveBeenCalledWith(
      mockContainerEl,
      'Include side panel views',
      expect.any(String),
      config.includeSidePanelViewTypes.join('\n'),
      'includeSidePanelViewTypes',
      config.includeSidePanelViewTypesPlaceholder,
    );

    addTextAreaSettingSpy.mockRestore();
  });

  describe('getSettingDefinitions', () => {
    it('should return a single page for the section', () => {
      const [page] = sut.getSettingDefinitions();

      expect(page).toEqual(
        expect.objectContaining({ type: 'page', name: 'Editor Mode' }),
      );
    });

    it('should define the mode trigger setting', () => {
      const definitions = sut.getSettingDefinitions();

      expect(findSettingByKey(definitions, 'editorListCommand')).toEqual({
        name: 'Editor list mode trigger',
        desc: expect.any(String),
        control: {
          type: 'text',
          key: 'editorListCommand',
          placeholder: config.editorListPlaceholderText,
        },
      });
    });

    it('should define the order by access time setting', () => {
      const definitions = sut.getSettingDefinitions();

      expect(findSettingByKey(definitions, 'orderEditorListByAccessTime')).toEqual({
        name: 'Order default editor list by most recently accessed',
        desc: expect.any(String),
        control: { type: 'toggle', key: 'orderEditorListByAccessTime' },
      });
    });
  });

  describe('getSettingDefinitions side panel views list', () => {
    let openModalMock: jest.SpyInstance<Setting, [App, ListEntryModalOptions]>;
    const getList = () =>
      findListByHeading(sut.getSettingDefinitions(), 'Include side panel views');

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
      config.includeSidePanelViewTypes = ['backlink'];
      jest.spyOn(config, 'save').mockReturnValue();
    });

    afterEach(() => {
      openModalMock.mockRestore();
      (config.save as jest.Mock).mockRestore();
    });

    it('should name the list with a heading rather', () => {
      expect(getList().heading).toBe('Include side panel views');
    });

    it('should explain the setting in the add dialog', () => {
      const { desc } = runAddItem();

      expect(desc).toEqual(
        expect.stringContaining('show the following view types from the side panels'),
      );
    });

    it('should render one non-searchable row per stored view type, in order', () => {
      config.includeSidePanelViewTypes = ['markdown', 'backlink'];

      expect(getList().items).toEqual([
        { name: 'markdown', searchable: false },
        { name: 'backlink', searchable: false },
      ]);
    });

    it('should remove the entry at the deleted index, save, and rebuild the tab', () => {
      config.includeSidePanelViewTypes = ['markdown', 'backlink'];

      getList().onDelete(0);

      expect(config.includeSidePanelViewTypes).toEqual(['backlink']);
      expect(config.save).toHaveBeenCalled();
      expect(mockPluginSettingTab.update).toHaveBeenCalled();
    });

    it('should not offer reordering because no consumer reads the order', () => {
      expect(getList().onReorder).toBeUndefined();
    });

    it('should offer the registered view types as datalist suggestions', () => {
      const { suggestions, options } = runAddItem();

      expect(suggestions).toEqual(expect.arrayContaining([viewTypeName]));
      expect(options).toBeUndefined();
    });

    it('should append the submitted view type, save, and rebuild the tab', () => {
      const { onSubmit } = runAddItem();

      onSubmit('markdown');

      expect(config.includeSidePanelViewTypes).toEqual(['backlink', 'markdown']);
      expect(config.save).toHaveBeenCalled();
      expect(mockPluginSettingTab.update).toHaveBeenCalled();
    });

    it('should trim the entered value', () => {
      const { normalize } = runAddItem();

      expect(normalize('  markdown  ')).toBe('markdown');
    });

    it('should reject a duplicate view type', () => {
      const { validate } = runAddItem();

      expect(validate('backlink')).toEqual(expect.stringContaining('backlink'));
    });

    it('should accept an unregistered view type because the datalist is only a convenience', () => {
      const { validate } = runAddItem();

      expect(validate('not-registered')).toBeUndefined();
    });
  });
});
