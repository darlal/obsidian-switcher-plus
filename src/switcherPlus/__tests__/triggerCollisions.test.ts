import { mock } from 'jest-mock-extended';
import { InputParser } from '../inputParser';
import { CommandDefinition } from '../commandDefinitions';
import { HandlerRegistry } from '../handlerRegistry';
import { SwitcherPlusSettings } from 'src/settings';

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

describe('folded trigger collisions', () => {
  test.each([false, true])(
    'prefers exact then canonical with reversed=%s',
    (reversed) => {
      const definitions = [definition('symbol', '》'), definition('command', '>')];
      const sut = parser(reversed ? definitions.reverse() : definitions);
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
      expect(sut.parse('》foo').resolvedCommands[0].cmdDef.commandId).toBe('chinese');
      expect(sut.parse('＞foo').resolvedCommands[0].cmdDef.commandId).toBe('fullwidth');
      expect(sut.parse('>foo').resolvedCommands[0].cmdDef.commandId).toBe(
        rev ? 'fullwidth' : 'chinese',
      );
    },
  );

  it('keeps first registration for byte-identical duplicates', () => {
    const sut = parser([definition('first', '>'), definition('second', '>')]);
    expect(sut.parse('>foo').resolvedCommands[0].cmdDef.commandId).toBe('first');
    expect(sut.parse('》foo').resolvedCommands[0].cmdDef.commandId).toBe('first');
  });

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
