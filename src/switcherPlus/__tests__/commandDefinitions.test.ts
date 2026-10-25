import { Chance } from 'chance';
import { SwitcherPlusSettings } from 'src/settings';
import { getCommandDefinitions } from '../commandDefinitions';

const chance = new Chance();

describe('getCommandDefinitions', () => {
  let config: SwitcherPlusSettings;

  beforeEach(() => {
    config = new SwitcherPlusSettings(null);
  });

  it('should map each trigger command to its settings key and settings row name', () => {
    const definitions = getCommandDefinitions(config);

    const triggers = definitions
      .filter(({ parserCommand }) => parserCommand.type !== 'none')
      .map(({ commandId, parserCommand }) => [
        commandId,
        parserCommand.settingsTriggerKey,
        parserCommand.settingsTriggerName,
      ]);

    expect(triggers).toEqual([
      ['switcher-plus:open-editors', 'editorListCommand', 'Editor list mode trigger'],
      ['switcher-plus:open-symbols', 'symbolListCommand', 'Symbol list mode trigger'],
      [
        'switcher-plus:open-symbols-active',
        'symbolListActiveEditorCommand',
        'Symbol list mode trigger - Active editor only',
      ],
      [
        'switcher-plus:open-workspaces',
        'workspaceListCommand',
        'Workspace list mode trigger',
      ],
      [
        'switcher-plus:open-headings',
        'headingsListCommand',
        'Headings list mode trigger',
      ],
      [
        'switcher-plus:open-starred',
        'bookmarksListCommand',
        'Bookmarks list mode trigger',
      ],
      ['switcher-plus:open-commands', 'commandListCommand', 'Command list mode trigger'],
      [
        'switcher-plus:open-related-items',
        'relatedItemsListCommand',
        'Related Items list mode trigger',
      ],
      [
        'switcher-plus:open-related-items-active',
        'relatedItemsListActiveEditorCommand',
        'Related Items list mode trigger - Active editor only',
      ],
      ['switcher-plus:open-vaults', 'vaultListCommand', 'Vault list mode trigger'],
    ]);
  });

  it('should read the trigger from its settings key each time it is asked', () => {
    const definitions = getCommandDefinitions(config).filter(
      ({ parserCommand }) => parserCommand.settingsTriggerKey,
    );
    const expected = definitions.map(() => chance.string({ length: 8 }));

    definitions.forEach(({ parserCommand }, i) => {
      config[parserCommand.settingsTriggerKey] = expected[i];
    });

    expect(definitions.map(({ parserCommand }) => parserCommand.getCommandStr())).toEqual(
      expected,
    );
  });

  it('should give Standard mode no trigger', () => {
    const standard = getCommandDefinitions(config).find(
      ({ commandId }) => commandId === 'switcher-plus:open',
    );

    expect(standard.parserCommand).not.toHaveProperty('settingsTriggerKey');
    expect(standard.parserCommand).not.toHaveProperty('settingsTriggerName');
    expect(standard.parserCommand.getCommandStr()).toBe('');
  });
});
