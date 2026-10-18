import { mock } from 'jest-mock-extended';
import { InputParser } from '../inputParser';
import { CommandDefinition } from '../commandDefinitions';
import { HandlerRegistry } from '../handlerRegistry';
import { SwitcherPlusSettings } from 'src/settings';
import { analyzeTriggerConflicts } from 'src/utils/modeTriggers';

function definition(
  commandId: string,
  cmdStr: string,
  type: 'prefix' | 'sourced' = 'prefix',
): CommandDefinition {
  return mock<CommandDefinition>({
    commandId,
    parserCommand: { type, getCommandStr: () => cmdStr },
  });
}

function parser(definitions: CommandDefinition[], escapeCmdChar = '!'): InputParser {
  return new InputParser(
    mock<HandlerRegistry>(),
    mock<SwitcherPlusSettings>({ escapeCmdChar }),
    definitions,
  );
}

function conflictsFor(definitions: CommandDefinition[]) {
  return analyzeTriggerConflicts(
    definitions.map(({ commandId, parserCommand }) => ({
      key: commandId,
      name: commandId,
      cmdStr: parserCommand.getCommandStr(),
    })),
    '!',
  );
}

describe('folded trigger collisions', () => {
  test.each([
    ['!', '!>', '>', '!>foo', '>foo'],
    ['！', '!》', '>', '！》foo', '》foo'],
    ['!', '!>x', '>', '!>xfoo', '>xfoo'],
    ['!!', '！！》x', '＞', '！！》xfoo', '》xfoo'],
  ])(
    'warns consistently with escape precedence (%s, %s)',
    (escape, blocked, following, input, cleanInput) => {
      const definitions = [
        definition('symbol', blocked),
        definition('command', following),
      ];
      const result = parser(definitions, escape).parse(input);
      expect(result).toEqual({ cleanInput, resolvedCommands: [] });
      const conflicts = analyzeTriggerConflicts(
        definitions.map(({ commandId, parserCommand }) => ({
          key: commandId,
          name: commandId,
          cmdStr: parserCommand.getCommandStr(),
        })),
        escape,
      );
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].keys).toContain('symbol');
    },
  );

  test.each([['!>'], ['!x', '>']])(
    'keeps usable escape-prefixed trigger %s',
    (...commands) => {
      const sut = parser(commands.map((cmd, i) => definition(String(i), cmd)));
      expect(sut.parse(`${commands[0]}foo`).resolvedCommands[0].cmdDef.commandId).toBe(
        '0',
      );
    },
  );

  test.each([false, true])(
    'prefers exact then canonical with reversed=%s',
    (reversed) => {
      const definitions = [definition('symbol', '》'), definition('command', '>')];
      const sut = parser(reversed ? definitions.reverse() : definitions);
      expect(conflictsFor(definitions)).toEqual([]);
      for (const [input, commandId, cmdStr] of [
        ['>foo', 'command', '>'],
        ['》foo', 'symbol', '》'],
        ['＞foo', 'command', '>'],
      ]) {
        const result = sut.parse(input);
        expect(result.cleanInput).toBe(input);
        expect(result.resolvedCommands).toHaveLength(1);
        expect(result.resolvedCommands[0]).toEqual(
          expect.objectContaining({ cmdStr, filterText: 'foo', indexInCleanInput: 0 }),
        );
        expect(result.resolvedCommands[0].cmdDef.commandId).toBe(commandId);
      }
    },
  );

  test.each([false, true])(
    'uses stable fallback without canonical, reversed=%s',
    (rev) => {
      const definitions = [definition('chinese', '》'), definition('fullwidth', '＞')];
      const sut = parser(rev ? definitions.reverse() : definitions);
      const conflicts = conflictsFor(definitions);
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].keys).toEqual(definitions.map(({ commandId }) => commandId));
      expect(sut.parse('>foo').resolvedCommands[0].cmdDef.commandId).toBe(
        conflicts[0].keys[0],
      );
      expect(sut.parse('》foo').resolvedCommands[0].cmdDef.commandId).toBe('chinese');
      expect(sut.parse('＞foo').resolvedCommands[0].cmdDef.commandId).toBe('fullwidth');
      expect(sut.parse('>foo').resolvedCommands[0].cmdDef.commandId).toBe(
        rev ? 'fullwidth' : 'chinese',
      );
    },
  );

  test.each([false, true])(
    'reports duplicate groups consistent with registration order, reversed=%s',
    (reversed) => {
      const definitions = [definition('first', '>'), definition('second', '>')];
      if (reversed) definitions.reverse();
      const conflicts = conflictsFor(definitions);
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].keys).toEqual(definitions.map(({ commandId }) => commandId));
      const sut = parser(definitions);
      for (const input of ['>foo', '》foo']) {
        expect(sut.parse(input).resolvedCommands[0].cmdDef.commandId).toBe(
          conflicts[0].keys[0],
        );
      }
    },
  );

  it('keeps longest-folded priority over a shorter exact match', () => {
    const sut = parser([
      definition('short', '>'),
      definition('long', '》》'),
      definition('unmatched', '>x'),
    ]);
    const result = sut.parse('>＞foo');
    expect(result.resolvedCommands[0].cmdDef.commandId).toBe('long');
    expect(result.resolvedCommands[0].cmdStr).toBe('》》');
    expect(result.resolvedCommands[0].filterText).toBe('foo');
    expect(result.cleanInput).toBe('>＞foo');
    expect(sut.parse('>foo').resolvedCommands[0].cmdDef.commandId).toBe('short');
  });

  it('stops before a shorter candidate after finding the longest fallback', () => {
    const sut = parser([definition('long', '>>'), definition('short', '>')]);
    expect(sut.parse('>》foo').resolvedCommands[0].cmdDef.commandId).toBe('long');
  });

  it('continues past same-length nonmatches while retaining a folded fallback', () => {
    const sut = parser([
      definition('long', '>>'),
      definition('different', '>x'),
      definition('exact', '》》'),
    ]);
    expect(sut.parse('》》foo').resolvedCommands[0].cmdDef.commandId).toBe('exact');
    expect(sut.parse('＞＞foo').resolvedCommands[0].cmdDef.commandId).toBe('long');
    expect(sut.parse('>y').resolvedCommands).toEqual([]);
  });

  it('uses the same longest rule for escapes and preserves source-command offsets', () => {
    const sut = parser([
      definition('canonical', '> ', 'sourced'),
      definition('exact', '》 ', 'sourced'),
    ]);
    const result = sut.parse('💩！》\u3000foo ＞\u3000bar');
    expect(result.cleanInput).toBe('💩》\u3000foo ＞\u3000bar');
    expect(result.resolvedCommands).toHaveLength(1);
    expect(result.resolvedCommands[0]).toEqual(
      expect.objectContaining({ cmdStr: '> ', filterText: 'bar', indexInCleanInput: 8 }),
    );
  });

  it('preserves escape precedence when the escape and a trigger fold together', () => {
    const sut = parser([definition('symbol', '》'), definition('heading', '#')], '>');
    expect(sut.parse('》#foo')).toEqual({ cleanInput: '#foo', resolvedCommands: [] });
    // With no following command, the trigger still works; the warning must not
    // claim that every input using this trigger is unreachable.
    expect(sut.parse('》foo').resolvedCommands[0].cmdDef.commandId).toBe('symbol');
  });
});
