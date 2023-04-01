import { TFile } from 'obsidian';
import { LinkType } from 'src/types';
import {
  filenameFromPath,
  stripMDExtensionFromPath,
  isSystemSuggestion,
  matcherFnForRegExList,
  getLinkType,
} from 'src/utils';
import {
  makeAliasSuggestion,
  makeFileSuggestion,
  makeLink,
  makeUnresolvedSuggestion,
} from '@fixtures';

describe('utils', () => {
  describe('isSystemSuggestion', () => {
    it('should return true for FileSuggestion', () => {
      const sugg = makeFileSuggestion();

      const result = isSystemSuggestion(sugg);
      expect(result).toBe(true);
    });

    it('should return true for UnresolvedSuggestion', () => {
      const sugg = makeUnresolvedSuggestion();

      const result = isSystemSuggestion(sugg);
      expect(result).toBe(true);
    });

    it('should return true for AliasSuggestion', () => {
      const sugg = makeAliasSuggestion();

      const result = isSystemSuggestion(sugg);
      expect(result).toBe(true);
    });
  });

  describe('stripMDExtensionFromPath', () => {
    it('should return null on falsy input', () => {
      const result = stripMDExtensionFromPath(null);
      expect(result).toBe(null);
    });

    it('should return full path if input does not have md extension', () => {
      const file = new TFile();
      file.path = 'path/to/foo.bar';
      file.extension = 'bar';

      const result = stripMDExtensionFromPath(file);
      expect(result).toBe(file.path);
    });

    it('should strip the md extension', () => {
      const file = new TFile();
      file.path = 'path/to/foo.md';
      file.extension = 'md';

      const result = stripMDExtensionFromPath(file);
      expect(result).toBe('path/to/foo');
    });

    it('should not strip md if it is a dot file', () => {
      const file = new TFile();
      file.path = '.md';
      file.extension = 'md';

      const result = stripMDExtensionFromPath(file);
      expect(result).toBe(file.path);
    });
  });

  describe('filenameFromPath', () => {
    it('should return null with falsy input', () => {
      const result = filenameFromPath(null);
      expect(result).toBe(null);
    });

    it('should return input when there is no path delimiter', () => {
      const input = 'foo.bar';
      const result = filenameFromPath(input);
      expect(result).toBe(input);
    });

    it('should return leaf segment when there is a path delimiter', () => {
      const leaf = 'foo';
      const result = filenameFromPath(`path/to/${leaf}`);
      expect(result).toBe(leaf);
    });
  });

  describe('matcherFnForRegExList', () => {
    it('should not throw on falsy input', () => {
      expect(() => matcherFnForRegExList(null)).not.toThrow();
      expect(matcherFnForRegExList(null)).toBeInstanceOf(Function);
    });

    it('should log invalid regex strings to the console', () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockReturnValueOnce();

      matcherFnForRegExList(['*']); // invalid regex

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Switcher++: error creating RegExp from string:'),
        expect.any(Error),
      );

      consoleLogSpy.mockRestore();
    });

    test('that matcher function does not throw on falsy input', () => {
      const fn = matcherFnForRegExList(null);
      expect(() => fn(null)).not.toThrow();
      expect(fn(null)).toBe(false);
      expect(fn('')).toBe(false);
    });

    test('that matcher function returns true for any match', () => {
      const list = ['foo', 'bar', 'baz$'];
      const fn = matcherFnForRegExList(list);

      expect(fn('Lorem ipsum dolor baz')).toBe(true);
    });

    test('that matcher function returns false when there are no matches', () => {
      const list = ['foo', 'bar', 'baz$'];
      const fn = matcherFnForRegExList(list);

      expect(fn('Lorem ipsum dolor')).toBe(false);
    });
  });

  describe('getLinkType', () => {
    it('should not throw on falsy input', () => {
      expect(() => getLinkType(null)).not.toThrow();
      expect(getLinkType(null)).toBe(LinkType.None);
    });

    it('shoud parse as normal link', () => {
      const link = makeLink('foo', '[[foo]]');
      expect(getLinkType(link)).toBe(LinkType.Normal);

      const withDisplayText = makeLink('foo|bar', '[[foo|bar]]', 'bar');
      expect(getLinkType(withDisplayText)).toBe(LinkType.Normal);
    });

    it('should parse as block link', () => {
      const link = makeLink('foo#^bar', '[[foo#^bar]]');
      expect(getLinkType(link)).toBe(LinkType.Block);
    });

    it('should parse as header link', () => {
      const link = makeLink('foo#bar', '[[foo#bar]]');
      expect(getLinkType(link)).toBe(LinkType.Heading);
    });
  });
});
