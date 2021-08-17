import { TFile } from 'obsidian';
import { AliasSuggestion, FileSuggestion, UnresolvedSuggestion } from 'src/types';
import {
  filenameFromPath,
  stripMDExtensionFromPath,
  isSystemSuggestion,
} from 'src/utils';

describe('utils', () => {
  describe('isSystemSuggestion', () => {
    it('should return true for FileSuggestion', () => {
      const sugg: FileSuggestion = {
        file: null,
        type: 'file',
        match: null,
      };

      const result = isSystemSuggestion(sugg);
      expect(result).toBe(true);
    });

    it('should return true for UnresolvedSuggestion', () => {
      const sugg: UnresolvedSuggestion = {
        linktext: null,
        type: 'unresolved',
        match: null,
      };

      const result = isSystemSuggestion(sugg);
      expect(result).toBe(true);
    });

    it('should return true for AliasSuggestion', () => {
      const sugg: AliasSuggestion = {
        alias: null,
        file: null,
        type: 'alias',
        match: null,
      };

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
});
