import { SettingsControlKey, SwitcherPlusSettings } from './switcherPlusSettings';
import { SwitcherPlusSettingTab } from './switcherPlusSettingTab';
import { App, SettingDefinitionItem } from 'obsidian';
import type { TriggerSettingKey } from 'src/types';
import { displayTrigger, getModeTriggers, validateModeTrigger } from './modeTriggers';
import { openListEntryModal } from './listEntryModal';

export abstract class SettingsTabSection {
  constructor(
    protected app: App,
    protected mainSettingsTab: SwitcherPlusSettingTab,
    protected config: SwitcherPlusSettings,
  ) {}

  /**
   * Sections override this to define their settings declaratively. Obsidian
   * renders, indexes, and persists the returned definitions; it runs on every
   * update() and once at tab registration, so it must stay cheap.
   * @returns SettingDefinitionItem<SettingsControlKey>[]
   */
  abstract getSettingDefinitions(): SettingDefinitionItem<SettingsControlKey>[];

  protected getModeDisplayValue(key: TriggerSettingKey): string {
    const aliases = this.config.triggerAliases[key] ?? [];
    return aliases.length
      ? getModeTriggers(this.config, key).map(displayTrigger).join(', ')
      : this.config[key];
  }

  protected createTriggerSettings(
    key: TriggerSettingKey,
    name: string,
    desc: string,
    placeholder: string,
  ): SettingDefinitionItem<SettingsControlKey>[] {
    const { config, mainSettingsTab } = this;
    const entries = () => config.triggerAliases[key] ?? [];
    const commit = (next: string[]) => {
      const aliases = { ...config.triggerAliases };
      if (next.length) aliases[key] = next;
      else delete aliases[key];
      config.triggerAliases = aliases;
      config.save();
      mainSettingsTab.update();
    };
    const edit = (index?: number) => {
      openListEntryModal(this.app, {
        title: index === undefined ? 'Add trigger' : 'Edit trigger',
        desc: 'One trigger per entry. Spaces are preserved and shown as ␠.',
        initialValue: index === undefined ? undefined : entries()[index],
        placeholder: 'e.g. 》',
        validate: (value) => validateModeTrigger(config, key, value, index ?? -1),
        preview: (value) => `Trigger: ${displayTrigger(value) || '(empty)'}`,
        onSubmit: (value) => {
          const next = [...entries()];
          if (index === undefined) next.push(value);
          else next[index] = value;
          commit(next);
        },
      });
    };

    return [
      {
        name,
        desc,
        control: {
          type: 'text',
          key,
          placeholder,
          validate: (value) => validateModeTrigger(config, key, value, 'primary'),
        },
      },
      {
        type: 'page',
        name: key.includes('ActiveEditor')
          ? 'Additional triggers — active editor'
          : 'Additional triggers',
        desc: 'Optional alternatives for this mode. Add, edit or remove one at a time.',
        displayValue: () =>
          entries().length
            ? getModeTriggers(config, key).map(displayTrigger).join(', ')
            : displayTrigger(config[key]),
        items: [
          {
            name: `Primary trigger: ${displayTrigger(config[key])}`,
            desc: 'Additional triggers open the same mode. The primary trigger is used by launch commands. ␠ means a space.',
          },
          {
            type: 'list',
            heading: 'Additional triggers',
            emptyState: 'No additional triggers. Use + to add one.',
            addItem: { name: 'Add trigger', action: () => edit() },
            onDelete: (index) => commit(entries().filter((_entry, i) => i !== index)),
            items: entries().map((entry, index) => ({
              name: displayTrigger(entry),
              desc: validateModeTrigger(config, key, entry, index),
              searchable: false,
              action: () => edit(index),
            })),
          },
        ],
      },
    ];
  }
}
