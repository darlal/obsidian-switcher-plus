import {
  analyzeTriggerConflicts,
  describeTriggerConflict,
  foldTriggerString,
  getConfiguredTriggers,
  isTriggerSettingKey,
  prepareTriggers,
  TriggerDefinition,
} from '../modeTriggers';
import { SwitcherPlusSettings } from 'src/settings';
import { getCommandDefinitions } from 'src/switcherPlus/commandDefinitions';

const trigger = (key: string, cmdStr: string): TriggerDefinition => ({
  key,
  name: `${key} mode`,
  cmdStr,
});

describe('mode trigger analysis', () => {
  test.each([
    ['》＞＃＠！￥¥‘’', ">>#@!$$''"],
    ['＄\u3000', '$ '],
    ['…💩👨‍👩‍👧‍👦', '…💩👨‍👩‍👧‍👦'],
    ['', ''],
  ])('folds %s without changing code unit length', (raw, expected) => {
    expect(foldTriggerString(raw)).toBe(expected);
    expect(foldTriggerString(raw)).toHaveLength(raw.length);
  });

  it('sorts longest first, canonical first and otherwise stably without mutation', () => {
    const entries = [
      trigger('noncanonical', '》'),
      trigger('first', '>'),
      trigger('empty', ''),
      trigger('long', '》》'),
      trigger('second', '>'),
      trigger('variant', '＞'),
    ];
    expect(prepareTriggers(entries).map(({ key }) => key)).toEqual([
      'long',
      'first',
      'second',
      'noncanonical',
      'variant',
    ]);
    expect(entries[0].key).toBe('noncanonical');
    expect(entries[0]).not.toHaveProperty('foldedCmdStr');
  });

  it('should list a trigger for every command with a settings trigger, in registration order', () => {
    const definitions = getCommandDefinitions(new SwitcherPlusSettings(null));

    const triggers = getConfiguredTriggers(definitions);

    expect(triggers.map(({ key, name }) => [key, name])).toEqual(
      definitions
        .filter(({ parserCommand }) => parserCommand.settingsTriggerKey)
        .map(({ parserCommand }) => [
          parserCommand.settingsTriggerKey,
          parserCommand.settingsTriggerName,
        ]),
    );
  });

  it('should read each trigger value when called, not when the definitions were built', () => {
    const config = new SwitcherPlusSettings(null);
    const definitions = getCommandDefinitions(config);
    config.symbolListCommand = '%';

    const triggers = getConfiguredTriggers(definitions);

    expect(triggers.find(({ key }) => key === 'symbolListCommand').cmdStr).toBe('%');
  });

  it('should report no conflicts for the default configuration', () => {
    const config = new SwitcherPlusSettings(null);

    const conflicts = analyzeTriggerConflicts(
      getConfiguredTriggers(getCommandDefinitions(config)),
      config.escapeCmdChar,
    );

    expect(conflicts).toEqual([]);
  });

  test.each(['symbolListCommand', 'symbolListActiveEditorCommand', 'escapeCmdChar'])(
    'recognizes trigger setting %s',
    (key) => {
      const definitions = getCommandDefinitions(new SwitcherPlusSettings(null));

      expect(isTriggerSettingKey(key, definitions)).toBe(true);
    },
  );

  it('does not treat unrelated settings as trigger settings', () => {
    const definitions = getCommandDefinitions(new SwitcherPlusSettings(null));

    expect(isTriggerSettingKey('maxRecentCommands', definitions)).toBe(false);
  });

  it('does not warn about canonical groups, ordinary prefixes or empty triggers', () => {
    expect(
      analyzeTriggerConflicts(
        [trigger('a', '》'), trigger('b', '>'), trigger('c', '>>'), trigger('d', '')],
        '!',
      ),
    ).toEqual([]);
    expect(analyzeTriggerConflicts([trigger('a', '》')], '')).toEqual([]);
  });

  it('reports identical triggers, including distinct behaviors within one mode', () => {
    const conflicts = analyzeTriggerConflicts(
      [trigger('symbols', '@'), trigger('activeSymbols', '@')],
      '!',
    );
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].keys).toEqual(['symbols', 'activeSymbols']);
    expect(describeTriggerConflict(conflicts[0])).toContain(
      'symbols mode "@" wins by registration order',
    );
    expect(describeTriggerConflict(conflicts[0])).toContain('activeSymbols mode "@"');
  });

  it('warns only for duplicate original spellings when a canonical member exists', () => {
    const conflicts = analyzeTriggerConflicts(
      [trigger('a', '》'), trigger('b', '>'), trigger('c', '》'), trigger('d', '>')],
      '!',
    );
    expect(conflicts.map(({ keys }) => keys)).toEqual([
      ['b', 'd'],
      ['a', 'c'],
    ]);
    expect(
      conflicts.every((conflict) =>
        describeTriggerConflict(conflict).includes('same trigger'),
      ),
    ).toBe(true);
  });

  it('warns about fallback ambiguity without a canonical member', () => {
    const entries = [trigger('a', '》'), trigger('b', '＞')];
    const conflicts = analyzeTriggerConflicts(entries, '!');
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].keys).toEqual(['a', 'b']);
    expect(describeTriggerConflict(conflicts[0])).toContain(
      'Exact spellings work separately',
    );
    expect(describeTriggerConflict(conflicts[0])).toContain(
      'a mode "》" by registration order',
    );
    expect(describeTriggerConflict(conflicts[0])).toContain('Configure ">"');
    expect(analyzeTriggerConflicts(entries, '!')).toEqual(conflicts);
    const reversed = analyzeTriggerConflicts([...entries].reverse(), '!');
    expect(describeTriggerConflict(reversed[0])).toContain(
      'b mode "＞" by registration order',
    );
  });

  it('reports both a duplicate spelling and an ambiguous fallback when needed', () => {
    expect(
      analyzeTriggerConflicts(
        [trigger('a', '》'), trigger('b', '》'), trigger('c', '＞')],
        '!',
      ),
    ).toHaveLength(2);
    expect(
      analyzeTriggerConflicts([trigger('a', '》'), trigger('b', '》')], '!'),
    ).toHaveLength(1);
  });

  it('includes escape variants and shows significant spaces clearly', () => {
    const conflicts = analyzeTriggerConflicts(
      [trigger('a', '》 '), trigger('b', '> ')],
      '＞\u3000',
    );
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].keys).toEqual(['escapeCmdChar', 'b', 'a']);
    expect(describeTriggerConflict(conflicts[0])).toContain('escape character');
    expect(describeTriggerConflict(conflicts[0])).toContain('>␠');
    expect(describeTriggerConflict(conflicts[0])).toContain(
      'when followed by a mode trigger',
    );
  });

  it('reports escape conflicts alongside duplicate and fallback conflicts', () => {
    expect(
      analyzeTriggerConflicts([trigger('a', '!'), trigger('b', '!')], '！'),
    ).toHaveLength(2);
    expect(
      analyzeTriggerConflicts([trigger('a', '》'), trigger('b', '＞')], '>'),
    ).toHaveLength(2);
  });

  test.each([
    ['!', '!>', '>'],
    ['！', '!》', '>'],
    ['!', '!>x', '>'],
    ['!!', '！！》x', '＞'],
  ])('warns when escape %s masks trigger %s before %s', (escape, blocked, following) => {
    const conflicts = analyzeTriggerConflicts(
      [trigger('symbol', blocked), trigger('command', following)],
      escape,
    );
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].keys).toEqual(['escapeCmdChar', 'symbol', 'command']);
    expect(describeTriggerConflict(conflicts[0])).toContain('Escape processing consumes');
    expect(describeTriggerConflict(conflicts[0])).toContain('symbol mode');
    expect(conflicts[0].kind).toBe('escape-prefix');
  });

  test.each([
    ['!', ['!>']],
    ['!', ['!x', '>']],
    ['', ['!>', '>']],
  ])('does not warn for usable escape-prefixed triggers (%s, %s)', (escape, commands) => {
    expect(
      analyzeTriggerConflicts(
        commands.map((cmd, i) => trigger(String(i), cmd)),
        escape,
      ),
    ).toEqual([]);
  });

  it('reports the longest escaped group and all its variants', () => {
    const conflicts = analyzeTriggerConflicts(
      [
        trigger('symbol', '!>>x'),
        trigger('short', '>'),
        trigger('long', '>>'),
        trigger('variant', '》》'),
      ],
      '!',
    );
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].keys).toEqual(['escapeCmdChar', 'symbol', 'long', 'variant']);
  });
});

describe('describeTriggerConflict', () => {
  it('should describe a duplicate conflict', () => {
    const [conflict] = analyzeTriggerConflicts(
      [trigger('symbols', '@'), trigger('activeSymbols', '@')],
      '!',
    );

    expect(describeTriggerConflict(conflict)).toBe(
      'symbols mode "@" and activeSymbols mode "@" use the same trigger. symbols mode "@" wins by registration order. Choose different triggers.',
    );
  });

  it('should describe a folded conflict', () => {
    const [conflict] = analyzeTriggerConflicts(
      [trigger('a', '》'), trigger('b', '＞')],
      '!',
    );

    expect(describeTriggerConflict(conflict)).toBe(
      'a mode "》" and b mode "＞" share IME variants. Exact spellings work separately, but other variants select a mode "》" by registration order. Configure ">" on one of these behaviors for a predictable fallback.',
    );
  });

  it('should describe an escape conflict', () => {
    const [conflict] = analyzeTriggerConflicts(
      [trigger('a', '!'), trigger('b', 'x')],
      '！',
    );

    expect(describeTriggerConflict(conflict)).toBe(
      'a mode "!" share the escape character "！" or its IME variants. Escape processing takes priority when followed by a mode trigger. Choose a different escape character or mode trigger.',
    );
  });

  it('should describe an escape-prefix conflict', () => {
    const [conflict] = analyzeTriggerConflicts(
      [trigger('symbol', '!>'), trigger('command', '>')],
      '!',
    );

    expect(describeTriggerConflict(conflict)).toBe(
      'symbol mode "!>" begin with the escape character "!" followed by command mode ">" or its IME variants. Escape processing consumes this prefix before the full trigger can match. Choose a different escape character or mode trigger.',
    );
  });

  it('should show significant spaces in quoted triggers', () => {
    const [conflict] = analyzeTriggerConflicts(
      [trigger('a', '$ '), trigger('b', '$ ')],
      '!',
    );

    expect(describeTriggerConflict(conflict)).toContain('a mode "$␠"');
  });

  test.each([
    { kind: 'duplicate', triggers: [trigger('a', '@'), trigger('b', '@')], escape: '!' },
    { kind: 'folded', triggers: [trigger('a', '》'), trigger('b', '＞')], escape: '!' },
    { kind: 'escape', triggers: [trigger('a', '!')], escape: '！' },
    {
      kind: 'escape-prefix',
      triggers: [trigger('a', '!>'), trigger('b', '>')],
      escape: '!',
    },
  ])('should report a $kind conflict as kind $kind', ({ kind, triggers, escape }) => {
    const conflicts = analyzeTriggerConflicts(triggers, escape);

    expect(conflicts.map((conflict) => conflict.kind)).toEqual([kind]);
  });
});
