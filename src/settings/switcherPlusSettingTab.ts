import { StarredSettingTabSection } from './starredSettingsTabSection';
import { CommandListSettingTabSection } from './commandListSettingsTabSection';
import { App, Modal, PluginSettingTab, Setting } from 'obsidian';
import { LinkType, SymbolType } from 'src/types';
import { SwitcherPlusSettings } from 'src/settings';
import type SwitcherPlusPlugin from '../main';

export class SwitcherPlusSettingTab extends PluginSettingTab {
  constructor(
    app: App,
    plugin: SwitcherPlusPlugin,
    private settings: SwitcherPlusSettings,
  ) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl, settings } = this;

    containerEl.empty();
    this.setSymbolModeSettingsGroup(containerEl, settings);
    this.setEditorModeSettingsGroup(containerEl, settings);
    SwitcherPlusSettingTab.setWorkspaceModeSettingsGroup(containerEl, settings);
    this.setHeadingsModeSettingsGroup(containerEl, settings);

    const starredSection = new StarredSettingTabSection(this.app, this, settings);
    starredSection.display(containerEl);

    const commandListSection = new CommandListSettingTabSection(this.app, this, settings);
    commandListSection.display(containerEl);
  }

  private setEditorModeSettingsGroup(
    containerEl: HTMLElement,
    settings: SwitcherPlusSettings,
  ): void {
    containerEl.createEl('h2', { text: 'Editor List Mode Settings' });

    SwitcherPlusSettingTab.setEditorListCommand(containerEl, settings);
    this.setIncludeSidePanelViews(containerEl, settings);
  }

  private setSymbolModeSettingsGroup(
    containerEl: HTMLElement,
    settings: SwitcherPlusSettings,
  ): void {
    containerEl.createEl('h2', { text: 'Symbol List Mode Settings' });

    SwitcherPlusSettingTab.setSymbolListCommand(containerEl, settings);
    SwitcherPlusSettingTab.setSymbolsInLineOrder(containerEl, settings);
    SwitcherPlusSettingTab.setAlwaysNewPaneForSymbols(containerEl, settings);
    SwitcherPlusSettingTab.setUseActivePaneForSymbolsOnMobile(containerEl, settings);
    SwitcherPlusSettingTab.setSelectNearestHeading(containerEl, settings);
    this.setEnabledSymbolTypes(containerEl, settings);
  }

  private static setWorkspaceModeSettingsGroup(
    containerEl: HTMLElement,
    settings: SwitcherPlusSettings,
  ): void {
    containerEl.createEl('h2', { text: 'Workspace List Mode Settings' });

    SwitcherPlusSettingTab.setWorkspaceListCommand(containerEl, settings);
  }

  private setHeadingsModeSettingsGroup(
    containerEl: HTMLElement,
    settings: SwitcherPlusSettings,
  ): void {
    containerEl.createEl('h2', { text: 'Headings List Mode Settings' });

    SwitcherPlusSettingTab.setHeadingsListCommand(containerEl, settings);
    SwitcherPlusSettingTab.setStrictHeadingsOnly(containerEl, settings);
    SwitcherPlusSettingTab.setSearchAllHeadings(containerEl, settings);
    this.setExcludeFolders(containerEl, settings);
  }

  private static setAlwaysNewPaneForSymbols(
    containerEl: HTMLElement,
    settings: SwitcherPlusSettings,
  ): void {
    new Setting(containerEl)
      .setName('Open Symbols in new pane')
      .setDesc(
        'Enabled, always open a new pane when navigating to Symbols. Disabled, navigate in an already open pane (if one exists)',
      )
      .addToggle((toggle) =>
        toggle.setValue(settings.alwaysNewPaneForSymbols).onChange((value) => {
          settings.alwaysNewPaneForSymbols = value;
          settings.save();
        }),
      );
  }

  private static setUseActivePaneForSymbolsOnMobile(
    containerEl: HTMLElement,
    settings: SwitcherPlusSettings,
  ): void {
    new Setting(containerEl)
      .setName('Open Symbols in active pane on mobile devices')
      .setDesc(
        'Enabled, navigate to the target file and symbol in the active editor pane. Disabled, open a new pane when navigating to Symbols, even on mobile devices.',
      )
      .addToggle((toggle) =>
        toggle.setValue(settings.useActivePaneForSymbolsOnMobile).onChange((value) => {
          settings.useActivePaneForSymbolsOnMobile = value;
          settings.save();
        }),
      );
  }

  private static setSelectNearestHeading(
    containerEl: HTMLElement,
    settings: SwitcherPlusSettings,
  ): void {
    new Setting(containerEl)
      .setName('Auto-select nearest heading')
      .setDesc(
        'Enabled, in an unfiltered symbol list, select the closest preceding Heading to the current cursor position. Disabled, the first symbol in the list is selected.',
      )
      .addToggle((toggle) =>
        toggle.setValue(settings.selectNearestHeading).onChange((value) => {
          settings.selectNearestHeading = value;
          settings.save();
        }),
      );
  }

  private static setSymbolsInLineOrder(
    containerEl: HTMLElement,
    settings: SwitcherPlusSettings,
  ): void {
    new Setting(containerEl)
      .setName('List symbols as indented outline')
      .setDesc(
        'Enabled, symbols will be displayed in the (line) order they appear in the source text, indented under any preceding heading. Disabled, symbols will be grouped by type: Headings, Tags, Links, Embeds.',
      )
      .addToggle((toggle) =>
        toggle.setValue(settings.symbolsInLineOrder).onChange((value) => {
          settings.symbolsInLineOrder = value;
          settings.save();
        }),
      );
  }

  private setEnabledSymbolTypes(
    containerEl: HTMLElement,
    settings: SwitcherPlusSettings,
  ): void {
    new Setting(containerEl).setName('Show Headings').addToggle((toggle) =>
      toggle
        .setValue(settings.isSymbolTypeEnabled(SymbolType.Heading))
        .onChange((value) => {
          settings.setSymbolTypeEnabled(SymbolType.Heading, value);
          settings.save();
        }),
    );

    new Setting(containerEl).setName('Show Tags').addToggle((toggle) =>
      toggle.setValue(settings.isSymbolTypeEnabled(SymbolType.Tag)).onChange((value) => {
        settings.setSymbolTypeEnabled(SymbolType.Tag, value);
        settings.save();
      }),
    );

    new Setting(containerEl).setName('Show Embeds').addToggle((toggle) =>
      toggle
        .setValue(settings.isSymbolTypeEnabled(SymbolType.Embed))
        .onChange((value) => {
          settings.setSymbolTypeEnabled(SymbolType.Embed, value);
          settings.save();
        }),
    );

    this.setEnableLinks(containerEl, settings);
  }

  private setEnableLinks(containerEl: HTMLElement, settings: SwitcherPlusSettings): void {
    const isLinksEnabled = settings.isSymbolTypeEnabled(SymbolType.Link);

    new Setting(containerEl).setName('Show Links').addToggle((toggle) => {
      toggle.setValue(isLinksEnabled).onChange(async (value) => {
        settings.setSymbolTypeEnabled(SymbolType.Link, value);

        // have to await the save here because the call to display() will trigger a read
        // of the updated data
        await settings.saveSettings();

        // reload the settings panel. This will cause the sublink types toggle
        // controls to be shown/hidden based on isLinksEnabled status
        this.display();
      });
    });

    if (isLinksEnabled) {
      SwitcherPlusSettingTab.addSubLinkTypeToggle(
        containerEl,
        settings,
        LinkType.Heading,
        'Links to headings',
      );

      SwitcherPlusSettingTab.addSubLinkTypeToggle(
        containerEl,
        settings,
        LinkType.Block,
        'Links to blocks',
      );
    }
  }

  private static addSubLinkTypeToggle(
    containerEl: HTMLElement,
    settings: SwitcherPlusSettings,
    linkType: LinkType,
    name: string,
  ): void {
    new Setting(containerEl)
      .setClass('qsp-setting-item-indent')
      .setName(name)
      .addToggle((toggle) => {
        const isExcluded = (settings.excludeLinkSubTypes & linkType) === linkType;

        toggle.setValue(!isExcluded).onChange((isEnabled) => {
          let exclusions = settings.excludeLinkSubTypes;

          if (isEnabled) {
            // remove from exclusion list
            exclusions &= ~linkType;
          } else {
            // add to exclusion list
            exclusions |= linkType;
          }

          settings.excludeLinkSubTypes = exclusions;
          settings.save();
        });
      });
  }

  private static setEditorListCommand(
    containerEl: HTMLElement,
    settings: SwitcherPlusSettings,
  ): void {
    new Setting(containerEl)
      .setName('Editor list mode trigger')
      .setDesc('Character that will trigger editor list mode in the switcher')
      .addText((text) =>
        text
          .setPlaceholder(settings.editorListPlaceholderText)
          .setValue(settings.editorListCommand)
          .onChange((value) => {
            const val = value.length ? value : settings.editorListPlaceholderText;
            settings.editorListCommand = val;
            settings.save();
          }),
      );
  }

  private static setSymbolListCommand(
    containerEl: HTMLElement,
    settings: SwitcherPlusSettings,
  ): void {
    new Setting(containerEl)
      .setName('Symbol list mode trigger')
      .setDesc('Character that will trigger symbol list mode in the switcher')
      .addText((text) =>
        text
          .setPlaceholder(settings.symbolListPlaceholderText)
          .setValue(settings.symbolListCommand)
          .onChange((value) => {
            const val = value.length ? value : settings.symbolListPlaceholderText;
            settings.symbolListCommand = val;
            settings.save();
          }),
      );
  }

  private setIncludeSidePanelViews(
    containerEl: HTMLElement,
    settings: SwitcherPlusSettings,
  ): void {
    const viewsListing = Object.keys(this.app.viewRegistry.viewByType).sort().join(' ');

    new Setting(containerEl)
      .setName('Include side panel views')
      .setDesc(
        `When in Editor list mode, show the following view types from the side panels. Add one view type per line. Available view types: ${viewsListing}`,
      )
      .addTextArea((textArea) =>
        textArea
          .setPlaceholder(settings.includeSidePanelViewTypesPlaceholder)
          .setValue(settings.includeSidePanelViewTypes.join('\n'))
          .onChange((value) => {
            settings.includeSidePanelViewTypes = value.split('\n');
            settings.save();
          }),
      );
  }

  private static setWorkspaceListCommand(
    containerEl: HTMLElement,
    settings: SwitcherPlusSettings,
  ): void {
    new Setting(containerEl)
      .setName('Workspace list mode trigger')
      .setDesc('Character that will trigger workspace list mode in the switcher')
      .addText((text) =>
        text
          .setPlaceholder(settings.workspaceListPlaceholderText)
          .setValue(settings.workspaceListCommand)
          .onChange((value) => {
            const val = value.length ? value : settings.workspaceListPlaceholderText;
            settings.workspaceListCommand = val;
            settings.save();
          }),
      );
  }

  private static setHeadingsListCommand(
    containerEl: HTMLElement,
    settings: SwitcherPlusSettings,
  ): void {
    new Setting(containerEl)
      .setName('Headings list mode trigger')
      .setDesc('Character that will trigger headings list mode in the switcher')
      .addText((text) =>
        text
          .setPlaceholder(settings.headingsListPlaceholderText)
          .setValue(settings.headingsListCommand)
          .onChange((value) => {
            const val = value.length ? value : settings.headingsListPlaceholderText;
            settings.headingsListCommand = val;
            settings.save();
          }),
      );
  }

  private static setStrictHeadingsOnly(
    containerEl: HTMLElement,
    settings: SwitcherPlusSettings,
  ): void {
    new Setting(containerEl)
      .setName('Show headings only')
      .setDesc(
        'Enabled, only show suggestions where there is a match in the first H1 contained in the file. Disabled, if there is not a match in the first H1, fallback to showing suggestions where there is a filename match.',
      )
      .addToggle((toggle) =>
        toggle.setValue(settings.strictHeadingsOnly).onChange((value) => {
          settings.strictHeadingsOnly = value;
          settings.save();
        }),
      );
  }

  private static setSearchAllHeadings(
    containerEl: HTMLElement,
    settings: SwitcherPlusSettings,
  ): void {
    new Setting(containerEl)
      .setName('Search all headings')
      .setDesc(
        'Enabled, search through all headings contained in each file. Disabled, only search through the first H1 in each file.',
      )
      .addToggle((toggle) =>
        toggle.setValue(settings.searchAllHeadings).onChange((value) => {
          settings.searchAllHeadings = value;
          settings.save();
        }),
      );
  }

  private setExcludeFolders(
    containerEl: HTMLElement,
    settings: SwitcherPlusSettings,
  ): void {
    const settingName = 'Exclude folders';
    new Setting(containerEl)
      .setName(settingName)
      .setDesc(
        `When in Headings list mode, folder path that match any regex listed here will not be searched for suggestions. Path should start from the Vault Root. Add one path per line.`,
      )
      .addTextArea((textArea) => {
        textArea.setValue(settings.excludeFolders.join('\n'));
        textArea.inputEl.addEventListener('blur', () => {
          const excludes = textArea
            .getValue()
            .split('\n')
            .filter((v) => v.length > 0);

          if (this.validateExcludeFolderList(settingName, excludes)) {
            settings.excludeFolders = excludes;
            settings.save();
          }
        });
      });
  }

  private validateExcludeFolderList(settingName: string, excludes: string[]) {
    let isValid = true;
    let failedMsg = '';

    for (const str of excludes) {
      try {
        new RegExp(str);
      } catch (err) {
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        failedMsg += `<span class="qsp-warning">${str}</span><br/>${err}<br/><br/>`;
        isValid = false;
      }
    }

    if (!isValid) {
      const popup = new Modal(this.app);
      popup.titleEl.setText(settingName);
      popup.contentEl.innerHTML = `Changes not saved. The following regex contain errors:<br/><br/>${failedMsg}`;
      popup.open();
    }

    return isValid;
  }
}
