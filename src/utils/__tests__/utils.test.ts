import { FileManager, TFile, Vault, normalizePath, parseLinktext } from 'obsidian';
import {
  BookmarksSuggestion,
  LinkType,
  RelationType,
  SuggestionType,
  SymbolType,
} from 'src/types';
import {
  filenameFromPath,
  stripMDExtensionFromPath,
  isSystemSuggestion,
  matcherFnForRegExList,
  getLinkType,
  generateMarkdownLink,
  leafHasLoadedViewOfType,
  getTFileFromLeaf,
} from 'src/utils';
import {
  getTags,
  makeAliasSuggestion,
  makeBookmarkedFileSuggestion,
  makeBookmarksPluginFileItem,
  makeBookmarksPluginFolderItem,
  makeFileSuggestion,
  makeHeading,
  makeHeadingSuggestion,
  makeLeaf,
  makeLeafDeferred,
  makeLink,
  makeRelatedItemsSuggestion,
  makeSymbolSuggestion,
  makeUnresolvedSuggestion,
} from '@fixtures';
import { MockProxy, mock, mockClear, mockReset } from 'jest-mock-extended';
import { Chance } from 'chance';

const chance = new Chance();

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
    const mockNormalizePath = jest.mocked(normalizePath);

    beforeEach(() => {
      mockClear(mockNormalizePath);
    });

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

    it('should normalize paths', () => {
      const path = `path\\to\\filename.ext`;
      filenameFromPath(path);
      expect(mockNormalizePath).toHaveBeenCalledWith(path);
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

  describe('generateMarkdownLink', () => {
    const activeFile = new TFile();
    const activeFilePath = activeFile.path;
    const destFile = new TFile();
    const mockParseLinktext = jest.mocked<typeof parseLinktext>(parseLinktext);
    let mockFileManager: MockProxy<FileManager>;
    let mockVault: MockProxy<Vault>;

    beforeAll(() => {
      mockFileManager = mock<FileManager>();
      mockVault = mock<Vault>();
    });

    afterEach(() => {
      mockReset(mockFileManager);
      mockReset(mockVault);
      mockParseLinktext.mockClear();
    });

    it('should generate a link for Unresolved suggestions', () => {
      const dest = chance.word();
      const sugg = makeUnresolvedSuggestion(dest);

      const result = generateMarkdownLink(
        mockFileManager,
        mockVault,
        sugg,
        activeFilePath,
      );

      expect(mockFileManager.generateMarkdownLink).not.toHaveBeenCalled();
      expect(result).toBe(`[[${dest}]]`);
    });

    it('should generate a link for Alias suggestions', () => {
      const alias = chance.word();
      const sugg = makeAliasSuggestion(destFile, alias);

      generateMarkdownLink(mockFileManager, mockVault, sugg, activeFilePath);

      expect(mockFileManager.generateMarkdownLink).toHaveBeenCalledWith(
        destFile,
        activeFilePath,
        null,
        alias,
      );
    });

    it('should generate a link for File Bookmark suggestions', () => {
      const sugg = makeBookmarkedFileSuggestion({
        file: destFile,
        item: makeBookmarksPluginFileItem({ path: destFile.path }),
      });

      generateMarkdownLink(mockFileManager, mockVault, sugg, activeFilePath);

      expect(mockFileManager.generateMarkdownLink).toHaveBeenCalledWith(
        destFile,
        activeFilePath,
        null,
        destFile.basename,
      );
    });

    it('should generate a link for File Bookmark suggestions with the bookmark title as the link alias', () => {
      const title = chance.word();
      const sugg = makeBookmarkedFileSuggestion({
        file: destFile,
        item: makeBookmarksPluginFileItem({ path: destFile.path, title }),
      });

      generateMarkdownLink(mockFileManager, mockVault, sugg, activeFilePath);

      expect(mockFileManager.generateMarkdownLink).toHaveBeenCalledWith(
        destFile,
        activeFilePath,
        null,
        title,
      );
    });

    it('should not generate a link for non-file Bookmark suggestions', () => {
      const item = makeBookmarksPluginFolderItem();
      const sugg: BookmarksSuggestion = {
        type: SuggestionType.Bookmark,
        item,
        bookmarkPath: item.path,
        file: null,
        match: null,
      };

      const result = generateMarkdownLink(
        mockFileManager,
        mockVault,
        sugg,
        activeFilePath,
      );

      expect(result).toBeNull();
      expect(mockFileManager.generateMarkdownLink).not.toHaveBeenCalled();
    });

    it('should generate a link for Heading suggestions', () => {
      const heading = chance.sentence();
      const sugg = makeHeadingSuggestion(makeHeading(heading, 1), destFile);

      generateMarkdownLink(mockFileManager, mockVault, sugg, activeFilePath);

      expect(mockFileManager.generateMarkdownLink).toHaveBeenCalledWith(
        destFile,
        activeFilePath,
        `#${heading}`,
        heading,
      );
    });

    test('generated links for Heading subpath should not contain illegal link characters', () => {
      const illegalChar = ':#|^\\%%[[]]';
      const heading = `head ${illegalChar} tail`;
      const expectedLinkHeadingStr = 'head tail';
      const sugg = makeHeadingSuggestion(makeHeading(heading, 1), destFile);

      generateMarkdownLink(mockFileManager, mockVault, sugg, activeFilePath);

      expect(mockFileManager.generateMarkdownLink).toHaveBeenCalledWith(
        destFile,
        activeFilePath,
        `#${expectedLinkHeadingStr}`,
        expectedLinkHeadingStr,
      );
    });

    test('with useHeadingAsAlias disabled, it should generate a link for Heading suggestions with file basename as alias', () => {
      const heading = chance.sentence();
      const sugg = makeHeadingSuggestion(makeHeading(heading, 1), destFile);

      generateMarkdownLink(mockFileManager, mockVault, sugg, activeFilePath, {
        useHeadingAsAlias: false,
      });

      expect(mockFileManager.generateMarkdownLink).toHaveBeenCalledWith(
        destFile,
        activeFilePath,
        `#${heading}`,
        destFile.basename,
      );
    });

    test('with useBasenameAsAlias disabled, it should generate a link without an alias', () => {
      const sugg = makeFileSuggestion(destFile);

      generateMarkdownLink(mockFileManager, mockVault, sugg, activeFilePath, {
        useBasenameAsAlias: false,
      });

      expect(mockFileManager.generateMarkdownLink).toHaveBeenCalledWith(
        destFile,
        activeFilePath,
        null,
        null,
      );
    });

    it('should generate a link for heading Symbol suggestions that points directly to the heading in the destination file', () => {
      const heading = chance.sentence();
      const sugg = makeSymbolSuggestion(
        makeHeading(heading, 1),
        SymbolType.Heading,
        destFile,
      );

      generateMarkdownLink(mockFileManager, mockVault, sugg, activeFilePath);

      expect(mockFileManager.generateMarkdownLink).toHaveBeenCalledWith(
        destFile,
        activeFilePath,
        `#${heading}`,
        heading,
      );
    });

    it('should not generate a link for unsupported symbol types', () => {
      const sugg = makeSymbolSuggestion(getTags()[0], SymbolType.Tag, destFile);

      const result = generateMarkdownLink(
        mockFileManager,
        mockVault,
        sugg,
        activeFilePath,
      );

      expect(result).toBeNull();
      expect(mockFileManager.generateMarkdownLink).not.toHaveBeenCalled();
    });

    it('should generate a link for unresolved RelatedItems suggestions', () => {
      const dest = chance.word();
      const sugg = makeRelatedItemsSuggestion({
        relationType: RelationType.OutgoingLink,
        unresolvedText: dest,
        file: null,
      });

      const result = generateMarkdownLink(
        mockFileManager,
        mockVault,
        sugg,
        activeFilePath,
      );

      expect(result).toBe(`[[${dest}]]`);
    });

    it('should generate a link for block ReferenceCache that does not contain a file path', () => {
      const subpath = '#^8b7e5b';

      // link with no file path, in these cases, file path is assumed to be
      // the source file that contains/defines the ReferenceCache
      const refCache = makeLink(subpath, `[[${subpath}]]`);
      const sugg = makeSymbolSuggestion(refCache, SymbolType.Link, destFile);

      mockParseLinktext.mockReturnValueOnce({ path: '', subpath });

      generateMarkdownLink(mockFileManager, mockVault, sugg, activeFilePath);

      expect(mockFileManager.generateMarkdownLink).toHaveBeenCalledWith(
        destFile,
        activeFilePath,
        subpath,
        destFile.basename,
      );
    });

    it('should generate a link for heading ReferenceCache to another file', () => {
      const refCacheDestFile = new TFile();
      const { path: destFilePath } = refCacheDestFile;
      const displayText = chance.word();
      const subpath = `#${chance.word()}`;
      const link = `${destFilePath}${subpath}|${displayText}`;

      const refCache = makeLink(link, `[[${link}]]`, displayText);
      const sugg = makeSymbolSuggestion(refCache, SymbolType.Link, destFile);

      mockParseLinktext.mockReturnValueOnce({ path: destFilePath, subpath });

      mockVault.getFileByPath
        .calledWith(destFilePath)
        .mockReturnValueOnce(refCacheDestFile);

      generateMarkdownLink(mockFileManager, mockVault, sugg, activeFilePath);

      expect(mockFileManager.generateMarkdownLink).toHaveBeenCalledWith(
        refCacheDestFile,
        activeFilePath,
        subpath,
        displayText,
      );
    });

    it('should generate a link for ReferenceCache that is unresolved', () => {
      const displayText = chance.word();
      const path = 'NOEXIST';
      const link = `${path}|${displayText}`;

      const refCache = makeLink(link, `[[${link}]]`, displayText);
      const sugg = makeSymbolSuggestion(refCache, SymbolType.Link, destFile);

      mockParseLinktext.mockReturnValueOnce({ path, subpath: '' });

      mockVault.getFileByPath.calledWith(path).mockReturnValueOnce(null);

      const result = generateMarkdownLink(
        mockFileManager,
        mockVault,
        sugg,
        activeFilePath,
      );

      expect(mockFileManager.generateMarkdownLink).not.toHaveBeenCalled();
      expect(mockVault.getFileByPath).toHaveBeenCalledWith(path);
      expect(result).toBe(`[[${link}]]`);
    });

    it('should generate a link for ReferenceCache that is an external link (Markdown Link)', () => {
      const link = 'www.foo.com';
      const original = `[displaytext](${link})`;

      // link with no file path, in these cases, file path is assumed to be
      // the source file that contains/defines the ReferenceCache
      const refCache = makeLink(link, original);
      const sugg = makeSymbolSuggestion(refCache, SymbolType.Link, destFile);

      mockParseLinktext.mockReturnValueOnce({ path: link, subpath: '' });

      const result = generateMarkdownLink(
        mockFileManager,
        mockVault,
        sugg,
        activeFilePath,
      );

      expect(result).toBe(original);
      expect(mockFileManager.generateMarkdownLink).not.toHaveBeenCalled();
    });
  });

  describe('getTFileFromLeaf', () => {
    it('should not throw on falsy input', () => {
      expect(() => getTFileFromLeaf(null)).not.toThrow();
    });

    test('when the view is deferred, it should return the associated TFile', () => {
      const mockFile = new TFile();
      const mockLeaf = makeLeafDeferred({ file: mockFile });

      const result = getTFileFromLeaf(mockLeaf);

      expect(result).toBe(mockFile);
      expect((mockLeaf.app.vault as MockProxy<Vault>).getFileByPath).toHaveBeenCalledWith(
        mockFile.path,
      );
    });

    test('when the view is loaded, it should return the associated TFile', () => {
      const mockFile = new TFile();
      const mockLeaf = makeLeaf(mockFile);

      const result = getTFileFromLeaf(mockLeaf);

      expect(result).toEqual(mockFile);
    });
  });

  describe('leafHasLoadedViewOfType', () => {
    it('should return true if the view is not deferred and has the expected type', () => {
      const mockLeaf = makeLeaf();

      const result = leafHasLoadedViewOfType(mockLeaf, 'markdown');

      expect(result).toBe(true);
    });

    it('should return false if the view is deferred', () => {
      const mockLeaf = makeLeafDeferred();

      const result = leafHasLoadedViewOfType(mockLeaf, 'markdown');

      expect(result).toBe(false);
    });
  });
});
