import { SwitcherPlusSettings } from 'src/settings';
import { InputInfo, SourcedParsedCommand } from 'src/switcherPlus';
import { Handler, RelatedItemsHandler } from 'src/Handlers';
import { Mode, RelatedItemsInfo, RelationType, SuggestionType } from 'src/types';
import {
  WorkspaceLeaf,
  App,
  MetadataCache,
  Workspace,
  TFile,
  Vault,
  TAbstractFile,
  TFolder,
  prepareQuery,
  fuzzySearch,
  PreparedQuery,
  SearchResult,
} from 'obsidian';
import {
  rootSplitEditorFixtures,
  relatedItemsTrigger,
  makeFileStarredItem,
  makeAliasSuggestion,
  makeLeaf,
  makeFuzzyMatch,
  makePreparedQuery,
  makeEditorSuggestion,
  makeRelatedItemsSuggestion,
  makeStarredSuggestion,
  makeUnresolvedSuggestion,
} from '@fixtures';
import { mock, MockProxy } from 'jest-mock-extended';

const file1 = new TFile();
const file2 = new TFile();
const file3 = new TFile();
const file4 = new TFile();

function makeFileTree(sourceFile: TFile): TFolder {
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
    file1,
    sourceFile,
    file2,
    new mockFolder('l1Folder1', 'l1Folder1', [
      file3,
      new mockFolder('l2Folder1', 'l1Folder1/l2Folder1', [file4]),
    ]),
  ]);

  return root;
}

function makeBacklink(
  origin: TFile,
  dest: TFile,
  count?: number,
): Record<string, Record<string, number>> {
  const payload: Record<string, number> = {};
  count = count ?? 1;
  payload[dest.path] = count;

  const backlink: Record<string, Record<string, number>> = {};
  backlink[origin.path] = payload;

  return backlink;
}

describe('relatedItemsHandler', () => {
  const rootFixture = rootSplitEditorFixtures[0];
  let settings: SwitcherPlusSettings;
  let mockApp: MockProxy<App>;
  let mockWorkspace: MockProxy<Workspace>;
  let sut: RelatedItemsHandler;
  let mockMetadataCache: MockProxy<MetadataCache>;
  let mockRootSplitLeaf: MockProxy<WorkspaceLeaf>;
  let filterText: string;

  beforeAll(() => {
    mockMetadataCache = mock<MetadataCache>({});
    mockMetadataCache.getFileCache.mockImplementation((_f) => rootFixture.cachedMetadata);

    mockWorkspace = mock<Workspace>();
    mockApp = mock<App>({
      workspace: mockWorkspace,
      metadataCache: mockMetadataCache,
      vault: mock<Vault>(),
    });

    settings = new SwitcherPlusSettings(null);
    jest
      .spyOn(settings, 'relatedItemsListCommand', 'get')
      .mockReturnValue(relatedItemsTrigger);

    const rootSplitSourceFile = new TFile();
    rootSplitSourceFile.parent = makeFileTree(rootSplitSourceFile);

    mockRootSplitLeaf = makeLeaf();
    mockRootSplitLeaf.view.file = rootSplitSourceFile;
  });

  beforeEach(() => {
    // reset for each test because symbol mode will use saved data from previous runs
    sut = new RelatedItemsHandler(mockApp, settings);
  });

  describe('commandString', () => {
    it('should return relatedItemsListCommand trigger', () => {
      expect(sut.commandString).toBe(relatedItemsTrigger);
    });
  });

  describe('validateCommand', () => {
    filterText = 'foo';

    it('should validate parsed input in prefix (active editor) mode', () => {
      const inputInfo = new InputInfo(`${relatedItemsTrigger}${filterText}`);

      sut.validateCommand(inputInfo, 0, filterText, null, mockRootSplitLeaf);

      expect(inputInfo.mode).toBe(Mode.RelatedItemsList);

      const cmd = inputInfo.parsedCommand();
      expect(cmd.parsedInput).toBe(filterText);
      expect(cmd.isValidated).toBe(true);
    });

    it('should validate parsed input for file based suggestion', () => {
      const targetFile = new TFile();
      const inputInfo = new InputInfo('', Mode.Standard);
      const sugg = makeAliasSuggestion(targetFile, 'foo');

      sut.validateCommand(inputInfo, 0, '', sugg, null);

      expect(inputInfo.mode).toBe(Mode.RelatedItemsList);

      const cmd = inputInfo.parsedCommand() as SourcedParsedCommand;
      expect(cmd.isValidated).toBe(true);
      expect(cmd.source).toEqual(
        expect.objectContaining({
          file: targetFile,
          leaf: null,
          suggestion: sugg,
          isValidSource: true,
        }),
      );
    });

    it('should validate parsed input for editor suggestion', () => {
      const targetLeaf = makeLeaf();
      const inputInfo = new InputInfo('', Mode.EditorList);

      // set the target as a currently open leaf
      mockWorkspace.getMostRecentLeaf.mockReturnValueOnce(targetLeaf);

      const sugg = makeEditorSuggestion(targetLeaf, targetLeaf.view.file);

      sut.validateCommand(inputInfo, 0, '', sugg, null);

      expect(inputInfo.mode).toBe(Mode.RelatedItemsList);

      const cmd = inputInfo.parsedCommand() as SourcedParsedCommand;
      expect(cmd.isValidated).toBe(true);
      expect(cmd.source).toEqual(
        expect.objectContaining({
          file: targetLeaf.view.file,
          leaf: targetLeaf,
          suggestion: sugg,
          isValidSource: true,
        }),
      );
    });

    it('should validate parsed input for starred file suggestion', () => {
      const targetFile = new TFile();
      const inputInfo = new InputInfo('', Mode.StarredList);
      const item = makeFileStarredItem(targetFile.basename);
      const sugg = makeStarredSuggestion(item, targetFile);

      (mockApp.vault as MockProxy<Vault>).getAbstractFileByPath
        .calledWith(targetFile.path)
        .mockReturnValueOnce(targetFile);

      sut.validateCommand(inputInfo, 0, '', sugg, null);

      expect(inputInfo.mode).toBe(Mode.RelatedItemsList);

      const cmd = inputInfo.parsedCommand() as SourcedParsedCommand;
      expect(cmd.isValidated).toBe(true);
      expect(cmd.source).toEqual(
        expect.objectContaining({
          file: targetFile,
          leaf: null,
          suggestion: sugg,
          isValidSource: true,
        }),
      );
    });

    it('should validate and identify active editor as matching the file suggestion target', () => {
      const targetLeaf = makeLeaf();
      const inputInfo = new InputInfo('', Mode.Standard);
      const sugg = makeAliasSuggestion(targetLeaf.view.file, 'foo');

      // set the target as a currently open leaf
      const getActiveLeafSpy = jest
        .spyOn(Handler.prototype, 'getActiveLeaf')
        .mockReturnValueOnce(targetLeaf);

      sut.validateCommand(inputInfo, 0, '', sugg, null);

      expect(inputInfo.mode).toBe(Mode.RelatedItemsList);
      expect(getActiveLeafSpy).toHaveBeenCalled();

      const cmd = inputInfo.parsedCommand() as SourcedParsedCommand;
      expect(cmd.isValidated).toBe(true);
      expect(cmd.source).toEqual(
        expect.objectContaining({
          file: targetLeaf.view.file,
          leaf: targetLeaf,
          suggestion: sugg,
          isValidSource: true,
        }),
      );

      getActiveLeafSpy.mockRestore();
    });

    it('should validate and identify in-active editor as matching the file suggestion target file', () => {
      const targetLeaf = makeLeaf();
      const inputInfo = new InputInfo('', Mode.Standard);
      const sugg = makeAliasSuggestion(targetLeaf.view.file, 'foo');

      // clear out active leaf
      mockWorkspace.getMostRecentLeaf.mockReturnValueOnce(makeLeaf());
      mockWorkspace.iterateAllLeaves.mockImplementation((callback) => {
        callback(targetLeaf); // <-- report targetLeaf and an in-active open leaf
      });

      sut.validateCommand(inputInfo, 0, '', sugg, null);

      expect(inputInfo.mode).toBe(Mode.RelatedItemsList);

      const cmd = inputInfo.parsedCommand() as SourcedParsedCommand;
      expect(cmd.isValidated).toBe(true);
      expect(cmd.source).toEqual(
        expect.objectContaining({
          file: targetLeaf.view.file,
          leaf: targetLeaf,
          suggestion: sugg,
          isValidSource: true,
        }),
      );

      mockWorkspace.iterateAllLeaves.mockReset();
    });
  });

  describe('getSuggestions', () => {
    const mockPrepareQuery = jest.mocked<typeof prepareQuery>(prepareQuery);
    const mockFuzzySearch = jest.mocked<typeof fuzzySearch>(fuzzySearch);
    let getTFileByPathSpy: jest.SpyInstance;

    beforeAll(() => {
      getTFileByPathSpy = jest
        .spyOn(RelatedItemsHandler.prototype, 'getTFileByPath')
        .mockImplementation((path) => {
          return [file1, file2, file3, file4, mockRootSplitLeaf.view.file].find(
            (v) => v.path === path,
          );
        });
    });

    beforeEach(() => {
      mockMetadataCache.resolvedLinks = {};
      mockMetadataCache.unresolvedLinks = {};
      mockPrepareQuery.mockClear();
      mockFuzzySearch.mockClear();
    });

    afterAll(() => {
      getTFileByPathSpy.mockRestore();
    });

    test('with falsy input, it should return an empty array', () => {
      const results = sut.getSuggestions(null);

      expect(results).not.toBeNull();
      expect(results).toBeInstanceOf(Array);
      expect(results).toHaveLength(0);
    });

    test('that RelatedItemsSuggestion have a file property to enable interop with other plugins (like HoverEditor)', () => {
      const inputInfo = new InputInfo(relatedItemsTrigger);
      sut.validateCommand(inputInfo, 0, '', null, mockRootSplitLeaf);

      const results = sut.getSuggestions(inputInfo);

      expect(results.every((v) => v.file !== null)).toBe(true);
    });

    test('with default settings, it should return suggestions', () => {
      const inputInfo = new InputInfo(relatedItemsTrigger);
      sut.validateCommand(inputInfo, 0, '', null, mockRootSplitLeaf);
      mockMetadataCache.resolvedLinks = makeBacklink(file1, mockRootSplitLeaf.view.file);

      const results = sut.getSuggestions(inputInfo);

      expect(inputInfo.mode).toBe(Mode.RelatedItemsList);
      expect(results).toBeInstanceOf(Array);
      expect(results).toHaveLength(3);
      expect(results.every((sugg) => sugg.type === SuggestionType.RelatedItemsList)).toBe(
        true,
      );

      const diskFiles = results
        .filter((v) => v.item.relationType === RelationType.DiskLocation)
        .map((v) => v.file);
      expect(diskFiles).toHaveLength(2);

      const backlinkFiles = results
        .filter((v) => v.item.relationType === RelationType.Backlink)
        .map((v) => v.file);
      expect(backlinkFiles).toHaveLength(1);

      expect(mockPrepareQuery).toHaveBeenCalled();

      mockMetadataCache.resolvedLinks = {};
    });

    it('should return backlinks for Unresolved input suggestions', () => {
      const inputInfo = new InputInfo(relatedItemsTrigger);
      const unresolvedSugg = makeUnresolvedSuggestion(file1.path);
      sut.validateCommand(inputInfo, 0, '', unresolvedSugg, null);
      mockMetadataCache.unresolvedLinks = makeBacklink(file2, file1);

      const results = sut.getSuggestions(inputInfo);

      expect(inputInfo.mode).toBe(Mode.RelatedItemsList);
      expect(results).toBeInstanceOf(Array);
      expect(results).toHaveLength(1);
      expect(results.every((sugg) => sugg.type === SuggestionType.RelatedItemsList)).toBe(
        true,
      );

      expect(results[0].item.relationType).toBe(RelationType.Backlink);
    });

    test('with filter search term, it should return only matching related items suggestions', () => {
      filterText = file1.basename;
      mockPrepareQuery.mockReturnValueOnce(makePreparedQuery(filterText));
      mockFuzzySearch.mockImplementation(
        (_q: PreparedQuery, text: string): SearchResult => {
          const match = makeFuzzyMatch();
          return text.includes(filterText) ? match : null;
        },
      );

      const inputInfo = new InputInfo(`${relatedItemsTrigger}${filterText}`);
      sut.validateCommand(inputInfo, 0, filterText, null, mockRootSplitLeaf);

      const results = sut.getSuggestions(inputInfo);

      expect(inputInfo.mode).toBe(Mode.RelatedItemsList);
      expect(results).toBeInstanceOf(Array);
      expect(results).toHaveLength(1);
      expect(results.every((sugg) => sugg.type === SuggestionType.RelatedItemsList)).toBe(
        true,
      );
      expect(
        results.every((sugg) => sugg.item.relationType === RelationType.DiskLocation),
      ).toBe(true);

      expect(mockPrepareQuery).toHaveBeenCalled();
      expect(mockFuzzySearch).toHaveBeenCalled();

      mockFuzzySearch.mockReset();
    });

    test('with existing filter search term, it should continue refining suggestions for the previous target', () => {
      // 1) setup first initial run
      filterText = file1.basename.slice(0, file1.basename.length / 2);
      mockPrepareQuery.mockReturnValueOnce(makePreparedQuery(filterText));

      mockFuzzySearch.mockImplementation((_q: PreparedQuery, text: string) => {
        const match = makeFuzzyMatch();
        return text.includes(filterText) ? match : null;
      });

      let inputInfo = new InputInfo(`${relatedItemsTrigger}${filterText}`);

      sut.validateCommand(inputInfo, 0, filterText, null, mockRootSplitLeaf);

      let results = sut.getSuggestions(inputInfo);

      expect(inputInfo.mode).toBe(Mode.RelatedItemsList);
      expect(results).toBeInstanceOf(Array);
      expect(results.every((sugg) => sugg.type === SuggestionType.RelatedItemsList)).toBe(
        true,
      );
      expect(
        results.every((sugg) => sugg.item.relationType === RelationType.DiskLocation),
      ).toBe(true);

      let cmd = inputInfo.parsedCommand() as SourcedParsedCommand;
      expect(cmd.source.file).toBe(mockRootSplitLeaf.view.file);
      mockFuzzySearch.mockReset();

      // 2) setup second run, which refines the filterText from the first run
      filterText = file1.basename;
      mockPrepareQuery.mockReturnValueOnce(makePreparedQuery(filterText));

      mockFuzzySearch.mockImplementation((q: PreparedQuery, text: string) => {
        const match = makeFuzzyMatch();
        return text.endsWith(q.query) ? match : null;
      });

      const mockTempLeaf = makeLeaf();
      inputInfo = new InputInfo(`${relatedItemsTrigger}${filterText}`);

      // note the use of a different leaf than the first run, because it should use the
      // leaf from the previous run
      sut.validateCommand(inputInfo, 0, filterText, null, mockTempLeaf);

      results = sut.getSuggestions(inputInfo);

      expect(inputInfo.mode).toBe(Mode.RelatedItemsList);
      expect(results).toBeInstanceOf(Array);
      expect(results).toHaveLength(1);
      expect(results[0].file).toEqual(file1);
      expect(mockPrepareQuery).toHaveBeenCalled();
      expect(results.every((sugg) => sugg.type === SuggestionType.RelatedItemsList)).toBe(
        true,
      );
      expect(
        results.every((sugg) => sugg.item.relationType === RelationType.DiskLocation),
      ).toBe(true);

      cmd = inputInfo.parsedCommand() as SourcedParsedCommand;
      expect(cmd.source.file).not.toBe(mockTempLeaf.view.file);

      // expect the source file to be the same as the first run
      expect(cmd.source.file).toBe(mockRootSplitLeaf.view.file);
      mockFuzzySearch.mockReset();
    });
  });

  describe('renderSuggestion', () => {
    const fileSugg = makeRelatedItemsSuggestion({
      relationType: RelationType.DiskLocation,
      file: file1,
    });
    const backlingSugg = makeRelatedItemsSuggestion({
      relationType: RelationType.Backlink,
      file: file1,
      count: 2,
    });

    it('should not throw an error with a null suggestion', () => {
      expect(() => sut.renderSuggestion(null, null)).not.toThrow();
    });

    it.each([fileSugg, backlingSugg])(
      'should render a suggestion with match offsets (array data index: $#)',
      (sugg) => {
        const mockParentEl = mock<HTMLElement>();
        const mockFlairContainerEl = mock<HTMLDivElement>();

        const renderAsFileInfoPanelSpy = jest
          .spyOn(Handler.prototype, 'renderAsFileInfoPanel')
          .mockReturnValueOnce(null);

        const createFlairContainerSpy = jest
          .spyOn(Handler.prototype, 'createFlairContainer')
          .mockReturnValueOnce(mockFlairContainerEl);

        sut.renderSuggestion(sugg, mockParentEl);

        expect(renderAsFileInfoPanelSpy).toHaveBeenCalledWith(
          mockParentEl,
          ['qsp-suggestion-related'],
          file1.basename,
          sugg.file,
          sugg.matchType,
          sugg.match,
        );

        expect(mockFlairContainerEl.createSpan).toHaveBeenCalledWith(
          expect.objectContaining({
            cls: ['suggestion-flair', 'svg-icon', 'qsp-related-indicator'],
          }),
        );

        renderAsFileInfoPanelSpy.mockRestore();
        createFlairContainerSpy.mockRestore();
      },
    );
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

    test('with Mod down, it should create a new workspaceLeaf for the target file', () => {
      const mockEvt = mock<KeyboardEvent>();
      const sugg = makeRelatedItemsSuggestion({
        relationType: RelationType.DiskLocation,
        file: file1,
      });

      const navigateToLeafOrOpenFileSpy = jest.spyOn(
        Handler.prototype,
        'navigateToLeafOrOpenFile',
      );

      sut.onChooseSuggestion(sugg, mockEvt);

      expect(navigateToLeafOrOpenFileSpy).toHaveBeenCalledWith(
        mockEvt,
        sugg.file,
        expect.any(String),
      );

      navigateToLeafOrOpenFileSpy.mockRestore();
    });
  });

  describe('addRelatedDiskFiles', () => {
    test('with excludeRelatedFolders unset, it should include files from subfolders', () => {
      const sourceFile = new TFile();
      sourceFile.parent = makeFileTree(sourceFile);

      // don't set any folder filter
      const excludeRelatedFoldersSpy = jest
        .spyOn(settings, 'excludeRelatedFolders', 'get')
        .mockReturnValueOnce([]);

      const results: RelatedItemsInfo[] = [];
      sut.addRelatedDiskFiles(sourceFile, results);

      expect(results).toHaveLength(4);
      expect(results.map((v) => v.file)).toEqual(
        expect.arrayContaining([file1, file2, file3, file4]),
      );

      excludeRelatedFoldersSpy.mockRestore();
    });

    it('should exclude files from subfolders', () => {
      const sourceFile = new TFile();
      sourceFile.parent = makeFileTree(sourceFile);

      const results: RelatedItemsInfo[] = [];
      sut.addRelatedDiskFiles(sourceFile, results);

      expect(results).toHaveLength(2);
      expect(results.map((v) => v.file)).toEqual(expect.arrayContaining([file1, file2]));
    });

    it('should include files that are already open in an editor', () => {
      const findMatchingLeafSpy = jest.spyOn(sut, 'findMatchingLeaf');
      const sourceFile = new TFile();
      sourceFile.parent = makeFileTree(sourceFile);

      const results: RelatedItemsInfo[] = [];
      sut.addRelatedDiskFiles(sourceFile, results);

      expect(results).toHaveLength(2);
      expect(results.map((v) => v.file)).toEqual(expect.arrayContaining([file1, file2]));
      expect(findMatchingLeafSpy).not.toHaveBeenCalled();

      findMatchingLeafSpy.mockRestore();
    });

    test('with excludeOpenRelatedFiles enabled, it should exclude files that are already open in an editor', () => {
      const sourceFile = new TFile();
      sourceFile.parent = makeFileTree(sourceFile);

      // exclude files already open
      jest.spyOn(settings, 'excludeOpenRelatedFiles', 'get').mockReturnValueOnce(true);

      // set file1 as the file for active leaf
      const leaf = makeLeaf();
      leaf.view.file = file1;
      const getActiveLeafSpy = jest
        .spyOn(Handler.prototype, 'getActiveLeaf')
        .mockReturnValue(leaf);

      const results: RelatedItemsInfo[] = [];
      sut.addRelatedDiskFiles(sourceFile, results);

      expect(results).toHaveLength(1);
      expect(results.map((v) => v.file)).toEqual(expect.arrayContaining([file2]));
      expect(getActiveLeafSpy).toHaveBeenCalled();

      getActiveLeafSpy.mockRestore();
    });
  });
});
