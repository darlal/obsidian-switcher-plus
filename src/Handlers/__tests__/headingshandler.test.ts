import {
  App,
  CachedMetadata,
  fuzzySearch,
  Keymap,
  MetadataCache,
  PreparedQuery,
  prepareQuery,
  renderResults,
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
  stripMDExtensionFromPath,
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

  beforeAll(() => {
    settings = new SwitcherPlusSettings(null);

    jest.spyOn(settings, 'headingsListCommand', 'get').mockReturnValue(headingsTrigger);

    headingSugg = {
      item: makeHeading('foo heading', 1),
      file: new TFile(),
      match: null,
      type: 'heading',
    };
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
    const mockPrepareQuery = jest.mocked<typeof prepareQuery>(prepareQuery);
    const mockFuzzySearch = jest.mocked<typeof fuzzySearch>(fuzzySearch);
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

    test("with filter search term, it should return only matching suggestions using file name (leaf segment) when H1 doesn't exist", () => {
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

    test('with filter search term, it should fallback match against file path when there is no H1 and no match against the filename (leaf segment)', () => {
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

  describe('renderSuggestion', () => {
    let sut: HeadingsHandler;
    let mockParentEl: MockProxy<HTMLElement>;

    beforeAll(() => {
      sut = new HeadingsHandler(mock<App>(), settings);
      mockParentEl = mock<HTMLElement>();
    });

    it('should not throw an error with a null suggestion', () => {
      expect(() => sut.renderSuggestion(null, null)).not.toThrow();
    });

    it('should render a span with the heading level indicator', () => {
      sut.renderSuggestion(headingSugg, mockParentEl);

      expect(mockParentEl.createSpan).toHaveBeenCalledWith(
        expect.objectContaining({
          cls: ['suggestion-flair', 'qsp-headings-indicator'],
          text: HeadingIndicators[headingSugg.item.level],
          prepend: true,
        }),
      );
    });

    test('with HeadingCache, it should render a suggestion with match offsets', () => {
      const mockRenderResults = jest.mocked<typeof renderResults>(renderResults);

      sut.renderSuggestion(headingSugg, mockParentEl);

      expect(mockRenderResults).toHaveBeenCalledWith(
        mockParentEl,
        headingSugg.item.heading,
        headingSugg.match,
      );
    });

    it('should render a div element with the text of the suggestion file path', () => {
      sut.renderSuggestion(headingSugg, mockParentEl);

      expect(mockParentEl.createDiv).toHaveBeenCalledWith(
        expect.objectContaining({
          cls: 'suggestion-note',
          text: stripMDExtensionFromPath(headingSugg.file),
        }),
      );
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
});
