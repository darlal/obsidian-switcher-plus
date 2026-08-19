import {
  SettingDefinitionGroup,
  SettingDefinitionItem,
  SettingDefinitionList,
  SettingGroup,
  SettingGroupItem,
} from 'obsidian';
import { SwitcherPlusSettings } from 'src/settings';
import { Mode, PathDisplayFormat, TagSource, TitleSource } from 'src/types';
import { SettingsTabSection } from './settingsTabSection';
import { getModeNames, notifyError } from 'src/utils';
import { SettingsControlKey } from './switcherPlusSettings';
import { openListEntryModal, validateNewEntry } from './listEntryModal';

export class GeneralSettingsTabSection extends SettingsTabSection {
  display(containerEl: HTMLElement): void {
    const { config } = this;

    this.addSectionTitle(containerEl, 'General');

    this.addToggleSetting(
      containerEl,
      'Default to open in new tab',
      'When enabled, navigating to un-opened files will open a new editor tab whenever possible (as if cmd/ctrl were held). When the file is already open, the existing tab will be activated. This overrides all other tab settings.',
      config.onOpenPreferNewTab,
      'onOpenPreferNewTab',
    );
    this.showLauncherButtonOverrides(containerEl, config);
    this.showEnabledRibbonCommands(containerEl, config);

    this.addToggleSetting(
      containerEl,
      'Show indicator icons',
      'Display icons to indicate that an item is recent, bookmarked, etc..',
      config.showOptionalIndicatorIcons,
      'showOptionalIndicatorIcons',
    );
    this.addToggleSetting(
      containerEl,
      'Display mode trigger instructions',
      'When enabled, the trigger key for each mode will be displayed in the instructions section of the Switcher.',
      config.showModeTriggerInstructions,
      'showModeTriggerInstructions',
    );
    this.showStandardModeOverrides(containerEl, config);
    this.showPathDisplayGroup(containerEl, config);
    this.showPreferredSourceForTitle(containerEl, config);
    this.showTagDisplaySettings(containerEl, config);
    this.showQuickOpen(containerEl, config);
    this.showRenderMarkdownContentAsHTML(containerEl, config);

    this.addTextSetting(
      containerEl,
      'Mode trigger escape character',
      'Character to indicate that a mode trigger character should be treated just as a normal text.',
      config.escapeCmdChar,
      'escapeCmdChar',
    );
    this.addToggleSetting(
      containerEl,
      'Allow Backspace key to close the Switcher',
      'When the search box is empty, pressing the backspace key will close Switcher++.',
      config.shouldCloseModalOnBackspace,
      'shouldCloseModalOnBackspace',
    );
    this.showRestoreInput(containerEl, config);

    this.showInsertLinkInEditor(containerEl, config);
    this.showResetFacetEachSession(containerEl, config);
    this.showMatchPriorityAdjustments(containerEl, config);
  }

  showPreferredSourceForTitle(
    containerEl: HTMLElement,
    config: SwitcherPlusSettings,
  ): void {
    const options: Record<TitleSource, string> = {
      H1: 'First H₁ heading',
      Default: 'Default',
      FrontMatter: 'Frontmatter property',
    };

    const group = new SettingGroup(containerEl);

    this.addDropdownSetting(
      group,
      'Preferred suggestion title source',
      'The preferred source to use for the "title" text that will be searched and displayed for file based suggestions',
      config.preferredSourceForTitle,
      options,
      'preferredSourceForTitle',
      (rawValue, config) => {
        config.preferredSourceForTitle = rawValue as TitleSource;
        config.save();

        // Refresh the settings panel to show/hide the property path input
        this.mainSettingsTab.display();
      },
    );

    // Conditionally show the property path input when FrontMatter is selected
    if (config.preferredSourceForTitle === 'FrontMatter') {
      this.addTextSetting(
        group,
        'Frontmatter property path',
        'The path to the frontmatter property to use as the title. Use dot notation for nested properties (e.g., "title" or "meta.display_name"). The property value must be a string, number, or boolean. If the property doesn\'t exist or has an invalid type, the default filename will be used.',
        config.frontmatterTitleProperty,
        'frontmatterTitleProperty',
        'title',
      );
    }
  }

  showPathDisplayFormat(
    containerEl: HTMLElement | SettingGroup,
    config: SwitcherPlusSettings,
  ): void {
    const options: Record<string, string> = {};
    options[PathDisplayFormat.None.toString()] = 'Hide path';
    options[PathDisplayFormat.Full.toString()] = 'Full path';
    options[PathDisplayFormat.FolderOnly.toString()] = 'Only parent folder';
    options[PathDisplayFormat.FolderWithFilename.toString()] = 'Parent folder & filename';
    options[PathDisplayFormat.FolderPathFilenameOptional.toString()] =
      'Parent folder path (filename optional)';

    this.addDropdownSetting(
      containerEl,
      'Preferred file path display format',
      'The preferred way to display file paths in suggestions',
      config.pathDisplayFormat.toString(),
      options,
      null,
      (rawValue, config) => {
        config.pathDisplayFormat = Number(rawValue);
        config.save();
      },
    );
  }

  showPathDisplayGroup(containerEl: HTMLElement, config: SwitcherPlusSettings): void {
    const group = new SettingGroup(containerEl);

    this.createSetting(
      group,
      'Path Display Settings',
      'Configure how file paths are displayed in suggestions.',
    );

    this.showPathDisplayFormat(group, config);

    this.addToggleSetting(
      group,
      'Hide path for root items',
      'When enabled, path information will be hidden for items at the root of the vault.',
      config.hidePathIfRoot,
      'hidePathIfRoot',
    );
  }

  showStandardModeOverrides(
    containerEl: HTMLElement,
    config: SwitcherPlusSettings,
  ): void {
    const group = new SettingGroup(containerEl);

    this.createSetting(
      group,
      'Standard Mode Overrides',
      'Configure how Switcher++ overrides the default Obsidian Switcher behavior in Standard mode.',
    );

    this.addToggleSetting(
      group,
      'Override Standard mode file open behavior',
      'When enabled, Switcher++ will change the default Obsidian builtin Switcher functionality (Standard mode) to inject custom file open behavior.',
      config.overrideStandardModeBehaviors,
      'overrideStandardModeBehaviors',
    );

    this.addToggleSetting(
      group,
      'Override Standard mode rendering',
      'When enabled, Switcher++ will change the default Obsidian builtin Switcher functionality (Standard mode) to render suggestions as multi-line.',
      config.overrideStandardModeRendering,
      'overrideStandardModeRendering',
    );
  }

  showRestoreInput(containerEl: HTMLElement, config: SwitcherPlusSettings): void {
    const group = new SettingGroup(containerEl);

    this.createSetting(
      group,
      'Restore Previous Input',
      'Configure whether to restore the last typed input when launching the Switcher.',
    );

    this.addToggleSetting(
      group,
      'Restore previous input in Command Mode',
      'When enabled, restore the last typed input in Command Mode when launched via global command hotkey.',
      config.preserveCommandPaletteLastInput,
      'preserveCommandPaletteLastInput',
    );

    this.addToggleSetting(
      group,
      'Restore previous input',
      'When enabled, restore the last typed input when launched via global command hotkey.',
      config.preserveQuickSwitcherLastInput,
      'preserveQuickSwitcherLastInput',
    );
  }

  showEnabledRibbonCommands(
    containerEl: HTMLElement,
    config: SwitcherPlusSettings,
  ): void {
    const modeNames = getModeNames();
    const modeNamesStr = modeNames.join(' ');
    const desc = `Display an icon in the ribbon menu to launch specific modes. Add one mode per line. Available modes: ${modeNamesStr}`;

    this.createSetting(containerEl, 'Show ribbon icons', desc).addTextArea((textArea) => {
      textArea.setValue(config.enabledRibbonCommands.join('\n'));

      textArea.inputEl.addEventListener('focusout', () => {
        const values = textArea
          .getValue()
          .split('\n')
          .map((v) => v.trim())
          .filter((v) => v.length > 0);

        const invalidValues = Array.from(new Set(values)).filter(
          (v) => !(modeNames as string[]).includes(v),
        );

        if (invalidValues.length) {
          this.showErrorPopup(
            'Invalid mode',
            `Changes not saved. Available modes are: ${modeNamesStr}. The following are invalid:`,
            invalidValues.map((v) => [{ text: v }]),
          );
        } else {
          config.enabledRibbonCommands = values as Array<keyof typeof Mode>;
          config.save();

          // force unregister/register of ribbon commands, so the changes take
          // effect immediately
          this.mainSettingsTab.plugin.registerRibbonCommandIcons();
        }
      });
    });
  }

  showLauncherButtonOverrides(
    containerEl: HTMLElement,
    config: SwitcherPlusSettings,
  ): void {
    const { mobileLauncher } = config;

    const group = new SettingGroup(containerEl);

    const disableOptionKey = 'disabled'; // Option to disable the feature
    const options: Record<string, string> = { [disableOptionKey]: 'Do not override' };

    // Add each mode to the list of options
    const modeNames = getModeNames();
    modeNames.forEach((name) => {
      options[name] = name;
    });

    let initialValue = disableOptionKey;
    if (
      mobileLauncher.isEnabled &&
      modeNames.includes(mobileLauncher.modeString as keyof typeof Mode)
    ) {
      initialValue = mobileLauncher.modeString;
    }

    // Show the launch mode selector dropdown for mobile navigation bar
    this.addDropdownSetting(
      group,
      'New tab and mobile launcher buttons',
      'Select the Mode to launch Switcher++ in from the empty tab page and mobile navigation Bar button, or select "Do not override" to disable the feature.',
      initialValue,
      options,
      null,
      (rawValue, config) => {
        const isEnabled = rawValue !== disableOptionKey;

        config.mobileLauncher.isEnabled = isEnabled;
        if (isEnabled) {
          config.mobileLauncher.modeString = rawValue;
        }

        config.save();

        // Reload the settings panel. This will cause the new tab button option to display
        this.mainSettingsTab.display();

        // Trigger the buttons/new tab page to update to the new configuration
        this.mainSettingsTab.plugin.updateLauncherButtonOverrides(isEnabled);
      },
    );

    if (mobileLauncher.isEnabled) {
      // Show the mobile launcher button
      this.addToggleSetting(
        group,
        'Override default Switcher launch button on mobile platforms',
        'When enabled, override the "🔍" button (in the Navigation Bar) on mobile platforms to launch Switcher++ instead of the default system switcher.',
        mobileLauncher.isMobileButtonEnabled,
        null,
        (value, config) => {
          config.mobileLauncher.isMobileButtonEnabled = value;
          config.save();
          this.mainSettingsTab.plugin.updateLauncherButtonOverrides(
            config.mobileLauncher.isEnabled,
          );
        },
      );

      // Show the new tab page toggle button
      this.addToggleSetting(
        group,
        'Display launch button on the "New tab" page',
        'When enabled, a button to launch Switcher++ using the selected mode above will be added to the default Obsidian "New tab" page.',
        mobileLauncher.isEmptyTabButtonEnabled,
        null,
        (value, config) => {
          config.mobileLauncher.isEmptyTabButtonEnabled = value;
          config.save();
          this.mainSettingsTab.plugin.updateLauncherButtonOverrides(
            config.mobileLauncher.isEnabled,
          );
        },
      );
    }
  }

  showMatchPriorityAdjustments(
    containerEl: HTMLElement,
    config: SwitcherPlusSettings,
  ): void {
    const {
      matchPriorityAdjustments: { isEnabled, adjustments, fileExtAdjustments },
    } = config;

    const group = new SettingGroup(containerEl);

    this.addToggleSetting(
      group,
      'Result priority adjustments',
      'Artificially increase the match score of the specified item types by a fixed percentage so they appear higher in the results list (does not apply to Standard Mode).',
      isEnabled,
      null,
      (isEnabled, config) => {
        config.matchPriorityAdjustments.isEnabled = isEnabled;

        // have to wait for the save here because the call to display() will
        // trigger a read of the updated data
        config.saveSettings().then(
          () => {
            // reload the settings panel. This will cause the matchPriorityAdjustments
            // controls to be shown/hidden based on isEnabled status
            this.mainSettingsTab.display();
          },
          (reason) =>
            notifyError('Error saving "Result Priority Adjustments" setting. ', reason),
        );
      },
    );

    if (isEnabled) {
      [adjustments, fileExtAdjustments].forEach((collection) => {
        Object.entries(collection).forEach(([key, data]) => {
          const { value, label } = data;

          this.addSliderSetting(
            group,
            label,
            data.desc ?? '',
            value,
            [-1, 1, 0.05, 0],
            null,
            (value, config) => {
              collection[key].value = value;
              config.save();
            },
          );
        });
      });
    }
  }

  showResetFacetEachSession(
    containerEl: HTMLElement,
    config: SwitcherPlusSettings,
  ): void {
    this.addToggleSetting(
      containerEl,
      'Reset active Quick Filters',
      'When enabled, the switcher will reset all Quick Filters back to inactive for each session.',
      config.quickFilters.shouldResetActiveFacets,
      null,
      (value, config) => {
        config.quickFilters.shouldResetActiveFacets = value;
        config.save();
      },
    );
  }

  showRenderMarkdownContentAsHTML(
    containerEl: HTMLElement,
    config: SwitcherPlusSettings,
  ): void {
    const { renderMarkdownContentInSuggestions } = config;

    const group = new SettingGroup(containerEl);

    // Master toggle
    const isEnabledSetting = this.addToggleSetting(
      group,
      'Display markdown content as Live Preview',
      'When enabled, markdown content in symbol suggestions will be rendered as HTML similar to the Obsidian "Live Preview" display. When disabled, content will be rendered as raw text. Use the "toggle preview (selected item)" hotkey to toggle the display for individual items.',
      renderMarkdownContentInSuggestions.isEnabled,
      null,
      (value, config) => {
        const { renderMarkdownContentInSuggestions } = config;
        renderMarkdownContentInSuggestions.isEnabled = value;

        // have to wait for the save here because the call to display() will
        // trigger a read of the updated data
        config.saveSettings().then(
          () => {
            // reload the settings panel. This will cause the individual toggles
            // to be shown/hidden based on isEnabled status
            this.mainSettingsTab.display();
          },
          (reason) =>
            notifyError(
              'Error saving "Display markdown content as Live Preview" setting. ',
              reason,
            ),
        );
      },
    );

    // Show a callout that this feature is experimental
    isEnabledSetting?.nameEl?.createSpan({
      cls: ['qsp-tag', 'qsp-warning'],
      text: 'Experimental',
    });

    // Individual toggles (only shown when master toggle is enabled)
    if (renderMarkdownContentInSuggestions.isEnabled) {
      const symbolTypeToggles: Array<{
        name: string;
        property: keyof typeof renderMarkdownContentInSuggestions;
        description: string;
      }> = [
        {
          name: 'Headings',
          property: 'renderHeadings',
          description: 'Render headings as HTML',
        },
        {
          name: 'Links',
          property: 'renderLinks',
          description: 'Render links as HTML',
        },
        {
          name: 'Tags',
          property: 'renderTags',
          description: 'Render tags as HTML',
        },
        {
          name: 'Callouts',
          property: 'renderCallouts',
          description: 'Render callouts as HTML',
        },
      ];

      symbolTypeToggles.forEach(({ name, property, description }) => {
        this.addToggleSetting(
          group,
          name,
          description,
          renderMarkdownContentInSuggestions[property] as boolean,
          null,
          (value, config) => {
            (config.renderMarkdownContentInSuggestions[property] as boolean) = value;
            config.save();
          },
        );
      });
    }
  }

  showInsertLinkInEditor(containerEl: HTMLElement, config: SwitcherPlusSettings): void {
    const group = new SettingGroup(containerEl);
    this.createSetting(
      group,
      'Insert link in editor',
      'Configure alias options when inserting links into the editor.',
    );

    this.addToggleSetting(
      group,
      'Use filename as alias',
      'When enabled, the file basename will be set as the link alias.',
      config.insertLinkInEditor.useBasenameAsAlias,
      null,
      (value, config) => {
        config.insertLinkInEditor.useBasenameAsAlias = value;
        config.save();
      },
    );

    this.addToggleSetting(
      group,
      'Use heading as alias',
      'When enabled, the file heading will be set as the link alias. This overrides the "use filename as alias" setting.',
      config.insertLinkInEditor.useHeadingAsAlias,
      null,
      (value, config) => {
        config.insertLinkInEditor.useHeadingAsAlias = value;
        config.save();
      },
    );
  }

  showQuickOpen(containerEl: HTMLElement, config: SwitcherPlusSettings): void {
    this.addToggleSetting(
      containerEl,
      'Enable quick open hotkeys for top results',
      'When enabled, hotkeys will be defined for each of the top N results displayed in the Switcher. These hotkeys can be used to quickly open the associated suggestion directly. when disabled, no hotkeys are defined.',
      config.quickOpen.isEnabled,
      null,
      (value, config) => {
        config.quickOpen.isEnabled = value;
        config.save();
      },
    );
  }

  showTagDisplaySettings(containerEl: HTMLElement, config: SwitcherPlusSettings): void {
    const { showTagsInSuggestions } = config;
    const group = new SettingGroup(containerEl);

    this.addToggleSetting(
      group,
      'Show tags in suggestions',
      'When enabled, tags associated with a file will be displayed in suggestions.',
      showTagsInSuggestions,
      null,
      (value, config) => {
        config.showTagsInSuggestions = value;

        config.saveSettings().then(
          () => {
            // Reload the settings panel to show/hide sub-settings based on toggle state
            this.mainSettingsTab.display();
          },
          (reason) =>
            notifyError('Error saving "Show tags in suggestions" setting. ', reason),
        );
      },
    );

    if (showTagsInSuggestions) {
      const tagSourceOptions: Record<TagSource, string> = {
        [TagSource.Both]: 'Both',
        [TagSource.Inline]: 'Inline only',
        [TagSource.Frontmatter]: 'Frontmatter only',
      };

      this.addDropdownSetting(
        group,
        'Tag source',
        'Select which tags to display: inline tags (in document body), frontmatter tags, or both.',
        config.tagSource,
        tagSourceOptions,
        null,
        (rawValue, config) => {
          config.tagSource = rawValue as TagSource;
          config.save();
        },
      );

      this.addTextAreaSetting(
        group,
        'Excluded tags',
        'Tags to exclude from display, one per line. Tags should be entered without the # prefix.',
        config.excludeTagsFromDisplay.join('\n'),
        null,
        'tag1\ntag2\ntag3',
        (rawValue, config) => {
          const tags = rawValue
            .split('\n')
            .map((t) => t.trim())
            .filter((t) => t.length > 0);
          config.excludeTagsFromDisplay = tags;
          config.save();
        },
      );

      this.addSliderSetting(
        group,
        'Max tags to display',
        'Maximum number of tags to show per suggestion. Set to 0 for unlimited.',
        config.maxTagsToDisplay,
        [0, 20, 1, 5],
        'maxTagsToDisplay',
      );

      this.addTextSetting(
        group,
        'Tag separator',
        'The string used to separate multiple tags in the display.',
        config.tagDisplaySeparator,
        'tagDisplaySeparator',
        ', ',
      );

      this.addToggleSetting(
        group,
        'Remove # prefix from tags',
        'When enabled, the # prefix will be removed from tags when displayed.',
        config.removeHashPrefixFromTags,
        'removeHashPrefixFromTags',
      );
    }
  }

  /**
   * Builds the preferred title source group.
   * @returns SettingDefinitionGroup<SettingsControlKey>
   */
  private createTitleSourceGroupDefinition(): SettingDefinitionGroup<SettingsControlKey> {
    const { config } = this;
    const options: Record<TitleSource, string> = {
      H1: 'First H₁ heading',
      Default: 'Default',
      FrontMatter: 'Frontmatter property',
    };

    return {
      type: 'group',
      heading: 'Preferred suggestion title source',
      items: [
        {
          name: 'Preferred suggestion title source',
          desc: 'The preferred source to use for the "title" text that will be searched and displayed for file based suggestions',
          control: {
            type: 'dropdown',
            key: 'preferredSourceForTitle',
            options,
          },
        },
        {
          name: 'Frontmatter property path',
          desc: 'The path to the frontmatter property to use as the title. Use dot notation for nested properties (e.g., "title" or "meta.display_name"). The property value must be a string, number, or boolean. If the property doesn\'t exist or has an invalid type, the default filename will be used.',
          visible: () => config.preferredSourceForTitle === 'FrontMatter',
          control: {
            type: 'text',
            key: 'frontmatterTitleProperty',
            placeholder: 'title',
          },
        },
      ],
    };
  }

  /**
   * Builds the excluded tags list.
   * @returns SettingDefinitionList<SettingsControlKey> the excluded tags list
   */
  private createExcludedTagsDefinitions(): SettingDefinitionList<SettingsControlKey> {
    const { config } = this;
    const isEnabled = () => config.showTagsInSuggestions;

    const list: SettingDefinitionList<SettingsControlKey> = {
      type: 'list',
      heading: 'Excluded tags',
      visible: isEnabled,
      emptyState: 'No tags excluded.',
      addItem: {
        name: 'Add excluded tag',
        action: () => {
          openListEntryModal(this.app, {
            title: 'Add excluded tag',
            desc: 'Tags to exclude from display. Tags should be entered without the # prefix.',
            placeholder: 'tag1',
            // Tags are compared without the # prefix, so a stored entry that
            // keeps it would silently match nothing.
            normalize: (value) => value.trim().replace(/^#/, ''),
            validate: validateNewEntry(config.excludeTagsFromDisplay),
            onSubmit: (value) => {
              config.excludeTagsFromDisplay = [...config.excludeTagsFromDisplay, value];
              config.save();
              this.mainSettingsTab.update();
            },
          });
        },
      },
      onDelete: (index) => {
        const next = [...config.excludeTagsFromDisplay];
        next.splice(index, 1);

        config.excludeTagsFromDisplay = next;
        config.save();
        this.mainSettingsTab.update();
      },
      items: config.excludeTagsFromDisplay.map((entry) => ({
        name: entry,
        searchable: false,
      })),
    };

    return list;
  }

  /**
   * Builds the tag display group.
   * @returns SettingDefinitionGroup<SettingsControlKey>
   */
  private createTagDisplayGroupDefinition(): SettingDefinitionGroup<SettingsControlKey> {
    const { config } = this;
    const isEnabled = () => config.showTagsInSuggestions;
    const tagSourceOptions: Record<TagSource, string> = {
      [TagSource.Both]: 'Both',
      [TagSource.Inline]: 'Inline only',
      [TagSource.Frontmatter]: 'Frontmatter only',
    };

    return {
      type: 'group',
      heading: 'Show tags in suggestions',
      items: [
        {
          name: 'Show tags in suggestions',
          desc: 'When enabled, tags associated with a file will be displayed in suggestions.',
          control: { type: 'toggle', key: 'showTagsInSuggestions' },
        },
        {
          name: 'Tag source',
          desc: 'Select which tags to display: inline tags (in document body), frontmatter tags, or both.',
          visible: isEnabled,
          control: { type: 'dropdown', key: 'tagSource', options: tagSourceOptions },
        },
        {
          name: 'Max tags to display',
          desc: 'Maximum number of tags to show per suggestion. Set to 0 for unlimited.',
          visible: isEnabled,
          control: {
            type: 'slider',
            key: 'maxTagsToDisplay',
            min: 0,
            max: 20,
            step: 1,
            defaultValue: 5,
          },
        },
        {
          name: 'Tag separator',
          desc: 'The string used to separate multiple tags in the display.',
          visible: isEnabled,
          control: { type: 'text', key: 'tagDisplaySeparator', placeholder: ', ' },
        },
        {
          name: 'Remove # prefix from tags',
          desc: 'When enabled, the # prefix will be removed from tags when displayed.',
          visible: isEnabled,
          control: { type: 'toggle', key: 'removeHashPrefixFromTags' },
        },
      ],
    };
  }

  /**
   * Builds the Live Preview rendering group. Every key is a dot path into the
   * renderMarkdownContentInSuggestions config object.
   * @returns SettingDefinitionGroup<SettingsControlKey>
   */
  private createRenderMarkdownGroupDefinition(): SettingDefinitionGroup<SettingsControlKey> {
    const { config } = this;
    const isEnabled = () => config.renderMarkdownContentInSuggestions.isEnabled;
    const symbolTypeToggles: Array<[string, SettingsControlKey, string]> = [
      [
        'Headings',
        'renderMarkdownContentInSuggestions.renderHeadings',
        'Render headings as HTML',
      ],
      ['Links', 'renderMarkdownContentInSuggestions.renderLinks', 'Render links as HTML'],
      ['Tags', 'renderMarkdownContentInSuggestions.renderTags', 'Render tags as HTML'],
      [
        'Callouts',
        'renderMarkdownContentInSuggestions.renderCallouts',
        'Render callouts as HTML',
      ],
    ];

    return {
      type: 'group',
      heading: 'Display markdown content as Live Preview',
      items: [
        {
          name: 'Display markdown content as Live Preview',
          desc: 'Experimental. When enabled, markdown content in symbol suggestions will be rendered as HTML similar to the Obsidian "Live Preview" display. When disabled, content will be rendered as raw text. Use the "toggle preview (selected item)" hotkey to toggle the display for individual items.',
          control: {
            type: 'toggle',
            key: 'renderMarkdownContentInSuggestions.isEnabled',
          },
        },
        ...symbolTypeToggles.map(([name, key, desc]) => ({
          name,
          desc,
          visible: isEnabled,
          control: { type: 'toggle' as const, key },
        })),
      ],
    };
  }

  /**
   * Builds the match priority adjustment sliders, one per entry in the two adjustment collections.
   * @returns SettingDefinitionGroup<SettingsControlKey>
   */
  private createMatchPriorityGroupDefinition(): SettingDefinitionGroup<SettingsControlKey> {
    const { config } = this;
    const { adjustments, fileExtAdjustments } = config.matchPriorityAdjustments;
    const isEnabled = () => config.matchPriorityAdjustments.isEnabled;

    const collections: Array<['adjustments' | 'fileExtAdjustments', typeof adjustments]> =
      [
        ['adjustments', adjustments],
        ['fileExtAdjustments', fileExtAdjustments],
      ];

    const sliders = collections.flatMap(([collectionName, collection]) =>
      Object.entries(collection).map(
        ([key, data]): SettingGroupItem<SettingsControlKey> => ({
          name: data.label,
          desc: data.desc ?? '',
          visible: isEnabled,
          control: {
            type: 'slider',
            key: `matchPriorityAdjustments.${collectionName}.${key}.value`,
            min: -1,
            max: 1,
            step: 0.05,
            defaultValue: 0,
          },
        }),
      ),
    );

    return {
      type: 'group',
      heading: 'Result priority adjustments',
      items: [
        {
          name: 'Result priority adjustments',
          desc: 'Artificially increase the match score of the specified item types by a fixed percentage so they appear higher in the results list (does not apply to Standard Mode).',
          control: { type: 'toggle', key: 'matchPriorityAdjustments.isEnabled' },
        },
        ...sliders,
      ],
    };
  }

  /**
   * Builds the ribbon icons list. This is the one list whose order is
   * observable — ribbonIconManager iterates the array to register icons — so it
   * is the only one with a drag handle. Every mutation re-registers the icons so
   * the change takes effect without reopening settings.
   * @returns SettingDefinitionList<SettingsControlKey> the ribbon commands list
   */
  private createRibbonCommandsDefinitions(): SettingDefinitionList<SettingsControlKey> {
    const { config } = this;
    const modeNames = getModeNames();
    const remaining = modeNames.filter(
      (name) => !config.enabledRibbonCommands.includes(name),
    );

    const commit = (next: Array<keyof typeof Mode>) => {
      config.enabledRibbonCommands = next;
      config.save();

      // force unregister/register of ribbon commands, so the changes take
      // effect immediately
      this.mainSettingsTab.plugin.registerRibbonCommandIcons();
      this.mainSettingsTab.update();
    };

    const list: SettingDefinitionList<SettingsControlKey> = {
      type: 'list',
      heading: 'Show ribbon icons',
      emptyState: 'No ribbon icons shown.',
      onDelete: (index) => {
        const next = [...config.enabledRibbonCommands];
        next.splice(index, 1);

        commit(next);
      },
      onReorder: (oldIndex, newIndex) => {
        const next = [...config.enabledRibbonCommands];
        const [moved] = next.splice(oldIndex, 1);
        next.splice(newIndex, 0, moved);

        commit(next);
      },
      items: config.enabledRibbonCommands.map((entry) => ({
        name: entry,
        searchable: false,
      })),
    };

    if (remaining.length) {
      list.addItem = {
        name: 'Add ribbon icon',
        action: () => {
          openListEntryModal(this.app, {
            title: 'Add ribbon icon',
            desc: 'Display an icon in the ribbon menu to launch specific modes.',
            options: remaining,
            onSubmit: (value) => {
              commit([...config.enabledRibbonCommands, value as keyof typeof Mode]);
            },
          });
        },
      };
    }

    return list;
  }

  /**
   * Builds the launcher button group. Uses render because the dropdown's
   * "disabled" sentinel maps onto mobileLauncher.isEnabled rather than a stored
   * value, and because each change must refresh the installed launcher buttons.
   * @returns SettingDefinitionGroup<SettingsControlKey>
   */
  private createLauncherGroupDefinition(): SettingDefinitionGroup<SettingsControlKey> {
    const { config } = this;
    const { mobileLauncher } = config;
    const disableOptionKey = 'disabled';
    const modeNames = getModeNames();
    const isEnabled = () => config.mobileLauncher.isEnabled;

    const options: Record<string, string> = { [disableOptionKey]: 'Do not override' };
    modeNames.forEach((name) => {
      options[name] = name;
    });

    let initialValue = disableOptionKey;
    if (
      mobileLauncher.isEnabled &&
      modeNames.includes(mobileLauncher.modeString as keyof typeof Mode)
    ) {
      initialValue = mobileLauncher.modeString;
    }

    const refreshButtons = () => {
      this.mainSettingsTab.plugin.updateLauncherButtonOverrides(
        config.mobileLauncher.isEnabled,
      );
    };

    // render rows are outside the tab's control binding, which is what would
    // otherwise re-evaluate the isEnabled visibility predicates, so they have
    // to be refreshed explicitly after the mode dropdown changes
    const refreshVisibility = () => this.mainSettingsTab.refreshDomState();

    const launcherToggle = (
      name: string,
      desc: string,
      property: 'isMobileButtonEnabled' | 'isEmptyTabButtonEnabled',
    ): SettingGroupItem<SettingsControlKey> => ({
      name,
      desc,
      visible: isEnabled,
      render: (setting) => {
        setting.addToggle((comp) => {
          comp.setValue(config.mobileLauncher[property]);
          comp.onChange((value) => {
            config.mobileLauncher[property] = value;
            config.save();
            refreshButtons();
          });
        });
      },
    });

    return {
      type: 'group',
      heading: 'Tab and mobile launcher buttons',
      items: [
        {
          name: 'Mode for new tab and mobile launcher buttons',
          desc: 'Select the Mode to launch Switcher++ in from the empty tab page and mobile navigation Bar button, or select "Do not override" to disable the feature.',
          render: (setting) => {
            setting.addDropdown((comp) => {
              comp.addOptions(options);
              comp.setValue(initialValue);
              comp.onChange((rawValue) => {
                const isOverrideEnabled = rawValue !== disableOptionKey;

                config.mobileLauncher.isEnabled = isOverrideEnabled;
                if (isOverrideEnabled) {
                  config.mobileLauncher.modeString = rawValue;
                }

                config.save();
                refreshButtons();
                refreshVisibility();
              });
            });
          },
        },
        launcherToggle(
          'Override default Switcher launch button on mobile platforms',
          'When enabled, override the "🔍" button (in the Navigation Bar) on mobile platforms to launch Switcher++ instead of the default system switcher.',
          'isMobileButtonEnabled',
        ),
        launcherToggle(
          'Display launch button on the "New tab" page',
          'When enabled, a button to launch Switcher++ using the selected mode above will be added to the default Obsidian "New tab" page.',
          'isEmptyTabButtonEnabled',
        ),
      ],
    };
  }

  getSettingDefinitions(): SettingDefinitionItem<SettingsControlKey>[] {
    const pathDisplayOptions: Record<string, string> = {
      [PathDisplayFormat.None.toString()]: 'Hide path',
      [PathDisplayFormat.Full.toString()]: 'Full path',
      [PathDisplayFormat.FolderOnly.toString()]: 'Only parent folder',
      [PathDisplayFormat.FolderWithFilename.toString()]: 'Parent folder & filename',
      [PathDisplayFormat.FolderPathFilenameOptional.toString()]:
        'Parent folder path (filename optional)',
    };

    return [
      {
        name: 'Default to open in new tab',
        desc: 'When enabled, navigating to un-opened files will open a new editor tab whenever possible (as if cmd/ctrl were held). When the file is already open, the existing tab will be activated. This overrides all other tab settings.',
        control: { type: 'toggle', key: 'onOpenPreferNewTab' },
      },
      {
        name: 'Show indicator icons',
        desc: 'Display icons to indicate that an item is recent, bookmarked, etc..',
        control: { type: 'toggle', key: 'showOptionalIndicatorIcons' },
      },
      {
        name: 'Display mode trigger instructions',
        desc: 'When enabled, the trigger key for each mode will be displayed in the instructions section of the Switcher.',
        control: { type: 'toggle', key: 'showModeTriggerInstructions' },
      },
      {
        name: 'Enable quick open hotkeys for top results',
        desc: 'When enabled, hotkeys will be defined for each of the top N results displayed in the Switcher. These hotkeys can be used to quickly open the associated suggestion directly. when disabled, no hotkeys are defined.',
        control: { type: 'toggle', key: 'quickOpen.isEnabled' },
      },
      {
        name: 'Mode trigger escape character',
        desc: 'Character to indicate that a mode trigger character should be treated just as a normal text.',
        control: { type: 'text', key: 'escapeCmdChar' },
      },
      {
        name: 'Allow Backspace key to close the Switcher',
        desc: 'When the search box is empty, pressing the backspace key will close Switcher++.',
        control: { type: 'toggle', key: 'shouldCloseModalOnBackspace' },
      },
      {
        name: 'Reset active Quick Filters',
        desc: 'When enabled, the switcher will reset all Quick Filters back to inactive for each session.',
        control: { type: 'toggle', key: 'quickFilters.shouldResetActiveFacets' },
      },
      this.createRibbonCommandsDefinitions(),
      this.createLauncherGroupDefinition(),
      this.createTitleSourceGroupDefinition(),
      {
        type: 'group',
        heading: 'Path Display Settings',
        items: [
          { name: 'Configure how file paths are displayed in suggestions.' },
          {
            name: 'Preferred file path display format',
            desc: 'The preferred way to display file paths in suggestions',
            control: {
              type: 'dropdown',
              key: 'pathDisplayFormatString',
              options: pathDisplayOptions,
            },
          },
          {
            name: 'Hide path for root items',
            desc: 'When enabled, path information will be hidden for items at the root of the vault.',
            control: { type: 'toggle', key: 'hidePathIfRoot' },
          },
        ],
      },
      {
        type: 'group',
        heading: 'Standard Mode Overrides',
        items: [
          {
            name: 'Configure how Switcher++ overrides the default Obsidian Switcher behavior in Standard mode.',
          },
          {
            name: 'Override Standard mode file open behavior',
            desc: 'When enabled, Switcher++ will change the default Obsidian builtin Switcher functionality (Standard mode) to inject custom file open behavior.',
            control: { type: 'toggle', key: 'overrideStandardModeBehaviors' },
          },
          {
            name: 'Override Standard mode rendering',
            desc: 'When enabled, Switcher++ will change the default Obsidian builtin Switcher functionality (Standard mode) to render suggestions as multi-line.',
            control: { type: 'toggle', key: 'overrideStandardModeRendering' },
          },
        ],
      },
      {
        type: 'group',
        heading: 'Restore Previous Input',
        items: [
          {
            name: 'Configure whether to restore the last typed input when launching the Switcher.',
          },
          {
            name: 'Restore previous input in Command Mode',
            desc: 'When enabled, restore the last typed input in Command Mode when launched via global command hotkey.',
            control: { type: 'toggle', key: 'preserveCommandPaletteLastInput' },
          },
          {
            name: 'Restore previous input',
            desc: 'When enabled, restore the last typed input when launched via global command hotkey.',
            control: { type: 'toggle', key: 'preserveQuickSwitcherLastInput' },
          },
        ],
      },
      {
        type: 'group',
        heading: 'Insert link in editor',
        items: [
          { name: 'Configure alias options when inserting links into the editor.' },
          {
            name: 'Use filename as alias',
            desc: 'When enabled, the file basename will be set as the link alias.',
            control: { type: 'toggle', key: 'insertLinkInEditor.useBasenameAsAlias' },
          },
          {
            name: 'Use heading as alias',
            desc: 'When enabled, the file heading will be set as the link alias. This overrides the "use filename as alias" setting.',
            control: { type: 'toggle', key: 'insertLinkInEditor.useHeadingAsAlias' },
          },
        ],
      },
      this.createTagDisplayGroupDefinition(),
      this.createExcludedTagsDefinitions(),
      this.createRenderMarkdownGroupDefinition(),
      this.createMatchPriorityGroupDefinition(),
    ];
  }
}
