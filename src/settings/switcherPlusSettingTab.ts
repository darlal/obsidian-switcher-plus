import { StarredSettingsTabSection } from './starredSettingsTabSection';
import { CommandListSettingsTabSection } from './commandListSettingsTabSection';
import { RelatedItemsSettingsTabSection } from './relatedItemsSettingsTabSection';
import { GeneralSettingsTabSection } from './generalSettingsTabSection';
import { WorkspaceSettingsTabSection } from './workspaceSettingsTabSection';
import { EditorSettingsTabSection } from './editorSettingsTabSection';
import { SwitcherPlusSettings } from './switcherPlusSettings';
import { App, Modal, PluginSettingTab, Setting } from 'obsidian';
import { LinkType, SymbolType } from 'src/types';
import type SwitcherPlusPlugin from '../main';

export class SwitcherPlusSettingTab extends PluginSettingTab {
  constructor(
    app: App,
    plugin: SwitcherPlusPlugin,
    private config: SwitcherPlusSettings,
  ) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl, config } = this;
    const generalSection = new GeneralSettingsTabSection(this.app, this, config);
    const editorSection = new EditorSettingsTabSection(this.app, this, config);
    const starredSection = new StarredSettingsTabSection(this.app, this, config);
    const commandListSection = new CommandListSettingsTabSection(this.app, this, config);
    const workspaceListSection = new WorkspaceSettingsTabSection(this.app, this, config);
    const relatedItemsSection = new RelatedItemsSettingsTabSection(
      this.app,
      this,
      config,
    );

    containerEl.empty();
    containerEl.createEl('h2', { text: 'Quick Switcher++ Settings' });

    generalSection.display(containerEl);

    this.setSymbolModeSettingsGroup(containerEl, config);
    this.setHeadingsModeSettingsGroup(containerEl, config);

    editorSection.display(containerEl);
    relatedItemsSection.display(containerEl);
    starredSection.display(containerEl);
    commandListSection.display(containerEl);
    workspaceListSection.display(containerEl);
  }

  private setSymbolModeSettingsGroup(
    containerEl: HTMLElement,
    config: SwitcherPlusSettings,
  ): void {
    new Setting(containerEl).setHeading().setName('Symbol List Mode Settings');

    SwitcherPlusSettingTab.setSymbolListCommand(containerEl, config);
    SwitcherPlusSettingTab.setSymbolsInLineOrder(containerEl, config);
    SwitcherPlusSettingTab.setAlwaysNewPaneForSymbols(containerEl, config);
    SwitcherPlusSettingTab.setUseActivePaneForSymbolsOnMobile(containerEl, config);
    SwitcherPlusSettingTab.setSelectNearestHeading(containerEl, config);
    this.setEnabledSymbolTypes(containerEl, config);
  }

  private setHeadingsModeSettingsGroup(
    containerEl: HTMLElement,
    config: SwitcherPlusSettings,
  ): void {
    new Setting(containerEl).setHeading().setName('Headings List Mode Settings');

    SwitcherPlusSettingTab.setHeadingsListCommand(containerEl, config);
    SwitcherPlusSettingTab.setStrictHeadingsOnly(containerEl, config);
    SwitcherPlusSettingTab.setSearchAllHeadings(containerEl, config);
    this.setExcludeFolders(containerEl, config);
  }

  private static setAlwaysNewPaneForSymbols(
    containerEl: HTMLElement,
    config: SwitcherPlusSettings,
  ): void {
    new Setting(containerEl)
      .setName('Open Symbols in new pane')
      .setDesc(
        'Enabled, always open a new pane when navigating to Symbols. Disabled, navigate in an already open pane (if one exists)',
      )
      .addToggle((toggle) =>
        toggle.setValue(config.alwaysNewPaneForSymbols).onChange((value) => {
          config.alwaysNewPaneForSymbols = value;
          config.save();
        }),
      );
  }

  private static setUseActivePaneForSymbolsOnMobile(
    containerEl: HTMLElement,
    config: SwitcherPlusSettings,
  ): void {
    new Setting(containerEl)
      .setName('Open Symbols in active pane on mobile devices')
      .setDesc(
        'Enabled, navigate to the target file and symbol in the active editor pane. Disabled, open a new pane when navigating to Symbols, even on mobile devices.',
      )
      .addToggle((toggle) =>
        toggle.setValue(config.useActivePaneForSymbolsOnMobile).onChange((value) => {
          config.useActivePaneForSymbolsOnMobile = value;
          config.save();
        }),
      );
  }

  private static setSelectNearestHeading(
    containerEl: HTMLElement,
    config: SwitcherPlusSettings,
  ): void {
    new Setting(containerEl)
      .setName('Auto-select nearest heading')
      .setDesc(
        'Enabled, in an unfiltered symbol list, select the closest preceding Heading to the current cursor position. Disabled, the first symbol in the list is selected.',
      )
      .addToggle((toggle) =>
        toggle.setValue(config.selectNearestHeading).onChange((value) => {
          config.selectNearestHeading = value;
          config.save();
        }),
      );
  }

  private static setSymbolsInLineOrder(
    containerEl: HTMLElement,
    config: SwitcherPlusSettings,
  ): void {
    new Setting(containerEl)
      .setName('List symbols as indented outline')
      .setDesc(
        'Enabled, symbols will be displayed in the (line) order they appear in the source text, indented under any preceding heading. Disabled, symbols will be grouped by type: Headings, Tags, Links, Embeds.',
      )
      .addToggle((toggle) =>
        toggle.setValue(config.symbolsInLineOrder).onChange((value) => {
          config.symbolsInLineOrder = value;
          config.save();
        }),
      );
  }

  private setEnabledSymbolTypes(
    containerEl: HTMLElement,
    config: SwitcherPlusSettings,
  ): void {
    new Setting(containerEl).setName('Show Headings').addToggle((toggle) =>
      toggle
        .setValue(config.isSymbolTypeEnabled(SymbolType.Heading))
        .onChange((value) => {
          config.setSymbolTypeEnabled(SymbolType.Heading, value);
          config.save();
        }),
    );

    new Setting(containerEl).setName('Show Tags').addToggle((toggle) =>
      toggle.setValue(config.isSymbolTypeEnabled(SymbolType.Tag)).onChange((value) => {
        config.setSymbolTypeEnabled(SymbolType.Tag, value);
        config.save();
      }),
    );

    new Setting(containerEl).setName('Show Embeds').addToggle((toggle) =>
      toggle.setValue(config.isSymbolTypeEnabled(SymbolType.Embed)).onChange((value) => {
        config.setSymbolTypeEnabled(SymbolType.Embed, value);
        config.save();
      }),
    );

    this.setEnableLinks(containerEl, config);
  }

  private setEnableLinks(containerEl: HTMLElement, config: SwitcherPlusSettings): void {
    const isLinksEnabled = config.isSymbolTypeEnabled(SymbolType.Link);

    new Setting(containerEl).setName('Show Links').addToggle((toggle) => {
      toggle.setValue(isLinksEnabled).onChange(async (value) => {
        config.setSymbolTypeEnabled(SymbolType.Link, value);

        // have to await the save here because the call to display() will trigger a read
        // of the updated data
        await config.saveSettings();

        // reload the settings panel. This will cause the sublink types toggle
        // controls to be shown/hidden based on isLinksEnabled status
        this.display();
      });
    });

    if (isLinksEnabled) {
      SwitcherPlusSettingTab.addSubLinkTypeToggle(
        containerEl,
        config,
        LinkType.Heading,
        'Links to headings',
      );

      SwitcherPlusSettingTab.addSubLinkTypeToggle(
        containerEl,
        config,
        LinkType.Block,
        'Links to blocks',
      );
    }
  }

  private static addSubLinkTypeToggle(
    containerEl: HTMLElement,
    config: SwitcherPlusSettings,
    linkType: LinkType,
    name: string,
  ): void {
    new Setting(containerEl)
      .setClass('qsp-setting-item-indent')
      .setName(name)
      .addToggle((toggle) => {
        const isExcluded = (config.excludeLinkSubTypes & linkType) === linkType;

        toggle.setValue(!isExcluded).onChange((isEnabled) => {
          let exclusions = config.excludeLinkSubTypes;

          if (isEnabled) {
            // remove from exclusion list
            exclusions &= ~linkType;
          } else {
            // add to exclusion list
            exclusions |= linkType;
          }

          config.excludeLinkSubTypes = exclusions;
          config.save();
        });
      });
  }

  private static setSymbolListCommand(
    containerEl: HTMLElement,
    config: SwitcherPlusSettings,
  ): void {
    new Setting(containerEl)
      .setName('Symbol list mode trigger')
      .setDesc('Character that will trigger symbol list mode in the switcher')
      .addText((text) =>
        text
          .setPlaceholder(config.symbolListPlaceholderText)
          .setValue(config.symbolListCommand)
          .onChange((value) => {
            const val = value.length ? value : config.symbolListPlaceholderText;
            config.symbolListCommand = val;
            config.save();
          }),
      );
  }

  private static setHeadingsListCommand(
    containerEl: HTMLElement,
    config: SwitcherPlusSettings,
  ): void {
    new Setting(containerEl)
      .setName('Headings list mode trigger')
      .setDesc('Character that will trigger headings list mode in the switcher')
      .addText((text) =>
        text
          .setPlaceholder(config.headingsListPlaceholderText)
          .setValue(config.headingsListCommand)
          .onChange((value) => {
            const val = value.length ? value : config.headingsListPlaceholderText;
            config.headingsListCommand = val;
            config.save();
          }),
      );
  }

  private static setStrictHeadingsOnly(
    containerEl: HTMLElement,
    config: SwitcherPlusSettings,
  ): void {
    new Setting(containerEl)
      .setName('Show headings only')
      .setDesc(
        'Enabled, only show suggestions where there is a match in the first H1 contained in the file. Disabled, if there is not a match in the first H1, fallback to showing suggestions where there is a filename or path match.',
      )
      .addToggle((toggle) =>
        toggle.setValue(config.strictHeadingsOnly).onChange((value) => {
          config.strictHeadingsOnly = value;
          config.save();
        }),
      );
  }

  private static setSearchAllHeadings(
    containerEl: HTMLElement,
    config: SwitcherPlusSettings,
  ): void {
    new Setting(containerEl)
      .setName('Search all headings')
      .setDesc(
        'Enabled, search through all headings contained in each file. Disabled, only search through the first H1 in each file.',
      )
      .addToggle((toggle) =>
        toggle.setValue(config.searchAllHeadings).onChange((value) => {
          config.searchAllHeadings = value;
          config.save();
        }),
      );
  }

  private setExcludeFolders(
    containerEl: HTMLElement,
    config: SwitcherPlusSettings,
  ): void {
    const settingName = 'Exclude folders';
    new Setting(containerEl)
      .setName(settingName)
      .setDesc(
        `When in Headings list mode, folder path that match any regex listed here will not be searched for suggestions. Path should start from the Vault Root. Add one path per line.`,
      )
      .addTextArea((textArea) => {
        textArea.setValue(config.excludeFolders.join('\n'));
        textArea.inputEl.addEventListener('blur', () => {
          const excludes = textArea
            .getValue()
            .split('\n')
            .filter((v) => v.length > 0);

          if (this.validateExcludeFolderList(settingName, excludes)) {
            config.excludeFolders = excludes;
            config.save();
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
