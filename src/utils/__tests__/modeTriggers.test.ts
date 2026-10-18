import {
  analyzeTriggerConflicts,
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

  it('keeps configured metadata in actual command registration order', () => {
    const config = new SwitcherPlusSettings(null);
    expect(getConfiguredTriggers(config).map(({ cmdStr }) => cmdStr)).toEqual(
      getCommandDefinitions(config)
        .filter(({ parserCommand }) => parserCommand.type !== 'none')
        .map(({ parserCommand }) => parserCommand.getCommandStr()),
    );
    expect(analyzeTriggerConflicts(getConfiguredTriggers(config), '!')).toEqual([]);
  });

  test.each(['symbolListCommand', 'symbolListActiveEditorCommand', 'escapeCmdChar'])(
    'recognizes trigger setting %s',
    (key) => {
      expect(isTriggerSettingKey(key)).toBe(true);
    },
  );

  it('does not treat unrelated settings as trigger settings', () => {
    expect(isTriggerSettingKey('maxRecentCommands')).toBe(false);
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
    expect(conflicts[0].message).toContain('symbols mode "@" wins by registration order');
    expect(conflicts[0].message).toContain('activeSymbols mode "@"');
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
    expect(conflicts.every(({ message }) => message.includes('same trigger'))).toBe(true);
  });

  it('warns about fallback ambiguity without a canonical member', () => {
    const entries = [trigger('a', '》'), trigger('b', '＞')];
    const conflicts = analyzeTriggerConflicts(entries, '!');
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].keys).toEqual(['a', 'b']);
    expect(conflicts[0].message).toContain('Exact spellings work separately');
    expect(conflicts[0].message).toContain('a mode "》" by registration order');
    expect(conflicts[0].message).toContain('Configure ">"');
    expect(analyzeTriggerConflicts(entries, '!')).toEqual(conflicts);
    const reversed = analyzeTriggerConflicts([...entries].reverse(), '!');
    expect(reversed[0].message).toContain('b mode "＞" by registration order');
    expect(reversed[0].id).not.toBe(conflicts[0].id);
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
    expect(conflicts[0].message).toContain('escape character');
    expect(conflicts[0].message).toContain('>␠');
    expect(conflicts[0].message).toContain('when followed by a mode trigger');
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
    expect(conflicts[0].message).toContain('Escape processing consumes');
    expect(conflicts[0].message).toContain('symbol mode');
    expect(conflicts[0].id).toContain('escape-prefix');
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
