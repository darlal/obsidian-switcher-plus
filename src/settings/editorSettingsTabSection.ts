import { SwitcherPlusSettings } from './switcherPlusSettings';
import { SettingsTabSection } from './settingsTabSection';

export class EditorSettingsTabSection extends SettingsTabSection {
  display(containerEl: HTMLElement): void {
    const { config } = this;

    this.addSectionTitle(containerEl, 'Editor List Mode Settings');

    this.addTextSetting(
      containerEl,
      'Editor list mode trigger',
      'Character that will trigger editor list mode in the switcher',
      config.editorListCommand,
      'editorListCommand',
      config.editorListPlaceholderText,
    );

    this.showIncludeSidePanelViews(containerEl, config);

    this.addToggleSetting(
      containerEl,
      'Order default editor list by most recently accessed',
      'When there is no search term, order the list of editors by most recent access time.',
      config.orderEditorListByAccessTime,
      'orderEditorListByAccessTime',
    );
  }

  showIncludeSidePanelViews(
    containerEl: HTMLElement,
    config: SwitcherPlusSettings,
  ): void {
    const viewsListing = Object.keys(this.app.viewRegistry.viewByType).sort().join(' ');
    const desc = `When in Editor list mode, show the following view types from the side panels. Add one view type per line. Available view types: ${viewsListing}`;

    this.addTextAreaSetting(
      containerEl,
      'Include side panel views',
      desc,
      config.includeSidePanelViewTypes.join('\n'),
      'includeSidePanelViewTypes',
      config.includeSidePanelViewTypesPlaceholder,
    );
  }
}
