import { SwitcherPlusSettings } from 'src/settings';
import {
  Mode,
  SymbolSuggestion,
  SymbolType,
  HeadingIndicators,
  HeadingSuggestion,
  AnySymbolInfoPayload,
  LinkType,
} from 'src/types';
import { InputInfo } from 'src/switcherPlus';
import { SymbolHandler } from 'src/Handlers';
import {
  WorkspaceLeaf,
  PreparedQuery,
  prepareQuery,
  fuzzySearch,
  App,
  SearchResult,
  MarkdownView,
  EditorRange,
  Loc,
  renderResults,
  HeadingCache,
  TagCache,
  ReferenceCache,
  MetadataCache,
  Editor,
  Workspace,
  TFile,
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
} from '@fixtures';
import { mock, MockProxy } from 'jest-mock-extended';
import { mocked } from 'ts-jest/dist/utils/testing';

function makeLeaf(): MockProxy<WorkspaceLeaf> {
  const mockView = mock<MarkdownView>({
    file: new TFile(),
    editor: mock<Editor>(),
  });

  mockView.getViewType.mockImplementation(() => 'markdown');

  return mock<WorkspaceLeaf>({
    view: mockView,
  });
}

describe('symbolHandler', () => {
  const rootFixture = rootSplitEditorFixtures[0];
  const leftFixture = leftSplitEditorFixtures[0];
  let settings: SwitcherPlusSettings;
  let mockApp: MockProxy<App>;
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

    mockApp = mock<App>({ metadataCache: mockMetadataCache });

    settings = new SwitcherPlusSettings(null);
    jest.spyOn(settings, 'symbolListCommand', 'get').mockReturnValue(symbolTrigger);

    mockRootSplitLeaf = makeLeaf();
    mockLeftSplitLeaf = makeLeaf();

    symbolSugg = {
      type: 'symbol',
      item: {
        type: 'symbolInfo',
        symbol: getHeadings()[0],
        symbolType: SymbolType.Heading,
      },
      match: null,
    };
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
  });

  describe('getSuggestions', () => {
    const mockPrepareQuery = mocked<typeof prepareQuery>(prepareQuery);
    const mockFuzzySearch = mocked<typeof fuzzySearch>(fuzzySearch);

    test('with falsy input, it should return an empty array', () => {
      const results = sut.getSuggestions(null);

      expect(results).not.toBeNull();
      expect(results).toBeInstanceOf(Array);
      expect(results).toHaveLength(0);
    });

    test('with default settings, it should return symbol suggestions', () => {
      const inputInfo = new InputInfo(symbolTrigger);
      sut.validateCommand(inputInfo, 0, '', null, mockRootSplitLeaf);
      expect(inputInfo.mode).toBe(Mode.SymbolList);

      const results = sut.getSuggestions(inputInfo);

      expect(results).not.toBeNull();
      expect(results).toBeInstanceOf(Array);
      expect(results.every((sugg) => sugg.type === 'symbol')).toBe(true);

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

      mockEditor.getCursor.mockReturnValueOnce({
        line: expectedHeadingStartLineNumber + 1,
        ch: 0,
      });

      const activeSugg: HeadingSuggestion = {
        item: makeHeading('foo heading', 1),
        file: mockRootSplitLeaf.view.file, // <-- here, use the same TFile as ActivecLeaf
        match: null,
        type: 'heading',
      };

      // use headings prefix mode along with heading suggestion, note that the suggestion
      // has to point to the same TFile as 'activeLeaf'
      const inputInfo = new InputInfo('', Mode.HeadingsList);
      sut.validateCommand(
        inputInfo,
        headingsTrigger.length,
        '',
        activeSugg,
        mockRootSplitLeaf,
      );
      expect(inputInfo.mode).toBe(Mode.SymbolList);

      const results = sut.getSuggestions(inputInfo);

      expect(results).not.toBeNull();
      expect(results).toBeInstanceOf(Array);
      expect(results.every((sugg) => sugg.type === 'symbol')).toBe(true);

      const selectedSuggestions = results.filter((v) => v.item.isSelected === true);
      expect(selectedSuggestions).toHaveLength(1);
      expect(selectedSuggestions[0].item.symbol).toBe(expectedSelectedHeading);

      expect(mockMetadataCache.getFileCache).toHaveBeenCalledWith(
        mockRootSplitLeaf.view.file,
      );
      expect(mockPrepareQuery).toHaveBeenCalled();

      selectNearestHeadingSpy.mockReset();
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
      expect(results.every((sugg) => sugg.type === 'symbol')).toBe(true);

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
      expect(results.every((sugg) => sugg.type === 'symbol')).toBe(true);

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
      expect(results.every((sugg) => sugg.type === 'symbol')).toBe(true);
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
      expect(results[0]).toHaveProperty('type', 'symbol');

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
    const mockRenderResults = mocked<typeof renderResults>(renderResults);
    let mockTextSpan: MockProxy<HTMLSpanElement>;
    let mockParentEl: MockProxy<HTMLElement>;

    beforeAll(() => {
      mockTextSpan = mock<HTMLSpanElement>();
      mockParentEl = mock<HTMLElement>();
      mockParentEl.createSpan.mockImplementation(() => mockTextSpan);
    });

    it('should not throw an error with a null suggestion', () => {
      expect(() => sut.renderSuggestion(null, null)).not.toThrow();
    });

    it('should render Heading suggestion', () => {
      sut.renderSuggestion(symbolSugg, mockParentEl);

      expect(mockRenderResults).toHaveBeenCalledWith(
        mockTextSpan,
        (symbolSugg.item.symbol as HeadingCache).heading,
        symbolSugg.match,
      );

      expect(mockParentEl.createSpan).toHaveBeenCalledWith(
        expect.objectContaining({ cls: 'qsp-symbol-text' }),
      );
    });

    it('should render Tag suggestion', () => {
      const tagSugg: SymbolSuggestion = {
        type: 'symbol',
        item: {
          type: 'symbolInfo',
          symbol: getTags()[0],
          symbolType: SymbolType.Tag,
        },
        match: null,
      };

      sut.renderSuggestion(tagSugg, mockParentEl);

      expect(mockRenderResults).toHaveBeenCalledWith(
        mockTextSpan,
        (tagSugg.item.symbol as TagCache).tag.slice(1),
        tagSugg.match,
      );

      expect(mockParentEl.createSpan).toHaveBeenCalledWith(
        expect.objectContaining({ cls: 'qsp-symbol-text' }),
      );
    });

    it('should render Link suggestion', () => {
      const linkSugg: SymbolSuggestion = {
        type: 'symbol',
        item: {
          type: 'symbolInfo',
          symbol: getLinks()[1],
          symbolType: SymbolType.Link,
        },
        match: null,
      };

      sut.renderSuggestion(linkSugg, mockParentEl);

      const { link, displayText } = linkSugg.item.symbol as ReferenceCache;
      expect(mockRenderResults).toHaveBeenCalledWith(
        mockTextSpan,
        `${link}|${displayText}`,
        linkSugg.match,
      );

      expect(mockParentEl.createSpan).toHaveBeenCalledWith(
        expect.objectContaining({ cls: 'qsp-symbol-text' }),
      );
    });

    it('should add a symbol indicator', () => {
      sut.renderSuggestion(symbolSugg, mockParentEl);

      expect(mockParentEl.createDiv).toHaveBeenCalledWith(
        expect.objectContaining({
          text: HeadingIndicators[(symbolSugg.item.symbol as HeadingCache).level],
          cls: 'qsp-symbol-indicator',
        }),
      );
    });

    test('with symbolsInLineOrder enabled and no search term, it should indent symbols', () => {
      const settings = new SwitcherPlusSettings(null);
      jest.spyOn(settings, 'symbolsInLineOrder', 'get').mockReturnValue(true);

      const inputInfo = new InputInfo(symbolTrigger);
      sut.validateCommand(inputInfo, 0, 'foo', null, mockRootSplitLeaf);

      sut = new SymbolHandler(mockApp, settings);
      sut.getSuggestions(inputInfo);

      sut.renderSuggestion(symbolSugg, mockParentEl);

      expect(mockParentEl.addClass).toHaveBeenCalledWith(
        `qsp-symbol-l${symbolSugg.item.indentLevel}`,
      );
    });
  });

  describe('onChooseSuggestion', () => {
    type eState = {
      startLoc: Omit<Loc, 'offset'>;
      focus?: boolean;
      endLoc: Loc;
      line: number;
      cursor: EditorRange;
    };

    let mockWorkspace: MockProxy<Workspace>;

    const getExpectedEphemeralState = (
      sugg: SymbolSuggestion,
      focus?: boolean,
    ): eState => {
      const {
        start: { line, col },
        end: endLoc,
      } = sugg.item.symbol.position;

      const state: eState = {
        startLoc: { line, col },
        endLoc,
        line,
        cursor: {
          from: { line, ch: col },
          to: { line, ch: col },
        },
      };

      if (focus !== undefined) {
        state.focus = focus;
      }

      return state;
    };

    beforeAll(() => {
      mockWorkspace = mock<Workspace>();
      mockApp.workspace = mockWorkspace;
    });

    it('should not throw an error with a null suggestion', () => {
      expect(() => sut.onChooseSuggestion(null, null)).not.toThrow();
    });

    it('should activate the existing workspaceLeaf that contains the target symbol and scroll that view via eState', () => {
      const expectedState = getExpectedEphemeralState(symbolSugg, true);
      mockWorkspace.iterateAllLeaves.mockImplementation((callback) => {
        callback(mockRootSplitLeaf);
      });

      const inputInfo = new InputInfo(symbolTrigger);
      sut.validateCommand(inputInfo, 0, '', null, mockRootSplitLeaf);
      sut.getSuggestions(inputInfo);
      expect(inputInfo.mode).toBe(Mode.SymbolList);

      sut.onChooseSuggestion(symbolSugg, null);

      expect(mockWorkspace.iterateAllLeaves).toHaveBeenCalled();
      expect(mockWorkspace.setActiveLeaf).toHaveBeenCalledWith(mockRootSplitLeaf, true);
      expect(mockRootSplitLeaf.view.setEphemeralState).toHaveBeenCalledWith(
        expectedState,
      );

      mockWorkspace.iterateAllLeaves.mockReset();
    });

    it('should create a new workspaceLeaf for the target file that contains the symbol, and scroll via eState', () => {
      const expectedState = getExpectedEphemeralState(symbolSugg);
      mockWorkspace.openLinkText.mockResolvedValue();

      const inputInfo = new InputInfo(symbolTrigger);
      sut.validateCommand(inputInfo, 0, '', null, mockRootSplitLeaf);
      sut.getSuggestions(inputInfo);
      expect(inputInfo.mode).toBe(Mode.SymbolList);

      sut.onChooseSuggestion(symbolSugg, null);

      expect(mockWorkspace.openLinkText).toHaveBeenCalledWith(
        mockRootSplitLeaf.view.file.path,
        '',
        true,
        { eState: expectedState },
      );

      mockWorkspace.openLinkText.mockReset();
    });

    it('should catch errors while opening new workspaceLeaf and log it to the console', () => {
      // Promise used to trigger the error condition
      const openLinkTextPromise = Promise.resolve();

      mockWorkspace.openLinkText.mockImplementation(() => {
        // throw to simulate openLinkText() failing. This happens first
        return openLinkTextPromise.then(() => {
          throw new Error('openLinkText() unit test mock error');
        });
      });

      // Promise used to track the call to console.log
      let consoleLogPromiseResolveFn: (value: void | PromiseLike<void>) => void;
      const consoleLogPromise = new Promise<void>((resolve, _reject) => {
        consoleLogPromiseResolveFn = resolve;
      });

      const consoleLogSpy = jest
        .spyOn(console, 'log')
        .mockImplementation((message: string) => {
          if (message.startsWith('Switcher++: unable to navigate to symbol for file')) {
            // resolve the consoleLogPromise. This happens second and will allow
            // allPromises to resolve itself
            consoleLogPromiseResolveFn();
          }
        });

      // wait for the other promises to resolve before this promise can resolve
      const allPromises = Promise.all([openLinkTextPromise, consoleLogPromise]);

      const inputInfo = new InputInfo(symbolTrigger);
      sut.validateCommand(inputInfo, 0, '', null, mockRootSplitLeaf);
      sut.getSuggestions(inputInfo);
      expect(inputInfo.mode).toBe(Mode.SymbolList);

      // internally calls openLinkText(), which the spy will cause to fail, and then
      // will call console.log
      sut.onChooseSuggestion(symbolSugg, null);

      // when all the promises are resolved check expectations and clean up
      return allPromises.finally(() => {
        expect(mockWorkspace.iterateAllLeaves).toHaveBeenCalled();
        expect(mockWorkspace.openLinkText).toHaveBeenCalled();
        expect(consoleLogSpy).toHaveBeenCalled();

        mockWorkspace.openLinkText.mockReset();
        consoleLogSpy.mockRestore();
      });
    });
  });
});
