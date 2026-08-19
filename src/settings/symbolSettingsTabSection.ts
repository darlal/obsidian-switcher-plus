import {
  Setting,
  SettingDefinitionGroup,
  SettingDefinitionItem,
  SettingDefinitionPage,
  SettingGroup,
} from 'obsidian';
import { SettingsControlKey, SwitcherPlusSettings } from './switcherPlusSettings';
import { SettingsTabSection } from './settingsTabSection';
import { LinkType, SymbolType } from 'src/types';
import { notifyError } from 'src/utils';

export class SymbolSettingsTabSection extends SettingsTabSection {
  display(containerEl: HTMLElement): void {
    const { config } = this;

    this.addSectionTitle(containerEl, 'Symbol List Mode');

    this.addTextSetting(
      containerEl,
      'Symbol list mode trigger',
      'Character that will trigger symbol list mode in the switcher. This triggers a display of Symbols for the source file of the currently selected (highlighted) suggestion in the switcher. If there is not a suggestion, display results for the active editor.',
      config.symbolListCommand,
      'symbolListCommand',
      config.symbolListPlaceholderText,
    );

    this.addTextSetting(
      containerEl,
      'Symbol list mode trigger - Active editor only',
      'Character that will trigger symbol list mode in the switcher. This always triggers a display of Symbols for the active editor only.',
      config.symbolListActiveEditorCommand,
      'symbolListActiveEditorCommand',
      config.symbolListActiveEditorCommand,
    );

    this.addToggleSetting(
      containerEl,
      'List symbols as indented outline',
      'Enabled, symbols will be displayed in the (line) order they appear in the source text, indented under any preceding heading. Disabled, symbols will be grouped by type: Headings, Tags, Links, Embeds.',
      config.symbolsInLineOrder,
      'symbolsInLineOrder',
    );

    this.addToggleSetting(
      containerEl,
      'Auto-select nearest heading',
      'Enabled, in an unfiltered symbol list, select the closest preceding Heading to the current cursor position, or to the scroll position when the file is displayed in Reading mode. Disabled, the first symbol in the list is selected.',
      config.selectNearestHeading,
      'selectNearestHeading',
    );

    this.addToggleSetting(
      containerEl,
      'Show heading breadcrumbs in Symbol mode',
      'Enabled, display the hierarchical path of parent headings when showing heading symbols in Symbol mode.',
      config.showHeadingBreadcrumbsInSymbolMode,
      'showHeadingBreadcrumbsInSymbolMode',
    );

    this.showEnableSymbolTypesToggle(containerEl, config);
    this.showEnableLinksToggle(containerEl, config);
    this.showSymbolTabNavigationBehavior(containerEl, config);
  }

  showSymbolTabNavigationBehavior(
    containerEl: HTMLElement,
    config: SwitcherPlusSettings,
  ): void {
    const group = new SettingGroup(containerEl);

    this.createSetting(
      group,
      'Symbol Tab navigation behavior',
      'Configure how symbols are opened when navigating from the symbol list.',
    );

    this.addToggleSetting(
      group,
      'Open Symbols in new tab',
      'Enabled, always open a new tab when navigating to Symbols. Disabled, navigate in an already open tab (if one exists).',
      config.alwaysNewTabForSymbols,
      'alwaysNewTabForSymbols',
    );

    this.addToggleSetting(
      group,
      'Open Symbols in active tab on mobile devices',
      'Enabled, navigate to the target file and symbol in the active editor tab. Disabled, open a new tab when navigating to Symbols, even on mobile devices.',
      config.useActiveTabForSymbolsOnMobile,
      'useActiveTabForSymbolsOnMobile',
    );
  }

  showEnableSymbolTypesToggle(
    containerEl: HTMLElement,
    config: SwitcherPlusSettings,
  ): void {
    const allowedSymbols: [string, SymbolType][] = [
      ['Show Headings', SymbolType.Heading],
      ['Show Tags', SymbolType.Tag],
      ['Show Embeds', SymbolType.Embed],
      ['Show Callouts', SymbolType.Callout],
    ];

    allowedSymbols.forEach(([name, symbolType]) => {
      this.addToggleSetting(
        containerEl,
        name,
        '',
        config.enabledSymbolTypes[symbolType],
        null,
        (isEnabled) => {
          config.enabledSymbolTypes[symbolType] = isEnabled;
          config.save();
        },
      );
    });
  }

  showEnableLinksToggle(containerEl: HTMLElement, config: SwitcherPlusSettings): void {
    const isLinksEnabled = config.enabledSymbolTypes[SymbolType.Link];

    const group = new SettingGroup(containerEl);

    this.addToggleSetting(group, 'Show Links', '', isLinksEnabled, null, (isEnabled) => {
      config.enabledSymbolTypes[SymbolType.Link] = isEnabled;

      // have to wait for the save here because the call to display() will
      // trigger a read of the updated data
      config.saveSettings().then(
        () => {
          // reload the settings panel. This will cause the sublink types toggle
          // controls to be shown/hidden based on isLinksEnabled status
          this.mainSettingsTab.display();
        },
        (reason) => notifyError('Error saving "Show Links" setting. ', reason),
      );
    });

    if (isLinksEnabled) {
      const allowedLinkTypes: [string, number][] = [
        ['Links to headings', LinkType.Heading],
        ['Links to blocks', LinkType.Block],
      ];

      allowedLinkTypes.forEach(([name, linkType]) => {
        const isExcluded = (config.excludeLinkSubTypes & linkType) === linkType;
        this.addToggleSetting(group, name, '', !isExcluded, null, (isEnabled) =>
          this.saveEnableSubLinkChange(linkType, isEnabled),
        );
      });
    }
  }

  saveEnableSubLinkChange(linkType: LinkType, isEnabled: boolean): void {
    const { config } = this;
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
  }

  /**
   * Builds the symbol type toggles. Each binds to its own key inside the
   * enabledSymbolTypes record, which loadSettings merges with the defaults so
   * every key is present.
   * @returns SettingDefinitionItem<SettingsControlKey>[]
   */
  private createSymbolTypeDefinitions(): SettingDefinitionItem<SettingsControlKey>[] {
    const allowedSymbols = [
      ['Show Headings', SymbolType.Heading],
      ['Show Tags', SymbolType.Tag],
      ['Show Embeds', SymbolType.Embed],
      ['Show Callouts', SymbolType.Callout],
    ] as const;

    return allowedSymbols.map(([name, symbolType]) => ({
      name,
      control: { type: 'toggle', key: `enabledSymbolTypes.${symbolType}` },
    }));
  }

  /**
   * Builds the Links group. Show Links binds to its key inside the
   * enabledSymbolTypes record; the sub type toggles stay on render because
   * they set bit flags on excludeLinkSubTypes rather than a storage key. The
   * framework re-evaluates the sub type visible predicates after a control
   * change, so no explicit dom refresh is needed here.
   * @returns SettingDefinitionGroup<SettingsControlKey>
   */
  private createLinksGroupDefinition(): SettingDefinitionGroup<SettingsControlKey> {
    const { config } = this;
    const isLinksEnabled = () => config.enabledSymbolTypes[SymbolType.Link];
    const allowedLinkTypes: [string, LinkType][] = [
      ['Links to headings', LinkType.Heading],
      ['Links to blocks', LinkType.Block],
    ];

    const subTypeItems = allowedLinkTypes.map(([name, linkType]) => ({
      name,
      visible: isLinksEnabled,
      render: (setting: Setting) => {
        setting.addToggle((comp) => {
          const isExcluded = (config.excludeLinkSubTypes & linkType) !== 0;
          comp.setValue(!isExcluded);
          comp.onChange((isEnabled) => this.saveEnableSubLinkChange(linkType, isEnabled));
        });
      },
    }));

    return {
      type: 'group',
      heading: 'Links',
      items: [
        {
          name: 'Show Links',
          control: {
            type: 'toggle',
            key: `enabledSymbolTypes.${SymbolType.Link}`,
          },
        },
        ...subTypeItems,
      ],
    };
  }

  getSettingDefinitions(): SettingDefinitionPage<SettingsControlKey>[] {
    const { config } = this;

    return [
      {
        type: 'page',
        name: 'Symbol Mode',
        displayValue: () => config.symbolListCommand,
        items: [
          {
            name: 'Symbol list mode trigger',
            desc: 'Character that will trigger symbol list mode in the switcher. This triggers a display of Symbols for the source file of the currently selected (highlighted) suggestion in the switcher. If there is not a suggestion, display results for the active editor.',
            control: {
              type: 'text',
              key: 'symbolListCommand',
              placeholder: config.symbolListPlaceholderText,
            },
          },
          {
            name: 'Symbol list mode trigger - Active editor only',
            desc: 'Character that will trigger symbol list mode in the switcher. This always triggers a display of Symbols for the active editor only.',
            control: {
              type: 'text',
              key: 'symbolListActiveEditorCommand',
              placeholder: config.symbolListActiveEditorCommand,
            },
          },
          {
            name: 'List symbols as indented outline',
            desc: 'Enabled, symbols will be displayed in the (line) order they appear in the source text, indented under any preceding heading. Disabled, symbols will be grouped by type: Headings, Tags, Links, Embeds.',
            control: { type: 'toggle', key: 'symbolsInLineOrder' },
          },
          {
            name: 'Auto-select nearest heading',
            desc: 'Enabled, in an unfiltered symbol list, select the closest preceding Heading to the current cursor position, or to the scroll position when the file is displayed in Reading mode. Disabled, the first symbol in the list is selected.',
            control: { type: 'toggle', key: 'selectNearestHeading' },
          },
          {
            name: 'Show heading breadcrumbs in Symbol mode',
            desc: 'Enabled, display the hierarchical path of parent headings when showing heading symbols in Symbol mode.',
            control: { type: 'toggle', key: 'showHeadingBreadcrumbsInSymbolMode' },
          },
          ...this.createSymbolTypeDefinitions(),
          this.createLinksGroupDefinition(),
          {
            type: 'group',
            heading: 'Symbol Tab navigation behavior',
            items: [
              {
                name: 'Configure how symbols are opened when navigating from the symbol list.',
              },
              {
                name: 'Open Symbols in new tab',
                desc: 'Enabled, always open a new tab when navigating to Symbols. Disabled, navigate in an already open tab (if one exists). Overridden by "Default to open in new tab", which must be disabled for this to take effect.',
                control: { type: 'toggle', key: 'alwaysNewTabForSymbols' },
              },
              {
                name: 'Open Symbols in active tab on mobile devices',
                desc: 'Enabled, navigate to the target file and symbol in the active editor tab. Disabled, open a new tab when navigating to Symbols, even on mobile devices. Overridden by "Default to open in new tab", which must be disabled for this to take effect.',
                control: { type: 'toggle', key: 'useActiveTabForSymbolsOnMobile' },
              },
            ],
          },
        ],
      },
    ];
  }
}
