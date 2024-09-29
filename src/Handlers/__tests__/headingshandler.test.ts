import { Searcher } from 'src/search';
import {
  App,
  BookmarksPluginFileItem,
  BookmarksPluginSearchItem,
  CachedMetadata,
  MetadataCache,
  renderResults,
  SearchResult,
  TAbstractFile,
  TFile,
  TFolder,
  Vault,
  ViewRegistry,
  Workspace,
  WorkspaceLeaf,
} from 'obsidian';
import { Handler, HeadingsHandler } from 'src/Handlers';
import { HeadingsListFacetIds, SwitcherPlusSettings } from 'src/settings';
import {
  getCachedMetadata,
  headingsTrigger,
  makeFuzzyMatch,
  makeHeading,
  makeLoc,
  makeLeaf,
  makeHeadingSuggestion,
} from '@fixtures';
import { InputInfo } from 'src/switcherPlus';
import {
  HeadingIndicators,
  HeadingSuggestion,
  FileSuggestion,
  Mode,
  AliasSuggestion,
  UnresolvedSuggestion,
  BookmarksItemInfo,
  BookmarksSuggestion,
  EditorSuggestion,
  SuggestionType,
  SearchQuery,
} from 'src/types';
import {
  isAliasSuggestion,
  isEditorSuggestion,
  isFileSuggestion,
  isHeadingSuggestion,
  isUnresolvedSuggestion,
} from 'src/utils';
import { mock, mockClear, MockProxy } from 'jest-mock-extended';

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

function resetCurrentWorkspaceEnvList(inputInfo: InputInfo): void {
  inputInfo.currentWorkspaceEnvList.openWorkspaceLeaves = new Set<WorkspaceLeaf>();
  inputInfo.currentWorkspaceEnvList.openWorkspaceFiles = new Set<TFile>();
  inputInfo.currentWorkspaceEnvList.nonFileBookmarks = new Set<BookmarksItemInfo>();
  inputInfo.currentWorkspaceEnvList.mostRecentFiles = new Set<TFile>();
  inputInfo.currentWorkspaceEnvList.attachmentFileExtensions = new Set<string>();
  inputInfo.currentWorkspaceEnvList.fileBookmarks = new Map<TFile, BookmarksItemInfo[]>();
}

describe('headingsHandler', () => {
  let sut: HeadingsHandler;
  let mockApp: MockProxy<App>;
  let mockWorkspace: MockProxy<Workspace>;
  let mockVault: MockProxy<Vault>;
  let mockMetadataCache: MockProxy<MetadataCache>;
  let mockViewRegistry: MockProxy<ViewRegistry>;
  let builtInSystemOptionsSpy: jest.SpyInstance;
  let modeTriggerSpy: jest.SpyInstance;
  let settings: SwitcherPlusSettings;
  let headingSugg: HeadingSuggestion;

  beforeAll(() => {
    mockWorkspace = mock<Workspace>();
    mockVault = mock<Vault>();
    mockMetadataCache = mock<MetadataCache>();
    mockViewRegistry = mock<ViewRegistry>();
    mockViewRegistry.isExtensionRegistered.mockReturnValue(true);

    mockApp = mock<App>({
      workspace: mockWorkspace,
      vault: mockVault,
      metadataCache: mockMetadataCache,
      viewRegistry: mockViewRegistry,
    });

    headingSugg = makeHeadingSuggestion(makeHeading('foo heading', 1), new TFile());
    settings = new SwitcherPlusSettings(null);
    sut = new HeadingsHandler(mockApp, settings);

    modeTriggerSpy = jest
      .spyOn(settings, 'headingsListCommand', 'get')
      .mockReturnValue(headingsTrigger);

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
    modeTriggerSpy.mockRestore();
  });

  describe('getCommandString', () => {
    it('should return headingsListCommand trigger', () => {
      const sut = new HeadingsHandler(mock<App>(), settings);
      expect(sut.getCommandString()).toBe(headingsTrigger);
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
    const filterText = 'foo';
    let inputInfo: InputInfo;
    const mockSearchQuery = mock<SearchQuery>();
    let parsedInputQuerySpy: jest.SpyInstance<SearchQuery, []>;
    let executeSearchSpy: jest.SpyInstance<SearchResult, [text: string]>;

    beforeAll(() => {
      executeSearchSpy = jest.spyOn(Searcher.prototype, 'executeSearch');

      inputInfo = new InputInfo(null, Mode.HeadingsList);
      parsedInputQuerySpy = jest
        .spyOn(inputInfo, 'parsedInputQuery', 'get')
        .mockReturnValue(mockSearchQuery);
    });

    beforeEach(() => {
      mockClear(mockSearchQuery);
      mockSearchQuery.hasSearchTerm = true;
      mockSearchQuery.query = filterText;

      executeSearchSpy.mockClear().mockImplementation((text) => {
        return text.startsWith(filterText) ? makeFuzzyMatch() : null;
      });

      resetCurrentWorkspaceEnvList(inputInfo);
    });

    afterAll(() => {
      parsedInputQuerySpy.mockRestore();
      executeSearchSpy.mockRestore();
    });

    test('with falsy input, it should return an empty array', () => {
      const results = sut.getSuggestions(null);

      expect(results).not.toBeNull();
      expect(results).toBeInstanceOf(Array);
      expect(results).toHaveLength(0);
    });

    it('should respect the max result limit setting', () => {
      mockSearchQuery.hasSearchTerm = true; // Ensure that .getItems() is called

      const suggs = [
        mock<FileSuggestion>(),
        mock<FileSuggestion>(),
        mock<FileSuggestion>(),
        mock<FileSuggestion>(),
      ];

      const getItemsSpy = jest
        .spyOn(sut, 'getItems')
        .mockImplementationOnce((_f, _i, coll) => {
          coll.push(...suggs);
        });

      const expectedLimit = 2;
      const limitSpy = jest
        .spyOn(settings, 'limit', 'get')
        .mockReturnValue(expectedLimit);

      const results = sut.getSuggestions(inputInfo);

      expect(results).toHaveLength(expectedLimit);

      getItemsSpy.mockRestore();
      limitSpy.mockRestore();
    });

    test('without any filter text, it should return open editors and the most recent opened file suggestions for headings mode', () => {
      const file1 = new TFile();
      const file2 = new TFile();
      const leaf = makeLeaf();
      leaf.view.file = file1;

      inputInfo.currentWorkspaceEnvList.openWorkspaceLeaves = new Set([leaf]);
      inputInfo.currentWorkspaceEnvList.mostRecentFiles = new Set([file2]);

      mockSearchQuery.hasSearchTerm = false; // Indicates no search term
      executeSearchSpy.mockReturnValue(makeFuzzyMatch());
      mockMetadataCache.getFileCache.mockReturnValue({});

      const results = sut.getSuggestions(inputInfo);

      expect(results).toHaveLength(2);
      expect(results.filter((v) => isFileSuggestion(v))).toHaveLength(1);
      expect(results.filter((v) => isEditorSuggestion(v))).toHaveLength(1);

      mockMetadataCache.getFileCache.mockReset();
    });

    test('with filter search term, it should return matching suggestions for all headings', () => {
      const expected = new TFile();
      const h1 = makeHeading('foo heading H1', 1, makeLoc(1));
      const h2 = makeHeading('foo heading H2', 2, makeLoc(2));

      mockVault.getRoot.mockReturnValueOnce(makeFileTree(expected));

      mockMetadataCache.getFileCache.mockImplementation((f: TFile) => {
        return f === expected ? { headings: [h1, h2] } : getCachedMetadata();
      });

      const results = sut.getSuggestions(inputInfo);
      expect(results).toHaveLength(2);
      expect(results.every((r) => isHeadingSuggestion(r))).toBe(true);
      expect((results[0] as HeadingSuggestion).file).toBe(expected);
      expect(mockVault.getRoot).toHaveBeenCalled();
      expect(mockMetadataCache.getFileCache).toHaveBeenCalled();
      expect(builtInSystemOptionsSpy).toHaveBeenCalled();
      expect(
        results.every((r: HeadingSuggestion) => r.item === h1 || r.item === h2),
      ).toBe(true);

      mockMetadataCache.getFileCache.mockReset();
    });

    test('with filter search term, and searchAllHeadings set to false, it should return only matching suggestions using first H1 in file', () => {
      const expected = new TFile();
      const expectedHeading = makeHeading('foo heading H1', 1, makeLoc(1));
      const heading2 = makeHeading('foo heading H1', 1, makeLoc(2));

      const searchAllHeadingsSpy = jest
        .spyOn(settings, 'searchAllHeadings', 'get')
        .mockReturnValue(false);

      mockVault.getRoot.mockReturnValueOnce(makeFileTree(expected));

      mockMetadataCache.getFileCache.mockImplementation((f: TFile) => {
        return f === expected
          ? { headings: [expectedHeading, heading2] }
          : getCachedMetadata();
      });

      const results = sut.getSuggestions(inputInfo);
      expect(results).toHaveLength(1);

      const result = results[0] as HeadingSuggestion;
      expect(isHeadingSuggestion(result)).toBe(true);
      expect(result.file).toBe(expected);
      expect(result.item).toBe(expectedHeading);

      expect(mockVault.getRoot).toHaveBeenCalled();
      expect(mockMetadataCache.getFileCache).toHaveBeenCalled();
      expect(builtInSystemOptionsSpy).toHaveBeenCalled();

      mockMetadataCache.getFileCache.mockReset();
      searchAllHeadingsSpy.mockRestore();
    });

    test("with filter search term, it should return matching suggestions using file name (leaf segment) when H1 doesn't exist", () => {
      const expected = new TFile();
      expected.basename = `${filterText} filename`; // only filename matters for this

      mockVault.getRoot.mockReturnValueOnce(makeFileTree(expected));

      mockMetadataCache.getFileCache.mockImplementation((f: TFile) => {
        // don't return any heading metadata for expected
        return f === expected ? {} : getCachedMetadata();
      });

      const results = sut.getSuggestions(inputInfo);
      expect(results).toHaveLength(1);

      const result = results[0];
      expect(isFileSuggestion(result)).toBe(true);
      expect((result as FileSuggestion).file).toBe(expected);
      expect(mockVault.getRoot).toHaveBeenCalled();
      expect(mockMetadataCache.getFileCache).toHaveBeenCalled();
      expect(builtInSystemOptionsSpy).toHaveBeenCalled();

      mockMetadataCache.getFileCache.mockReset();
    });

    test('with filter search term, it should return matching suggestions using file name (leaf segment) when H1 exist but does not match', () => {
      const filename = `${filterText} filename`; // only filename matters for this test

      const expectedFile = new TFile();
      expectedFile.basename = filename;

      mockMetadataCache.getFileCache.calledWith(expectedFile).mockReturnValue({
        headings: [makeHeading("words that don't match", 1)],
      });

      mockVault.getRoot.mockReturnValueOnce(makeFileTree(expectedFile));

      const results = sut.getSuggestions(inputInfo);
      expect(results).toHaveLength(1);

      const result = results[0] as FileSuggestion;
      expect(isFileSuggestion(result)).toBe(true);
      expect(result.file).toBe(expectedFile);
      expect(mockMetadataCache.getFileCache).toHaveBeenCalledWith(expectedFile);

      mockMetadataCache.getFileCache.mockReset();
    });

    test('with shouldSearchFilenames enabled, it should return matching suggestions using file name even when there is an H1 match', () => {
      const filename = `${filterText} filename`; // only filename matters for this
      const expectedFile = new TFile();
      expectedFile.basename = filename;

      const shouldSearchFilenameSpy = jest
        .spyOn(settings, 'shouldSearchFilenames', 'get')
        .mockReturnValue(true);

      mockMetadataCache.getFileCache.calledWith(expectedFile).mockReturnValue({
        headings: [makeHeading(filterText, 1)], // <-- ensure heading match
      });

      mockVault.getRoot.mockReturnValueOnce(makeFileTree(expectedFile));

      const results = sut.getSuggestions(inputInfo);
      expect(results).toHaveLength(2);

      const H1Sugg = results.find(isHeadingSuggestion);
      const fileSugg = results.find(isFileSuggestion);
      expect(H1Sugg).not.toBeFalsy();
      expect(fileSugg).not.toBeFalsy();
      expect(fileSugg.file).toBe(expectedFile);
      expect(mockMetadataCache.getFileCache).toHaveBeenCalledWith(expectedFile);

      mockMetadataCache.getFileCache.mockReset();
      shouldSearchFilenameSpy.mockRestore();
    });

    test('with filter search term, it should fallback match against file path when there is no H1 match and no match against the basename', () => {
      const path = `path/${filterText}/bar`; // only path matters for this test

      const expectedFile = new TFile();
      expectedFile.path = path;

      mockMetadataCache.getFileCache.calledWith(expectedFile).mockReturnValue({
        headings: [makeHeading("words that don't match", 1)],
      });

      mockVault.getRoot.mockReturnValueOnce(makeFileTree(expectedFile));

      executeSearchSpy.mockImplementation((text: string) => {
        return text === path ? makeFuzzyMatch() : null;
      });

      const results = sut.getSuggestions(inputInfo);
      expect(results).toHaveLength(1);

      const result = results[0] as FileSuggestion;
      expect(isFileSuggestion(result)).toBe(true);
      expect(result.file).toBe(expectedFile);
      expect(mockMetadataCache.getFileCache).toHaveBeenCalledWith(expectedFile);

      mockMetadataCache.getFileCache.mockReset();
    });

    test('with filter search term and shouldShowAlias set to true, it should match against aliases', () => {
      const expected = new TFile();

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

      const results = sut.getSuggestions(inputInfo);
      expect(results).toHaveLength(1);

      const result = results[0];
      expect(isAliasSuggestion(result)).toBe(true);
      expect((result as AliasSuggestion).file).toBe(expected);
      expect(mockVault.getRoot).toHaveBeenCalled();
      expect(mockMetadataCache.getFileCache).toHaveBeenCalled();
      expect(builtInSystemOptionsSpy).toHaveBeenCalled();

      settings.shouldShowAlias = false;
      mockMetadataCache.getFileCache.mockReset();
    });

    test('with filter search term and shouldSearchBookmarks enabled, it should match against bookmarks', () => {
      const expected = new TFile();

      mockVault.getRoot.mockReturnValueOnce(makeFileTree(expected));
      settings.shouldSearchBookmarks = true;

      const fileBookmark = mock<BookmarksItemInfo>({
        item: mock<BookmarksPluginFileItem>(),
        bookmarkPath: filterText,
      });

      const searchBookmark = mock<BookmarksItemInfo>({
        item: mock<BookmarksPluginSearchItem>(),
        bookmarkPath: filterText,
      });

      inputInfo.currentWorkspaceEnvList.nonFileBookmarks = new Set([searchBookmark]);
      inputInfo.currentWorkspaceEnvList.fileBookmarks = new Map([
        [expected, [fileBookmark]],
      ]);

      const results = sut.getSuggestions(inputInfo);
      expect(results).toHaveLength(2);

      const fileResult = results.find(
        (v: BookmarksSuggestion) => v.item === fileBookmark.item,
      );

      const searchResult = results.find(
        (v: BookmarksSuggestion) => v.item === searchBookmark.item,
      );

      expect(fileResult).not.toBeNull();
      expect(searchResult).not.toBeNull();
    });

    test('with filter search term and showExistingOnly set to false, it should match against unresolved linktext', () => {
      const expected = new TFile();

      mockVault.getRoot.mockReturnValueOnce(makeFileTree(expected));

      mockMetadataCache.unresolvedLinks[expected.path] = {
        'foo link noexist': 1,
        'another link': 1,
      };

      const results = sut.getSuggestions(inputInfo);
      expect(results).toHaveLength(1);

      const result = results[0];
      expect(isUnresolvedSuggestion(result)).toBe(true);
      expect((result as UnresolvedSuggestion).linktext).toBe('foo link noexist');
      expect(mockVault.getRoot).toHaveBeenCalled();
      expect(builtInSystemOptionsSpy).toHaveBeenCalled();

      mockMetadataCache.unresolvedLinks = {};
    });

    test('with filter search term and strictHeadingsOnly enabled, it should not match against file name, or path when there is no H1', () => {
      const expected = new TFile();
      expected.path = 'foo/path/to/filename.md'; // only path matters for this test

      mockVault.getRoot.mockReturnValueOnce(makeFileTree(expected));
      mockMetadataCache.getFileCache.mockReturnValue({});

      const strictHeadingsOnlySpy = jest
        .spyOn(settings, 'strictHeadingsOnly', 'get')
        .mockReturnValue(true);

      const results = sut.getSuggestions(inputInfo);
      expect(results).toHaveLength(0);
      expect(mockVault.getRoot).toHaveBeenCalled();
      expect(mockMetadataCache.getFileCache).toHaveBeenCalled();
      expect(builtInSystemOptionsSpy).toHaveBeenCalled();
      expect(strictHeadingsOnlySpy).toHaveBeenCalled();

      mockMetadataCache.getFileCache.mockReset();
      strictHeadingsOnlySpy.mockRestore();
    });

    it('should not return suggestions from excluded folders', () => {
      const excludedFolderName = 'ignored';
      const h1 = makeHeading('foo heading H1', 1, makeLoc(1));
      const expected = new TFile();
      expected.path = 'foo/path/to/foo filename.md';

      mockVault.getRoot.mockReturnValueOnce(makeFileTree(expected, excludedFolderName));

      mockMetadataCache.getFileCache.mockImplementation((f: TFile) => {
        return f === expected ? { headings: [h1] } : {};
      });

      const excludeFoldersSpy = jest
        .spyOn(settings, 'excludeFolders', 'get')
        .mockReturnValue([excludedFolderName]);

      const results = sut.getSuggestions(inputInfo);
      expect(results).toHaveLength(0);
      expect(mockVault.getRoot).toHaveBeenCalled();
      expect(mockMetadataCache.getFileCache).toHaveBeenCalled();
      expect(builtInSystemOptionsSpy).toHaveBeenCalled();

      mockMetadataCache.getFileCache.mockReset();
      excludeFoldersSpy.mockRestore();
    });
  });

  describe('renderSuggestion', () => {
    it('should not throw an error with a null suggestion', () => {
      expect(() => sut.renderSuggestion(null, null)).not.toThrow();
    });

    it('should render the heading level indicator', () => {
      const renderIndicatorSpy = jest.spyOn(sut, 'renderIndicator');

      const mockFlairContainerEl = mock<HTMLDivElement>();
      const createFlairContainerSpy = jest
        .spyOn(sut, 'createFlairContainer')
        .mockReturnValueOnce(mockFlairContainerEl);

      const mockParentEl = mock<HTMLElement>();
      mockParentEl.createDiv.mockReturnValue(mock<HTMLDivElement>());

      const sugg = makeHeadingSuggestion(makeHeading('foo heading', 1));

      sut.renderSuggestion(sugg, mockParentEl);

      expect(renderIndicatorSpy).toHaveBeenCalledWith(
        mockFlairContainerEl,
        ['qsp-headings-indicator'],
        null,
        HeadingIndicators[sugg.item.level],
      );

      renderIndicatorSpy.mockRestore();
      createFlairContainerSpy.mockRestore();
    });

    test('with HeadingCache, it should render a suggestion with match offsets', () => {
      const mockRenderResults = jest.mocked<typeof renderResults>(renderResults);
      mockRenderResults.mockClear();

      const mockContentEl = mock<HTMLDivElement>();
      const mockParentEl = mock<HTMLElement>();
      mockParentEl.createDiv.mockReturnValue(mockContentEl);

      const renderPathSpy = jest
        .spyOn(Handler.prototype, 'renderPath')
        .mockReturnValueOnce();

      sut.renderSuggestion(headingSugg, mockParentEl);

      expect(renderPathSpy).toHaveBeenCalledWith(mockContentEl, headingSugg.file);

      // Check that the first call to renderResults has the expected content passed in
      expect(mockRenderResults.mock.calls[0][1]).toBe(headingSugg.item.heading);
      expect(mockRenderResults.mock.calls[0][2]).toBe(headingSugg.match);

      expect(mockParentEl.addClasses).toHaveBeenCalledWith(
        expect.arrayContaining([
          'mod-complex',
          'qsp-suggestion-headings',
          `qsp-headings-l${headingSugg.item.level}`,
        ]),
      );

      mockRenderResults.mockRestore();
      renderPathSpy.mockRestore();
    });

    it('should add CSS class to downranked suggestions', () => {
      const mockParentEl = mock<HTMLElement>();
      mockParentEl.createDiv.mockReturnValue(mock<HTMLDivElement>());
      const sugg = makeHeadingSuggestion(makeHeading('foo heading', 1));
      sugg.downranked = true;

      sut.renderSuggestion(sugg, mockParentEl);

      expect(mockParentEl.addClass).toHaveBeenCalledWith('mod-downranked');
    });

    it('.renderHeadingContent() should render markdown content when the config setting is enabled and the override is disabled', () => {
      const file = new TFile();
      const mockTitleEl = mock<HTMLElement>();
      const mockConfig = mock<SwitcherPlusSettings>({
        renderMarkdownContentInSuggestions: { isEnabled: true, renderHeadings: true },
      });

      const heading = makeHeading(
        'Unit Test: markdown should render based on config settings',
        1,
      );

      const renderMarkdownSpy = jest
        .spyOn(Handler, 'renderMarkdownContentAsync')
        .mockReturnValueOnce();

      // Note: omit the optional renderAsHTMLOverride param
      HeadingsHandler.renderHeadingContent(
        mockApp,
        mockConfig,
        mockTitleEl,
        heading,
        file,
      );

      expect(renderMarkdownSpy).toHaveBeenCalledWith(
        mockApp,
        mockTitleEl,
        heading.heading,
        file.path,
      );

      renderMarkdownSpy.mockRestore();
    });

    it('.renderHeadingContent() should render markdown content when the override is enabled', () => {
      const file = new TFile();
      const mockTitleEl = mock<HTMLElement>();
      const mockConfig = mock<SwitcherPlusSettings>({
        // Note: disable the config settings
        renderMarkdownContentInSuggestions: { isEnabled: false, renderHeadings: false },
      });

      const heading = makeHeading(
        'Unit Test: markdown should render based on override',
        1,
      );

      const renderMarkdownSpy = jest
        .spyOn(Handler, 'renderMarkdownContentAsync')
        .mockReturnValueOnce();

      HeadingsHandler.renderHeadingContent(
        mockApp,
        mockConfig,
        mockTitleEl,
        heading,
        file,
        null,
        true, // Enable override
      );

      expect(renderMarkdownSpy).toHaveBeenCalledWith(
        mockApp,
        mockTitleEl,
        heading.heading,
        file.path,
      );

      renderMarkdownSpy.mockRestore();
    });
  });

  describe('onChooseSuggestion', () => {
    beforeAll(() => {
      const fileContainerLeaf = makeLeaf();
      fileContainerLeaf.openFile.mockResolvedValueOnce();
      mockWorkspace.getLeaf.mockReturnValueOnce(fileContainerLeaf);
    });

    it('should not throw an error with a null suggestion', () => {
      expect(() => sut.onChooseSuggestion(null, null)).not.toThrow();
    });

    it('should open the file associated with the suggestion', () => {
      const mockEvt = mock<KeyboardEvent>();
      const navigateToLeafOrOpenFileSpy = jest.spyOn(
        Handler.prototype,
        'navigateToLeafOrOpenFile',
      );

      sut.onChooseSuggestion(headingSugg, mockEvt);

      expect(navigateToLeafOrOpenFileSpy).toHaveBeenCalledWith(
        mockEvt,
        headingSugg.file,
        expect.any(String),
        expect.anything(),
      );

      navigateToLeafOrOpenFileSpy.mockRestore();
    });
  });

  describe('shouldIncludeFile', () => {
    let excludeObsidianIgnoredFilesSpy: jest.SpyInstance;

    beforeAll(() => {
      excludeObsidianIgnoredFilesSpy = jest.spyOn(
        settings,
        'excludeObsidianIgnoredFiles',
        'get',
      );
    });

    afterAll(() => {
      excludeObsidianIgnoredFilesSpy.mockRestore();
    });

    it('should not throw on falsy input', () => {
      expect((): void => {
        sut.shouldIncludeFile(null);
      }).not.toThrow();
    });

    test('with excludeObsidianIgnoredFiles set to true, it should return false for user ignored files', () => {
      const mockFile = new TFile();

      excludeObsidianIgnoredFilesSpy.mockReturnValueOnce(true);
      mockMetadataCache.isUserIgnored.calledWith(mockFile.path).mockReturnValueOnce(true);

      const result = sut.shouldIncludeFile(mockFile);

      expect(result).toBe(false);
      expect(mockMetadataCache.isUserIgnored).toHaveBeenCalledWith(mockFile.path);

      mockMetadataCache.isUserIgnored.mockReset();
    });

    test('with excludeObsidianIgnoredFiles set to false, it should return true for user ignored files', () => {
      const mockFile = new TFile();

      excludeObsidianIgnoredFilesSpy.mockReturnValueOnce(false);
      mockMetadataCache.isUserIgnored.calledWith(mockFile.path).mockReturnValueOnce(true);

      const result = sut.shouldIncludeFile(mockFile);

      expect(result).toBe(true);

      mockMetadataCache.isUserIgnored.mockReset();
    });

    test('with showAttachments set to false, it should return true for files with .md extension', () => {
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
    });

    it('should return true for files in the allowlist', () => {
      const ext = 'test';
      const { fileExtAllowList } = settings;
      fileExtAllowList.push(ext);

      const mockFile = new TFile();
      mockFile.extension = ext;

      mockViewRegistry.isExtensionRegistered.mockReturnValueOnce(false);
      mockMetadataCache.isUserIgnored
        .calledWith(mockFile.path)
        .mockReturnValueOnce(false);

      builtInSystemOptionsSpy.mockReturnValueOnce({
        showAllFileTypes: false,
        showAttachments: false,
        showExistingOnly: false,
      });

      const result = sut.shouldIncludeFile(mockFile);

      expect(result).toBe(true);

      mockViewRegistry.isExtensionRegistered.mockReset();
      mockMetadataCache.isUserIgnored.mockReset();
      fileExtAllowList.splice(fileExtAllowList.indexOf(ext), 1);
    });

    test('when faceted with ExternalFiles, it should return false for .md files', () => {
      const activeFacets = new Set([HeadingsListFacetIds.ExternalFiles]);
      const file = new TFile();

      excludeObsidianIgnoredFilesSpy.mockReturnValueOnce(false);

      const result = sut.shouldIncludeFile(file, activeFacets);

      expect(result).toBe(false);
    });

    test('when faceted with ExternalFiles, it should return false if external files are disabled', () => {
      const activeFacets = new Set([HeadingsListFacetIds.ExternalFiles]);
      const file = new TFile();
      file.extension = 'test';

      excludeObsidianIgnoredFilesSpy.mockReturnValueOnce(false);
      builtInSystemOptionsSpy.mockReturnValueOnce({
        showAllFileTypes: false,
        showAttachments: false,
        showExistingOnly: false,
      });

      const result = sut.shouldIncludeFile(file, activeFacets);

      expect(result).toBe(false);
    });
  });

  describe('Facet Handling', () => {
    let inputInfo: InputInfo;
    const fileData = [new TFile(), new TFile(), new TFile()];
    let parsedInputQuerySpy: jest.SpyInstance<SearchQuery, []>;
    let executeSearchSpy: jest.SpyInstance<SearchResult, [text: string]>;

    beforeAll(() => {
      executeSearchSpy = jest
        .spyOn(Searcher.prototype, 'executeSearch')
        .mockReturnValue(makeFuzzyMatch());

      inputInfo = new InputInfo(null, Mode.HeadingsList);
      parsedInputQuerySpy = jest
        .spyOn(inputInfo, 'parsedInputQuery', 'get')
        .mockReturnValue(mock<SearchQuery>({ hasSearchTerm: true, query: null }));
    });

    beforeEach(() => {
      resetCurrentWorkspaceEnvList(inputInfo);
    });

    afterAll(() => {
      parsedInputQuerySpy.mockRestore();
      executeSearchSpy.mockRestore();
    });

    test('when faceted with .RecentFiles, .getSuggestionsForEditorsAndRecentFiles should return recent files but not WorkspaceLeaves', () => {
      const { currentWorkspaceEnvList } = inputInfo;
      const expectedFile = new TFile();
      const leaf = makeLeaf();
      currentWorkspaceEnvList.mostRecentFiles = new Set([expectedFile]);
      currentWorkspaceEnvList.openWorkspaceLeaves = new Set<WorkspaceLeaf>([leaf]);

      const results: FileSuggestion[] = [];
      sut.getSuggestionsForEditorsAndRecentFiles(
        inputInfo,
        results,
        new Set<string>([HeadingsListFacetIds.RecentFiles]),
        {
          editors: true,
          recentFiles: false, // Expect to be overriden by facet
        },
      );

      expect(results).toHaveLength(1);
      expect(results[0].file).toBe(expectedFile);
    });

    test('when faceted with .Bookmarks, .getItems should return only BookmarksSuggestion', () => {
      const facetIds = new Set([HeadingsListFacetIds.Bookmarks]);
      const fileBookmark = mock<BookmarksItemInfo>({ item: { type: 'file' } });
      const searchBookmark = mock<BookmarksItemInfo>({ item: { type: 'search' } });

      const { currentWorkspaceEnvList } = inputInfo;
      currentWorkspaceEnvList.nonFileBookmarks = new Set([searchBookmark]);
      currentWorkspaceEnvList.fileBookmarks = new Map<TFile, BookmarksItemInfo[]>([
        [fileBookmark.file, [fileBookmark]],
      ]);

      const results: BookmarksSuggestion[] = [];
      sut.getItems(fileData, inputInfo, results, facetIds, {
        headings: true,
        allHeadings: true,
        aliases: true,
        bookmarks: false, // Expect to be overriden by facet
        filename: true,
        filenameAsFallback: true,
        unresolved: true,
      });

      expect(results).toHaveLength(2);
      expect(results[0].item).toBe(fileBookmark.item);
      expect(results[1].item).toBe(searchBookmark.item);
      expect(results.every((result) => result.type === SuggestionType.Bookmark)).toBe(
        true,
      );
    });

    test('when faceted with .ExternalFiles, .getItems should only return files with non-core file extensions', () => {
      const facetIds = new Set([HeadingsListFacetIds.ExternalFiles]);
      const expectedFile = new TFile();
      expectedFile.extension = 'testExtension';

      const results: FileSuggestion[] = [];
      sut.getItems([expectedFile, ...fileData], inputInfo, results, facetIds, {
        headings: true,
        allHeadings: true,
        aliases: true,
        bookmarks: true,
        filename: false, // Expect to be overriden by facet
        filenameAsFallback: false,
        unresolved: true,
      });

      expect(results).toHaveLength(1);
      expect(results[0].file).toBe(expectedFile);
    });

    test('when faceted with .Filenames, .getItems should return only FileSuggestions', () => {
      mockMetadataCache.getFileCache.mockClear();

      const facetIds = new Set([HeadingsListFacetIds.Filenames]);
      const expectedFile = new TFile();

      const results: FileSuggestion[] = [];
      sut.getItems([expectedFile], inputInfo, results, facetIds, {
        headings: true,
        allHeadings: true,
        aliases: true,
        bookmarks: true,
        filename: false, // Expect to be overriden by facet
        filenameAsFallback: false,
        unresolved: true,
      });

      expect(results).toHaveLength(1);
      expect(results[0].file).toBe(expectedFile);
      expect(results[0].type).toBe(SuggestionType.File);

      // expected not to be callled because it's needed for other suggestion
      // types e.g. headings, aliases
      expect(mockMetadataCache.getFileCache).not.toHaveBeenCalled();
    });

    test('when faceted with .Headings, .getItems should return only HeadingSuggestions', () => {
      mockMetadataCache.getFileCache.mockClear();

      const facetIds = new Set([HeadingsListFacetIds.Headings]);
      const expectedFile = new TFile();

      const mockMetadata = mock<CachedMetadata>({ headings: [makeHeading('H1', 1)] });

      mockMetadataCache.getFileCache
        .calledWith(expectedFile)
        .mockReturnValueOnce(mockMetadata);

      const results: HeadingSuggestion[] = [];
      sut.getItems([expectedFile, ...fileData], inputInfo, results, facetIds, {
        headings: false, // Expect to be overriden by facet
        allHeadings: true,
        aliases: true,
        bookmarks: true,
        filename: true,
        filenameAsFallback: false, // disable filename search for files that don't match
        unresolved: true,
      });

      expect(results).toHaveLength(1);
      expect(results[0].file).toBe(expectedFile);
      expect(results[0].type).toBe(SuggestionType.HeadingsList);
      expect(results[0].item).toBe(mockMetadata.headings[0]);

      mockMetadataCache.getFileCache.mockReset();
    });
  });

  describe('getSuggestionsForEditorsAndRecentFiles', () => {
    let inputInfo: InputInfo;
    const fileData = [new TFile(), new TFile(), new TFile()];
    let parsedInputQuerySpy: jest.SpyInstance<SearchQuery, []>;
    let executeSearchSpy: jest.SpyInstance<SearchResult, [text: string]>;

    beforeAll(() => {
      executeSearchSpy = jest
        .spyOn(Searcher.prototype, 'executeSearch')
        .mockReturnValue(makeFuzzyMatch());

      inputInfo = new InputInfo(null, Mode.HeadingsList);
      parsedInputQuerySpy = jest
        .spyOn(inputInfo, 'parsedInputQuery', 'get')
        .mockReturnValue(mock<SearchQuery>({ hasSearchTerm: true, query: null }));
    });

    beforeEach(() => {
      resetCurrentWorkspaceEnvList(inputInfo);
    });

    afterAll(() => {
      parsedInputQuerySpy.mockRestore();
      executeSearchSpy.mockRestore();
    });

    it('should return heading suggestions for recent files', () => {
      const expectedFiles = new Set(fileData);
      inputInfo.currentWorkspaceEnvList.mostRecentFiles = expectedFiles;

      mockMetadataCache.getFileCache.mockReturnValue(getCachedMetadata());

      const results: (HeadingSuggestion | FileSuggestion)[] = [];
      sut.getSuggestionsForEditorsAndRecentFiles(inputInfo, results, new Set<string>(), {
        editors: false,
        recentFiles: true,
      });

      expect(results).toHaveLength(fileData.length);
      expect(mockMetadataCache.getFileCache).toHaveBeenCalled();
      expect(results.every((sugg) => expectedFiles.has(sugg.file))).toBe(true);
      expect(results.every((sugg) => isHeadingSuggestion(sugg))).toBe(true);
      expect(results.every((sugg) => sugg.isRecent)).toBe(true);

      mockMetadataCache.getFileCache.mockReset();
    });

    it('should return file suggestions for recent files without headings', () => {
      const results: (HeadingSuggestion | FileSuggestion)[] = [];
      const expectedFiles = new Set(fileData);
      inputInfo.currentWorkspaceEnvList.mostRecentFiles = expectedFiles;

      mockMetadataCache.getFileCache.mockReturnValue({});

      sut.getSuggestionsForEditorsAndRecentFiles(inputInfo, results, new Set<string>(), {
        editors: false,
        recentFiles: true,
      });

      expect(results).toHaveLength(fileData.length);
      expect(mockMetadataCache.getFileCache).toHaveBeenCalled();
      expect(results.every((sugg) => expectedFiles.has(sugg.file))).toBe(true);
      expect(results.every((sugg) => isFileSuggestion(sugg))).toBe(true);
      expect(results.every((sugg) => sugg.isRecent)).toBe(true);

      mockMetadataCache.getFileCache.mockReset();
    });

    it('should return editor suggestions with optional indicator', () => {
      const leaf = makeLeaf();
      inputInfo.currentWorkspaceEnvList.openWorkspaceLeaves = new Set<WorkspaceLeaf>([
        leaf,
      ]);

      inputInfo.currentWorkspaceEnvList.openWorkspaceFiles = new Set<TFile>([
        leaf.view.file,
      ]);

      const results: EditorSuggestion[] = [];
      sut.getSuggestionsForEditorsAndRecentFiles(inputInfo, results, new Set<string>(), {
        editors: true,
        recentFiles: false,
      });

      expect(results).toHaveLength(1);
      expect(results.every((sugg) => sugg.isOpenInEditor)).toBe(true);
    });
  });

  describe('getAvailableFacets', () => {
    let sut: HeadingsHandler;
    const inputInfo = new InputInfo('', Mode.HeadingsList);
    let searchBookmarksSpy: jest.SpyInstance;

    beforeAll(() => {
      sut = new HeadingsHandler(mock<App>(), settings);
      searchBookmarksSpy = jest.spyOn(settings, 'shouldSearchBookmarks', 'get');
    });

    afterAll(() => {
      searchBookmarksSpy.mockRestore();
    });

    it('should return a facet as available for a feature that is enabled', () => {
      const expectedFacetId: string = HeadingsListFacetIds.Bookmarks;

      // Enable the feature to allow searching through bookmarks
      searchBookmarksSpy.mockReturnValueOnce(true);

      const results = sut.getAvailableFacets(inputInfo);

      expect(results.find((facet) => facet.id === expectedFacetId)).toBeTruthy();
    });

    it('should not return a facet for a feature that is disabled', () => {
      const expectedFacetId: string = HeadingsListFacetIds.Bookmarks;

      // Enable the feature to allow searching through bookmarks
      searchBookmarksSpy.mockReturnValueOnce(false);

      const results = sut.getAvailableFacets(inputInfo);

      expect(results.find((facet) => facet.id === expectedFacetId)).toBe(undefined);
    });
  });
});
