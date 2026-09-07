import { RelationType } from 'src/types';
import { SettingsTabSection } from './settingsTabSection';
import { SettingDefinitionList, SettingDefinitionPage } from 'obsidian';
import { SettingsControlKey } from './switcherPlusSettings';
import { openListEntryModal } from './listEntryModal';

export class RelatedItemsSettingsTabSection extends SettingsTabSection {
  /**
   * Builds the enabled relation types list. Rows are read only: the value space
   * is a closed enum, so correcting an entry means picking a different one.
   * @returns SettingDefinitionList<SettingsControlKey> the related item types list
   */
  private createEnabledRelatedItemsDefinitions(): SettingDefinitionList<SettingsControlKey> {
    const { config } = this;
    const relationTypes = Object.values(RelationType).sort();
    const remaining = relationTypes.filter(
      (type) => !config.enabledRelatedItems.includes(type),
    );

    const list: SettingDefinitionList<SettingsControlKey> = {
      type: 'list',
      heading: 'Show related items',
      emptyState: 'No related item types enabled.',
      onDelete: (index) => {
        const next = [...config.enabledRelatedItems];
        next.splice(index, 1);

        config.enabledRelatedItems = next;
        config.save();
        this.mainSettingsTab.update();
      },
      items: config.enabledRelatedItems.map((entry) => ({
        name: entry,
        searchable: false,
      })),
    };

    if (remaining.length) {
      list.addItem = {
        name: 'Add related item type',
        action: () => {
          openListEntryModal(this.app, {
            title: 'Add related item type',
            desc: 'The types of related items to show in the list.',
            options: remaining,
            onSubmit: (value) => {
              config.enabledRelatedItems = [
                ...config.enabledRelatedItems,
                value as RelationType,
              ];
              config.save();
              this.mainSettingsTab.update();
            },
          });
        },
      };
    }

    return list;
  }

  getSettingDefinitions(): SettingDefinitionPage<SettingsControlKey>[] {
    const { config } = this;

    return [
      {
        type: 'page',
        name: 'Related Items Mode',
        displayValue: () => config.relatedItemsListCommand,
        items: [
          {
            name: 'Related Items list mode trigger',
            desc: 'Character that will trigger related items list mode in the switcher. This triggers a display of Related Items for the source file of the currently selected (highlighted) suggestion in the switcher. If there is not a suggestion, display results for the active editor.',
            control: {
              type: 'text',
              key: 'relatedItemsListCommand',
              placeholder: config.relatedItemsListPlaceholderText,
            },
          },
          {
            name: 'Related Items list mode trigger - Active editor only',
            desc: 'Character that will trigger related items list mode in the switcher. This always triggers a display of Related Items for the active editor only.',
            control: {
              type: 'text',
              key: 'relatedItemsListActiveEditorCommand',
              placeholder: config.relatedItemsListActiveEditorCommand,
            },
          },
          this.createEnabledRelatedItemsDefinitions(),
          {
            name: 'Exclude open files',
            desc: 'Enable, related files which are already open will not be displayed in the list. Disabled, All related files will be displayed in the list.',
            control: { type: 'toggle', key: 'excludeOpenRelatedFiles' },
          },
        ],
      },
    ];
  }
}
