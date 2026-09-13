import {
  SettingDefinition,
  SettingDefinitionControl,
  SettingDefinitionItem,
  SettingDefinitionList,
} from 'obsidian';
import { SettingsControlKey } from 'src/settings';

type Definitions = SettingDefinitionItem<SettingsControlKey>[];
type Leaf = SettingDefinition<SettingsControlKey>;
type Control = SettingDefinitionControl<SettingsControlKey>;
type List = SettingDefinitionList<SettingsControlKey>;

/**
 * Groups, lists, and pages are the only definition kinds that carry child
 * items, so the presence of an items array identifies a container.
 */
function isContainer(
  item: Definitions[number],
): item is Definitions[number] & { items: Definitions } {
  return Array.isArray((item as { items?: Definitions }).items);
}

/**
 * Narrows a list of matches to exactly one, failing loudly otherwise. Tests
 * address settings by identity rather than position, so a miss means a rename
 * or a deletion.
 * @param  {T[]} matches
 * @param  {string} description what was searched for
 * @param  {string[]} available every identity present in the tree
 * @returns T the single match
 */
function expectExactlyOne<T>(matches: T[], description: string, available: string[]): T {
  if (matches.length !== 1) {
    throw new Error(
      `Expected exactly one setting with ${description}, found ${matches.length}. ` +
        `Available: ${available.join(', ')}`,
    );
  }

  return matches[0];
}

/**
 * Flattens a definition tree into its leaf settings, discarding the group,
 * list, and page containers that only exist to shape the rendered layout.
 * @param  {Definitions} items
 * @returns Leaf[] every setting in the tree, in depth first order
 */
export function flattenSettingDefinitions(items: Definitions): Leaf[] {
  return items.flatMap((item) =>
    isContainer(item) ? flattenSettingDefinitions(item.items) : [item as Leaf],
  );
}

/**
 * Locates a control setting by the config key it binds to, at any depth. The
 * key is the setting's durable identity, type checked against
 * SettingsControlKey and survives renames of the displayed text.
 * @param  {Definitions} items
 * @param  {SettingsControlKey} key
 * @returns Control
 */
export function findSettingByKey(items: Definitions, key: SettingsControlKey): Control {
  const settings = flattenSettingDefinitions(items);
  const matches = settings.filter((item) => (item as Control).control?.key === key);

  return expectExactlyOne(
    matches as Control[],
    `key "${key}"`,
    settings.map((item) => (item as Control).control?.key).filter(Boolean),
  );
}

/**
 * Collects every list in the tree, at any depth. Containers other than lists
 * are traversed so a list nested inside a page is still found.
 * @param  {Definitions} items
 * @returns List[] every list, in depth first order
 */
function collectLists(items: Definitions): List[] {
  return items.flatMap((item) => {
    if (!isContainer(item)) {
      return [];
    }

    const nested = collectLists(item.items);

    return (item as List).type === 'list' ? [item as List, ...nested] : nested;
  });
}

/**
 * Locates a list by its heading, at any depth. The heading is the list's own
 * durable identity, it also keys the framework's re-render reconciliation, so
 * addressing a list through it needs no positional lookup.
 * @param  {Definitions} items
 * @param  {string} heading
 * @returns List
 */
export function findListByHeading(items: Definitions, heading: string): List {
  const lists = collectLists(items);

  return expectExactlyOne(
    lists.filter((list) => list.heading === heading),
    `heading "${heading}"`,
    lists.map((list) => list.heading).filter(Boolean),
  );
}

/**
 * Locates a setting by its display name, at any depth. Render rows carry no
 * control key, so the name is the only identity available.
 * @param  {Definitions} items
 * @param  {string} name
 * @returns Leaf
 */
export function findSettingByName(items: Definitions, name: string): Leaf {
  const settings = flattenSettingDefinitions(items);

  return expectExactlyOne(
    settings.filter((item) => item.name === name),
    `name "${name}"`,
    settings.map((item) => item.name),
  );
}

/**
 * Resolves a control's visibility to a boolean. The API models `visible` as a
 * boolean, a predicate, or absent, so tests would otherwise repeat an unsafe
 * cast that turns a static or omitted value into a call time crash instead of
 * a readable assertion failure. Omitting `visible` means the setting shows.
 * @param  {Leaf} item
 * @returns boolean whether the setting is currently shown
 */
export function isSettingVisible(item: Leaf): boolean {
  const { visible } = item;

  if (typeof visible === 'function') {
    return visible();
  }

  return visible ?? true;
}
