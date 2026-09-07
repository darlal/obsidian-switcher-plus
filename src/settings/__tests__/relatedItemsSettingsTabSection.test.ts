import {
  RelatedItemsSettingsTabSection,
  SwitcherPlusSettings,
  SwitcherPlusSettingTab,
} from 'src/settings';
import { RelationType } from 'src/types';
import { mock, MockProxy } from 'jest-mock-extended';
import { App, Setting } from 'obsidian';
import { findListByHeading, findSettingByKey } from '@fixtures';
import * as ListEntryModal from 'src/settings/listEntryModal';
import type { ListEntryModalOptions } from 'src/settings/listEntryModal';

describe('relatedItemsSettingsTabSection', () => {
  let mockApp: MockProxy<App>;
  let mockPluginSettingTab: MockProxy<SwitcherPlusSettingTab>;
  let config: SwitcherPlusSettings;
  let mockContainerEl: MockProxy<HTMLElement>;
  let sut: RelatedItemsSettingsTabSection;

  beforeAll(() => {
    mockApp = mock<App>();
    mockContainerEl = mock<HTMLElement>();
    mockPluginSettingTab = mock<SwitcherPlusSettingTab>({ containerEl: mockContainerEl });
    config = new SwitcherPlusSettings(null);

    sut = new RelatedItemsSettingsTabSection(mockApp, mockPluginSettingTab, config);
  });

  describe('getSettingDefinitions', () => {
    it('should return a single page for the section', () => {
      const [page] = sut.getSettingDefinitions();

      expect(page).toEqual(
        expect.objectContaining({ type: 'page', name: 'Related Items Mode' }),
      );
    });

    it('should define both mode trigger settings', () => {
      const definitions = sut.getSettingDefinitions();

      expect(findSettingByKey(definitions, 'relatedItemsListCommand')).toEqual(
        expect.objectContaining({
          name: 'Related Items list mode trigger',
          control: {
            type: 'text',
            key: 'relatedItemsListCommand',
            placeholder: config.relatedItemsListPlaceholderText,
          },
        }),
      );
      expect(
        findSettingByKey(definitions, 'relatedItemsListActiveEditorCommand'),
      ).toEqual(
        expect.objectContaining({
          name: 'Related Items list mode trigger - Active editor only',
          control: {
            type: 'text',
            key: 'relatedItemsListActiveEditorCommand',
            placeholder: config.relatedItemsListActiveEditorCommand,
          },
        }),
      );
    });

    it('should define the exclude open files setting', () => {
      const definitions = sut.getSettingDefinitions();

      expect(findSettingByKey(definitions, 'excludeOpenRelatedFiles')).toEqual(
        expect.objectContaining({
          name: 'Exclude open files',
          control: { type: 'toggle', key: 'excludeOpenRelatedFiles' },
        }),
      );
    });
  });
  describe('getSettingDefinitions related item types list', () => {
    let openModalMock: jest.SpyInstance<Setting, [App, ListEntryModalOptions]>;
    const getList = () =>
      findListByHeading(sut.getSettingDefinitions(), 'Show related items');

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
      config.enabledRelatedItems = [RelationType.Backlink];
      jest.spyOn(config, 'save').mockReturnValue();
    });

    afterEach(() => {
      openModalMock.mockRestore();
      (config.save as jest.Mock).mockRestore();
      config.enabledRelatedItems = Object.values(RelationType);
    });

    it('should name the list with a heading', () => {
      expect(getList().heading).toBe('Show related items');
    });

    it('should explain the setting in the add dialog', () => {
      const { desc } = runAddItem();

      expect(desc).toEqual(
        expect.stringContaining('types of related items to show in the list'),
      );
    });

    it('should render one non-searchable row per stored type, in order', () => {
      config.enabledRelatedItems = [RelationType.DiskLocation, RelationType.Backlink];

      expect(getList().items).toEqual([
        { name: RelationType.DiskLocation, searchable: false },
        { name: RelationType.Backlink, searchable: false },
      ]);
    });

    it('should remove the entry at the deleted index, save, and rebuild the tab', () => {
      config.enabledRelatedItems = [RelationType.DiskLocation, RelationType.Backlink];

      getList().onDelete(0);

      expect(config.enabledRelatedItems).toEqual([RelationType.Backlink]);
      expect(config.save).toHaveBeenCalled();
      expect(mockPluginSettingTab.update).toHaveBeenCalled();
    });

    it('should not offer reordering because no consumer reads the order', () => {
      expect(getList().onReorder).toBeUndefined();
    });

    it('should offer only the types not already added', () => {
      const { options } = runAddItem();

      expect(options).toEqual(
        Object.values(RelationType)
          .sort()
          .filter((type) => type !== RelationType.Backlink),
      );
    });

    it('should append the submitted type, save, and rebuild the tab', () => {
      const { onSubmit } = runAddItem();

      onSubmit(RelationType.DiskLocation);

      expect(config.enabledRelatedItems).toEqual([
        RelationType.Backlink,
        RelationType.DiskLocation,
      ]);
      expect(config.save).toHaveBeenCalled();
      expect(mockPluginSettingTab.update).toHaveBeenCalled();
    });

    it('should omit the add affordance once every type is enabled', () => {
      config.enabledRelatedItems = Object.values(RelationType);

      expect(getList().addItem).toBeUndefined();
    });
  });
});
