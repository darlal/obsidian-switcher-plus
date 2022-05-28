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

    this.setIncludeSidePanelViews(containerEl, config);
  }

  setIncludeSidePanelViews(containerEl: HTMLElement, config: SwitcherPlusSettings) {
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
