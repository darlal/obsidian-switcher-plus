import { SwitcherPlusSettings } from 'src/settings';
import {
  Mode,
  SymbolSuggestion,
  SymbolType,
  HeadingIndicators,
  LinkType,
  SuggestionType,
  CalloutCache,
  SymbolIndicators,
  SymbolInfo,
  SearchQuery,
} from 'src/types';
import { InputInfo, SourcedParsedCommand } from 'src/switcherPlus';
import {
  Handler,
  HeadingsHandler,
  SymbolHandler,
  SymbolInfoExcludingCanvasNodes,
} from 'src/Handlers';
import {
  WorkspaceLeaf,
  App,
  SearchResult,
  MarkdownView,
  HeadingCache,
  TagCache,
  ReferenceCache,
  MetadataCache,
  Editor,
  Workspace,
  TFile,
  Vault,
  OpenViewState,
  setIcon,
  CanvasFileView,
  CanvasNodeElement,
  renderResults,
} from 'obsidian';
import {
  rootSplitEditorFixtures,
  leftSplitEditorFixtures,
  symbolTrigger,
  headingsTrigger,
  makeFuzzyMatch,
  getHeadings,
  getTags,
  getLinks,
  makeHeading,
  makeSymbolSuggestion,
  makeLeaf,
  makeAliasSuggestion,
  makeEditorSuggestion,
  makeHeadingSuggestion,
  getCallouts,
  makeCanvasFileContentString,
  makeBookmarkedFileSuggestion,
  symbolActiveTrigger,
  getCachedMetadata,
} from '@fixtures';
import {
  CanvasData,
  CanvasFileData,
  CanvasGroupData,
  CanvasLinkData,
  CanvasTextData,
} from 'obsidian/canvas';
import { mock, MockProxy, mockClear, mockFn } from 'jest-mock-extended';
import { Chance } from 'chance';
import { Searcher } from 'src/search';

const chance = new Chance();

describe('symbolHandler', () => {
  const rootFixture = rootSplitEditorFixtures[0];
  const leftFixture = leftSplitEditorFixtures[0];
  const fileContentWithCallout = '\n> [!NOTE] callout title\n> callout Contents\n';
  const calloutSectionCache = getCallouts();
  const calloutCache: CalloutCache = {
    calloutTitle: chance.sentence(),
    calloutType: 'note',
    ...calloutSectionCache[0],
  };

  let settings: SwitcherPlusSettings;
  let mockApp: MockProxy<App>;
  let mockWorkspace: MockProxy<Workspace>;
  let mockVault: MockProxy<Vault>;
  let sut: SymbolHandler;
  let mockMetadataCache: MockProxy<MetadataCache>;
  let mockRootSplitLeaf: MockProxy<WorkspaceLeaf>;
  let mockLeftSplitLeaf: MockProxy<WorkspaceLeaf>;
  let inputText: string;
  let startIndex: number;
  let filterText: string;
  let symbolSugg: SymbolSuggestion;

  beforeAll(() => {
    mockMetadataCache = mock<MetadataCache>();
    mockMetadataCache.getFileCache.mockImplementation((_f) => rootFixture.cachedMetadata);

    mockWorkspace = mock<Workspace>({
      revealLeaf: mockFn().mockResolvedValue(null),
    });

    mockVault = mock<Vault>();
    mockApp = mock<App>({
      workspace: mockWorkspace,
      metadataCache: mockMetadataCache,
      vault: mockVault,
    });

    settings = new SwitcherPlusSettings(null);
    jest.spyOn(settings, 'symbolListCommand', 'get').mockReturnValue(symbolTrigger);
    jest
      .spyOn(settings, 'symbolListActiveEditorCommand', 'get')
      .mockReturnValue(symbolActiveTrigger);

    mockRootSplitLeaf = makeLeaf();
    mockLeftSplitLeaf = makeLeaf();

    symbolSugg = makeSymbolSuggestion(getHeadings()[0], SymbolType.Heading, new TFile());
  });

  beforeEach(() => {
    // reset for each test because symbol mode will use saved data from previous runs
    sut = new SymbolHandler(mockApp, settings);
  });

  describe('getCommandString', () => {
    it('should return symbolListCommand trigger', () => {
      expect(sut.getCommandString()).toBe(symbolTrigger);
    });

    test('with useActiveEditorAsSource enabled, it should return symbolListActiveEditorCommand trigger', () => {
      expect(sut.getCommandString({ useActiveEditorAsSource: true })).toBe(
        symbolActiveTrigger,
      );
    });
  });

  describe('validateCommand', () => {
    filterText = 'foo';

    beforeAll(() => {
      inputText = `${symbolTrigger}${filterText}`;
      startIndex = 0;
    });

    it('should validate parsed input in symbol prefix (active editor) mode when using symbolListCommand', () => {
      const inputInfo = new InputInfo(inputText);

      sut.validateCommand(inputInfo, startIndex, filterText, null, mockRootSplitLeaf);
      expect(inputInfo.mode).toBe(Mode.SymbolList);

      const symbolCmd = inputInfo.parsedCommand();
      expect(symbolCmd.parsedInput).toBe(filterText);
      expect(symbolCmd.isValidated).toBe(true);
    });

    it('should validate parsed input in prefix mode (active editor only) using symbolListActiveEditorCommand', () => {
      const sugg = makeAliasSuggestion(new TFile(), 'foo');
      const inputInfo = new InputInfo(`${symbolActiveTrigger}${filterText}`);

      sut.validateCommand(inputInfo, startIndex, filterText, sugg, mockRootSplitLeaf);
      expect(inputInfo.mode).toBe(Mode.SymbolList);

      const symbolCmd = inputInfo.parsedCommand();
      expect(symbolCmd.parsedInput).toBe(filterText);
      expect(symbolCmd.isValidated).toBe(true);
    });

    it('should validate parsed input for file based suggestion', () => {
      const targetFile = new TFile();
      const sugg = makeAliasSuggestion(targetFile, 'foo');

      const inputInfo = new InputInfo('', Mode.Standard);
      sut.validateCommand(inputInfo, 0, '', sugg, null);

      expect(inputInfo.mode).toBe(Mode.SymbolList);

      const symbolCmd = inputInfo.parsedCommand() as SourcedParsedCommand;
      expect(symbolCmd.isValidated).toBe(true);
      expect(symbolCmd.source).toEqual(
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

      // set the target as a currently open leaf
      mockWorkspace.getMostRecentLeaf.mockReturnValueOnce(targetLeaf);

      const sugg = makeEditorSuggestion(targetLeaf, targetLeaf.view.file);

      const inputInfo = new InputInfo('', Mode.EditorList);
      sut.validateCommand(inputInfo, 0, '', sugg, null);

      expect(inputInfo.mode).toBe(Mode.SymbolList);

      const symbolCmd = inputInfo.parsedCommand() as SourcedParsedCommand;
      expect(symbolCmd.isValidated).toBe(true);
      expect(symbolCmd.source).toEqual(
        expect.objectContaining({
          file: targetLeaf.view.file,
          leaf: targetLeaf,
          suggestion: sugg,
          isValidSource: true,
        }),
      );
    });

    it('should validate parsed input for Bookmarks file suggestion', () => {
      const targetFile = new TFile();
      const sugg = makeBookmarkedFileSuggestion({ file: targetFile });

      const inputInfo = new InputInfo('', Mode.BookmarksList);
      sut.validateCommand(inputInfo, 0, '', sugg, null);

      expect(inputInfo.mode).toBe(Mode.SymbolList);

      const symbolCmd = inputInfo.parsedCommand() as SourcedParsedCommand;
      expect(symbolCmd.isValidated).toBe(true);
      expect(symbolCmd.source).toEqual(
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
      const sugg = makeAliasSuggestion(targetLeaf.view.file, 'foo');

      // set the target as a currently open leaf
      const getActiveLeafSpy = jest
        .spyOn(Handler.prototype, 'getActiveLeaf')
        .mockReturnValue(targetLeaf);

      const inputInfo = new InputInfo('', Mode.Standard);
      sut.validateCommand(inputInfo, 0, '', sugg, null);

      expect(inputInfo.mode).toBe(Mode.SymbolList);
      expect(getActiveLeafSpy).toHaveBeenCalled();

      const symbolCmd = inputInfo.parsedCommand() as SourcedParsedCommand;
      expect(symbolCmd.isValidated).toBe(true);
      expect(symbolCmd.source).toEqual(
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
      const sugg = makeAliasSuggestion(targetLeaf.view.file, 'foo');

      mockWorkspace.getMostRecentLeaf.mockReturnValueOnce(makeLeaf());
      mockWorkspace.iterateAllLeaves.mockImplementation((callback) => {
        callback(targetLeaf); // <-- report targetLeaf and an in-active open leaf
      });

      const inputInfo = new InputInfo('', Mode.Standard);
      sut.validateCommand(inputInfo, 0, '', sugg, null);

      expect(inputInfo.mode).toBe(Mode.SymbolList);

      const symbolCmd = inputInfo.parsedCommand() as SourcedParsedCommand;
      expect(symbolCmd.isValidated).toBe(true);
      expect(symbolCmd.source).toEqual(
        expect.objectContaining({
          file: targetLeaf.view.file,
          leaf: targetLeaf,
          suggestion: sugg,
          isValidSource: true,
        }),
      );
    });

    it('should not validate embedded command using active editor as valid source', () => {
      const expectedMode = Mode.Standard;
      const input = `${filterText}${symbolTrigger}`;
      const inputInfo = new InputInfo(input);
      inputInfo.mode = expectedMode;

      const cmd = sut.validateCommand(
        inputInfo,
        input.indexOf(symbolTrigger),
        '',
        null,
        mockRootSplitLeaf,
      );

      expect(inputInfo.mode).toBe(expectedMode);
      expect(cmd.isValidated).toBe(false);
    });
  });

  describe('getSuggestions', () => {
    const mockSearchQuery = mock<SearchQuery>();
    let executeSearchSpy: jest.SpyInstance<SearchResult, [text: string]>;

    beforeAll(() => {
      executeSearchSpy = jest.spyOn(Searcher.prototype, 'executeSearch');
    });

    beforeEach(() => {
      mockClear(mockSearchQuery);
    });

    afterAll(() => {
      executeSearchSpy.mockRestore();
    });

    test('with falsy input, it should return an empty array', async () => {
      const results = await sut.getSuggestions(null);

      expect(results).not.toBeNull();
      expect(results).toBeInstanceOf(Array);
      expect(results).toHaveLength(0);
    });

    test('that SymbolSuggestion have a file property to enable interop with other plugins (like HoverEditor)', async () => {
      const inputInfo = new InputInfo(symbolTrigger);
      const results = await sut.getSuggestions(inputInfo);

      expect(results.every((v) => v.file !== null)).toBe(true);
    });

    test('with default settings, it should return symbol suggestions when using symbolListActiveEditorCommand', async () => {
      const inputInfo = new InputInfo(symbolActiveTrigger);
      sut.validateCommand(inputInfo, 0, '', null, mockRootSplitLeaf);

      // needed for callout symbols
      mockVault.cachedRead.mockResolvedValueOnce(fileContentWithCallout);

      const results = await sut.getSuggestions(inputInfo);

      expect(results.every((sugg) => sugg.type === SuggestionType.SymbolList)).toBe(true);

      const cached = Object.values(rootFixture.cachedMetadata).flat();

      expect(results).toHaveLength(cached.length);
      expect(mockVault.cachedRead).toHaveBeenCalledWith(mockRootSplitLeaf.view.file);
      expect(mockMetadataCache.getFileCache).toHaveBeenCalledWith(
        mockRootSplitLeaf.view.file,
      );
    });

    test('with default settings, it should return symbol suggestions when using symbolListCommand', async () => {
      const inputInfo = new InputInfo(symbolTrigger);
      sut.validateCommand(inputInfo, 0, '', null, mockRootSplitLeaf);
      const initialMode = inputInfo.mode;

      // needed for callout symbols
      mockVault.cachedRead.mockResolvedValueOnce(fileContentWithCallout);

      const results = await sut.getSuggestions(inputInfo);

      expect(initialMode).toBe(Mode.SymbolList);
      expect(results).toBeInstanceOf(Array);
      expect(results.every((sugg) => sugg.type === SuggestionType.SymbolList)).toBe(true);

      const cached = Object.values(rootFixture.cachedMetadata).flat();

      expect(results).toHaveLength(cached.length);
      expect(mockVault.cachedRead).toHaveBeenCalledWith(mockRootSplitLeaf.view.file);
      expect(mockMetadataCache.getFileCache).toHaveBeenCalledWith(
        mockRootSplitLeaf.view.file,
      );
    });

    test('with selectNearestHeading set to true, it should set the isSelected property of the nearest preceding heading suggestion to true when the file is open in the active editor for any file based suggestion modes', async () => {
      const selectNearestHeadingSpy = jest
        .spyOn(settings, 'selectNearestHeading', 'get')
        .mockReturnValue(true);

      // there should be a heading in the fixture that starts on this line number
      const expectedHeadingStartLineNumber = 9;
      const expectedSelectedHeading = rootFixture.cachedMetadata.headings.find(
        (val) => val.position.start.line === expectedHeadingStartLineNumber,
      );
      expect(expectedSelectedHeading).not.toBeNull();

      const mockEditor = (mockRootSplitLeaf.view as MarkdownView)
        .editor as MockProxy<Editor>;

      mockEditor.getCursor.mockReturnValue({
        line: expectedHeadingStartLineNumber + 1,
        ch: 0,
      });

      const getActiveLeafSpy = jest
        .spyOn(Handler.prototype, 'getActiveLeaf')
        .mockReturnValue(mockRootSplitLeaf);

      // here, use the same TFile as activeLeaf
      const activeSugg = makeHeadingSuggestion(
        makeHeading('foo heading', 1),
        mockRootSplitLeaf.view.file,
      );

      // use headings prefix mode along with heading suggestion, note that the suggestion
      // has to point to the same TFile as activeLeaf
      const inputInfo = new InputInfo('', Mode.HeadingsList);
      sut.validateCommand(
        inputInfo,
        headingsTrigger.length,
        '',
        activeSugg,
        mockRootSplitLeaf,
      );

      const results = await sut.getSuggestions(inputInfo);

      expect(inputInfo.mode).toBe(Mode.SymbolList);
      expect(results).toBeInstanceOf(Array);
      expect(results.every((sugg) => sugg.type === SuggestionType.SymbolList)).toBe(true);

      const selectedSuggestions = results.filter((v) => v.item.isSelected === true);
      expect(selectedSuggestions).toHaveLength(1);
      expect(selectedSuggestions[0].item.symbol).toBe(expectedSelectedHeading);
      expect(getActiveLeafSpy).toHaveBeenCalled();

      expect(mockMetadataCache.getFileCache).toHaveBeenCalledWith(
        mockRootSplitLeaf.view.file,
      );

      selectNearestHeadingSpy.mockReset();
      mockEditor.getCursor.mockReset();
      getActiveLeafSpy.mockRestore();
    });

    test('with selectNearestHeading set to true, it should set the isSelected property of the nearest preceding heading suggestion to true', async () => {
      const selectNearestHeadingSpy = jest
        .spyOn(settings, 'selectNearestHeading', 'get')
        .mockReturnValue(true);

      // there should be a heading in the fixture that starts on this line number
      const expectedHeadingStartLineNumber = 9;
      const expectedSelectedHeading = rootFixture.cachedMetadata.headings.find(
        (val) => val.position.start.line === expectedHeadingStartLineNumber,
      );
      expect(expectedSelectedHeading).not.toBeNull();

      const mockEditor = (mockRootSplitLeaf.view as MarkdownView)
        .editor as MockProxy<Editor>;

      mockEditor.getCursor.mockReturnValueOnce({
        line: expectedHeadingStartLineNumber + 1,
        ch: 0,
      });

      const inputInfo = new InputInfo(symbolTrigger);
      sut.validateCommand(inputInfo, 0, '', null, mockRootSplitLeaf);
      expect(inputInfo.mode).toBe(Mode.SymbolList);

      const results = await sut.getSuggestions(inputInfo);

      expect(results).not.toBeNull();
      expect(results).toBeInstanceOf(Array);
      expect(results.every((sugg) => sugg.type === SuggestionType.SymbolList)).toBe(true);

      const selectedSuggestions = results.filter((v) => v.item.isSelected === true);
      expect(selectedSuggestions).toHaveLength(1);
      expect(selectedSuggestions[0].item.symbol).toBe(expectedSelectedHeading);

      expect(mockMetadataCache.getFileCache).toHaveBeenCalledWith(
        mockRootSplitLeaf.view.file,
      );

      selectNearestHeadingSpy.mockReset();
    });

    test('with filter search term, it should return only matching symbol suggestions', async () => {
      filterText = 'tag';
      mockMetadataCache.getFileCache.mockReturnValueOnce(leftFixture.cachedMetadata);

      executeSearchSpy.mockImplementation((text) => {
        return text === 'tag1' || text === 'tag2' ? makeFuzzyMatch() : null;
      });

      const inputInfo = new InputInfo(`${symbolTrigger}${filterText}`);
      sut.validateCommand(inputInfo, 0, filterText, null, mockLeftSplitLeaf);
      expect(inputInfo.mode).toBe(Mode.SymbolList);

      const results = await sut.getSuggestions(inputInfo);

      expect(results).toHaveLength(2);
      expect(results.every((sugg) => sugg.type === SuggestionType.SymbolList)).toBe(true);

      const { tags } = leftFixture.cachedMetadata;
      const resTags = new Set(results.map((sugg) => sugg.item.symbol));
      expect(tags.every((tag) => resTags.has(tag))).toBe(true);

      expect(mockMetadataCache.getFileCache).toHaveBeenCalledWith(
        mockLeftSplitLeaf.view.file,
      );

      executeSearchSpy.mockReset();
    });

    test('with existing filter search term, it should continue refining suggestions for the previous target', async () => {
      mockMetadataCache.getFileCache.mockReturnValue(leftFixture.cachedMetadata);

      // 1) setup first initial run
      filterText = 'tag';

      executeSearchSpy.mockImplementation((text) => {
        return text === 'tag1' || text === 'tag2' ? makeFuzzyMatch() : null;
      });

      let inputInfo = new InputInfo(`${symbolTrigger}${filterText}`);

      sut.validateCommand(inputInfo, 0, filterText, null, mockLeftSplitLeaf);
      expect(inputInfo.mode).toBe(Mode.SymbolList);

      let results = await sut.getSuggestions(inputInfo);

      expect(results).toHaveLength(2);
      expect(results.every((sugg) => sugg.type === SuggestionType.SymbolList)).toBe(true);
      expect(mockMetadataCache.getFileCache).toHaveBeenCalledWith(
        mockLeftSplitLeaf.view.file,
      );

      executeSearchSpy.mockReset();

      // 2) setup second run, which refines the filterText from the first run
      filterText = 'tag2';

      executeSearchSpy.mockImplementation((text) => {
        return text === filterText ? makeFuzzyMatch() : null;
      });

      const mockTempLeaf = makeLeaf();
      const mockTempLeafFile = mockTempLeaf.view.file;
      inputInfo = new InputInfo(`${symbolTrigger}${filterText}`);

      // note the use of a different leaf than the first run
      sut.validateCommand(inputInfo, startIndex, filterText, null, mockTempLeaf);
      expect(inputInfo.mode).toBe(Mode.SymbolList);

      results = await sut.getSuggestions(inputInfo);

      expect(results).toHaveLength(1); // expect just 1 this time
      expect(results[0]).toHaveProperty('type', SuggestionType.SymbolList);

      const tag = leftFixture.cachedMetadata.tags.find((item) => item.tag === '#tag2');
      expect(results[0]).toHaveProperty('item.symbol', tag);

      // getFileCache should be called with leftSplitLeaf.view.file both times
      expect(mockMetadataCache.getFileCache).not.toHaveBeenCalledWith(mockTempLeafFile);
      expect(mockMetadataCache.getFileCache).toHaveBeenCalledWith(
        mockLeftSplitLeaf.view.file,
      );

      mockMetadataCache.getFileCache.mockReset();
      executeSearchSpy.mockReset();
    });

    it('should not return suggestions for a symbol type that is disabled', async () => {
      const inputInfo = new InputInfo(symbolTrigger);

      const isSymbolTypeEnabledSpy = jest
        .spyOn(settings, 'isSymbolTypeEnabled')
        .mockImplementation((type) => (type === SymbolType.Tag ? false : true));

      mockMetadataCache.getFileCache.mockReturnValueOnce({ tags: getTags() });
      sut.validateCommand(inputInfo, 0, '', null, mockRootSplitLeaf);
      expect(inputInfo.mode).toBe(Mode.SymbolList);

      const results = await sut.getSuggestions(inputInfo);

      expect(results).toHaveLength(0);
      expect(mockMetadataCache.getFileCache).toHaveBeenCalledWith(
        mockRootSplitLeaf.view.file,
      );

      isSymbolTypeEnabledSpy.mockRestore();
    });

    it('should not return suggestions for links if the Link symbol type is disabled', async () => {
      const inputInfo = new InputInfo(symbolTrigger);

      const isSymbolTypeEnabledSpy = jest
        .spyOn(settings, 'isSymbolTypeEnabled')
        .mockImplementation((type) => (type === SymbolType.Link ? false : true));

      mockMetadataCache.getFileCache.mockReturnValueOnce({ links: getLinks() });
      sut.validateCommand(inputInfo, 0, '', null, mockRootSplitLeaf);
      expect(inputInfo.mode).toBe(Mode.SymbolList);

      const results = await sut.getSuggestions(inputInfo);

      expect(results).toHaveLength(0);
      expect(mockMetadataCache.getFileCache).toHaveBeenCalledWith(
        mockRootSplitLeaf.view.file,
      );

      isSymbolTypeEnabledSpy.mockRestore();
    });

    it('should not return suggestions for a sub-link type that is disabled', async () => {
      const inputInfo = new InputInfo(symbolTrigger);

      const excludeLinkSubTypesSpy = jest
        .spyOn(settings, 'excludeLinkSubTypes', 'get')
        .mockReturnValue(LinkType.Block | LinkType.Heading);

      mockMetadataCache.getFileCache.mockReturnValueOnce({ links: getLinks() });
      sut.validateCommand(inputInfo, 0, '', null, mockRootSplitLeaf);
      expect(inputInfo.mode).toBe(Mode.SymbolList);

      const results = await sut.getSuggestions(inputInfo);

      expect(results).toBeInstanceOf(Array);

      // getLinks fixture returns 2 links, 1 block, 1 normal
      expect(results).toHaveLength(1);

      expect(mockMetadataCache.getFileCache).toHaveBeenCalledWith(
        mockRootSplitLeaf.view.file,
      );

      excludeLinkSubTypesSpy.mockRestore();
    });

    it('should return suggestions for canvas files', async () => {
      const mockCanvasFile = new TFile();
      mockCanvasFile.extension = 'canvas';
      const activeLeaf = makeLeaf(mockCanvasFile);
      const fileContent = makeCanvasFileContentString();
      const canvasNodes = (JSON.parse(fileContent) as CanvasData).nodes;
      const inputInfo = new InputInfo(symbolTrigger);
      sut.validateCommand(inputInfo, 0, '', null, activeLeaf);

      mockVault.cachedRead.mockResolvedValueOnce(fileContent);

      const results = await sut.getSuggestions(inputInfo);

      expect(results.every((sugg) => sugg.type === SuggestionType.SymbolList)).toBe(true);
      expect(results).toHaveLength(canvasNodes.length);
      expect(mockVault.cachedRead).toHaveBeenCalledWith(mockCanvasFile);
    });

    it('should return suggestion for Headings', async () => {
      filterText = 'heading3';

      const metadata = getCachedMetadata();
      mockMetadataCache.getFileCache.mockReturnValueOnce(metadata);

      const expectedHeading = metadata.headings.filter(
        ({ heading }) => heading === filterText,
      )[0];

      executeSearchSpy.mockImplementation((text) => {
        return text === filterText ? makeFuzzyMatch() : null;
      });

      const inputInfo = new InputInfo(`${symbolTrigger}${filterText}`);
      sut.validateCommand(inputInfo, 0, filterText, null, mockLeftSplitLeaf);

      const results = await sut.getSuggestions(inputInfo);

      expect(results).toHaveLength(1);
      expect(results.every((sugg) => sugg.type === SuggestionType.SymbolList)).toBe(true);
      expect(results[0].item.symbol).toEqual(expectedHeading);
      expect(mockMetadataCache.getFileCache).toHaveBeenCalledWith(
        mockLeftSplitLeaf.view.file,
      );

      executeSearchSpy.mockReset();
    });
  });

  describe('renderSuggestion', () => {
    let mockParentEl: MockProxy<HTMLElement>;
    const mockRenderResults = jest.mocked<typeof renderResults>(renderResults);

    beforeAll(() => {
      mockParentEl = mock<HTMLElement>();
      mockParentEl.createDiv.mockReturnValue(mock<HTMLDivElement>());
    });

    afterEach(() => {
      mockParentEl.createDiv.mockClear();
      mockRenderResults.mockClear();
    });

    afterAll(() => {
      mockRenderResults.mockRestore();
    });

    it('should not throw an error with a null suggestion', () => {
      expect(() => sut.renderSuggestion(null, null)).not.toThrow();
    });

    it('should delegate rendering of headings to Headings Handler', () => {
      const renderHeadingSpy = jest.spyOn(HeadingsHandler, 'renderHeadingContent');

      sut.renderSuggestion(symbolSugg, mockParentEl);

      expect(renderHeadingSpy).toHaveBeenCalled();

      renderHeadingSpy.mockRestore();
    });

    it('should render Tag suggestion', () => {
      const tagSugg = makeSymbolSuggestion(getTags()[0], SymbolType.Tag);

      sut.renderSuggestion(tagSugg, mockParentEl);

      // Check that the first call to renderResults has the expected content passed in
      // as the second parameter
      expect(mockRenderResults.mock.calls[0][1]).toBe(
        (tagSugg.item.symbol as TagCache).tag.slice(1),
      );
    });

    it('should render Link suggestion', () => {
      const linkSugg = makeSymbolSuggestion(getLinks()[1], SymbolType.Link);

      sut.renderSuggestion(linkSugg, mockParentEl);

      const { link, displayText } = linkSugg.item.symbol as ReferenceCache;

      // Check that the first call to renderResults has the expected content passed in
      // as the second parameter
      expect(mockRenderResults.mock.calls[0][1]).toBe(`${link}|${displayText}`);
    });

    it('should render a callout suggestion', () => {
      const calloutSugg = makeSymbolSuggestion(calloutCache, SymbolType.Callout);

      const addIndicatorSpy = jest.spyOn(sut, 'addSymbolIndicator').mockReturnValueOnce();

      sut.renderSuggestion(calloutSugg, mockParentEl);

      expect(addIndicatorSpy).toHaveBeenCalled();

      // Check that the first call to renderResults has the expected content passed in
      // as the second parameter
      expect(mockRenderResults.mock.calls[0][1]).toBe(
        (calloutSugg.item.symbol as CalloutCache).calloutTitle,
      );

      addIndicatorSpy.mockRestore();
    });

    test('with symbolsInLineOrder enabled and no search term, it should indent symbols', () => {
      const settings = new SwitcherPlusSettings(null);
      jest.spyOn(settings, 'symbolsInLineOrder', 'get').mockReturnValue(true);

      symbolSugg.item.indentLevel = 2;
      const inputInfo = new InputInfo(symbolTrigger);
      const parsedInputQuerySpy = jest
        .spyOn(inputInfo, 'parsedInputQuery', 'get')
        .mockReturnValue(mock<SearchQuery>({ hasSearchTerm: false }));

      const handler = new SymbolHandler(mockApp, settings);
      handler.inputInfo = inputInfo;

      handler.renderSuggestion(symbolSugg, mockParentEl);

      expect(mockParentEl.addClasses).toHaveBeenCalledWith(
        expect.arrayContaining([`qsp-symbol-l${symbolSugg.item.indentLevel}`]),
      );

      parsedInputQuerySpy.mockRestore();
    });

    it('should render a canvas suggestion', () => {
      const canvasNodes = (JSON.parse(makeCanvasFileContentString()) as CanvasData).nodes;
      const canvasSugg = makeSymbolSuggestion(canvasNodes[0], SymbolType.CanvasNode);

      sut.renderSuggestion(canvasSugg, mockParentEl);

      expect(mockParentEl.addClasses).toHaveBeenCalledWith(
        expect.arrayContaining(['mod-complex', 'qsp-suggestion-symbol']),
      );

      // Check that the first call to renderResults has the expected content passed in
      // as the second parameter
      expect(mockRenderResults.mock.calls[0][1]).toBe(
        (canvasSugg.item.symbol as CanvasGroupData).label,
      );
    });
  });

  describe('onChooseSuggestion', () => {
    let navigateToLeafOrOpenFileSpy: jest.SpyInstance;

    beforeAll(() => {
      const fileContainerLeaf = makeLeaf();
      fileContainerLeaf.openFile.mockResolvedValueOnce();
      mockWorkspace.getLeaf.mockReturnValue(fileContainerLeaf);

      navigateToLeafOrOpenFileSpy = jest.spyOn(
        SymbolHandler.prototype,
        'navigateToLeafOrOpenFileAsync',
      );
    });

    afterAll(() => {
      navigateToLeafOrOpenFileSpy.mockRestore();
    });

    const getExpectedEphemeralState = (
      symbolInfo: SymbolInfoExcludingCanvasNodes,
    ): OpenViewState => {
      const {
        start: { line, col },
        end: endLoc,
      } = symbolInfo.symbol.position;

      const state: Record<string, unknown> = {
        active: true,
        eState: {
          active: true,
          focus: true,
          startLoc: { line, col },
          endLoc,
          line,
          cursor: {
            from: { line, ch: col },
            to: { line, ch: col },
          },
        },
      };

      return state;
    };

    it('should not throw an error with a null suggestion', () => {
      expect(() => sut.onChooseSuggestion(null, null)).not.toThrow();
    });

    it('should activate the existing workspaceLeaf that contains the target symbol and scroll that view via eState', async () => {
      const mockEvt = mock<KeyboardEvent>();
      const mockLeaf = makeLeaf(symbolSugg.file);
      const expectedState = getExpectedEphemeralState(
        symbolSugg.item as SymbolInfoExcludingCanvasNodes,
      );

      const inputInfo = new InputInfo(symbolTrigger);
      sut.validateCommand(inputInfo, 0, '', null, mockLeaf);
      await sut.getSuggestions(inputInfo);
      expect(inputInfo.mode).toBe(Mode.SymbolList);

      navigateToLeafOrOpenFileSpy.mockResolvedValueOnce(null);

      sut.onChooseSuggestion(symbolSugg, mockEvt);

      expect(inputInfo.mode).toBe(Mode.SymbolList);
      expect(navigateToLeafOrOpenFileSpy).toHaveBeenCalledWith(
        mockEvt,
        symbolSugg.file,
        expectedState,
        mockLeaf,
        Mode.SymbolList,
      );

      navigateToLeafOrOpenFileSpy.mockReset();
    });

    it('should center the chosen canvas node in the viewport', async () => {
      const mockNodeData = mock<CanvasFileData>({ id: 'foo' });
      const mockCanvasNodeEl = mock<CanvasNodeElement>({ id: mockNodeData.id });
      const mockFile = new TFile();
      const promise = Promise.resolve();
      const inputInfo = new InputInfo(symbolTrigger);

      const mockCanvasView = mock<CanvasFileView>();
      mockCanvasView.file = mockFile;
      mockCanvasView.getViewType.mockReturnValue('canvas');
      mockCanvasView.canvas.selectOnly = mockFn();
      mockCanvasView.canvas.zoomToSelection = mockFn();
      mockCanvasView.canvas.nodes = new Map<string, CanvasNodeElement>([
        [mockCanvasNodeEl.id, mockCanvasNodeEl],
      ]);

      const canvasSugg = makeSymbolSuggestion(
        mockNodeData,
        SymbolType.CanvasNode,
        mockFile,
      );

      const mockLeaf = mock<WorkspaceLeaf>({
        isDeferred: false,
        view: mockCanvasView,
      });

      const getActiveLeafSpy = jest
        .spyOn(SymbolHandler.prototype, 'getActiveLeaf')
        .mockReturnValueOnce(mockLeaf);

      navigateToLeafOrOpenFileSpy.mockReturnValueOnce(promise);

      sut.validateCommand(inputInfo, 0, '', null, mockLeaf);
      await sut.getSuggestions(inputInfo);

      sut.onChooseSuggestion(canvasSugg, null);
      await promise;

      expect(mockCanvasView.canvas.selectOnly).toHaveBeenCalledWith(mockCanvasNodeEl);
      expect(mockCanvasView.canvas.zoomToSelection).toHaveBeenCalled();

      navigateToLeafOrOpenFileSpy.mockReset();
      getActiveLeafSpy.mockRestore();
    });

    it('should log any navigation errors to the console', async () => {
      const mockFile = new TFile();
      const canvasSugg = makeSymbolSuggestion(null, SymbolType.CanvasNode, mockFile);
      const errorMsg = 'SymbolHandler onChooseSuggestion Unit test error';
      const rejectedPromise = Promise.reject(errorMsg);
      const consoleLogSpy = jest.spyOn(console, 'log').mockReturnValueOnce();

      const inputInfo = new InputInfo(symbolTrigger);
      sut.validateCommand(inputInfo, 0, '', null, makeLeaf(mockFile));
      await sut.getSuggestions(inputInfo);

      navigateToLeafOrOpenFileSpy.mockReturnValueOnce(rejectedPromise);

      sut.onChooseSuggestion(canvasSugg, null);

      try {
        await rejectedPromise;
      } catch (e) {
        /* noop */
      }

      expect(consoleLogSpy).toHaveBeenCalledWith(
        `Switcher++: Unable to navigate to symbols for file ${mockFile.path}`,
        errorMsg,
      );

      navigateToLeafOrOpenFileSpy.mockReset();
      consoleLogSpy.mockRestore();
    });
  });

  describe('addSymbolIndicator', () => {
    const mockFlairContainerEl = mock<HTMLDivElement>();
    const mockParentEl = mock<HTMLDivElement>();
    let createFlairContainerSpy: jest.SpyInstance;

    beforeAll(() => {
      createFlairContainerSpy = jest
        .spyOn(SymbolHandler.prototype, 'createFlairContainer')
        .mockReturnValue(mockFlairContainerEl);
    });

    afterAll(() => {
      createFlairContainerSpy.mockRestore();
    });

    afterEach(() => {
      mockClear(mockFlairContainerEl);
      mockClear(mockParentEl);
    });

    it('should add icon for Callout symbols', () => {
      const mockSetIcon = jest.mocked(setIcon);
      const iconName = chance.word();

      const sugg = makeSymbolSuggestion(calloutCache, SymbolType.Callout);

      const mockFlairEl = mock<HTMLSpanElement>();
      mockFlairContainerEl.createSpan.mockReturnValueOnce(mockFlairEl);
      mockFlairEl.getCssPropertyValue
        .calledWith('--callout-icon')
        .mockReturnValueOnce(iconName);

      sut.addSymbolIndicator(sugg.item, mockParentEl);

      expect(mockSetIcon).toHaveBeenCalledWith(mockFlairEl, iconName);
      expect(mockFlairContainerEl.createSpan).toHaveBeenCalledWith(
        expect.objectContaining({
          cls: [
            'qsp-symbol-indicator',
            'suggestion-flair',
            'callout',
            'callout-icon',
            'svg-icon',
          ],
          attr: { 'data-callout': calloutCache.calloutType },
        }),
      );
    });

    it.each([
      { title: 'headings', type: SymbolType.Heading, cache: getHeadings()[0] },
      { title: 'tags', type: SymbolType.Tag, cache: getTags()[0] },
    ])('should add icon for symbols: $title', ({ type, cache }) => {
      const sugg = makeSymbolSuggestion(cache, type);
      const renderIndicatorSpy = jest.spyOn(sut, 'renderIndicator');

      const expectedText =
        type === SymbolType.Heading
          ? HeadingIndicators[(cache as HeadingCache).level]
          : SymbolIndicators[type];

      sut.addSymbolIndicator(sugg.item, mockParentEl);

      expect(renderIndicatorSpy).toHaveBeenCalledWith(
        mockFlairContainerEl,
        ['qsp-symbol-indicator'],
        null,
        expectedText,
      );

      renderIndicatorSpy.mockRestore();
    });
  });

  describe('addCalloutsFromSource', () => {
    const mockFile = new TFile();

    it('should add symbol information for callouts', async () => {
      const results: SymbolInfo[] = [];
      mockVault.cachedRead.mockResolvedValueOnce(fileContentWithCallout);

      await sut.addCalloutsFromSource(
        mockFile,
        calloutSectionCache,
        results,
        new Set<string>(),
      );

      expect(mockVault.cachedRead).toHaveBeenCalledWith(mockFile);
      expect(results).toHaveLength(calloutSectionCache.length);
    });

    it('should log any exceptions reading a file to the console', async () => {
      const expectedMsg = `Switcher++: error reading file to extract callout information. ${mockFile.path} `;
      const errorMsg = 'addCalloutsFromSource Unit test error';
      const consoleLogSpy = jest.spyOn(console, 'log').mockReturnValueOnce();

      mockVault.cachedRead.mockRejectedValueOnce(errorMsg);

      await sut.addCalloutsFromSource(
        mockFile,
        calloutSectionCache,
        [],
        new Set<string>(),
      );

      expect(consoleLogSpy).toHaveBeenCalledWith(expectedMsg, errorMsg);
      expect(mockVault.cachedRead).toHaveBeenCalledWith(mockFile);

      consoleLogSpy.mockRestore();
    });
  });

  describe('addCanvasSymbolsFromSource', () => {
    const mockFile = new TFile();

    it('should add symbol information for canvas nodes', async () => {
      const results: SymbolInfo[] = [];
      const fileContent = makeCanvasFileContentString();
      const canvasNodes = (JSON.parse(fileContent) as CanvasData).nodes;
      mockVault.cachedRead.mockResolvedValueOnce(fileContent);

      await sut.addCanvasSymbolsFromSource(mockFile, results, new Set<string>());

      expect(mockVault.cachedRead).toHaveBeenCalledWith(mockFile);
      expect(results).toHaveLength(canvasNodes.length);
    });

    it('should log any exceptions reading a file to the console', async () => {
      const expectedMsg = `Switcher++: error reading file to extract canvas node information. ${mockFile.path} `;
      const errorMsg = 'addCanvasSymbolsFromSource Unit test error';
      const consoleLogSpy = jest.spyOn(console, 'log').mockReturnValueOnce();

      mockVault.cachedRead.mockRejectedValueOnce(errorMsg);

      await sut.addCanvasSymbolsFromSource(mockFile, [], new Set<string>());

      expect(consoleLogSpy).toHaveBeenCalledWith(expectedMsg, errorMsg);
      expect(mockVault.cachedRead).toHaveBeenCalledWith(mockFile);

      consoleLogSpy.mockRestore();
    });
  });

  describe('getSuggestionTextForCanvasNode', () => {
    const canvasNodes = (JSON.parse(makeCanvasFileContentString()) as CanvasData).nodes;

    it('should return .file for CanvasFileData', () => {
      const node = canvasNodes.find((v) => v.type === 'file');
      const expectedStr = (node as CanvasFileData).file;

      const result = SymbolHandler.getSuggestionTextForCanvasNode(node);
      expect(result).toBe(expectedStr);
    });

    it('should return .text for CanvasTextData', () => {
      const node = canvasNodes.find((v) => v.type === 'text');
      const expectedStr = (node as CanvasTextData).text;

      const result = SymbolHandler.getSuggestionTextForCanvasNode(node);
      expect(result).toBe(expectedStr);
    });

    it('should return .url for CanvasLinkData', () => {
      const node = canvasNodes.find((v) => v.type === 'link');
      const expectedStr = (node as CanvasLinkData).url;

      const result = SymbolHandler.getSuggestionTextForCanvasNode(node);
      expect(result).toBe(expectedStr);
    });

    it('should return .label for CanvasGroupData', () => {
      const node = canvasNodes.find((v) => v.type === 'group');
      const expectedStr = (node as CanvasGroupData).label;

      const result = SymbolHandler.getSuggestionTextForCanvasNode(node);
      expect(result).toBe(expectedStr);
    });
  });
});
