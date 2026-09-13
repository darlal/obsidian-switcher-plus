import {
  Setting,
  SettingDefinitionGroup,
  SettingDefinitionItem,
  SettingDefinitionPage,
} from 'obsidian';
import { SettingsControlKey } from './switcherPlusSettings';
import { SettingsTabSection } from './settingsTabSection';
import { LinkType, SymbolType } from 'src/types';

export class SymbolSettingsTabSection extends SettingsTabSection {
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
        displayValue: () => this.getModeDisplayValue('symbolListCommand'),
        items: [
          ...this.createTriggerSettings(
            'symbolListCommand',
            'Symbol list mode trigger',
            'Primary trigger that will activate symbol list mode in the switcher. This triggers a display of Symbols for the source file of the currently selected (highlighted) suggestion in the switcher. If there is not a suggestion, display results for the active editor.',
            config.symbolListPlaceholderText,
          ),
          ...this.createTriggerSettings(
            'symbolListActiveEditorCommand',
            'Symbol list mode trigger - Active editor only',
            'Primary trigger that will activate symbol list mode in the switcher. This always triggers a display of Symbols for the active editor only.',
            config.symbolListActiveEditorCommand,
          ),
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
