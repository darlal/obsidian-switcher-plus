import { Modal } from 'obsidian';
import { SwitcherPlusSettings } from 'src/settings';
import { RelationType } from 'src/types';
import { SettingsTabSection } from './settingsTabSection';

export class RelatedItemsSettingsTabSection extends SettingsTabSection {
  display(containerEl: HTMLElement): void {
    const { config } = this;

    this.addSectionTitle(containerEl, 'Related Items List Mode Settings');

    this.addTextSetting(
      containerEl,
      'Related Items list mode trigger',
      'Character that will trigger related items list mode in the switcher. This triggers a display of Related Items for the source file of the currently selected (highlighted) suggestion in the switcher',
      config.relatedItemsListCommand,
      'relatedItemsListCommand',
      config.relatedItemsListPlaceholderText,
    );

    this.showEnabledRelatedItems(containerEl, config);

    this.addToggleSetting(
      containerEl,
      'Exclude open files',
      'Enable, related files which are already open will not be displayed in the list. Disabled, All related files will be displayed in the list.',
      config.excludeOpenRelatedFiles,
      'excludeOpenRelatedFiles',
    );
  }

  showEnabledRelatedItems(containerEl: HTMLElement, config: SwitcherPlusSettings): void {
    const relationTypes = Object.values(RelationType).sort() as string[];
    const relationTypesStr = relationTypes.join(', ');
    const desc = `The types of related items to show in the list. Add one type per line. Available types: ${relationTypesStr}`;

    this.createSetting(containerEl, 'Show related item types', desc).addTextArea(
      (textArea) => {
        textArea.setValue(config.enabledRelatedItems.join('\n'));

        textArea.inputEl.addEventListener('focusout', () => {
          const values = textArea
            .getValue()
            .split('\n')
            .map((v) => v.trim())
            .filter((v) => v.length > 0);

          const invalidValues = [...new Set(values)].filter(
            (v) => !relationTypes.includes(v),
          );

          if (invalidValues?.length) {
            this.showErrorPopup(invalidValues.join('<br/>'), relationTypesStr);
          } else {
            config.enabledRelatedItems = values as RelationType[];
            config.save();
          }
        });
      },
    );
  }

  showErrorPopup(invalidTypes: string, relationTypes: string): void {
    const popup = new Modal(this.app);

    popup.titleEl.setText('Invalid related item type');
    popup.contentEl.innerHTML = `Changes not saved. Available relation types are: ${relationTypes}. The following types are invalid:<br/><br/>${invalidTypes}`;
    popup.open();
  }
}
