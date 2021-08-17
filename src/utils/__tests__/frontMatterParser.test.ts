import { FrontMatterCache } from 'obsidian';
import { FrontMatterParser } from 'src/utils';

describe('FrontMatterParser', () => {
  describe('getAliases', () => {
    it('should return empty array with falsy input', () => {
      const results = FrontMatterParser.getAliases(null);

      expect(results).toBeInstanceOf(Array);
      expect(results).toHaveLength(0);
    });

    it('should return empty array with missing key', () => {
      const fm: FrontMatterCache = {
        position: null,
      };

      const results = FrontMatterParser.getAliases(fm);

      expect(results).toBeInstanceOf(Array);
      expect(results).toHaveLength(0);
    });

    it('should parse alias key', () => {
      const fm: FrontMatterCache = {
        alias: 'foo',
        position: null,
      };

      const results = FrontMatterParser.getAliases(fm);

      expect(results).toBeInstanceOf(Array);
      expect(results).toHaveLength(1);
      expect(results[0]).toBe('foo');
    });

    it('should parse aliases key', () => {
      const fm: FrontMatterCache = {
        aliases: 'foo',
        position: null,
      };

      const results = FrontMatterParser.getAliases(fm);

      expect(results).toBeInstanceOf(Array);
      expect(results).toHaveLength(1);
      expect(results[0]).toBe('foo');
    });

    it('should parse string values', () => {
      const fm: FrontMatterCache = {
        aliases: 'one, two ,three',
        position: null,
      };

      const results = FrontMatterParser.getAliases(fm);

      expect(results).toBeInstanceOf(Array);
      expect(results).toHaveLength(3);
      expect(results).toEqual((fm.aliases as string).split(',').map((val) => val.trim()));
    });

    it('should parse array values', () => {
      const fm: FrontMatterCache = {
        aliases: ['one', 'two   ', 'three'],
        position: null,
      };

      const results = FrontMatterParser.getAliases(fm);

      expect(results).toBeInstanceOf(Array);
      expect(results).toHaveLength(3);
      expect(results).toEqual((fm.aliases as string[]).map((val) => val.trim()));
    });

    it('should ignore non-string/non-array values', () => {
      const fm: FrontMatterCache = {
        aliases: {},
        position: null,
      };

      const results = FrontMatterParser.getAliases(fm);

      expect(results).toBeInstanceOf(Array);
      expect(results).toHaveLength(0);
    });

    it('should ignore nested non-string values', () => {
      const fm: FrontMatterCache = {
        aliases: ['one', ['two'], 'three'],
        position: null,
      };

      const results = FrontMatterParser.getAliases(fm);

      expect(results).toBeInstanceOf(Array);
      expect(results).toHaveLength(2);
      expect(results).toEqual(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (fm.aliases as any[]).filter((val) => typeof val === 'string'),
      );
    });
  });
});
