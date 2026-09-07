import { SettingsControlKey } from './switcherPlusSettings';
import { SettingsTabSection } from './settingsTabSection';
import {
  SettingDefinitionGroup,
  SettingDefinitionItem,
  SettingDefinitionList,
  SettingDefinitionPage,
  SettingGroupItem,
} from 'obsidian';
import { openListEntryModal, validateNewEntry } from './listEntryModal';

export class HeadingsSettingsTabSection extends SettingsTabSection {
  /**
   * Opens the entry modal for the file extension allow list. Passing an index
   * edits that row in place; omitting it appends. The extension being edited is
   * excluded from the duplicate check so re-saving it unchanged is not an error.
   * @param  {number} index? the row being edited
   * @returns void
   */
  private openFileExtEntryModal(index?: number): void {
    const { config } = this;
    const entries = config.fileExtAllowList;
    const isEdit = index !== undefined;

    openListEntryModal(this.app, {
      title: isEdit ? 'Edit file extension' : 'Add file extension',
      desc: 'Override the "Show attachments" and the "Show all file types" builtin, system Switcher settings and always search files with the listed extensions. For example to add ".canvas" file extension, just add "canvas".',
      suggestions: Object.keys(this.app.viewRegistry.typeByExtension).sort(),
      placeholder: 'canvas',
      initialValue: isEdit ? entries[index] : undefined,
      normalize: (value) => value.trim(),
      validate: validateNewEntry(
        entries.filter((_entry, entryIdx) => entryIdx !== index),
      ),
      onSubmit: (value) => {
        const next = [...entries];

        if (isEdit) {
          next[index] = value;
        } else {
          next.push(value);
        }

        config.fileExtAllowList = next;
        config.save();
        this.mainSettingsTab.update();
      },
    });
  }

  /**
   * Builds the file extension allow list. Entries are free text: the list exists
   * precisely to admit extensions the view registry reports as unregistered, so
   * the registered set is offered only as a suggestion.
   * @returns SettingDefinitionList<SettingsControlKey> the file extension allow list
   */
  private createFileExtAllowListDefinitions(): SettingDefinitionList<SettingsControlKey> {
    const { config } = this;

    const list: SettingDefinitionList<SettingsControlKey> = {
      type: 'list',
      heading: 'File extension override',
      emptyState: 'No file extension overrides.',
      addItem: {
        name: 'Add file extension',
        action: () => this.openFileExtEntryModal(),
      },
      onDelete: (index) => {
        const next = [...config.fileExtAllowList];
        next.splice(index, 1);

        config.fileExtAllowList = next;
        config.save();
        this.mainSettingsTab.update();
      },
      items: config.fileExtAllowList.map((entry) => ({
        name: entry,
        searchable: false,
        action: (_el: HTMLElement, index: number) => this.openFileExtEntryModal(index),
      })),
    };

    return list;
  }

  /**
   * Opens the entry modal for an exclude-folder pattern. Entries are regexes, so
   * the value is never trimmed: leading and trailing whitespace can be part of
   * the pattern.
   * @param  {number} index? the row being edited
   * @returns void
   */
  private openExcludeFolderModal(index?: number): void {
    const { config } = this;
    const entries = config.excludeFolders;
    const isEdit = index !== undefined;

    openListEntryModal(this.app, {
      title: isEdit ? 'Edit excluded folder' : 'Add excluded folder',
      desc: 'When in Headings list mode, folder path that match any regex listed here will not be searched for suggestions. Path may start from the Vault Root.',
      placeholder: '^Archive',
      initialValue: isEdit ? entries[index] : undefined,
      validate: validateNewEntry(
        entries.filter((_entry, entryIdx) => entryIdx !== index),
        (value) => {
          try {
            new RegExp(value);
          } catch (err) {
            return `${value} — ${(err as Error).toString()}`;
          }

          return undefined;
        },
      ),
      onSubmit: (value) => {
        const next = [...entries];

        if (isEdit) {
          next[index] = value;
        } else {
          next.push(value);
        }

        config.excludeFolders = next;
        config.save();
        this.mainSettingsTab.update();
      },
    });
  }

  /**
   * Builds the exclusions block.
   * @returns SettingDefinitionItem<SettingsControlKey>[] the page level siblings, in reading order
   */
  private createExclusionsDefinitions(): SettingDefinitionItem<SettingsControlKey>[] {
    const { config } = this;

    const list: SettingDefinitionList<SettingsControlKey> = {
      type: 'list',
      heading: 'Exclude folders',
      emptyState: 'No folders excluded.',
      addItem: {
        name: 'Add excluded folder',
        action: () => this.openExcludeFolderModal(),
      },
      onDelete: (index) => {
        const next = [...config.excludeFolders];
        next.splice(index, 1);

        config.excludeFolders = next;
        config.save();
        this.mainSettingsTab.update();
      },
      items: config.excludeFolders.map((entry) => ({
        name: entry,
        searchable: false,
        action: (_el: HTMLElement, index: number) => this.openExcludeFolderModal(index),
      })),
    };

    return [
      list,
      {
        name: 'Hide Obsidian "Excluded files"',
        desc: 'Enabled, do not display suggestions for files that are in Obsidian\'s "Options > Files & Links > Excluded files" list. Disabled, suggestions for those files will be displayed but downranked.',
        control: { type: 'toggle', key: 'excludeObsidianIgnoredFiles' },
      },
    ];
  }

  /**
   * Builds the Search Headings group. The dependent settings use a visible
   * predicate. The breadcrumb detail settings are additionally gated on the
   * showHeadingBreadcrumbs toggle.
   * @returns SettingDefinitionGroup<SettingsControlKey>
   */
  private createSearchHeadingsGroupDefinition(): SettingDefinitionGroup<SettingsControlKey> {
    const { config } = this;
    const isEnabled = () => config.shouldSearchHeadings;
    const isBreadcrumbsEnabled = () => isEnabled() && config.showHeadingBreadcrumbs;

    return {
      type: 'group',
      heading: 'Search Headings',
      items: [
        {
          name: 'Search Headings',
          desc: "Enabled, search and show suggestions for Headings. Disabled, Don't search through Headings",
          control: { type: 'toggle', key: 'shouldSearchHeadings' },
        },
        {
          name: 'Turn off filename fallback',
          desc: 'Enabled, strictly search through only the headings contained in the file. Do not fallback to searching the filename when an H1 match is not found. Disabled, fallback to searching against the filename when there is not a match in the first H1 contained in the file.',
          visible: isEnabled,
          control: { type: 'toggle', key: 'strictHeadingsOnly' },
        },
        this.createHeadingLevelsDefinition(isEnabled),
        {
          name: 'Show heading breadcrumbs',
          desc: 'Enabled, display the hierarchical path of parent headings leading to each heading suggestion.',
          visible: isEnabled,
          control: { type: 'toggle', key: 'showHeadingBreadcrumbs' },
        },
        {
          name: 'Breadcrumb separator',
          desc: 'The string used to separate heading levels in breadcrumbs',
          visible: isBreadcrumbsEnabled,
          control: { type: 'text', key: 'headingBreadcrumbSeparator' },
        },
        {
          name: 'Max breadcrumb depth',
          desc: 'Maximum number of heading levels to show in breadcrumbs. Set to 0 for unlimited depth.',
          visible: isBreadcrumbsEnabled,
          control: {
            type: 'slider',
            key: 'maxBreadcrumbDepth',
            min: 0,
            max: 6,
            step: 1,
            defaultValue: 0,
          },
        },
      ],
    };
  }

  /**
   * Builds the H1 through H6 selector. Uses render because a row of buttons has
   * no first-class declarative control, and because the value is a set of levels
   * rather than a single bindable key.
   * @param  {()=>boolean} isEnabled visibility predicate shared with the rest of
   *   the Search Headings group
   * @returns SettingGroupItem<SettingsControlKey>
   */
  private createHeadingLevelsDefinition(
    isEnabled: () => boolean,
  ): SettingGroupItem<SettingsControlKey> {
    const { config } = this;

    return {
      name: 'Include heading levels',
      desc: 'Select which heading levels to include in search. To search just the very first H1 heading only deselect all levels.',
      visible: isEnabled,
      render: (setting) => {
        // searchAllHeadings is normalized to a number[] by its getter, so legacy
        // booleans already map to the right levels (true → all, false → empty).
        const enabledLevels = new Set(config.searchAllHeadings);

        for (let level = 1; level <= 6; level++) {
          setting.addButton((btn) => {
            btn.setButtonText(`H${level}`);

            if (enabledLevels.has(level)) {
              btn.setCta();
            }

            btn.onClick(() => {
              if (enabledLevels.has(level)) {
                enabledLevels.delete(level);
                btn.removeCta();
              } else {
                enabledLevels.add(level);
                btn.setCta();
              }

              config.searchAllHeadings = Array.from(enabledLevels).sort((a, b) => a - b);

              config.save();
            });
          });
        }
      },
    };
  }

  getSettingDefinitions(): SettingDefinitionPage<SettingsControlKey>[] {
    const { config } = this;

    return [
      {
        type: 'page',
        name: 'Headings Mode',
        displayValue: () => config.headingsListCommand,
        items: [
          {
            name: 'Headings list mode trigger',
            desc: 'Character that will trigger headings list mode in the switcher',
            control: {
              type: 'text',
              key: 'headingsListCommand',
              placeholder: config.headingsListPlaceholderText,
            },
          },
          {
            name: 'Max recent files to show',
            desc: 'The maximum number of recent files to show when there is no search term',
            control: {
              type: 'slider',
              key: 'maxRecentFileSuggestionsOnInit',
              min: 0,
              max: 75,
              step: 1,
              defaultValue: 25,
            },
          },
          {
            name: 'Search Filenames',
            desc: "Enabled, search and show suggestions for filenames. Disabled, Don't search through filenames (except for fallback searches)",
            control: { type: 'toggle', key: 'shouldSearchFilenames' },
          },
          {
            name: 'Search Bookmarks',
            desc: "Enabled, search and show suggestions for Bookmarks. Disabled, Don't search through Bookmarks",
            control: { type: 'toggle', key: 'shouldSearchBookmarks' },
          },
          this.createSearchHeadingsGroupDefinition(),
          this.createFileExtAllowListDefinitions(),
          ...this.createExclusionsDefinitions(),
        ],
      },
    ];
  }
}
