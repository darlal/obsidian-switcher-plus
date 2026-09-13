import { SettingsControlKey } from './switcherPlusSettings';
import { SettingsTabSection } from './settingsTabSection';
import { SettingDefinitionList, SettingDefinitionPage } from 'obsidian';
import { openListEntryModal, validateNewEntry } from './listEntryModal';

export class EditorSettingsTabSection extends SettingsTabSection {
  /**
   * Every view type currently registered with the app. Read from the in-memory
   * view registry on each call, which keeps getSettingDefinitions() cheap enough
   * to run on every update.
   * @returns string[]
   */
  private getSidePanelViewTypes(): string[] {
    return Object.keys(this.app.viewRegistry.viewByType).sort();
  }

  /**
   * Builds the side panel view types list. The registered types are offered as
   * datalist suggestions which also accept any string.
   * @returns SettingDefinitionList<SettingsControlKey> the side panel views list
   */
  private createSidePanelViewsDefinitions(): SettingDefinitionList<SettingsControlKey> {
    const { config } = this;
    const viewTypes = this.getSidePanelViewTypes();

    const list: SettingDefinitionList<SettingsControlKey> = {
      type: 'list',
      heading: 'Include side panel views',
      emptyState: 'No side panel view types included.',
      addItem: {
        name: 'Add view type',
        action: () => {
          openListEntryModal(this.app, {
            title: 'Add view type',
            desc: 'When in Editor list mode, show the following view types from the side panels.',
            suggestions: viewTypes,
            placeholder: 'backlink',
            normalize: (value) => value.trim(),
            validate: validateNewEntry(config.includeSidePanelViewTypes),
            onSubmit: (value) => {
              config.includeSidePanelViewTypes = [
                ...config.includeSidePanelViewTypes,
                value,
              ];
              config.save();
              this.mainSettingsTab.update();
            },
          });
        },
      },
      onDelete: (index) => {
        const next = [...config.includeSidePanelViewTypes];
        next.splice(index, 1);

        config.includeSidePanelViewTypes = next;
        config.save();
        this.mainSettingsTab.update();
      },
      items: config.includeSidePanelViewTypes.map((entry) => ({
        name: entry,
        searchable: false,
      })),
    };

    return list;
  }

  getSettingDefinitions(): SettingDefinitionPage<SettingsControlKey>[] {
    const { config } = this;

    return [
      {
        type: 'page',
        name: 'Editor Mode',
        displayValue: () => this.getModeDisplayValue('editorListCommand'),
        items: [
          ...this.createTriggerSettings(
            'editorListCommand',
            'Editor list mode trigger',
            'Primary trigger that will activate editor list mode in the switcher',
            config.editorListPlaceholderText,
          ),
          {
            name: 'Order default editor list by most recently accessed',
            desc: 'When there is no search term, order the list of editors by most recent access time.',
            control: { type: 'toggle', key: 'orderEditorListByAccessTime' },
          },
          this.createSidePanelViewsDefinitions(),
        ],
      },
    ];
  }
}
