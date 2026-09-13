import { SettingDefinition, SettingDefinitionItem } from 'obsidian';
import {
  findListByHeading,
  findSettingByKey,
  findSettingByName,
  flattenSettingDefinitions,
  isSettingVisible,
} from '@fixtures';
import { SettingsControlKey } from 'src/settings';

// The other fixtures are pure builders, so the tests that consume them cover
// every line ambiently and need no tests of their own. This fixture is the
// different, it has logic and branches that a passing suite can never reach.
describe('settingDefinition fixture', () => {
  // A definition tree that exercises every nesting level the settings sections
  // produce: top level control, page wrapper, and a group inside that page.
  const makeDefinitions = (): SettingDefinitionItem<SettingsControlKey>[] => [
    {
      name: 'Top level toggle',
      control: { type: 'toggle', key: 'onOpenPreferNewTab' },
    },
    {
      type: 'page',
      name: 'Symbol List Mode',
      items: [
        {
          name: 'Symbol list mode trigger',
          control: { type: 'text', key: 'symbolListCommand' },
        },
        {
          type: 'group',
          heading: 'Links',
          items: [
            { name: 'Show Links', render: () => undefined },
            {
              name: 'Nested toggle',
              control: { type: 'toggle', key: 'alwaysNewTabForSymbols' },
            },
          ],
        },
      ],
    },
    {
      type: 'list',
      heading: 'Exclude folders',
      emptyState: 'No folders excluded.',
      items: [{ name: '^Archive', searchable: false }],
    },
  ];

  describe('flattenSettingDefinitions', () => {
    it('should return the leaf settings from every nesting level', () => {
      const result = flattenSettingDefinitions(makeDefinitions());

      expect(result.map((item) => item.name)).toEqual([
        'Top level toggle',
        'Symbol list mode trigger',
        'Show Links',
        'Nested toggle',
        '^Archive',
      ]);
    });

    it('should not return the page and group containers themselves', () => {
      const result = flattenSettingDefinitions(makeDefinitions());

      expect(result).toHaveLength(5);
    });
  });

  describe('findSettingByKey', () => {
    it('should return a control nested inside a group inside a page', () => {
      const result = findSettingByKey(makeDefinitions(), 'alwaysNewTabForSymbols');

      expect(result.name).toBe('Nested toggle');
    });

    it('should throw naming the key and the available keys when absent', () => {
      expect(() => findSettingByKey(makeDefinitions(), 'excludeFolders')).toThrow(
        /excludeFolders.*onOpenPreferNewTab/s,
      );
    });

    it('should throw when more than one control binds the same key', () => {
      const definitions = makeDefinitions();
      definitions.push({
        name: 'Duplicate toggle',
        control: { type: 'toggle', key: 'onOpenPreferNewTab' },
      });

      expect(() => findSettingByKey(definitions, 'onOpenPreferNewTab')).toThrow(
        /found 2/,
      );
    });
  });

  describe('findSettingByName', () => {
    it('should return a render row nested inside a group inside a page', () => {
      const result = findSettingByName(makeDefinitions(), 'Show Links');

      expect(result.render).toEqual(expect.any(Function));
    });

    it('should throw naming the name and the available names when absent', () => {
      expect(() => findSettingByName(makeDefinitions(), 'Show Tags')).toThrow(
        /Show Tags.*Top level toggle/s,
      );
    });
  });

  describe('findListByHeading', () => {
    it('should return the list carrying that heading', () => {
      const result = findListByHeading(makeDefinitions(), 'Exclude folders');

      expect(result.emptyState).toBe('No folders excluded.');
    });

    it('should throw naming the heading and the available headings when absent', () => {
      expect(() => findListByHeading(makeDefinitions(), 'Excluded tags')).toThrow(
        /Excluded tags.*Exclude folders/s,
      );
    });
  });

  describe('isSettingVisible', () => {
    it('should return the result of the predicate when visible is a function', () => {
      const item: SettingDefinition<SettingsControlKey> = {
        name: 'Predicate row',
        visible: () => false,
      };

      expect(isSettingVisible(item)).toBe(false);
    });

    it('should return the value itself when visible is a static boolean', () => {
      const item: SettingDefinition<SettingsControlKey> = {
        name: 'Static row',
        visible: false,
      };

      expect(isSettingVisible(item)).toBe(false);
    });

    it('should return true when visible is omitted', () => {
      const item: SettingDefinition<SettingsControlKey> = { name: 'Default row' };

      expect(isSettingVisible(item)).toBe(true);
    });
  });
});
