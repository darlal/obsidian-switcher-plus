import {
  App,
  CachedMetadata,
  fuzzySearch,
  Keymap,
  MetadataCache,
  PreparedQuery,
  prepareQuery,
  TAbstractFile,
  TFile,
  TFolder,
  Vault,
  ViewRegistry,
  Workspace,
} from 'obsidian';
import { Handler, HeadingsHandler } from 'src/Handlers';
import { SwitcherPlusSettings } from 'src/settings';
import {
  getCachedMetadata,
  headingsTrigger,
  makeFuzzyMatch,
  makeHeading,
  makeLoc,
  makePreparedQuery,
  makeLeaf,
  makeHeadingSuggestion,
  makeFileSuggestion,
} from '@fixtures';
import { InputInfo } from 'src/switcherPlus';
import {
  HeadingIndicators,
  HeadingSuggestion,
  FileSuggestion,
  Mode,
  AliasSuggestion,
  UnresolvedSuggestion,
} from 'src/types';
import {
  isAliasSuggestion,
  isFileSuggestion,
  isHeadingSuggestion,
  isUnresolvedSuggestion,
} from 'src/utils';
import { mock, MockProxy } from 'jest-mock-extended';

function makeFileTree(expectedFile: TFile, parentFolderName = 'l2Folder2'): TFolder {
  const mockFolder = jest.fn<
    TFolder,
    [name: string, path: string, children: Array<TAbstractFile>]
  >((name, path, children = []) => {
    return {
      vault: null,
      parent: null,
      isRoot: undefined,
      name,
      path,
      children,
    };
  });

  const root = new mockFolder('', '/', [
    new TFile(),
    new mockFolder('l1Folder1', 'l1Folder1', [
      new TFile(),
      new mockFolder('l2Folder1', 'l1Folder1/l2Folder1', [new TFile()]),
      new mockFolder(parentFolderName, `l1Folder1/${parentFolderName}`, [expectedFile]),
    ]),
  ]);

  return root;
}

describe('headingsHandler', () => {
  let settings: SwitcherPlusSettings;
  let headingSugg: HeadingSuggestion;
  const mockPrepareQuery = jest.mocked<typeof prepareQuery>(prepareQuery);
  const mockFuzzySearch = jest.mocked<typeof fuzzySearch>(fuzzySearch);

  beforeAll(() => {
    settings = new SwitcherPlusSettings(null);

    jest.spyOn(settings, 'headingsListCommand', 'get').mockReturnValue(headingsTrigger);

    headingSugg = makeHeadingSuggestion(makeHeading('foo heading', 1), new TFile());
  });

  describe('commandString', () => {
    it('should return headingsListCommand trigger', () => {
      const sut = new HeadingsHandler(mock<App>(), settings);
      expect(sut.commandString).toBe(headingsTrigger);
    });
  });

  describe('validateCommand', () => {
    it('should validate parsed input for headings mode', () => {
      const filterText = 'foo';
      const inputText = `${headingsTrigger}${filterText}`;
      const startIndex = headingsTrigger.length;
      const inputInfo = new InputInfo(inputText);

      const sut = new HeadingsHandler(mock<App>(), settings);
      sut.validateCommand(inputInfo, startIndex, filterText, null, null);
      expect(inputInfo.mode).toBe(Mode.HeadingsList);

      const headingsCmd = inputInfo.parsedCommand();
      expect(headingsCmd.parsedInput).toBe(filterText);
      expect(headingsCmd.isValidated).toBe(true);
    });
  });

  describe('getSuggestions', () => {
    let sut: HeadingsHandler;
    let mockWorkspace: MockProxy<Workspace>;
    let mockVault: MockProxy<Vault>;
    let mockMetadataCache: MockProxy<MetadataCache>;
    let mockViewRegistry: MockProxy<ViewRegistry>;
    let builtInSystemOptionsSpy: jest.SpyInstance;

    beforeAll(() => {
      mockWorkspace = mock<Workspace>();
      mockVault = mock<Vault>();
      mockMetadataCache = mock<MetadataCache>();
      mockViewRegistry = mock<ViewRegistry>();
      mockViewRegistry.isExtensionRegistered.mockReturnValue(true);

      const mockApp = mock<App>({
        workspace: mockWorkspace,
        vault: mockVault,
        metadataCache: mockMetadataCache,
        viewRegistry: mockViewRegistry,
      });

      sut = new HeadingsHandler(mockApp, settings);

      builtInSystemOptionsSpy = jest
        .spyOn(settings, 'builtInSystemOptions', 'get')
        .mockReturnValue({
          showAllFileTypes: true,
          showAttachments: true,
          showExistingOnly: false,
        });
    });

    afterAll(() => {
      builtInSystemOptionsSpy.mockRestore();
    });

    test('with falsy input, it should return an empty array', () => {
      const results = sut.getSuggestions(null);

      expect(results).not.toBeNull();
      expect(results).toBeInstanceOf(Array);
      expect(results).toHaveLength(0);
    });

    test('without any filter text, it should return most recent opened file suggestions for headings mode', () => {
      const fileData: Record<string, TFile> = {};
      let file = new TFile();
      fileData[file.path] = file;

      file = new TFile();
      fileData[file.path] = file;

      file = new TFile();
      fileData[file.path] = file;

      const fileDataKeys = Object.keys(fileData);
      mockWorkspace.getLastOpenFiles.mockReturnValueOnce(fileDataKeys);
      mockVault.getAbstractFileByPath.mockImplementation(
        (path: string) => fileData[path],
      );
      mockMetadataCache.getFileCache.mockImplementation((f: TFile) => {
        return f === file ? {} : getCachedMetadata();
      });

      const inputInfo = new InputInfo(headingsTrigger);
      const results = sut.getSuggestions(inputInfo);

      expect(results).toHaveLength(fileDataKeys.length);

      const expectedFiles = new Set(Object.values(fileData));
      const headingSuggestions = results.filter((sugg) =>
        isHeadingSuggestion(sugg),
      ) as HeadingSuggestion[];

      expect(headingSuggestions).toHaveLength(2);
      expect(headingSuggestions.every((sugg) => expectedFiles.has(sugg.file))).toBe(true);

      const fileSuggestions = results.filter((sugg) =>
        isFileSuggestion(sugg),
      ) as FileSuggestion[];

      expect(fileSuggestions).toHaveLength(1);
      expect(fileSuggestions.every((sugg) => expectedFiles.has(sugg.file))).toBe(true);

      expect(mockWorkspace.getLastOpenFiles).toHaveBeenCalled();
      expect(mockVault.getAbstractFileByPath).toHaveBeenCalled();
      expect(mockMetadataCache.getFileCache).toHaveBeenCalled();
      expect(builtInSystemOptionsSpy).toHaveBeenCalled();
      expect(mockViewRegistry.isExtensionRegistered).toHaveBeenCalled();

      mockWorkspace.getLastOpenFiles.mockReset();
      mockVault.getAbstractFileByPath.mockReset();
      mockMetadataCache.getFileCache.mockReset();
    });

    test('with filter search term, it should return matching suggestions for all headings', () => {
      const expected = new TFile();
      const h1 = makeHeading('foo heading H1', 1, makeLoc(1));
      const h2 = makeHeading('foo heading H2', 2, makeLoc(2));
      const filterText = 'foo';

      mockPrepareQuery.mockReturnValue(makePreparedQuery(filterText));
      mockVault.getRoot.mockReturnValueOnce(makeFileTree(expected));

      mockMetadataCache.getFileCache.mockImplementation((f: TFile) => {
        return f === expected ? { headings: [h1, h2] } : getCachedMetadata();
      });

      mockFuzzySearch.mockImplementation((_q: PreparedQuery, text: string) => {
        const match = makeFuzzyMatch();
        return text.startsWith(filterText) ? match : null;
      });

      const inputInfo = new InputInfo(`${headingsTrigger}${filterText}`);
      sut.validateCommand(inputInfo, 0, filterText, null, null);

      const results = sut.getSuggestions(inputInfo);
      expect(results).toHaveLength(2);

      expect(results.every((r) => isHeadingSuggestion(r))).toBe(true);

      expect(
        results.every((r: HeadingSuggestion) => r.item === h1 || r.item === h2),
      ).toBe(true);

      const result = results[0] as HeadingSuggestion;
      expect(result.file).toBe(expected);

      expect(mockFuzzySearch).toHaveBeenCalled();
      expect(mockPrepareQuery).toHaveBeenCalled();
      expect(mockVault.getRoot).toHaveBeenCalled();
      expect(mockMetadataCache.getFileCache).toHaveBeenCalled();
      expect(builtInSystemOptionsSpy).toHaveBeenCalled();
      expect(mockViewRegistry.isExtensionRegistered).toHaveBeenCalled();

      mockMetadataCache.getFileCache.mockReset();
      mockFuzzySearch.mockReset();
      mockPrepareQuery.mockReset();
    });

    test('with filter search term, and searchAllHeadings set to false, it should return only matching suggestions using first H1 in file', () => {
      const expected = new TFile();
      const expectedHeading = makeHeading('foo heading H1', 1, makeLoc(1));
      const heading2 = makeHeading('foo heading H1', 1, makeLoc(2));
      const filterText = 'foo';

      const searchAllHeadingsSpy = jest
        .spyOn(settings, 'searchAllHeadings', 'get')
        .mockReturnValue(false);

      mockPrepareQuery.mockReturnValue(makePreparedQuery(filterText));
      mockVault.getRoot.mockReturnValueOnce(makeFileTree(expected));

      mockMetadataCache.getFileCache.mockImplementation((f: TFile) => {
        return f === expected
          ? { headings: [expectedHeading, heading2] }
          : getCachedMetadata();
      });

      mockFuzzySearch.mockImplementation((_q: PreparedQuery, text: string) => {
        const match = makeFuzzyMatch();
        return text.startsWith(filterText) ? match : null;
      });

      const inputInfo = new InputInfo(`${headingsTrigger}${filterText}`);
      sut.validateCommand(inputInfo, 0, filterText, null, null);

      const results = sut.getSuggestions(inputInfo);
      expect(results).toHaveLength(1);

      let result = results[0];
      expect(isHeadingSuggestion(result)).toBe(true);

      result = result as HeadingSuggestion;
      expect(result.file).toBe(expected);
      expect(result.item).toBe(expectedHeading);

      expect(mockFuzzySearch).toHaveBeenCalled();
      expect(mockPrepareQuery).toHaveBeenCalled();
      expect(mockVault.getRoot).toHaveBeenCalled();
      expect(mockMetadataCache.getFileCache).toHaveBeenCalled();
      expect(builtInSystemOptionsSpy).toHaveBeenCalled();
      expect(mockViewRegistry.isExtensionRegistered).toHaveBeenCalled();

      mockMetadataCache.getFileCache.mockReset();
      mockFuzzySearch.mockReset();
      mockPrepareQuery.mockReset();
      searchAllHeadingsSpy.mockRestore();
    });

    test("with filter search term, it should return matching suggestions using file name (leaf segment) when H1 doesn't exist", () => {
      const filterText = 'foo';
      const expected = new TFile();
      expected.path = 'path/to/bar/foo filename.md'; // only path matters for this test

      mockPrepareQuery.mockReturnValue(makePreparedQuery(filterText));
      mockVault.getRoot.mockReturnValueOnce(makeFileTree(expected));

      mockMetadataCache.getFileCache.mockImplementation((f: TFile) => {
        // don't return any heading metadata for expected
        return f === expected ? {} : getCachedMetadata();
      });

      mockFuzzySearch.mockImplementation((_q: PreparedQuery, text: string) => {
        const match = makeFuzzyMatch();
        return text.startsWith(filterText) ? match : null;
      });

      const inputInfo = new InputInfo(`${headingsTrigger}${filterText}`);
      sut.validateCommand(inputInfo, 0, filterText, null, null);

      const results = sut.getSuggestions(inputInfo);
      expect(results).toHaveLength(1);

      const result = results[0];
      expect(isFileSuggestion(result)).toBe(true);
      expect((result as FileSuggestion).file).toBe(expected);

      expect(mockFuzzySearch).toHaveBeenCalled();
      expect(mockPrepareQuery).toHaveBeenCalled();
      expect(mockVault.getRoot).toHaveBeenCalled();
      expect(mockMetadataCache.getFileCache).toHaveBeenCalled();
      expect(builtInSystemOptionsSpy).toHaveBeenCalled();
      expect(mockViewRegistry.isExtensionRegistered).toHaveBeenCalled();

      mockMetadataCache.getFileCache.mockReset();
      mockFuzzySearch.mockReset();
      mockPrepareQuery.mockReset();
    });

    test("with filter search term, it should fallback to match against file path when H1 doesn't exist and there's no match against the filename (leaf segment)", () => {
      const filterText = 'foo';
      const expected = new TFile();
      expected.path = 'foo/path/to/filename.md'; // only path matters for this test

      mockPrepareQuery.mockReturnValue(makePreparedQuery(filterText));
      mockVault.getRoot.mockReturnValueOnce(makeFileTree(expected));
      mockMetadataCache.getFileCache.mockReturnValue({});

      mockFuzzySearch.mockImplementation((_q: PreparedQuery, text: string) => {
        const match = makeFuzzyMatch();
        return text.startsWith(filterText) ? match : null;
      });

      const inputInfo = new InputInfo(`${headingsTrigger}${filterText}`);
      sut.validateCommand(inputInfo, 0, filterText, null, null);

      const results = sut.getSuggestions(inputInfo);
      expect(results).toHaveLength(1);

      const result = results[0];
      expect(isFileSuggestion(result)).toBe(true);
      expect((result as FileSuggestion).file).toBe(expected);

      expect(mockFuzzySearch).toHaveBeenCalled();
      expect(mockPrepareQuery).toHaveBeenCalled();
      expect(mockVault.getRoot).toHaveBeenCalled();
      expect(mockMetadataCache.getFileCache).toHaveBeenCalled();
      expect(builtInSystemOptionsSpy).toHaveBeenCalled();
      expect(mockViewRegistry.isExtensionRegistered).toHaveBeenCalled();

      mockMetadataCache.getFileCache.mockReset();
      mockFuzzySearch.mockReset();
      mockPrepareQuery.mockReset();
    });

    test('with filter search term and shouldShowAlias set to true, it should match against aliases', () => {
      const expected = new TFile();
      const filterText = 'foo';

      mockPrepareQuery.mockReturnValue(makePreparedQuery(filterText));
      mockVault.getRoot.mockReturnValueOnce(makeFileTree(expected));
      settings.shouldShowAlias = true;

      const fm: CachedMetadata = {
        frontmatter: {
          aliases: ['bar', 'foo'],
          position: null,
        },
      };

      mockMetadataCache.getFileCache.mockImplementation((f: TFile) => {
        return f === expected ? fm : getCachedMetadata();
      });

      mockFuzzySearch.mockImplementation((_q: PreparedQuery, text: string) => {
        const match = makeFuzzyMatch();
        return text.startsWith(filterText) ? match : null;
      });

      const inputInfo = new InputInfo(`${headingsTrigger}${filterText}`);
      sut.validateCommand(inputInfo, 0, filterText, null, null);

      const results = sut.getSuggestions(inputInfo);
      expect(results).toHaveLength(1);

      const result = results[0];
      expect(isAliasSuggestion(result)).toBe(true);
      expect((result as AliasSuggestion).file).toBe(expected);

      expect(mockFuzzySearch).toHaveBeenCalled();
      expect(mockPrepareQuery).toHaveBeenCalled();
      expect(mockVault.getRoot).toHaveBeenCalled();
      expect(mockMetadataCache.getFileCache).toHaveBeenCalled();
      expect(builtInSystemOptionsSpy).toHaveBeenCalled();
      expect(mockViewRegistry.isExtensionRegistered).toHaveBeenCalled();

      settings.shouldShowAlias = false;
      mockMetadataCache.getFileCache.mockReset();
      mockFuzzySearch.mockReset();
      mockPrepareQuery.mockReset();
    });

    test('with filter search term and showExistingOnly set to false, it should match against unresolved linktext', () => {
      const expected = new TFile();
      const filterText = 'foo';

      mockPrepareQuery.mockReturnValue(makePreparedQuery(filterText));
      mockVault.getRoot.mockReturnValueOnce(makeFileTree(expected));

      mockMetadataCache.unresolvedLinks[expected.path] = {
        'foo link noexist': 1,
        'another link': 1,
      };

      mockFuzzySearch.mockImplementation((_q: PreparedQuery, text: string) => {
        const match = makeFuzzyMatch();
        return text.startsWith(filterText) ? match : null;
      });

      const inputInfo = new InputInfo(`${headingsTrigger}${filterText}`);
      sut.validateCommand(inputInfo, 0, filterText, null, null);

      const results = sut.getSuggestions(inputInfo);
      expect(results).toHaveLength(1);

      const result = results[0];
      expect(isUnresolvedSuggestion(result)).toBe(true);
      expect((result as UnresolvedSuggestion).linktext).toBe('foo link noexist');

      expect(mockFuzzySearch).toHaveBeenCalled();
      expect(mockPrepareQuery).toHaveBeenCalled();
      expect(mockVault.getRoot).toHaveBeenCalled();
      expect(builtInSystemOptionsSpy).toHaveBeenCalled();
      expect(mockViewRegistry.isExtensionRegistered).toHaveBeenCalled();

      mockFuzzySearch.mockReset();
      mockPrepareQuery.mockReset();
      mockMetadataCache.unresolvedLinks = {};
    });

    test('with filter search term and strictHeadingsOnly enabled, it should not match against file name, or path when there is no H1', () => {
      const filterText = 'foo';
      const expected = new TFile();
      expected.path = 'foo/path/to/filename.md'; // only path matters for this test

      mockPrepareQuery.mockReturnValue(makePreparedQuery(filterText));
      mockVault.getRoot.mockReturnValueOnce(makeFileTree(expected));
      mockMetadataCache.getFileCache.mockReturnValue({});

      const strictHeadingsOnlySpy = jest
        .spyOn(settings, 'strictHeadingsOnly', 'get')
        .mockReturnValue(true);

      const inputInfo = new InputInfo(`${headingsTrigger}${filterText}`);
      sut.validateCommand(inputInfo, 0, filterText, null, null);

      const results = sut.getSuggestions(inputInfo);
      expect(results).toHaveLength(0);

      expect(mockPrepareQuery).toHaveBeenCalled();
      expect(mockVault.getRoot).toHaveBeenCalled();
      expect(mockMetadataCache.getFileCache).toHaveBeenCalled();
      expect(builtInSystemOptionsSpy).toHaveBeenCalled();
      expect(mockViewRegistry.isExtensionRegistered).toHaveBeenCalled();
      expect(strictHeadingsOnlySpy).toHaveBeenCalled();

      mockMetadataCache.getFileCache.mockReset();
      mockPrepareQuery.mockReset();
      strictHeadingsOnlySpy.mockRestore();
    });

    it('should not return suggestions from excluded folders', () => {
      const filterText = 'foo';
      const excludedFolderName = 'ignored';
      const h1 = makeHeading('foo heading H1', 1, makeLoc(1));
      const expected = new TFile();
      expected.path = 'foo/path/to/foo filename.md';

      mockPrepareQuery.mockReturnValue(makePreparedQuery(filterText));
      mockVault.getRoot.mockReturnValueOnce(makeFileTree(expected, excludedFolderName));

      mockMetadataCache.getFileCache.mockImplementation((f: TFile) => {
        return f === expected ? { headings: [h1] } : {};
      });

      mockFuzzySearch.mockImplementation((_q: PreparedQuery, text: string) => {
        const match = makeFuzzyMatch();
        return text.startsWith(filterText) ? match : null;
      });

      const excludeFoldersSpy = jest
        .spyOn(settings, 'excludeFolders', 'get')
        .mockReturnValue([excludedFolderName]);

      const inputInfo = new InputInfo(`${headingsTrigger}${filterText}`);
      sut.validateCommand(inputInfo, 0, filterText, null, null);

      const results = sut.getSuggestions(inputInfo);
      expect(results).toHaveLength(0);

      expect(mockFuzzySearch).toHaveBeenCalled();
      expect(mockPrepareQuery).toHaveBeenCalled();
      expect(mockVault.getRoot).toHaveBeenCalled();
      expect(mockMetadataCache.getFileCache).toHaveBeenCalled();
      expect(builtInSystemOptionsSpy).toHaveBeenCalled();
      expect(mockViewRegistry.isExtensionRegistered).toHaveBeenCalled();

      mockMetadataCache.getFileCache.mockReset();
      mockFuzzySearch.mockReset();
      mockPrepareQuery.mockReset();
      excludeFoldersSpy.mockRestore();
    });
  });

  describe('addSuggestionsFromFile', () => {
    let sut: HeadingsHandler;
    let mockWorkspace: MockProxy<Workspace>;
    let mockMetadataCache: MockProxy<MetadataCache>;
    let mockViewRegistry: MockProxy<ViewRegistry>;
    let builtInSystemOptionsSpy: jest.SpyInstance;

    beforeAll(() => {
      mockWorkspace = mock<Workspace>();
      mockMetadataCache = mock<MetadataCache>();
      mockViewRegistry = mock<ViewRegistry>();
      mockViewRegistry.isExtensionRegistered.mockReturnValue(true);

      const mockApp = mock<App>({
        workspace: mockWorkspace,
        metadataCache: mockMetadataCache,
        viewRegistry: mockViewRegistry,
      });

      builtInSystemOptionsSpy = jest
        .spyOn(settings, 'builtInSystemOptions', 'get')
        .mockReturnValue({
          showAllFileTypes: true,
          showAttachments: true,
          showExistingOnly: false,
        });

      sut = new HeadingsHandler(mockApp, settings);
    });

    afterAll(() => {
      builtInSystemOptionsSpy.mockRestore();
    });

    test('with filter search term, it should return matching suggestions using file name (leaf segment) when there is no H1 match', () => {
      const filterText = 'foo';
      const filename = `${filterText} filename`;
      const path = `path/${filterText}/bar/${filename}`; // only path matters for this test
      const results: Array<FileSuggestion> = [];
      const expectedMatch = makeFuzzyMatch();

      const expectedFile = new TFile();
      expectedFile.path = path;

      mockMetadataCache.getFileCache.calledWith(expectedFile).mockReturnValue({
        headings: [makeHeading("words that don't match", 1)],
      });

      mockFuzzySearch.mockImplementation((_q: PreparedQuery, text: string) => {
        return text === filename ? expectedMatch : null;
      });

      sut.addSuggestionsFromFile(results, expectedFile, makePreparedQuery(filterText));

      const result = results[0];
      expect(results).toHaveLength(1);
      expect(isFileSuggestion(result)).toBe(true);
      expect(result.file).toBe(expectedFile);
      expect(result.match).toBe(expectedMatch);
      expect(mockFuzzySearch).toHaveBeenCalled();
      expect(mockMetadataCache.getFileCache).toHaveBeenCalledWith(expectedFile);

      mockMetadataCache.getFileCache.mockReset();
      mockFuzzySearch.mockReset();
    });

    test('with shouldSearchFilenames enabled, it should return matching suggestions using file name even when there is an H1 match', () => {
      const filterText = 'foo';
      const filename = `${filterText} filename`;
      const path = `path/to/bar/${filename}`; // only path matters for this test
      const results: Array<FileSuggestion> = [];
      const expectedFile = new TFile();
      expectedFile.path = path;

      const shouldSearchFilenameSpy = jest
        .spyOn(settings, 'shouldSearchFilenames', 'get')
        .mockReturnValueOnce(true);

      mockMetadataCache.getFileCache.calledWith(expectedFile).mockReturnValue({
        headings: [makeHeading(filterText, 1)], // <-- ensure heading match
      });

      mockFuzzySearch.mockImplementation((_q: PreparedQuery, text: string) => {
        return text === filterText || text === filename ? makeFuzzyMatch() : null;
      });

      sut.addSuggestionsFromFile(results, expectedFile, makePreparedQuery(filterText));

      const H1Sugg = results.find(isHeadingSuggestion);
      const fileSugg = results.find(isFileSuggestion);
      expect(results).toHaveLength(2);
      expect(H1Sugg).not.toBeFalsy();
      expect(fileSugg).not.toBeFalsy();
      expect(fileSugg.file).toBe(expectedFile);
      expect(mockFuzzySearch).toHaveBeenCalled();
      expect(mockMetadataCache.getFileCache).toHaveBeenCalledWith(expectedFile);

      mockMetadataCache.getFileCache.mockReset();
      mockFuzzySearch.mockReset();
      shouldSearchFilenameSpy.mockRestore();
    });

    test('with filter search term, it should fallback match against file path when there is no H1 match and no match against the filename (leaf segment)', () => {
      const filterText = 'foo';
      const path = `path/${filterText}/bar/filename`; // only path matters for this test
      const results: Array<FileSuggestion> = [];
      const expectedMatch = makeFuzzyMatch();

      const expectedFile = new TFile();
      expectedFile.path = path;

      mockMetadataCache.getFileCache.calledWith(expectedFile).mockReturnValue({
        headings: [makeHeading("words that don't match", 1)],
      });

      mockFuzzySearch.mockImplementation((_q: PreparedQuery, text: string) => {
        return text === path ? expectedMatch : null;
      });

      sut.addSuggestionsFromFile(results, expectedFile, makePreparedQuery(filterText));

      const result = results[0];
      expect(results).toHaveLength(1);
      expect(isFileSuggestion(result)).toBe(true);
      expect(result.file).toBe(expectedFile);
      expect(result.match).toBe(expectedMatch);
      expect(mockFuzzySearch).toHaveBeenCalled();
      expect(mockMetadataCache.getFileCache).toHaveBeenCalledWith(expectedFile);

      mockMetadataCache.getFileCache.mockReset();
      mockFuzzySearch.mockReset();
    });
  });

  describe('renderSuggestion', () => {
    let sut: HeadingsHandler;
    let mockParentEl: MockProxy<HTMLElement>;

    beforeAll(() => {
      sut = new HeadingsHandler(mock<App>(), settings);
      mockParentEl = mock<HTMLElement>();
      mockParentEl.createDiv.mockReturnValue(mock<HTMLDivElement>());
    });

    it('should not throw an error with a null suggestion', () => {
      expect(() => sut.renderSuggestion(null, null)).not.toThrow();
    });

    it('should render a span with the heading level indicator', () => {
      const renderPathSpy = jest
        .spyOn(Handler.prototype, 'renderPath')
        .mockReturnValueOnce();

      sut.renderSuggestion(headingSugg, mockParentEl);

      expect(mockParentEl.createSpan).toHaveBeenCalledWith(
        expect.objectContaining({
          cls: ['suggestion-flair', 'qsp-headings-indicator'],
          text: HeadingIndicators[headingSugg.item.level],
        }),
      );

      renderPathSpy.mockRestore();
    });

    test('with HeadingCache, it should render a suggestion with match offsets', () => {
      const renderContentSpy = jest.spyOn(Handler.prototype, 'renderContent');

      const renderPathSpy = jest
        .spyOn(Handler.prototype, 'renderPath')
        .mockReturnValueOnce();

      sut.renderSuggestion(headingSugg, mockParentEl);

      expect(renderPathSpy).toHaveBeenCalledWith(mockParentEl, headingSugg.file);
      expect(renderContentSpy).toBeCalledWith(
        mockParentEl,
        headingSugg.item.heading,
        headingSugg.match,
      );
      expect(mockParentEl.addClasses).toHaveBeenCalledWith([
        'qsp-suggestion-headings',
        `qsp-headings-l${headingSugg.item.level}`,
      ]);

      renderContentSpy.mockRestore();
      renderPathSpy.mockRestore();
    });

    it('should add CSS class to downranked suggestions', () => {
      const sugg = makeHeadingSuggestion(makeHeading('foo heading', 1));
      sugg.downranked = true;

      sut.renderSuggestion(sugg, mockParentEl);

      expect(mockParentEl.addClass).toHaveBeenCalledWith('mod-downranked');
    });
  });

  describe('onChooseSuggestion', () => {
    const mockKeymap = jest.mocked<typeof Keymap>(Keymap);
    let sut: HeadingsHandler;
    let mockWorkspace: MockProxy<Workspace>;

    beforeAll(() => {
      mockWorkspace = mock<Workspace>();
      const mockApp = mock<App>({
        workspace: mockWorkspace,
      });

      const fileContainerLeaf = makeLeaf();
      fileContainerLeaf.openFile.mockResolvedValueOnce();
      mockWorkspace.getLeaf.mockReturnValueOnce(fileContainerLeaf);

      sut = new HeadingsHandler(mockApp, settings);
    });

    it('should not throw an error with a null suggestion', () => {
      expect(() => sut.onChooseSuggestion(null, null)).not.toThrow();
    });

    it('should open the file associated with the suggestion', () => {
      const isModDown = false;
      const navigateToLeafOrOpenFileSpy = jest.spyOn(
        Handler.prototype,
        'navigateToLeafOrOpenFile',
      );

      mockKeymap.isModEvent.mockReturnValueOnce(isModDown);

      sut.onChooseSuggestion(headingSugg, null);

      expect(mockKeymap.isModEvent).toHaveBeenCalled();
      expect(navigateToLeafOrOpenFileSpy).toHaveBeenCalledWith(
        isModDown,
        headingSugg.file,
        expect.any(String),
        expect.anything(),
      );

      navigateToLeafOrOpenFileSpy.mockRestore();
    });
  });

  describe('downrankScoreIfIgnored', () => {
    let sut: HeadingsHandler;
    let mockMetadataCache: MockProxy<MetadataCache>;

    beforeAll(() => {
      mockMetadataCache = mock<MetadataCache>();
      const mockApp = mock<App>({
        metadataCache: mockMetadataCache,
      });

      sut = new HeadingsHandler(mockApp, settings);
    });

    it('should not throw on falsy input', () => {
      const sugg = makeFileSuggestion();

      mockMetadataCache.isUserIgnored.mockReturnValue(false);

      expect((): void => {
        sugg.file = null;
        sut.downrankScoreIfIgnored(sugg);
      }).not.toThrow();

      expect((): void => {
        sugg.match = null;
        sut.downrankScoreIfIgnored(sugg);
      }).not.toThrow();

      expect((): void => {
        sut.downrankScoreIfIgnored(null);
      }).not.toThrow();

      mockMetadataCache.isUserIgnored.mockReset();
    });

    it('should downrank suggestions for file that are excluded by Obsidian exclude files setting', () => {
      const sugg = makeFileSuggestion();
      sugg.match.score = 0;

      mockMetadataCache.isUserIgnored
        .calledWith(sugg.file.path)
        .mockReturnValueOnce(true);

      const result = sut.downrankScoreIfIgnored(sugg);

      // by default scores are downranked by -10
      expect(result.match.score).toBe(-10);
      expect(result.downranked).toBe(true);
      expect(mockMetadataCache.isUserIgnored).toBeCalledWith(sugg.file.path);

      mockMetadataCache.isUserIgnored.mockReset();
    });
  });

  describe('shouldIncludeFile', () => {
    let sut: HeadingsHandler;
    let mockMetadataCache: MockProxy<MetadataCache>;
    let mockViewRegistry: MockProxy<ViewRegistry>;
    let builtInSystemOptionsSpy: jest.SpyInstance;
    let excludeObsidianIgnoredFilesSpy: jest.SpyInstance;

    beforeAll(() => {
      mockMetadataCache = mock<MetadataCache>();
      mockViewRegistry = mock<ViewRegistry>();

      const mockApp = mock<App>({
        metadataCache: mockMetadataCache,
        viewRegistry: mockViewRegistry,
      });

      builtInSystemOptionsSpy = jest
        .spyOn(settings, 'builtInSystemOptions', 'get')
        .mockReturnValue({
          showAllFileTypes: true,
          showAttachments: true,
          showExistingOnly: false,
        });

      excludeObsidianIgnoredFilesSpy = jest.spyOn(
        settings,
        'excludeObsidianIgnoredFiles',
        'get',
      );

      sut = new HeadingsHandler(mockApp, settings);
    });

    afterAll(() => {
      builtInSystemOptionsSpy.mockRestore();
      excludeObsidianIgnoredFilesSpy.mockRestore();
    });

    it('should not throw on falsy input', () => {
      expect((): void => {
        sut.shouldIncludeFile(null);
      }).not.toThrow();
    });

    test('with excludeObsidianIgnoredFiles enabled, it should return false', () => {
      const mockFile = new TFile();

      excludeObsidianIgnoredFilesSpy.mockReturnValueOnce(true);
      mockMetadataCache.isUserIgnored.calledWith(mockFile.path).mockReturnValueOnce(true);

      const result = sut.shouldIncludeFile(mockFile);

      expect(result).toBe(false);
      expect(mockMetadataCache.isUserIgnored).toBeCalledWith(mockFile.path);

      mockMetadataCache.isUserIgnored.mockReset();
    });

    test('with excludeObsidianIgnoredFiles disabled, it should return true', () => {
      const mockFile = new TFile();

      excludeObsidianIgnoredFilesSpy.mockReturnValueOnce(false);
      mockMetadataCache.isUserIgnored.calledWith(mockFile.path).mockReturnValueOnce(true);

      const result = sut.shouldIncludeFile(mockFile);

      expect(result).toBe(true);
      expect(mockMetadataCache.isUserIgnored).toBeCalledWith(mockFile.path);

      mockMetadataCache.isUserIgnored.mockReset();
    });

    test('with showAttachments disabled it should return true for files with .md extension', () => {
      const mockFile = new TFile();

      mockViewRegistry.isExtensionRegistered.mockReturnValueOnce(true);
      mockMetadataCache.isUserIgnored
        .calledWith(mockFile.path)
        .mockReturnValueOnce(false);

      builtInSystemOptionsSpy.mockReturnValue({
        showAllFileTypes: true,
        showAttachments: false, // <-- here
        showExistingOnly: false,
      });

      const result = sut.shouldIncludeFile(mockFile);

      expect(result).toBe(true);

      mockViewRegistry.isExtensionRegistered.mockReset();
      mockMetadataCache.isUserIgnored.mockReset();
      builtInSystemOptionsSpy.mockReset();
    });
  });
});
