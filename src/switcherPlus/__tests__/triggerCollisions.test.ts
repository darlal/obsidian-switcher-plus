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
      if (reversed) {
        definitions.reverse();
      }
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
});
