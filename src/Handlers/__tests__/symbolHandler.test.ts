import { SwitcherPlusSettings } from 'src/settings';
import { Mode, SymbolSuggestion, SymbolType } from 'src/types';
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
} from 'obsidian';
import {
  rootSplitEditorFixtures,
  leftSplitEditorFixtures,
  symbolTrigger,
  makePreparedQuery,
  makeFuzzyMatch,
  makePreparedQueryEmpty,
  getHeadings,
} from '@fixtures';

describe('symbolHandler', () => {
  const rootFixture = rootSplitEditorFixtures[0];
  const leftFixture = leftSplitEditorFixtures[0];
  let settings: SwitcherPlusSettings;
  let app: App;
  let sut: SymbolHandler;
  let mockGetFileCache: jest.SpyInstance;
  let mockPrepareQuery: jest.MockedFunction<typeof prepareQuery>;
  let mockFuzzySearch: jest.MockedFunction<typeof fuzzySearch>;
  let rootSplitLeaf: WorkspaceLeaf;
  let leftSplitLeaf: WorkspaceLeaf;
  let inputText: string;
  let startIndex: number;
  let filterText: string;

  beforeAll(() => {
    app = new App();

    settings = new SwitcherPlusSettings(null);
    jest.spyOn(settings, 'symbolListCommand', 'get').mockReturnValue(symbolTrigger);

    mockGetFileCache = jest
      .spyOn(app.metadataCache, 'getFileCache')
      .mockImplementation(() => {
        return rootFixture.cachedMetadata;
      });

    mockPrepareQuery = prepareQuery as jest.MockedFunction<typeof prepareQuery>;
    mockPrepareQuery.mockReturnValue(makePreparedQueryEmpty());

    mockFuzzySearch = fuzzySearch as jest.MockedFunction<typeof fuzzySearch>;
    rootSplitLeaf = new WorkspaceLeaf();
    leftSplitLeaf = new WorkspaceLeaf();
  });

  beforeEach(() => {
    // reset for each test because symbol mode will use saved data from previous runs
    sut = new SymbolHandler(app, settings);
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

      sut.validateCommand(inputInfo, startIndex, filterText, null, rootSplitLeaf);
      expect(inputInfo.mode).toBe(Mode.SymbolList);

      const symbolCmd = inputInfo.parsedCommand();
      expect(symbolCmd.parsedInput).toBe(filterText);
      expect(symbolCmd.isValidated).toBe(true);
    });
  });

  describe('getSuggestions', () => {
    test('with falsy input, it should return an empty array', () => {
      const results = sut.getSuggestions(null);

      expect(results).not.toBeNull();
      expect(results).toBeInstanceOf(Array);
      expect(results).toHaveLength(0);
    });

    test('with default settings, it should return symbol suggestions', () => {
      const inputInfo = new InputInfo(symbolTrigger);
      sut.validateCommand(inputInfo, 0, '', null, rootSplitLeaf);
      expect(inputInfo.mode).toBe(Mode.SymbolList);

      const results = sut.getSuggestions(inputInfo);

      expect(results).not.toBeNull();
      expect(results).toBeInstanceOf(Array);
      expect(results.every((sugg) => sugg.type === 'symbol')).toBe(true);

      const set = new Set(results.map((sugg) => sugg.item.symbol));
      const cached = Object.values(rootFixture.cachedMetadata).flat();
      expect(results).toHaveLength(cached.length);
      expect(cached.every((item) => set.has(item))).toBe(true);

      expect(mockGetFileCache).toHaveBeenCalledWith(rootSplitLeaf.view.file);
      expect(mockPrepareQuery).toHaveBeenCalled();
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

      const getCursorSpy = jest.spyOn(
        (rootSplitLeaf.view as MarkdownView).editor,
        'getCursor',
      );
      getCursorSpy.mockReturnValueOnce({
        line: expectedHeadingStartLineNumber + 1,
        ch: 0,
      });

      const inputInfo = new InputInfo(symbolTrigger);
      sut.validateCommand(inputInfo, 0, '', null, rootSplitLeaf);
      expect(inputInfo.mode).toBe(Mode.SymbolList);

      const results = sut.getSuggestions(inputInfo);

      expect(results).not.toBeNull();
      expect(results).toBeInstanceOf(Array);
      expect(results.every((sugg) => sugg.type === 'symbol')).toBe(true);

      const selectedSuggestions = results.filter((v) => v.item.isSelected === true);
      expect(selectedSuggestions).toHaveLength(1);
      expect(selectedSuggestions[0].item.symbol).toBe(expectedSelectedHeading);

      expect(mockGetFileCache).toHaveBeenCalledWith(rootSplitLeaf.view.file);
      expect(mockPrepareQuery).toHaveBeenCalled();

      selectNearestHeadingSpy.mockRestore();
    });

    test('with filter search term, it should return only matching symbol suggestions', () => {
      mockGetFileCache.mockReturnValueOnce(leftFixture.cachedMetadata);
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
      sut.validateCommand(inputInfo, startIndex, filterText, null, leftSplitLeaf);
      expect(inputInfo.mode).toBe(Mode.SymbolList);

      const results = sut.getSuggestions(inputInfo);

      expect(results).not.toBeNull();
      expect(results).toBeInstanceOf(Array);
      expect(results).toHaveLength(2);
      expect(results.every((sugg) => sugg.type === 'symbol')).toBe(true);

      const { tags } = leftFixture.cachedMetadata;
      const resTags = new Set(results.map((sugg) => sugg.item.symbol));
      expect(tags.every((tag) => resTags.has(tag))).toBe(true);

      expect(mockGetFileCache).toHaveBeenCalledWith(leftSplitLeaf.view.file);
      expect(mockPrepareQuery).toHaveBeenCalled();
      expect(mockFuzzySearch).toHaveBeenCalled();

      mockFuzzySearch.mockRestore();
    });

    test('with existing filter search term, it should continue refining suggestions for the previous target', () => {
      mockGetFileCache.mockReturnValue(leftFixture.cachedMetadata);

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

      sut.validateCommand(inputInfo, startIndex, filterText, null, leftSplitLeaf);
      expect(inputInfo.mode).toBe(Mode.SymbolList);

      let results = sut.getSuggestions(inputInfo);

      expect(results).not.toBeNull();
      expect(results).toBeInstanceOf(Array);
      expect(results).toHaveLength(2);
      expect(results.every((sugg) => sugg.type === 'symbol')).toBe(true);
      expect(mockGetFileCache).toHaveBeenCalledWith(leftSplitLeaf.view.file);
      mockFuzzySearch.mockRestore();

      // 2) setup second run, which refines the filterText from the first run
      filterText = 'tag2';
      mockPrepareQuery.mockReturnValueOnce(makePreparedQuery(filterText));

      mockFuzzySearch.mockImplementation((q: PreparedQuery, text: string) => {
        const match = makeFuzzyMatch([[0, 4]], -0.0104);
        return text === q.query ? match : null;
      });

      const tempLeaf = new WorkspaceLeaf();
      const tempLeafFile = tempLeaf.view.file;

      inputText = `${symbolTrigger}${filterText}`;
      inputInfo = new InputInfo(inputText);

      // note the use of a different leaf than the first run
      sut.validateCommand(inputInfo, startIndex, filterText, null, tempLeaf);
      expect(inputInfo.mode).toBe(Mode.SymbolList);

      results = sut.getSuggestions(inputInfo);

      expect(results).not.toBeNull();
      expect(results).toBeInstanceOf(Array);
      expect(results).toHaveLength(1); // expect just 1 this time
      expect(results[0]).toHaveProperty('type', 'symbol');

      const tag = leftFixture.cachedMetadata.tags.find((item) => item.tag === '#tag2');
      expect(results[0]).toHaveProperty('item.symbol', tag);

      // getFileCache should be called with leftSplitLeaf.view.file both times
      expect(mockGetFileCache).not.toHaveBeenCalledWith(tempLeafFile);
      expect(mockGetFileCache).toHaveBeenCalledWith(leftSplitLeaf.view.file);
      expect(mockPrepareQuery).toHaveBeenCalled();

      mockGetFileCache.mockRestore();
      mockFuzzySearch.mockRestore();
    });
  });

  describe('renderSuggestion', () => {
    it('should not throw an error with a null suggestion', () => {
      expect(() => sut.renderSuggestion(null, null)).not.toThrow();
    });
  });

  describe('onChooseSuggestion', () => {
    const symbolSugg: SymbolSuggestion = {
      type: 'symbol',
      item: {
        type: 'symbolInfo',
        symbol: getHeadings()[0],
        symbolType: SymbolType.Heading,
      },
      match: null,
    };

    type eState = {
      startLoc: Omit<Loc, 'offset'>;
      focus?: boolean;
      endLoc: Loc;
      line: number;
      cursor: EditorRange;
    };

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

    it('should not throw an error with a null suggestion', () => {
      expect(() => sut.onChooseSuggestion(null, null)).not.toThrow();
    });

    it('should activate the existing workspaceLeaf that contains the target symbol and scroll that view via eState', () => {
      const expectedState = getExpectedEphemeralState(symbolSugg, true);
      const iterateAllLeavesSpy = jest
        .spyOn(app.workspace, 'iterateAllLeaves')
        .mockImplementation((callback: (leaf: WorkspaceLeaf) => void) => {
          callback(rootSplitLeaf);
        });

      const setActiveLeafSpy = jest.spyOn(app.workspace, 'setActiveLeaf');
      const setEphemeralStateSpy = jest.spyOn(rootSplitLeaf.view, 'setEphemeralState');

      const inputInfo = new InputInfo(symbolTrigger);
      sut.validateCommand(inputInfo, 0, '', null, rootSplitLeaf);
      sut.getSuggestions(inputInfo);
      expect(inputInfo.mode).toBe(Mode.SymbolList);

      sut.onChooseSuggestion(symbolSugg, null);

      expect(iterateAllLeavesSpy).toHaveBeenCalled();
      expect(setEphemeralStateSpy).toHaveBeenCalledWith(expectedState);
      expect(setActiveLeafSpy).toHaveBeenCalledWith(rootSplitLeaf, true);

      iterateAllLeavesSpy.mockRestore();
      setActiveLeafSpy.mockRestore();
      setEphemeralStateSpy.mockRestore();
    });

    it('should create a new workspaceLeaf for the target file that contains the symbol, and scroll via eState', () => {
      const expectedState = getExpectedEphemeralState(symbolSugg);
      const iterateAllLeavesSpy = jest
        .spyOn(app.workspace, 'iterateAllLeaves')
        .mockImplementation((_callback: (leaf: WorkspaceLeaf) => void) => {
          // noop, simulates no open workspace leaves open/found
        });

      const openLinkTextSpy = jest
        .spyOn(app.workspace, 'openLinkText')
        .mockResolvedValue();

      const inputInfo = new InputInfo(symbolTrigger);
      sut.validateCommand(inputInfo, 0, '', null, rootSplitLeaf);
      sut.getSuggestions(inputInfo);
      expect(inputInfo.mode).toBe(Mode.SymbolList);

      sut.onChooseSuggestion(symbolSugg, null);

      expect(iterateAllLeavesSpy).toHaveBeenCalled();
      expect(openLinkTextSpy).toHaveBeenCalledWith(
        rootSplitLeaf.view.file.path,
        '',
        true,
        { eState: expectedState },
      );

      iterateAllLeavesSpy.mockRestore();
      openLinkTextSpy.mockRestore();
    });

    it('should catch errors while opening new workspaceLeaf and log it to the console', () => {
      const iterateAllLeavesSpy = jest
        .spyOn(app.workspace, 'iterateAllLeaves')
        .mockImplementation((_callback: (leaf: WorkspaceLeaf) => void) => {
          // noop, simulates no open workspace leaves open/found
        });

      // Promise used to trigger the error condition
      const openLinkTextPromise = Promise.resolve();
      const openLinkTextSpy = jest
        .spyOn(app.workspace, 'openLinkText')
        .mockImplementation((_linktext, _sourcePath, _newLeaf?, _state?) => {
          // throw to simulate openLinkText() failing. This happens first
          return openLinkTextPromise.then(() => {
            throw new Error('openLinkText() unit test error');
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
      sut.validateCommand(inputInfo, 0, '', null, rootSplitLeaf);
      sut.getSuggestions(inputInfo);
      expect(inputInfo.mode).toBe(Mode.SymbolList);

      // internally calls openLinkText(), which the spy will cause to fail, and then
      // will call console.log
      sut.onChooseSuggestion(symbolSugg, null);

      // when all the promises are resolved check expectations and clean up
      return allPromises.finally(() => {
        expect(iterateAllLeavesSpy).toHaveBeenCalled();
        expect(openLinkTextSpy).toHaveBeenCalled();
        expect(consoleLogSpy).toHaveBeenCalled();

        iterateAllLeavesSpy.mockRestore();
        openLinkTextSpy.mockRestore();
        consoleLogSpy.mockRestore();
      });
    });
  });
});
