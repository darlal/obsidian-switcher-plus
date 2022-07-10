import { SwitcherPlusSettings } from 'src/settings';
import {
  Mode,
  SymbolSuggestion,
  SymbolType,
  HeadingIndicators,
  AnySymbolInfoPayload,
  LinkType,
  SuggestionType,
} from 'src/types';
import { InputInfo, SourcedParsedCommand } from 'src/switcherPlus';
import { Handler, SymbolHandler } from 'src/Handlers';
import {
  WorkspaceLeaf,
  PreparedQuery,
  prepareQuery,
  fuzzySearch,
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
} from 'obsidian';
import {
  rootSplitEditorFixtures,
  leftSplitEditorFixtures,
  symbolTrigger,
  headingsTrigger,
  makePreparedQuery,
  makeFuzzyMatch,
  getHeadings,
  getTags,
  getLinks,
  makeHeading,
  makeSymbolSuggestion,
  makeLeaf,
  makeAliasSuggestion,
  makeEditorSuggestion,
  makeStarredSuggestion,
  makeHeadingSuggestion,
  makeSearchStarredItem,
} from '@fixtures';
import { mock, MockProxy } from 'jest-mock-extended';

describe('symbolHandler', () => {
  const rootFixture = rootSplitEditorFixtures[0];
  const leftFixture = leftSplitEditorFixtures[0];
  let settings: SwitcherPlusSettings;
  let mockApp: MockProxy<App>;
  let mockWorkspace: MockProxy<Workspace>;
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

    mockWorkspace = mock<Workspace>({ activeLeaf: null });
    mockApp = mock<App>({
      workspace: mockWorkspace,
      metadataCache: mockMetadataCache,
      vault: mock<Vault>(),
    });

    settings = new SwitcherPlusSettings(null);
    jest.spyOn(settings, 'symbolListCommand', 'get').mockReturnValue(symbolTrigger);

    mockRootSplitLeaf = makeLeaf();
    mockLeftSplitLeaf = makeLeaf();

    symbolSugg = makeSymbolSuggestion(getHeadings()[0], SymbolType.Heading, new TFile());
  });

  beforeEach(() => {
    // reset for each test because symbol mode will use saved data from previous runs
    sut = new SymbolHandler(mockApp, settings);
  });

  describe('commandString', () => {
    it('should return symbolListCommand trigger', () => {
      expect(sut.commandString).toBe(symbolTrigger);
    });
  });

  describe('validateCommand', () => {
    filterText = 'foo';

    beforeAll(() => {
      inputText = `${symbolTrigger}${filterText}`;
      startIndex = 0;
    });

    it('should validate parsed input in symbol prefix (active editor) mode', () => {
      const inputInfo = new InputInfo(inputText);

      sut.validateCommand(inputInfo, startIndex, filterText, null, mockRootSplitLeaf);
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
      mockWorkspace.activeLeaf = targetLeaf; // <-- set the target as a currently open leaf

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

      mockWorkspace.activeLeaf = null;
    });

    it('should validate parsed input for starred file suggestion', () => {
      const targetFile = new TFile();
      const sugg = makeStarredSuggestion(null, targetFile);

      (mockApp.vault as MockProxy<Vault>).getAbstractFileByPath
        .calledWith(targetFile.path)
        .mockReturnValueOnce(targetFile);

      const inputInfo = new InputInfo('', Mode.StarredList);
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

    it('should not validate parsed input for starred search suggestion', () => {
      const item = makeSearchStarredItem();
      const sugg = makeStarredSuggestion(item);

      const inputInfo = new InputInfo('', Mode.StarredList);
      sut.validateCommand(inputInfo, 0, '', sugg, null);

      expect(inputInfo.mode).toBe(Mode.StarredList);

      const symbolCmd = inputInfo.parsedCommand(Mode.SymbolList) as SourcedParsedCommand;
      expect(symbolCmd.isValidated).toBe(false);
      expect(symbolCmd.source).toBeNull();
    });

    it('should validate and identify active editor as matching the file suggestion target', () => {
      const targetLeaf = makeLeaf();
      const sugg = makeAliasSuggestion(targetLeaf.view.file, 'foo');
      mockWorkspace.activeLeaf = targetLeaf; // <-- set the target as a currently open leaf

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

      mockWorkspace.activeLeaf = null;
    });

    it('should validate and identify in-active editor as matching the file suggestion target file', () => {
      const targetLeaf = makeLeaf();
      const sugg = makeAliasSuggestion(targetLeaf.view.file, 'foo');

      mockWorkspace.activeLeaf = null; // <-- clear out active leaf
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

      mockWorkspace.iterateAllLeaves.mockReset();
    });
  });

  describe('getSuggestions', () => {
    const mockPrepareQuery = jest.mocked<typeof prepareQuery>(prepareQuery);
    const mockFuzzySearch = jest.mocked<typeof fuzzySearch>(fuzzySearch);

    test('with falsy input, it should return an empty array', () => {
      const results = sut.getSuggestions(null);

      expect(results).not.toBeNull();
      expect(results).toBeInstanceOf(Array);
      expect(results).toHaveLength(0);
    });

    test('that SymbolSuggestion have a file property to enable interop with other plugins (like HoverEditor)', () => {
      const inputInfo = new InputInfo(symbolTrigger);
      const results = sut.getSuggestions(inputInfo);

      expect(results.every((v) => v.file !== null)).toBe(true);
    });

    test('with default settings, it should return symbol suggestions', () => {
      const inputInfo = new InputInfo(symbolTrigger);
      sut.validateCommand(inputInfo, 0, '', null, mockRootSplitLeaf);
      expect(inputInfo.mode).toBe(Mode.SymbolList);

      const results = sut.getSuggestions(inputInfo);

      expect(results).not.toBeNull();
      expect(results).toBeInstanceOf(Array);
      expect(results.every((sugg) => sugg.type === SuggestionType.SymbolList)).toBe(true);

      const set = new Set(results.map((sugg) => sugg.item.symbol));

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const cached: AnySymbolInfoPayload[] = Object.values(
        rootFixture.cachedMetadata,
      ).flat();

      expect(results).toHaveLength(cached.length);
      expect(cached.every((item) => set.has(item))).toBe(true);

      expect(mockMetadataCache.getFileCache).toHaveBeenCalledWith(
        mockRootSplitLeaf.view.file,
      );
      expect(mockPrepareQuery).toHaveBeenCalled();
    });

    test('with selectNearestHeading set to true, it should set the isSelected property of the nearest preceding heading suggestion to true when the file is open in the active editor for any file based suggestion modes', () => {
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

      mockWorkspace.activeLeaf = mockRootSplitLeaf;

      // here, use the same TFile as ActiveLeaf
      const activeSugg = makeHeadingSuggestion(
        makeHeading('foo heading', 1),
        mockWorkspace.activeLeaf.view.file,
      );

      // use headings prefix mode along with heading suggestion, note that the suggestion
      // has to point to the same TFile as 'activeLeaf'
      const inputInfo = new InputInfo('', Mode.HeadingsList);
      sut.validateCommand(
        inputInfo,
        headingsTrigger.length,
        '',
        activeSugg,
        mockWorkspace.activeLeaf,
      );

      const results = sut.getSuggestions(inputInfo);

      expect(inputInfo.mode).toBe(Mode.SymbolList);
      expect(results).toBeInstanceOf(Array);
      expect(results.every((sugg) => sugg.type === SuggestionType.SymbolList)).toBe(true);

      const selectedSuggestions = results.filter((v) => v.item.isSelected === true);
      expect(selectedSuggestions).toHaveLength(1);
      expect(selectedSuggestions[0].item.symbol).toBe(expectedSelectedHeading);

      expect(mockMetadataCache.getFileCache).toHaveBeenCalledWith(
        mockWorkspace.activeLeaf.view.file,
      );
      expect(mockPrepareQuery).toHaveBeenCalled();

      selectNearestHeadingSpy.mockReset();
      mockEditor.getCursor.mockReset();
      mockWorkspace.activeLeaf = null;
    });

    test('with selectNearestHeading set to true, it should set the isSelected property of the nearest preceding heading suggestion to true', () => {
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

      const results = sut.getSuggestions(inputInfo);

      expect(results).not.toBeNull();
      expect(results).toBeInstanceOf(Array);
      expect(results.every((sugg) => sugg.type === SuggestionType.SymbolList)).toBe(true);

      const selectedSuggestions = results.filter((v) => v.item.isSelected === true);
      expect(selectedSuggestions).toHaveLength(1);
      expect(selectedSuggestions[0].item.symbol).toBe(expectedSelectedHeading);

      expect(mockMetadataCache.getFileCache).toHaveBeenCalledWith(
        mockRootSplitLeaf.view.file,
      );
      expect(mockPrepareQuery).toHaveBeenCalled();

      selectNearestHeadingSpy.mockReset();
    });

    test('with filter search term, it should return only matching symbol suggestions', () => {
      mockMetadataCache.getFileCache.mockReturnValueOnce(leftFixture.cachedMetadata);
      mockPrepareQuery.mockReturnValueOnce(makePreparedQuery(filterText));
      mockFuzzySearch.mockImplementation(
        (_q: PreparedQuery, text: string): SearchResult => {
          const match = makeFuzzyMatch();
          return text === 'tag1' || text === 'tag2' ? match : null;
        },
      );

      filterText = 'tag';
      inputText = `${symbolTrigger}${filterText}`;
      startIndex = 0;
      const inputInfo = new InputInfo(inputText);
      sut.validateCommand(inputInfo, startIndex, filterText, null, mockLeftSplitLeaf);
      expect(inputInfo.mode).toBe(Mode.SymbolList);

      const results = sut.getSuggestions(inputInfo);

      expect(results).not.toBeNull();
      expect(results).toBeInstanceOf(Array);
      expect(results).toHaveLength(2);
      expect(results.every((sugg) => sugg.type === SuggestionType.SymbolList)).toBe(true);

      const { tags } = leftFixture.cachedMetadata;
      const resTags = new Set(results.map((sugg) => sugg.item.symbol));
      expect(tags.every((tag) => resTags.has(tag))).toBe(true);

      expect(mockMetadataCache.getFileCache).toHaveBeenCalledWith(
        mockLeftSplitLeaf.view.file,
      );
      expect(mockPrepareQuery).toHaveBeenCalled();
      expect(mockFuzzySearch).toHaveBeenCalled();

      mockFuzzySearch.mockReset();
    });

    test('with existing filter search term, it should continue refining suggestions for the previous target', () => {
      mockMetadataCache.getFileCache.mockReturnValue(leftFixture.cachedMetadata);

      // 1) setup first initial run
      filterText = 'tag';
      inputText = `${symbolTrigger}${filterText}`;
      startIndex = 0;

      mockPrepareQuery.mockReturnValueOnce(makePreparedQuery(filterText));

      mockFuzzySearch.mockImplementation((_q: PreparedQuery, text: string) => {
        const match = makeFuzzyMatch();
        return text === 'tag1' || text === 'tag2' ? match : null;
      });

      let inputInfo = new InputInfo(inputText);

      sut.validateCommand(inputInfo, startIndex, filterText, null, mockLeftSplitLeaf);
      expect(inputInfo.mode).toBe(Mode.SymbolList);

      let results = sut.getSuggestions(inputInfo);

      expect(results).not.toBeNull();
      expect(results).toBeInstanceOf(Array);
      expect(results).toHaveLength(2);
      expect(results.every((sugg) => sugg.type === SuggestionType.SymbolList)).toBe(true);
      expect(mockMetadataCache.getFileCache).toHaveBeenCalledWith(
        mockLeftSplitLeaf.view.file,
      );
      mockFuzzySearch.mockReset();

      // 2) setup second run, which refines the filterText from the first run
      filterText = 'tag2';
      mockPrepareQuery.mockReturnValueOnce(makePreparedQuery(filterText));

      mockFuzzySearch.mockImplementation((q: PreparedQuery, text: string) => {
        const match = makeFuzzyMatch([[0, 4]], -0.0104);
        return text === q.query ? match : null;
      });

      const mockTempLeaf = makeLeaf();
      const mockTempLeafFile = mockTempLeaf.view.file;

      inputText = `${symbolTrigger}${filterText}`;
      inputInfo = new InputInfo(inputText);

      // note the use of a different leaf than the first run
      sut.validateCommand(inputInfo, startIndex, filterText, null, mockTempLeaf);
      expect(inputInfo.mode).toBe(Mode.SymbolList);

      results = sut.getSuggestions(inputInfo);

      expect(results).not.toBeNull();
      expect(results).toBeInstanceOf(Array);
      expect(results).toHaveLength(1); // expect just 1 this time
      expect(results[0]).toHaveProperty('type', SuggestionType.SymbolList);

      const tag = leftFixture.cachedMetadata.tags.find((item) => item.tag === '#tag2');
      expect(results[0]).toHaveProperty('item.symbol', tag);

      // getFileCache should be called with leftSplitLeaf.view.file both times
      expect(mockMetadataCache.getFileCache).not.toHaveBeenCalledWith(mockTempLeafFile);
      expect(mockMetadataCache.getFileCache).toHaveBeenCalledWith(
        mockLeftSplitLeaf.view.file,
      );
      expect(mockPrepareQuery).toHaveBeenCalled();

      mockMetadataCache.getFileCache.mockReset();
      mockFuzzySearch.mockReset();
    });

    it('should not return suggestions for a symbol type that is disabled', () => {
      const inputInfo = new InputInfo(symbolTrigger);

      const isSymbolTypeEnabledSpy = jest
        .spyOn(settings, 'isSymbolTypeEnabled')
        .mockImplementation((type) => (type === SymbolType.Tag ? false : true));

      mockMetadataCache.getFileCache.mockReturnValueOnce({ tags: getTags() });
      sut.validateCommand(inputInfo, 0, '', null, mockRootSplitLeaf);
      expect(inputInfo.mode).toBe(Mode.SymbolList);

      const results = sut.getSuggestions(inputInfo);

      expect(results).toBeInstanceOf(Array);
      expect(results).toHaveLength(0);

      expect(mockMetadataCache.getFileCache).toHaveBeenCalledWith(
        mockRootSplitLeaf.view.file,
      );
      expect(mockPrepareQuery).toHaveBeenCalled();

      isSymbolTypeEnabledSpy.mockRestore();
    });

    it('should not return suggestions for links if the Link symbol type is disabled', () => {
      const inputInfo = new InputInfo(symbolTrigger);

      const isSymbolTypeEnabledSpy = jest
        .spyOn(settings, 'isSymbolTypeEnabled')
        .mockImplementation((type) => (type === SymbolType.Link ? false : true));

      mockMetadataCache.getFileCache.mockReturnValueOnce({ links: getLinks() });
      sut.validateCommand(inputInfo, 0, '', null, mockRootSplitLeaf);
      expect(inputInfo.mode).toBe(Mode.SymbolList);

      const results = sut.getSuggestions(inputInfo);

      expect(results).toBeInstanceOf(Array);
      expect(results).toHaveLength(0);

      expect(mockMetadataCache.getFileCache).toHaveBeenCalledWith(
        mockRootSplitLeaf.view.file,
      );
      expect(mockPrepareQuery).toHaveBeenCalled();

      isSymbolTypeEnabledSpy.mockRestore();
    });

    it('should not return suggestions for a sub-link type that is disabled', () => {
      const inputInfo = new InputInfo(symbolTrigger);

      const excludeLinkSubTypesSpy = jest
        .spyOn(settings, 'excludeLinkSubTypes', 'get')
        .mockReturnValue(LinkType.Block | LinkType.Heading);

      mockMetadataCache.getFileCache.mockReturnValueOnce({ links: getLinks() });
      sut.validateCommand(inputInfo, 0, '', null, mockRootSplitLeaf);
      expect(inputInfo.mode).toBe(Mode.SymbolList);

      const results = sut.getSuggestions(inputInfo);

      expect(results).toBeInstanceOf(Array);

      // getLinks fixture returns 2 links, 1 block, 1 normal
      expect(results).toHaveLength(1);

      expect(mockMetadataCache.getFileCache).toHaveBeenCalledWith(
        mockRootSplitLeaf.view.file,
      );
      expect(mockPrepareQuery).toHaveBeenCalled();

      excludeLinkSubTypesSpy.mockRestore();
    });
  });

  describe('renderSuggestion', () => {
    let renderContentSpy: jest.SpyInstance;
    let mockParentEl: MockProxy<HTMLElement>;

    beforeAll(() => {
      renderContentSpy = jest.spyOn(Handler.prototype, 'renderContent');
      mockParentEl = mock<HTMLElement>();
      mockParentEl.createDiv.mockReturnValue(mock<HTMLDivElement>());
    });

    afterEach(() => {
      mockParentEl.createDiv.mockClear();
      renderContentSpy.mockClear();
    });

    afterAll(() => {
      renderContentSpy.mockRestore();
    });

    it('should not throw an error with a null suggestion', () => {
      expect(() => sut.renderSuggestion(null, null)).not.toThrow();
    });

    it('should render Heading suggestion', () => {
      sut.renderSuggestion(symbolSugg, mockParentEl);

      expect(mockParentEl.addClasses).toHaveBeenCalledWith(
        expect.arrayContaining(['qsp-suggestion-symbol']),
      );
      expect(renderContentSpy).toHaveBeenCalledWith(
        mockParentEl,
        (symbolSugg.item.symbol as HeadingCache).heading,
        symbolSugg.match,
      );
    });

    it('should render Tag suggestion', () => {
      const tagSugg = makeSymbolSuggestion(getTags()[0], SymbolType.Tag);

      sut.renderSuggestion(tagSugg, mockParentEl);

      expect(renderContentSpy).toHaveBeenCalledWith(
        mockParentEl,
        (tagSugg.item.symbol as TagCache).tag.slice(1),
        tagSugg.match,
      );
    });

    it('should render Link suggestion', () => {
      const linkSugg = makeSymbolSuggestion(getLinks()[1], SymbolType.Link);

      sut.renderSuggestion(linkSugg, mockParentEl);

      const { link, displayText } = linkSugg.item.symbol as ReferenceCache;
      expect(renderContentSpy).toHaveBeenCalledWith(
        mockParentEl,
        `${link}|${displayText}`,
        linkSugg.match,
      );
    });

    it('should add a symbol indicator', () => {
      const mockAuxEl = mock<HTMLDivElement>();
      mockAuxEl.createSpan.mockReturnValue(mock<HTMLSpanElement>());

      const mockContainerEl = mock<HTMLElement>();
      mockContainerEl.createDiv.mockReturnValue(mockAuxEl);

      sut.renderSuggestion(symbolSugg, mockContainerEl);

      expect(mockContainerEl.createDiv).toHaveBeenCalledWith(
        expect.objectContaining({
          cls: ['suggestion-aux', 'qsp-aux'],
        }),
      );
      expect(mockAuxEl.createSpan).toHaveBeenCalledWith(
        expect.objectContaining({
          text: HeadingIndicators[(symbolSugg.item.symbol as HeadingCache).level],
          cls: ['suggestion-flair', 'qsp-symbol-indicator'],
        }),
      );
    });

    test('with symbolsInLineOrder enabled and no search term, it should indent symbols', () => {
      const settings = new SwitcherPlusSettings(null);
      jest.spyOn(settings, 'symbolsInLineOrder', 'get').mockReturnValue(true);

      const inputInfo = new InputInfo(symbolTrigger);
      const handler = new SymbolHandler(mockApp, settings);

      handler.validateCommand(inputInfo, 0, 'foo', null, mockRootSplitLeaf);
      handler.getSuggestions(inputInfo);

      handler.renderSuggestion(symbolSugg, mockParentEl);

      expect(mockParentEl.addClasses).toHaveBeenCalledWith(
        expect.arrayContaining([`qsp-symbol-l${symbolSugg.item.indentLevel}`]),
      );
    });
  });

  describe('onChooseSuggestion', () => {
    beforeAll(() => {
      const fileContainerLeaf = makeLeaf();
      fileContainerLeaf.openFile.mockResolvedValueOnce();
      mockWorkspace.getLeaf.mockReturnValue(fileContainerLeaf);
    });

    const getExpectedEphemeralState = (sugg: SymbolSuggestion): OpenViewState => {
      const {
        start: { line, col },
        end: endLoc,
      } = sugg.item.symbol.position;

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

    it('should activate the existing workspaceLeaf that contains the target symbol and scroll that view via eState', () => {
      const mockEvt = mock<KeyboardEvent>();
      const expectedState = getExpectedEphemeralState(symbolSugg);
      const mockLeaf = makeLeaf(symbolSugg.file);

      const navigateToLeafOrOpenFileSpy = jest.spyOn(
        Handler.prototype,
        'navigateToLeafOrOpenFile',
      );

      const inputInfo = new InputInfo(symbolTrigger);
      sut.validateCommand(inputInfo, 0, '', null, mockLeaf);
      sut.getSuggestions(inputInfo);
      expect(inputInfo.mode).toBe(Mode.SymbolList);

      sut.onChooseSuggestion(symbolSugg, mockEvt);

      expect(inputInfo.mode).toBe(Mode.SymbolList);
      expect(navigateToLeafOrOpenFileSpy).toHaveBeenCalledWith(
        mockEvt,
        symbolSugg.file,
        expect.any(String),
        expectedState,
        mockLeaf,
        Mode.SymbolList,
      );

      navigateToLeafOrOpenFileSpy.mockRestore();
    });
  });
});
