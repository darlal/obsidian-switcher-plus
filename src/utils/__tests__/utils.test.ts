import {
  FileManager,
  TFile,
  Vault,
  normalizePath,
  parseLinktext,
  MetadataCache,
  HeadingCache,
} from 'obsidian';
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
  getHeadingBreadcrumbs,
  formatHeadingBreadcrumbs,
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
  makeLoc,
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

  describe('getHeadingBreadcrumbs', () => {
    let mockMetadataCache: MockProxy<MetadataCache>;
    let mockFile: TFile;

    beforeEach(() => {
      mockMetadataCache = mock<MetadataCache>();
      mockFile = new TFile();
    });

    afterEach(() => {
      mockReset(mockMetadataCache);
    });

    it('should return empty array for H1 heading (no breadcrumbs)', () => {
      // Arrange
      const h1 = makeHeading('Title', 1, makeLoc(0, 0, 0), makeLoc(0, 5, 5));
      mockMetadataCache.getFileCache.mockReturnValue({
        headings: [h1],
      });

      // Act
      const result = getHeadingBreadcrumbs(h1, mockFile, mockMetadataCache);

      // Assert
      expect(result).toEqual([]);
      expect(mockMetadataCache.getFileCache).toHaveBeenCalledWith(mockFile);
    });

    it('should return correct breadcrumbs for normal hierarchy (H1 → H2 → H3)', () => {
      // Arrange
      const h1 = makeHeading('Big Idea', 1, makeLoc(0, 0, 0), makeLoc(0, 8, 8));
      const h2 = makeHeading('Section', 2, makeLoc(5, 0, 50), makeLoc(5, 7, 57));
      const h3 = makeHeading('Subsection', 3, makeLoc(10, 0, 100), makeLoc(10, 10, 110));
      mockMetadataCache.getFileCache.mockReturnValue({
        headings: [h1, h2, h3],
      });

      // Act
      const result = getHeadingBreadcrumbs(h3, mockFile, mockMetadataCache);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toBe(h1);
      expect(result[1]).toBe(h2);
      expect(result[0].level).toBe(1);
      expect(result[1].level).toBe(2);
    });

    it('should handle skipped levels (H1 → H3, no H2)', () => {
      // Arrange
      const h1 = makeHeading('Big Idea', 1, makeLoc(0, 0, 0), makeLoc(0, 8, 8));
      const h3 = makeHeading('Subsection', 3, makeLoc(10, 0, 100), makeLoc(10, 10, 110));
      mockMetadataCache.getFileCache.mockReturnValue({
        headings: [h1, h3],
      });

      // Act
      const result = getHeadingBreadcrumbs(h3, mockFile, mockMetadataCache);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toBe(h1);
      expect(result[0].level).toBe(1);
    });

    it('should handle multiple H1s in file correctly', () => {
      // Arrange
      const h1a = makeHeading('First H1', 1, makeLoc(0, 0, 0), makeLoc(0, 8, 8));
      const h2a = makeHeading('Section A', 2, makeLoc(5, 0, 50), makeLoc(5, 9, 59));
      const h1b = makeHeading('Second H1', 1, makeLoc(20, 0, 200), makeLoc(20, 11, 211));
      const h2b = makeHeading('Section B', 2, makeLoc(25, 0, 250), makeLoc(25, 9, 259));
      mockMetadataCache.getFileCache.mockReturnValue({
        headings: [h1a, h2a, h1b, h2b],
      });

      // Act
      const result = getHeadingBreadcrumbs(h2b, mockFile, mockMetadataCache);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toBe(h1b);
      expect(result[0].heading).toBe('Second H1');
    });

    it('should return empty array when file has no headings', () => {
      // Arrange
      const h1 = makeHeading('Title', 1, makeLoc(0, 0, 0), makeLoc(0, 5, 5));
      mockMetadataCache.getFileCache.mockReturnValue({
        headings: [],
      });

      // Act
      const result = getHeadingBreadcrumbs(h1, mockFile, mockMetadataCache);

      // Assert
      expect(result).toEqual([]);
    });

    it('should return empty array when file cache is null', () => {
      // Arrange
      const h1 = makeHeading('Title', 1, makeLoc(0, 0, 0), makeLoc(0, 5, 5));
      mockMetadataCache.getFileCache.mockReturnValue(null);

      // Act
      const result = getHeadingBreadcrumbs(h1, mockFile, mockMetadataCache);

      // Assert
      expect(result).toEqual([]);
    });

    it('should return empty array when file cache is undefined', () => {
      // Arrange
      const h1 = makeHeading('Title', 1, makeLoc(0, 0, 0), makeLoc(0, 5, 5));
      mockMetadataCache.getFileCache.mockReturnValue(undefined);

      // Act
      const result = getHeadingBreadcrumbs(h1, mockFile, mockMetadataCache);

      // Assert
      expect(result).toEqual([]);
    });

    it('should handle heading at line 0 (first line)', () => {
      // Arrange
      const h1 = makeHeading('First Heading', 1, makeLoc(0, 0, 0), makeLoc(0, 12, 12));
      const h2 = makeHeading('Second Heading', 2, makeLoc(1, 0, 13), makeLoc(1, 14, 27));
      mockMetadataCache.getFileCache.mockReturnValue({
        headings: [h1, h2],
      });

      // Act
      const result = getHeadingBreadcrumbs(h2, mockFile, mockMetadataCache);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toBe(h1);
    });

    it('should handle very deep hierarchy (H1 → H2 → H3 → H4 → H5 → H6)', () => {
      // Arrange
      const h1 = makeHeading('Level 1', 1, makeLoc(0, 0, 0), makeLoc(0, 7, 7));
      const h2 = makeHeading('Level 2', 2, makeLoc(1, 0, 8), makeLoc(1, 7, 15));
      const h3 = makeHeading('Level 3', 3, makeLoc(2, 0, 16), makeLoc(2, 7, 23));
      const h4 = makeHeading('Level 4', 4, makeLoc(3, 0, 24), makeLoc(3, 7, 31));
      const h5 = makeHeading('Level 5', 5, makeLoc(4, 0, 32), makeLoc(4, 7, 39));
      const h6 = makeHeading('Level 6', 6, makeLoc(5, 0, 40), makeLoc(5, 7, 47));
      mockMetadataCache.getFileCache.mockReturnValue({
        headings: [h1, h2, h3, h4, h5, h6],
      });

      // Act
      const result = getHeadingBreadcrumbs(h6, mockFile, mockMetadataCache);

      // Assert
      expect(result).toHaveLength(5);
      expect(result[0].level).toBe(1);
      expect(result[1].level).toBe(2);
      expect(result[2].level).toBe(3);
      expect(result[3].level).toBe(4);
      expect(result[4].level).toBe(5);
    });

    it('should find closest preceding heading when multiple headings exist at same level', () => {
      // Arrange
      const h1a = makeHeading('First H1', 1, makeLoc(0, 0, 0), makeLoc(0, 8, 8));
      const h2a = makeHeading('First H2', 2, makeLoc(5, 0, 50), makeLoc(5, 8, 58));
      const h1b = makeHeading('Second H1', 1, makeLoc(10, 0, 100), makeLoc(10, 9, 109));
      const h2b = makeHeading('Second H2', 2, makeLoc(15, 0, 150), makeLoc(15, 9, 159));
      const h3 = makeHeading(
        'H3 under second H2',
        3,
        makeLoc(20, 0, 200),
        makeLoc(20, 18, 218),
      );

      mockMetadataCache.getFileCache.mockReturnValue({
        headings: [h1a, h2a, h1b, h2b, h3],
      });

      // Act
      const result = getHeadingBreadcrumbs(h3, mockFile, mockMetadataCache);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toBe(h1b);
      expect(result[1]).toBe(h2b);
    });
  });

  describe('formatHeadingBreadcrumbs', () => {
    it('should format breadcrumbs with default separator', () => {
      // Arrange
      const h1 = makeHeading('Big Idea', 1);
      const h2 = makeHeading('Section', 2);
      const breadcrumbs = [h1, h2];

      // Act
      const result = formatHeadingBreadcrumbs(breadcrumbs);

      // Assert
      expect(result).toBe('Big Idea > Section');
    });

    it('should format breadcrumbs with custom separator', () => {
      // Arrange
      const h1 = makeHeading('Big Idea', 1);
      const h2 = makeHeading('Section', 2);
      const breadcrumbs = [h1, h2];

      // Act
      const result = formatHeadingBreadcrumbs(breadcrumbs, ' / ');

      // Assert
      expect(result).toBe('Big Idea / Section');
    });

    it('should return empty string for empty breadcrumbs array', () => {
      // Arrange
      const breadcrumbs: HeadingCache[] = [];

      // Act
      const result = formatHeadingBreadcrumbs(breadcrumbs);

      // Assert
      expect(result).toBe('');
    });

    it('should handle single breadcrumb', () => {
      // Arrange
      const h1 = makeHeading('Single Heading', 1);
      const breadcrumbs = [h1];

      // Act
      const result = formatHeadingBreadcrumbs(breadcrumbs);

      // Assert
      expect(result).toBe('Single Heading');
    });

    it('should truncate to rightmost N breadcrumbs when maxDepth is set', () => {
      // Arrange
      const h1 = makeHeading('Level 1', 1);
      const h2 = makeHeading('Level 2', 2);
      const h3 = makeHeading('Level 3', 3);
      const h4 = makeHeading('Level 4', 4);
      const breadcrumbs = [h1, h2, h3, h4];

      // Act
      const result = formatHeadingBreadcrumbs(breadcrumbs, ' > ', 2);

      // Assert
      expect(result).toBe('Level 3 > Level 4');
    });

    it('should show all breadcrumbs when maxDepth is 0 (unlimited)', () => {
      // Arrange
      const h1 = makeHeading('Level 1', 1);
      const h2 = makeHeading('Level 2', 2);
      const h3 = makeHeading('Level 3', 3);
      const breadcrumbs = [h1, h2, h3];

      // Act
      const result = formatHeadingBreadcrumbs(breadcrumbs, ' > ', 0);

      // Assert
      expect(result).toBe('Level 1 > Level 2 > Level 3');
    });

    it('should show only most immediate parent when maxDepth is 1', () => {
      // Arrange
      const h1 = makeHeading('Level 1', 1);
      const h2 = makeHeading('Level 2', 2);
      const h3 = makeHeading('Level 3', 3);
      const breadcrumbs = [h1, h2, h3];

      // Act
      const result = formatHeadingBreadcrumbs(breadcrumbs, ' > ', 1);

      // Assert
      expect(result).toBe('Level 3');
    });

    it('should not truncate when breadcrumbs length equals maxDepth', () => {
      // Arrange
      const h1 = makeHeading('Level 1', 1);
      const h2 = makeHeading('Level 2', 2);
      const breadcrumbs = [h1, h2];

      // Act
      const result = formatHeadingBreadcrumbs(breadcrumbs, ' > ', 2);

      // Assert
      expect(result).toBe('Level 1 > Level 2');
    });

    it('should not truncate when breadcrumbs length is less than maxDepth', () => {
      // Arrange
      const h1 = makeHeading('Level 1', 1);
      const h2 = makeHeading('Level 2', 2);
      const breadcrumbs = [h1, h2];

      // Act
      const result = formatHeadingBreadcrumbs(breadcrumbs, ' > ', 5);

      // Assert
      expect(result).toBe('Level 1 > Level 2');
    });

    it('should handle very deep hierarchy with maxDepth truncation', () => {
      // Arrange
      const h1 = makeHeading('Level 1', 1);
      const h2 = makeHeading('Level 2', 2);
      const h3 = makeHeading('Level 3', 3);
      const h4 = makeHeading('Level 4', 4);
      const h5 = makeHeading('Level 5', 5);
      const h6 = makeHeading('Level 6', 6);
      const breadcrumbs = [h1, h2, h3, h4, h5, h6];

      // Act
      const result = formatHeadingBreadcrumbs(breadcrumbs, ' > ', 3);

      // Assert
      expect(result).toBe('Level 4 > Level 5 > Level 6');
    });
  });
});
