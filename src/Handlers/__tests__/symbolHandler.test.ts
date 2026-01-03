import {
  BASE_VIEW_FACET_ID_MAP,
  CANVAS_NODE_FACET_ID_MAP,
  SwitcherPlusSettings,
} from 'src/settings';
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
  SourceInfo,
} from 'src/types';
import { InputInfo, SourcedParsedCommand } from 'src/switcherPlus';
import { Handler, SymbolHandler, SymbolInfoExcludingSpecialFiles } from 'src/Handlers';
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
  View,
  BasesConfigFile,
  BaseViewData,
  parseYaml,
  Pos,
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
  makeInputInfo,
  makeBaseFileContentString,
  makeBaseFileContentStringEmptyViews,
  makeBaseFileContentStringNoViews,
  makeBaseFileContentStringInvalid,
  makeLoc,
} from '@fixtures';
import { CanvasData, CanvasFileData, CanvasGroupData } from 'obsidian/canvas';
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

    test('with selectNearestHeading set to true, it should handle headings that are after the cursor by keeping the previous heading', async () => {
      // Arrange
      // This test covers the branch on line 367 where currLine > cursorLine (returns acc)
      const selectNearestHeadingSpy = jest
        .spyOn(settings, 'selectNearestHeading', 'get')
        .mockReturnValue(true);

      // Create headings: one before cursor, one after cursor
      const headingBeforeCursor = makeHeading(
        'Heading Before',
        1,
        makeLoc(5, 0, 0),
        makeLoc(5, 15, 15),
      );

      const headingAfterCursor = makeHeading(
        'Heading After',
        1,
        makeLoc(15, 0, 0),
        makeLoc(15, 15, 15),
      );
      const cursorLine = 10; // Between the two headings

      const metadata = getCachedMetadata();
      metadata.headings = [headingBeforeCursor, headingAfterCursor];
      mockMetadataCache.getFileCache.mockReturnValueOnce(metadata);

      const mockEditor = (mockRootSplitLeaf.view as MarkdownView)
        .editor as MockProxy<Editor>;
      mockEditor.getCursor.mockReturnValueOnce({
        line: cursorLine,
        ch: 0,
      });

      const inputInfo = new InputInfo(symbolTrigger);
      sut.validateCommand(inputInfo, 0, '', null, mockRootSplitLeaf);
      expect(inputInfo.mode).toBe(Mode.SymbolList);

      // Act
      const results = await sut.getSuggestions(inputInfo);

      // Assert
      // Should select the heading before cursor, not the one after
      const selectedSuggestions = results.filter((v) => v.item.isSelected === true);
      expect(selectedSuggestions).toHaveLength(1);
      expect(selectedSuggestions[0].item.symbol).toBe(headingBeforeCursor);
      expect(selectedSuggestions[0].item.symbol).not.toBe(headingAfterCursor);

      selectNearestHeadingSpy.mockReset();
    });

    test('with selectNearestHeading set to true, it should handle headings at the same or earlier line by keeping the previous heading', async () => {
      // Arrange
      // This test covers the branch on line 367 where currLine <= accLine (returns acc)
      const selectNearestHeadingSpy = jest
        .spyOn(settings, 'selectNearestHeading', 'get')
        .mockReturnValue(true);

      // Create headings: first at line 5, second at line 3 (earlier), cursor at line 10
      const heading1 = makeHeading(
        'Heading First',
        1,
        makeLoc(5, 0, 0),
        makeLoc(5, 15, 15),
      );

      const heading2 = makeHeading(
        'Heading Earlier',
        1,
        makeLoc(3, 0, 0),
        makeLoc(3, 18, 18),
      );
      const cursorLine = 10;

      const metadata = getCachedMetadata();
      // Add headings in order: first heading1, then heading2 (which is earlier)
      metadata.headings = [heading1, heading2];
      mockMetadataCache.getFileCache.mockReturnValueOnce(metadata);

      const mockEditor = (mockRootSplitLeaf.view as MarkdownView)
        .editor as MockProxy<Editor>;
      mockEditor.getCursor.mockReturnValueOnce({
        line: cursorLine,
        ch: 0,
      });

      const inputInfo = new InputInfo(symbolTrigger);
      sut.validateCommand(inputInfo, 0, '', null, mockRootSplitLeaf);
      expect(inputInfo.mode).toBe(Mode.SymbolList);

      // Act
      const results = await sut.getSuggestions(inputInfo);

      // Assert
      // Should select heading1 (the first one that meets the condition),
      // not heading2 (which is earlier and doesn't meet currLine > accLine)
      const selectedSuggestions = results.filter((v) => v.item.isSelected === true);
      expect(selectedSuggestions).toHaveLength(1);
      expect(selectedSuggestions[0].item.symbol).toBe(heading1);
      expect(selectedSuggestions[0].item.symbol).not.toBe(heading2);

      selectNearestHeadingSpy.mockReset();
    });

    test('with selectNearestHeading set to true, it should handle headings that are both earlier than previous and after cursor by keeping the previous heading', async () => {
      // Arrange
      // This test covers the branch on line 369 where both conditions are false:
      // currLine <= accLine && currLine > cursorLine (returns acc)
      const selectNearestHeadingSpy = jest
        .spyOn(settings, 'selectNearestHeading', 'get')
        .mockReturnValue(true);

      // Create headings: first at line 3, second at line 2 (earlier), cursor at line 1
      // heading2 is both: earlier than heading1 (2 <= 3) AND after cursor (2 > 1)
      // heading1 meets: 3 > -1 && 3 <= 1 → false, so acc stays null
      // heading2 meets: 2 > -1 && 2 <= 1 → false, so acc stays null
      // But we need heading1 to be selected first, then heading2 should not replace it
      // So let's put cursor at line 4, heading1 at line 3, heading2 at line 2
      const heading1 = makeHeading(
        'Heading First',
        1,
        makeLoc(3, 0, 0),
        makeLoc(3, 15, 15),
      );

      const heading2 = makeHeading(
        'Heading Earlier After Cursor',
        1,
        makeLoc(2, 0, 0),
        makeLoc(2, 25, 25),
      );
      const cursorLine = 4; // After both headings

      const metadata = getCachedMetadata();
      // Add headings in order: first heading1, then heading2 (which is earlier)
      metadata.headings = [heading1, heading2];
      mockMetadataCache.getFileCache.mockReturnValueOnce(metadata);

      const mockEditor = (mockRootSplitLeaf.view as MarkdownView)
        .editor as MockProxy<Editor>;
      mockEditor.getCursor.mockReturnValueOnce({
        line: cursorLine,
        ch: 0,
      });

      const inputInfo = new InputInfo(symbolTrigger);
      sut.validateCommand(inputInfo, 0, '', null, mockRootSplitLeaf);
      expect(inputInfo.mode).toBe(Mode.SymbolList);

      // Act
      const results = await sut.getSuggestions(inputInfo);

      // Assert
      // heading1: 3 > -1 && 3 <= 4 → true && true → true → returns heading1
      // heading2: 2 > 3 && 2 <= 4 → false && true → false → returns heading1 (acc)
      // So heading1 should be selected
      const selectedSuggestions = results.filter((v) => v.item.isSelected === true);
      expect(selectedSuggestions).toHaveLength(1);
      expect(selectedSuggestions[0].item.symbol).toBe(heading1);
      expect(selectedSuggestions[0].item.symbol).not.toBe(heading2);

      selectNearestHeadingSpy.mockReset();
    });

    test('with selectNearestHeading set to true, it should handle headings at the same line by keeping the previous heading', async () => {
      // Arrange
      // This test covers the branch on line 369 where currLine === accLine (returns acc)
      const selectNearestHeadingSpy = jest
        .spyOn(settings, 'selectNearestHeading', 'get')
        .mockReturnValue(true);

      // Create headings: both at line 5, cursor at line 10
      // heading2 is at the same line as heading1 (currLine === accLine)
      const heading1 = makeHeading(
        'Heading First',
        1,
        makeLoc(5, 0, 0),
        makeLoc(5, 15, 15),
      );

      const heading2 = makeHeading(
        'Heading Same Line',
        2,
        makeLoc(5, 20, 20),
        makeLoc(5, 40, 40),
      );
      const cursorLine = 10;

      const metadata = getCachedMetadata();
      // Add headings in order: first heading1, then heading2 (at same line)
      metadata.headings = [heading1, heading2];
      mockMetadataCache.getFileCache.mockReturnValueOnce(metadata);

      const mockEditor = (mockRootSplitLeaf.view as MarkdownView)
        .editor as MockProxy<Editor>;
      mockEditor.getCursor.mockReturnValueOnce({
        line: cursorLine,
        ch: 0,
      });

      const inputInfo = new InputInfo(symbolTrigger);
      sut.validateCommand(inputInfo, 0, '', null, mockRootSplitLeaf);
      expect(inputInfo.mode).toBe(Mode.SymbolList);

      // Act
      const results = await sut.getSuggestions(inputInfo);

      // Assert
      // Should select heading1 (the first one that meets the condition),
      // not heading2 (which is at the same line and doesn't meet currLine > accLine)
      const selectedSuggestions = results.filter((v) => v.item.isSelected === true);
      expect(selectedSuggestions).toHaveLength(1);
      expect(selectedSuggestions[0].item.symbol).toBe(heading1);
      expect(selectedSuggestions[0].item.symbol).not.toBe(heading2);

      selectNearestHeadingSpy.mockReset();
    });

    test('with selectNearestHeading set to true, it should handle headings exactly at the cursor line', async () => {
      // Arrange
      // This test covers the branch on line 369 where currLine === cursorLine
      const selectNearestHeadingSpy = jest
        .spyOn(settings, 'selectNearestHeading', 'get')
        .mockReturnValue(true);

      // Create headings: first at line 5, second at line 10 (exactly at cursor)
      const heading1 = makeHeading(
        'Heading Before',
        1,
        makeLoc(5, 0, 0),
        makeLoc(5, 15, 15),
      );

      const heading2 = makeHeading(
        'Heading At Cursor',
        1,
        makeLoc(10, 0, 0),
        makeLoc(10, 18, 18),
      );
      const cursorLine = 10; // Same as heading2

      const metadata = getCachedMetadata();
      metadata.headings = [heading1, heading2];
      mockMetadataCache.getFileCache.mockReturnValueOnce(metadata);

      const mockEditor = (mockRootSplitLeaf.view as MarkdownView)
        .editor as MockProxy<Editor>;
      mockEditor.getCursor.mockReturnValueOnce({
        line: cursorLine,
        ch: 0,
      });

      const inputInfo = new InputInfo(symbolTrigger);
      sut.validateCommand(inputInfo, 0, '', null, mockRootSplitLeaf);
      expect(inputInfo.mode).toBe(Mode.SymbolList);

      // Act
      const results = await sut.getSuggestions(inputInfo);

      // Assert
      // Should select heading2 (at cursor line, meets currLine > accLine && currLine <= cursorLine)
      const selectedSuggestions = results.filter((v) => v.item.isSelected === true);
      expect(selectedSuggestions).toHaveLength(1);
      expect(selectedSuggestions[0].item.symbol).toBe(heading2);
      expect(selectedSuggestions[0].item.symbol).not.toBe(heading1);

      selectNearestHeadingSpy.mockReset();
    });

    test('with selectNearestHeading set to true, it should handle first heading when acc is null (covers falsy branch on line 367)', async () => {
      // Arrange
      // This test covers the falsy branch on line 367: accLine = acc ? ... : -1
      // When acc is null (first iteration of reduce), accLine should be -1
      const selectNearestHeadingSpy = jest
        .spyOn(settings, 'selectNearestHeading', 'get')
        .mockReturnValue(true);

      // Create a single heading before cursor to test first iteration with acc=null
      const heading = makeHeading(
        'First Heading',
        1,
        makeLoc(5, 0, 0),
        makeLoc(5, 15, 15),
      );
      const cursorLine = 10; // After the heading

      const metadata = getCachedMetadata();
      metadata.headings = [heading];
      mockMetadataCache.getFileCache.mockReturnValueOnce(metadata);

      const mockEditor = (mockRootSplitLeaf.view as MarkdownView)
        .editor as MockProxy<Editor>;
      mockEditor.getCursor.mockReturnValueOnce({
        line: cursorLine,
        ch: 0,
      });

      const inputInfo = new InputInfo(symbolTrigger);
      sut.validateCommand(inputInfo, 0, '', null, mockRootSplitLeaf);
      expect(inputInfo.mode).toBe(Mode.SymbolList);

      // Act
      const results = await sut.getSuggestions(inputInfo);

      // Assert
      // With acc=null on first iteration, accLine=-1, so condition is: 5 > -1 && 5 <= 10 → true
      // Heading should be selected
      const selectedSuggestions = results.filter((v) => v.item.isSelected === true);
      expect(selectedSuggestions).toHaveLength(1);
      expect(selectedSuggestions[0].item.symbol).toBe(heading);

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

    it('should return suggestions for base files', async () => {
      // Arrange
      const mockBaseFile = new TFile();
      mockBaseFile.extension = 'base';
      const activeLeaf = makeLeaf(mockBaseFile);
      const fileContent = makeBaseFileContentString();
      const parsedData: BasesConfigFile = {
        views: [
          { type: 'table', name: 'All Tasks' },
          { type: 'list', name: 'Project List' },
          { type: 'cards', name: 'Kanban Board' },
        ],
      };
      const inputInfo = new InputInfo(symbolTrigger);
      sut.validateCommand(inputInfo, 0, '', null, activeLeaf);

      mockVault.cachedRead.mockResolvedValueOnce(fileContent);
      const mockParseYamlFn = jest.mocked(parseYaml);
      mockParseYamlFn.mockReturnValue(parsedData);

      // Act
      const results = await sut.getSuggestions(inputInfo);

      // Assert
      expect(results.every((sugg) => sugg.type === SuggestionType.SymbolList)).toBe(true);
      expect(results).toHaveLength(parsedData.views.length);
      expect(mockVault.cachedRead).toHaveBeenCalledWith(mockBaseFile);
      expect(mockParseYamlFn).toHaveBeenCalledWith(fileContent);
      expect(results.every((sugg) => sugg.item.symbolType === SymbolType.BaseView)).toBe(
        true,
      );
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

    it('should process base files before canvas files when both checks would match', async () => {
      // Arrange
      // Create a file that could theoretically match both (though in practice a file
      // can only have one extension, this test verifies the order of checks)
      const mockBaseFile = new TFile();
      mockBaseFile.extension = 'base';
      const activeLeaf = makeLeaf(mockBaseFile);
      const fileContent = makeBaseFileContentString();
      const parsedData: BasesConfigFile = {
        views: [{ type: 'table', name: 'Test View' }],
      };
      const inputInfo = new InputInfo(symbolTrigger);
      sut.validateCommand(inputInfo, 0, '', null, activeLeaf);

      mockVault.cachedRead.mockResolvedValueOnce(fileContent);
      const mockParseYamlFn = jest.mocked(parseYaml);
      mockParseYamlFn.mockReturnValue(parsedData);

      const addBaseViewsSpy = jest.spyOn(sut, 'addBaseViewsFromSource');
      const addCanvasSymbolsSpy = jest.spyOn(sut, 'addCanvasSymbolsFromSource');

      // Act
      await sut.getSuggestions(inputInfo);

      // Assert
      // Base file should trigger addBaseViewsFromSource, not addCanvasSymbolsFromSource
      expect(addBaseViewsSpy).toHaveBeenCalledTimes(1);
      expect(addCanvasSymbolsSpy).not.toHaveBeenCalled();
      expect(addBaseViewsSpy).toHaveBeenCalledWith(
        mockBaseFile,
        expect.any(Array),
        expect.any(Set),
      );

      addBaseViewsSpy.mockRestore();
      addCanvasSymbolsSpy.mockRestore();
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

    it('should render heading symbols using the unified renderSymbolContent method', () => {
      const renderSymbolContentSpy = jest.spyOn(SymbolHandler, 'renderSymbolContent');

      sut.renderSuggestion(symbolSugg, mockParentEl);

      expect(renderSymbolContentSpy).toHaveBeenCalledTimes(1);

      renderSymbolContentSpy.mockRestore();
    });

    it('should render heading breadcrumbs when enabled', () => {
      const headingSugg = makeSymbolSuggestion(
        getHeadings()[3],
        SymbolType.Heading,
        new TFile(),
      );
      mockMetadataCache.getFileCache.mockReturnValueOnce(rootFixture.cachedMetadata);
      const previousValue = settings.showHeadingBreadcrumbsInSymbolMode;
      settings.showHeadingBreadcrumbsInSymbolMode = true;
      const renderBreadcrumbSpy = jest
        .spyOn(sut, 'renderBreadcrumb')
        .mockReturnValueOnce();

      sut.renderSuggestion(headingSugg, mockParentEl);

      expect(renderBreadcrumbSpy).toHaveBeenCalledTimes(1);

      renderBreadcrumbSpy.mockRestore();
      settings.showHeadingBreadcrumbsInSymbolMode = previousValue;
    });

    it('should not render heading breadcrumbs for non-heading symbols', () => {
      const tagSugg = makeSymbolSuggestion(getTags()[0], SymbolType.Tag);
      const previousValue = settings.showHeadingBreadcrumbsInSymbolMode;
      settings.showHeadingBreadcrumbsInSymbolMode = true;
      const renderBreadcrumbSpy = jest.spyOn(sut, 'renderBreadcrumb');

      sut.renderSuggestion(tagSugg, mockParentEl);

      expect(renderBreadcrumbSpy).not.toHaveBeenCalled();

      renderBreadcrumbSpy.mockRestore();
      settings.showHeadingBreadcrumbsInSymbolMode = previousValue;
    });

    it('should skip heading breadcrumbs when disabled', () => {
      const headingSugg = makeSymbolSuggestion(
        getHeadings()[3],
        SymbolType.Heading,
        new TFile(),
      );
      const previousValue = settings.showHeadingBreadcrumbsInSymbolMode;
      settings.showHeadingBreadcrumbsInSymbolMode = false;
      const renderBreadcrumbSpy = jest.spyOn(sut, 'renderBreadcrumb');

      sut.renderSuggestion(headingSugg, mockParentEl);

      expect(renderBreadcrumbSpy).not.toHaveBeenCalled();

      renderBreadcrumbSpy.mockRestore();
      settings.showHeadingBreadcrumbsInSymbolMode = previousValue;
    });

    it('should NOT render tags in Symbol mode (all suggestions belong to same file)', () => {
      // In Symbol mode, all suggestions pertain to the same file, so showing
      // file-level tags on every symbol suggestion would be redundant
      const expectedFile = new TFile();
      const headingSugg = makeSymbolSuggestion(
        getHeadings()[0],
        SymbolType.Heading,
        expectedFile,
      );
      const renderTagsSpy = jest
        .spyOn(Handler.prototype, 'renderTags')
        .mockReturnValueOnce();

      sut.renderSuggestion(headingSugg, mockParentEl);

      expect(renderTagsSpy).not.toHaveBeenCalled();

      renderTagsSpy.mockRestore();
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
      symbolInfo: SymbolInfoExcludingSpecialFiles,
    ): OpenViewState => {
      const { start: startLoc, end: endLoc } = symbolInfo.symbol.position;
      const { line, col } = startLoc;

      const state: Record<string, unknown> = {
        active: true,
        eState: {
          active: true,
          focus: true,
          startLoc,
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
        symbolSugg.item as SymbolInfoExcludingSpecialFiles,
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

      await sut.getSuggestions(
        makeInputInfo({ mode: Mode.SymbolList, sourceInfo: { leaf: mockLeaf } }),
      );

      sut.onChooseSuggestion(canvasSugg, null);
      await promise;

      expect(mockCanvasView.canvas.selectOnly).toHaveBeenCalledWith(mockCanvasNodeEl);
      expect(mockCanvasView.canvas.zoomToSelection).toHaveBeenCalled();

      navigateToLeafOrOpenFileSpy.mockReset();
      getActiveLeafSpy.mockRestore();
    });

    it('should log any navigation errors to the console', async () => {
      const canvasSugg = makeSymbolSuggestion(null, SymbolType.CanvasNode, new TFile());
      const errorMsg = 'SymbolHandler onChooseSuggestion Unit test error';
      const rejectedPromise = Promise.reject(new Error(errorMsg));
      const consoleLogSpy = jest.spyOn(console, 'log').mockReturnValueOnce();

      sut.inputInfo = makeInputInfo({
        mode: Mode.SymbolList,
        sourceInfo: mock<SourceInfo>(),
      });

      navigateToLeafOrOpenFileSpy.mockReturnValueOnce(rejectedPromise);

      sut.onChooseSuggestion(canvasSugg, null);

      await expect(rejectedPromise).rejects.toBeTruthy();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ message: errorMsg }),
      );

      navigateToLeafOrOpenFileSpy.mockReset();
      consoleLogSpy.mockRestore();
    });

    describe('Base view navigation', () => {
      it('should navigate to Base view after file is opened', async () => {
        // Arrange
        const mockBaseFile = new TFile();
        mockBaseFile.path = 'MyBase.base';
        mockBaseFile.extension = 'base';
        const baseViewData: BaseViewData = {
          type: 'table',
          name: 'All Tasks',
        };
        const baseViewSugg = makeSymbolSuggestion(
          baseViewData,
          SymbolType.BaseView,
          mockBaseFile,
        );
        const promise = Promise.resolve();

        mockWorkspace.openLinkText = mockFn().mockResolvedValue(undefined);

        const mockLeaf = makeLeaf(mockBaseFile);
        sut.inputInfo = makeInputInfo({
          mode: Mode.SymbolList,
          sourceInfo: { file: mockBaseFile, leaf: mockLeaf },
        });

        navigateToLeafOrOpenFileSpy.mockReturnValueOnce(promise);

        // Act
        sut.onChooseSuggestion(baseViewSugg, null);
        await promise;

        // Assert
        expect(mockWorkspace.openLinkText).toHaveBeenCalledTimes(1);
        expect(mockWorkspace.openLinkText).toHaveBeenCalledWith(
          `${mockBaseFile.path}#All Tasks`,
          mockBaseFile.path,
          false,
        );

        navigateToLeafOrOpenFileSpy.mockReset();
        mockWorkspace.openLinkText.mockReset();
      });

      it('should construct linktext correctly by stripping .base extension', async () => {
        // Arrange
        const mockBaseFile = new TFile();
        mockBaseFile.path = 'Projects/MyBase.base';
        mockBaseFile.extension = 'base';
        const baseViewData: BaseViewData = {
          type: 'list',
          name: 'Project List',
        };
        const baseViewSugg = makeSymbolSuggestion(
          baseViewData,
          SymbolType.BaseView,
          mockBaseFile,
        );
        const promise = Promise.resolve();

        mockWorkspace.openLinkText = mockFn().mockResolvedValue(undefined);

        const mockLeaf = makeLeaf(mockBaseFile);
        sut.inputInfo = makeInputInfo({
          mode: Mode.SymbolList,
          sourceInfo: { file: mockBaseFile, leaf: mockLeaf },
        });

        navigateToLeafOrOpenFileSpy.mockReturnValueOnce(promise);

        // Act
        sut.onChooseSuggestion(baseViewSugg, null);
        await promise;

        // Assert
        // Should strip .base extension and construct linktext with view name
        expect(mockWorkspace.openLinkText).toHaveBeenCalledWith(
          `${mockBaseFile.path}#Project List`,
          mockBaseFile.path,
          false,
        );

        navigateToLeafOrOpenFileSpy.mockReset();
        mockWorkspace.openLinkText.mockReset();
      });

      it('should handle Base view names with special characters', async () => {
        // Arrange
        const mockBaseFile = new TFile();
        mockBaseFile.path = 'MyBase.base';
        mockBaseFile.extension = 'base';
        const baseViewData: BaseViewData = {
          type: 'cards',
          name: 'Kanban Board (2024)',
        };
        const baseViewSugg = makeSymbolSuggestion(
          baseViewData,
          SymbolType.BaseView,
          mockBaseFile,
        );
        const promise = Promise.resolve();

        mockWorkspace.openLinkText = mockFn().mockResolvedValue(undefined);

        const mockLeaf = makeLeaf(mockBaseFile);
        sut.inputInfo = makeInputInfo({
          mode: Mode.SymbolList,
          sourceInfo: { file: mockBaseFile, leaf: mockLeaf },
        });

        navigateToLeafOrOpenFileSpy.mockReturnValueOnce(promise);

        // Act
        sut.onChooseSuggestion(baseViewSugg, null);
        await promise;

        // Assert
        expect(mockWorkspace.openLinkText).toHaveBeenCalledWith(
          `${mockBaseFile.path}#Kanban Board (2024)`,
          mockBaseFile.path,
          false,
        );

        navigateToLeafOrOpenFileSpy.mockReset();
        mockWorkspace.openLinkText.mockReset();
      });

      it('should not navigate to Base view if symbol is not a Base view', async () => {
        // Arrange
        const mockFile = new TFile();
        const headingSugg = makeSymbolSuggestion(
          getHeadings()[0],
          SymbolType.Heading,
          mockFile,
        );
        const promise = Promise.resolve();

        mockWorkspace.openLinkText = mockFn().mockResolvedValue(undefined);

        const mockLeaf = makeLeaf(mockFile);
        sut.inputInfo = makeInputInfo({
          mode: Mode.SymbolList,
          sourceInfo: { file: mockFile, leaf: mockLeaf },
        });

        navigateToLeafOrOpenFileSpy.mockReturnValueOnce(promise);

        // Act
        sut.onChooseSuggestion(headingSugg, null);
        await promise;

        // Assert
        expect(mockWorkspace.openLinkText).not.toHaveBeenCalled();

        navigateToLeafOrOpenFileSpy.mockReset();
        mockWorkspace.openLinkText.mockReset();
      });

      it('should handle Base view navigation errors gracefully', async () => {
        // Arrange
        const mockBaseFile = new TFile();
        mockBaseFile.path = 'MyBase.base';
        mockBaseFile.extension = 'base';
        const baseViewData: BaseViewData = {
          type: 'table',
          name: 'All Tasks',
        };
        const baseViewSugg = makeSymbolSuggestion(
          baseViewData,
          SymbolType.BaseView,
          mockBaseFile,
        );
        const promise = Promise.resolve();
        const openLinkTextError = new Error('Failed to open link');
        const consoleLogSpy = jest.spyOn(console, 'log').mockReturnValue();

        mockWorkspace.openLinkText = mockFn().mockRejectedValue(openLinkTextError);

        const mockLeaf = makeLeaf(mockBaseFile);
        sut.inputInfo = makeInputInfo({
          mode: Mode.SymbolList,
          sourceInfo: { file: mockBaseFile, leaf: mockLeaf },
        });

        navigateToLeafOrOpenFileSpy.mockReturnValueOnce(promise);

        // Act
        sut.onChooseSuggestion(baseViewSugg, null);
        await promise;
        // Wait for openLinkText promise to reject
        await new Promise((resolve) => setTimeout(resolve, 0));

        // Assert
        expect(mockWorkspace.openLinkText).toHaveBeenCalledWith(
          `${mockBaseFile.path}#All Tasks`,
          mockBaseFile.path,
          false,
        );
        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('Unable to navigate to Base view'),
          openLinkTextError,
        );

        navigateToLeafOrOpenFileSpy.mockReset();
        mockWorkspace.openLinkText.mockReset();
        consoleLogSpy.mockRestore();
      });

      it('should navigate to Base view after file navigation completes', async () => {
        // Arrange
        const mockBaseFile = new TFile();
        mockBaseFile.path = 'MyBase.base';
        mockBaseFile.extension = 'base';
        const baseViewData: BaseViewData = {
          type: 'table',
          name: 'All Tasks',
        };
        const baseViewSugg = makeSymbolSuggestion(
          baseViewData,
          SymbolType.BaseView,
          mockBaseFile,
        );
        const promise = Promise.resolve();

        mockWorkspace.openLinkText = mockFn().mockResolvedValue(undefined);

        const mockLeaf = makeLeaf(mockBaseFile);
        sut.inputInfo = makeInputInfo({
          mode: Mode.SymbolList,
          sourceInfo: { file: mockBaseFile, leaf: mockLeaf },
        });

        navigateToLeafOrOpenFileSpy.mockReturnValueOnce(promise);

        // Act
        sut.onChooseSuggestion(baseViewSugg, null);
        await promise;

        // Assert
        // Should call openLinkText after navigateToLeafOrOpenFileAsync resolves
        expect(navigateToLeafOrOpenFileSpy).toHaveBeenCalled();
        expect(mockWorkspace.openLinkText).toHaveBeenCalledWith(
          `${mockBaseFile.path}#All Tasks`,
          mockBaseFile.path,
          false,
        );

        navigateToLeafOrOpenFileSpy.mockReset();
        mockWorkspace.openLinkText.mockReset();
      });
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

    it.each([
      { viewType: 'table', expectedIcon: 'lucide-table' },
      { viewType: 'list', expectedIcon: 'lucide-list' },
      { viewType: 'cards', expectedIcon: 'lucide-layout-grid' },
    ])('should add icon for Base views: $viewType', ({ viewType, expectedIcon }) => {
      // Arrange
      const baseViewData: BaseViewData = {
        type: viewType,
        name: chance.word(),
      };
      const sugg = makeSymbolSuggestion(baseViewData, SymbolType.BaseView);
      const renderIndicatorSpy = jest.spyOn(sut, 'renderIndicator');

      // Act
      sut.addSymbolIndicator(sugg.item, mockParentEl);

      // Assert
      expect(renderIndicatorSpy).toHaveBeenCalledWith(
        mockFlairContainerEl,
        ['qsp-symbol-indicator'],
        expectedIcon,
        null,
      );

      renderIndicatorSpy.mockRestore();
    });

    it('should use table icon as fallback for unknown Base view types', () => {
      // Arrange
      const baseViewData: BaseViewData = {
        type: 'unknown-view-type',
        name: chance.word(),
      };
      const sugg = makeSymbolSuggestion(baseViewData, SymbolType.BaseView);
      const renderIndicatorSpy = jest.spyOn(sut, 'renderIndicator');

      // Act
      sut.addSymbolIndicator(sugg.item, mockParentEl);

      // Assert
      expect(renderIndicatorSpy).toHaveBeenCalledWith(
        mockFlairContainerEl,
        ['qsp-symbol-indicator'],
        'lucide-table',
        null,
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

  describe('addBaseViewsFromSource', () => {
    const mockFile = new TFile();
    let mockParseYamlFn: jest.MockedFunction<typeof parseYaml>;

    beforeEach(() => {
      mockParseYamlFn = jest.mocked(parseYaml);
    });

    afterEach(() => {
      mockParseYamlFn.mockReset();
    });

    describe('adding base views', () => {
      it('should add symbol information for base views', async () => {
        // Arrange
        const results: SymbolInfo[] = [];
        const fileContent = makeBaseFileContentString();
        const parsedData: BasesConfigFile = {
          views: [
            { type: 'table', name: 'All Tasks' },
            { type: 'list', name: 'Project List' },
            { type: 'cards', name: 'Kanban Board' },
            { type: 'custom', name: 'Custom View' },
          ],
        };
        mockVault.cachedRead.mockResolvedValueOnce(fileContent);
        mockParseYamlFn.mockReturnValue(parsedData);

        // Act
        await sut.addBaseViewsFromSource(mockFile, results, new Set<string>());

        // Assert
        expect(mockVault.cachedRead).toHaveBeenCalledWith(mockFile);
        expect(mockParseYamlFn).toHaveBeenCalledWith(fileContent);
        expect(results).toHaveLength(parsedData.views.length);
        expect(results[0].symbolType).toBe(SymbolType.BaseView);
        expect(SymbolHandler.isBaseViewSymbolPayload(results[0])).toBe(true);
        const baseView = results[0] as SymbolInfo & { symbol: BaseViewData };
        expect(baseView.symbol).toMatchObject({
          type: 'table',
          name: 'All Tasks',
        });
      });

      it('should include all views when no facets are active', async () => {
        // Arrange
        const results: SymbolInfo[] = [];
        const fileContent = makeBaseFileContentString();
        const parsedData: BasesConfigFile = {
          views: [
            { type: 'table', name: 'All Tasks' },
            { type: 'list', name: 'Project List' },
            { type: 'cards', name: 'Kanban Board' },
            { type: 'custom', name: 'Custom View' },
          ],
        };
        mockVault.cachedRead.mockResolvedValueOnce(fileContent);
        mockParseYamlFn.mockReturnValue(parsedData);

        // Act
        await sut.addBaseViewsFromSource(mockFile, results, new Set<string>());

        // Assert
        expect(results).toHaveLength(parsedData.views.length);
        expect(results.every((r) => r.symbolType === SymbolType.BaseView)).toBe(true);
      });

      it('should filter views based on active facets', async () => {
        // Arrange
        const results: SymbolInfo[] = [];
        const fileContent = makeBaseFileContentString();
        const parsedData: BasesConfigFile = {
          views: [
            { type: 'table', name: 'All Tasks' },
            { type: 'list', name: 'Project List' },
            { type: 'cards', name: 'Kanban Board' },
            { type: 'custom', name: 'Custom View' },
          ],
        };
        mockVault.cachedRead.mockResolvedValueOnce(fileContent);
        mockParseYamlFn.mockReturnValue(parsedData);
        const activeFacetIds = new Set<string>([BASE_VIEW_FACET_ID_MAP.table]);

        // Act
        await sut.addBaseViewsFromSource(mockFile, results, activeFacetIds);

        // Assert
        expect(results).toHaveLength(1);
        expect(SymbolHandler.isBaseViewSymbolPayload(results[0])).toBe(true);
        const baseView = results[0] as SymbolInfo & { symbol: BaseViewData };
        expect(baseView.symbol).toMatchObject({
          type: 'table',
          name: 'All Tasks',
        });
      });

      it('should include unknown view types when no facets are active', async () => {
        // Arrange
        const results: SymbolInfo[] = [];
        const fileContent = makeBaseFileContentString();
        const parsedData: BasesConfigFile = {
          views: [
            { type: 'table', name: 'All Tasks' },
            { type: 'list', name: 'Project List' },
            { type: 'cards', name: 'Kanban Board' },
            { type: 'custom', name: 'Custom View' },
          ],
        };
        mockVault.cachedRead.mockResolvedValueOnce(fileContent);
        mockParseYamlFn.mockReturnValue(parsedData);

        // Act
        await sut.addBaseViewsFromSource(mockFile, results, new Set<string>());

        // Assert
        // The fixture includes a 'custom' view type which is not in BASE_VIEW_FACET_ID_MAP
        const customView = results.find((r) => {
          if (SymbolHandler.isBaseViewSymbolPayload(r)) {
            const baseView = r as SymbolInfo & { symbol: BaseViewData };
            return baseView.symbol.type === 'custom';
          }
          return false;
        });
        expect(customView).toBeDefined();
        expect(customView).not.toBeNull();
        expect(SymbolHandler.isBaseViewSymbolPayload(customView)).toBe(true);
        const baseView = customView as SymbolInfo & { symbol: BaseViewData };
        expect(baseView.symbol).toMatchObject({
          type: 'custom',
          name: 'Custom View',
        });
      });

      it('should exclude unknown view types when facets are active', async () => {
        // Arrange
        const results: SymbolInfo[] = [];
        const fileContent = makeBaseFileContentString();
        const parsedData: BasesConfigFile = {
          views: [
            { type: 'table', name: 'All Tasks' },
            { type: 'list', name: 'Project List' },
            { type: 'cards', name: 'Kanban Board' },
            { type: 'custom', name: 'Custom View' },
          ],
        };
        mockVault.cachedRead.mockResolvedValueOnce(fileContent);
        mockParseYamlFn.mockReturnValue(parsedData);
        const activeFacetIds = new Set<string>([BASE_VIEW_FACET_ID_MAP.table]);

        // Act
        await sut.addBaseViewsFromSource(mockFile, results, activeFacetIds);

        // Assert
        // Custom view should be excluded when facets are active
        const customView = results.find((r) => {
          if (SymbolHandler.isBaseViewSymbolPayload(r)) {
            const baseView = r as SymbolInfo & { symbol: BaseViewData };
            return baseView.symbol.type === 'custom';
          }
          return false;
        });
        expect(customView).toBeUndefined();
        // Only the table view should be included
        expect(results).toHaveLength(1);
      });
    });

    describe('error handling', () => {
      it('should handle empty views array', async () => {
        // Arrange
        const results: SymbolInfo[] = [];
        const fileContent = makeBaseFileContentStringEmptyViews();
        const parsedData: BasesConfigFile = { views: [] };
        mockVault.cachedRead.mockResolvedValueOnce(fileContent);
        mockParseYamlFn.mockReturnValue(parsedData);

        // Act
        await sut.addBaseViewsFromSource(mockFile, results, new Set<string>());

        // Assert
        expect(results).toHaveLength(0);
      });

      it('should handle missing views property', async () => {
        // Arrange
        const results: SymbolInfo[] = [];
        const fileContent = makeBaseFileContentStringNoViews();
        const parsedData = {
          name: 'My Base',
          description: 'A test base file',
        } as BasesConfigFile;
        mockVault.cachedRead.mockResolvedValueOnce(fileContent);
        mockParseYamlFn.mockReturnValue(parsedData);

        // Act
        await sut.addBaseViewsFromSource(mockFile, results, new Set<string>());

        // Assert
        expect(results).toHaveLength(0);
      });

      it('should handle null parsed data', async () => {
        // Arrange
        const results: SymbolInfo[] = [];
        const fileContent = '';
        mockVault.cachedRead.mockResolvedValueOnce(fileContent);
        mockParseYamlFn.mockReturnValue(null);

        // Act
        await sut.addBaseViewsFromSource(mockFile, results, new Set<string>());

        // Assert
        expect(results).toHaveLength(0);
      });

      it('should log any exceptions reading a file to the console', async () => {
        // Arrange
        const expectedMsg = `Switcher++: error reading file to extract base view information. ${mockFile.path} `;
        const errorMsg = 'addBaseViewsFromSource Unit test error';
        const consoleLogSpy = jest.spyOn(console, 'log').mockReturnValueOnce();
        mockVault.cachedRead.mockRejectedValueOnce(errorMsg);

        // Act
        await sut.addBaseViewsFromSource(mockFile, [], new Set<string>());

        // Assert
        expect(consoleLogSpy).toHaveBeenCalledWith(expectedMsg, errorMsg);
        expect(mockVault.cachedRead).toHaveBeenCalledWith(mockFile);

        consoleLogSpy.mockRestore();
      });

      it('should handle YAML parse errors gracefully', async () => {
        // Arrange
        const results: SymbolInfo[] = [];
        const fileContent = makeBaseFileContentStringInvalid();
        const consoleLogSpy = jest.spyOn(console, 'log').mockReturnValue();
        mockVault.cachedRead.mockResolvedValueOnce(fileContent);
        // Mock parseYaml to return null for invalid YAML
        mockParseYamlFn.mockReturnValue(null);

        // Act
        await sut.addBaseViewsFromSource(mockFile, results, new Set<string>());

        // Assert
        // parseYaml returns null for invalid YAML, method should handle it gracefully
        expect(results).toHaveLength(0);
        expect(mockParseYamlFn).toHaveBeenCalledWith(fileContent);

        consoleLogSpy.mockRestore();
      });
    });

    describe('facet filtering', () => {
      it('should include views matching active table facet', async () => {
        // Arrange
        const results: SymbolInfo[] = [];
        const fileContent = makeBaseFileContentString();
        const parsedData: BasesConfigFile = {
          views: [
            { type: 'table', name: 'All Tasks' },
            { type: 'list', name: 'Project List' },
            { type: 'cards', name: 'Kanban Board' },
            { type: 'custom', name: 'Custom View' },
          ],
        };
        mockVault.cachedRead.mockResolvedValueOnce(fileContent);
        mockParseYamlFn.mockReturnValue(parsedData);
        const activeFacetIds = new Set<string>([BASE_VIEW_FACET_ID_MAP.table]);

        // Act
        await sut.addBaseViewsFromSource(mockFile, results, activeFacetIds);

        // Assert
        expect(results).toHaveLength(1);
        expect(SymbolHandler.isBaseViewSymbolPayload(results[0])).toBe(true);
        const baseView = results[0] as SymbolInfo & { symbol: BaseViewData };
        expect(baseView.symbol.type).toBe('table');
      });

      it('should include views matching active list facet', async () => {
        // Arrange
        const results: SymbolInfo[] = [];
        const fileContent = makeBaseFileContentString();
        const parsedData: BasesConfigFile = {
          views: [
            { type: 'table', name: 'All Tasks' },
            { type: 'list', name: 'Project List' },
            { type: 'cards', name: 'Kanban Board' },
            { type: 'custom', name: 'Custom View' },
          ],
        };
        mockVault.cachedRead.mockResolvedValueOnce(fileContent);
        mockParseYamlFn.mockReturnValue(parsedData);
        const activeFacetIds = new Set<string>([BASE_VIEW_FACET_ID_MAP.list]);

        // Act
        await sut.addBaseViewsFromSource(mockFile, results, activeFacetIds);

        // Assert
        expect(results).toHaveLength(1);
        expect(SymbolHandler.isBaseViewSymbolPayload(results[0])).toBe(true);
        const baseView = results[0] as SymbolInfo & { symbol: BaseViewData };
        expect(baseView.symbol.type).toBe('list');
      });

      it('should include views matching active cards facet', async () => {
        // Arrange
        const results: SymbolInfo[] = [];
        const fileContent = makeBaseFileContentString();
        const parsedData: BasesConfigFile = {
          views: [
            { type: 'table', name: 'All Tasks' },
            { type: 'list', name: 'Project List' },
            { type: 'cards', name: 'Kanban Board' },
            { type: 'custom', name: 'Custom View' },
          ],
        };
        mockVault.cachedRead.mockResolvedValueOnce(fileContent);
        mockParseYamlFn.mockReturnValue(parsedData);
        const activeFacetIds = new Set<string>([BASE_VIEW_FACET_ID_MAP.cards]);

        // Act
        await sut.addBaseViewsFromSource(mockFile, results, activeFacetIds);

        // Assert
        expect(results).toHaveLength(1);
        expect(SymbolHandler.isBaseViewSymbolPayload(results[0])).toBe(true);
        const baseView = results[0] as SymbolInfo & { symbol: BaseViewData };
        expect(baseView.symbol.type).toBe('cards');
      });

      it('should include multiple views when multiple facets are active', async () => {
        // Arrange
        const results: SymbolInfo[] = [];
        const fileContent = makeBaseFileContentString();
        const parsedData: BasesConfigFile = {
          views: [
            { type: 'table', name: 'All Tasks' },
            { type: 'list', name: 'Project List' },
            { type: 'cards', name: 'Kanban Board' },
            { type: 'custom', name: 'Custom View' },
          ],
        };
        mockVault.cachedRead.mockResolvedValueOnce(fileContent);
        mockParseYamlFn.mockReturnValue(parsedData);
        const activeFacetIds = new Set<string>([
          BASE_VIEW_FACET_ID_MAP.table,
          BASE_VIEW_FACET_ID_MAP.list,
        ]);

        // Act
        await sut.addBaseViewsFromSource(mockFile, results, activeFacetIds);

        // Assert
        expect(results.length).toBeGreaterThan(1);
        const viewTypes = results
          .filter((r) => SymbolHandler.isBaseViewSymbolPayload(r))
          .map((r) => {
            const baseView = r as SymbolInfo & { symbol: BaseViewData };
            return baseView.symbol.type;
          });
        expect(viewTypes).toContain('table');
        expect(viewTypes).toContain('list');
      });
    });
  });

  describe('getSuggestionTextForCanvasNode', () => {
    const canvasNodes = (JSON.parse(makeCanvasFileContentString()) as CanvasData).nodes;

    it('should return .file for CanvasFileData', () => {
      const node = canvasNodes.find((v) => v.type === 'file');
      const expectedStr = node.file;

      const result = SymbolHandler.getSuggestionTextForCanvasNode(node);
      expect(result).toBe(expectedStr);
    });

    it('should return .text for CanvasTextData', () => {
      const node = canvasNodes.find((v) => v.type === 'text');
      const expectedStr = node.text;

      const result = SymbolHandler.getSuggestionTextForCanvasNode(node);
      expect(result).toBe(expectedStr);
    });

    it('should return .url for CanvasLinkData', () => {
      const node = canvasNodes.find((v) => v.type === 'link');
      const expectedStr = node.url;

      const result = SymbolHandler.getSuggestionTextForCanvasNode(node);
      expect(result).toBe(expectedStr);
    });

    it('should return .label for CanvasGroupData', () => {
      const node = canvasNodes.find((v) => v.type === 'group');
      const expectedStr = node.label;

      const result = SymbolHandler.getSuggestionTextForCanvasNode(node);
      expect(result).toBe(expectedStr);
    });
  });

  describe('getSuggestionTextForSymbol', () => {
    it('should return view name for Base views', () => {
      // Arrange
      const viewName = chance.word();
      const baseViewData: BaseViewData = {
        type: 'table',
        name: viewName,
      };
      const symbolInfo = makeSymbolSuggestion(baseViewData, SymbolType.BaseView).item;

      // Act
      const result = SymbolHandler.getSuggestionTextForSymbol(symbolInfo);

      // Assert
      expect(result).toBe(viewName);
    });
  });

  describe('isBaseFile', () => {
    it('should return true when file has base extension', () => {
      // Arrange
      const mockFile = new TFile();
      mockFile.extension = 'base';

      // Act
      const result = SymbolHandler.isBaseFile(mockFile);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when file has different extension', () => {
      // Arrange
      const mockFile = new TFile();
      mockFile.extension = 'md';

      // Act
      const result = SymbolHandler.isBaseFile(mockFile);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when file is null', () => {
      // Arrange
      const mockFile: TFile = null;

      // Act
      const result = SymbolHandler.isBaseFile(mockFile);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when file is undefined', () => {
      // Arrange
      const mockFile: TFile = undefined;

      // Act
      const result = SymbolHandler.isBaseFile(mockFile);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('isBaseView', () => {
    it('should return true when view type is bases', () => {
      // Arrange
      const mockView = mock<View>();
      mockView.getViewType.mockReturnValue('bases');

      // Act
      const result = SymbolHandler.isBaseView(mockView);

      // Assert
      expect(result).toBe(true);
      expect(mockView.getViewType).toHaveBeenCalled();
    });

    it('should return false when view type is not bases', () => {
      // Arrange
      const mockView = mock<View>();
      mockView.getViewType.mockReturnValue('markdown');

      // Act
      const result = SymbolHandler.isBaseView(mockView);

      // Assert
      expect(result).toBe(false);
      expect(mockView.getViewType).toHaveBeenCalled();
    });

    it('should return false when view is null', () => {
      // Arrange
      const mockView: View = null;

      // Act
      const result = SymbolHandler.isBaseView(mockView);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when view is undefined', () => {
      // Arrange
      const mockView: View = undefined;

      // Act
      const result = SymbolHandler.isBaseView(mockView);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('getPreferredViewLinePosition', () => {
    it('should return default position for Base views', () => {
      // Arrange
      const baseViewData: BaseViewData = {
        type: 'table',
        name: chance.word(),
      };
      const baseViewSugg = makeSymbolSuggestion(baseViewData, SymbolType.BaseView);
      const getPreferredViewLinePositionSpy = jest.spyOn(
        Handler.prototype,
        'getPreferredViewLinePosition',
      );
      const defaultLoc = { line: 0, col: 0, offset: 0 };
      const defaultPosition: Pos = { start: defaultLoc, end: defaultLoc };
      getPreferredViewLinePositionSpy.mockReturnValue(defaultPosition);

      // Act
      const result = sut.getPreferredViewLinePosition(baseViewSugg);

      // Assert
      expect(result).toBe(defaultPosition);
      expect(getPreferredViewLinePositionSpy).toHaveBeenCalled();

      getPreferredViewLinePositionSpy.mockRestore();
    });

    it('should return default position for Canvas nodes', () => {
      // Arrange
      const canvasNodes = (JSON.parse(makeCanvasFileContentString()) as CanvasData).nodes;
      const canvasNode = canvasNodes[0];
      const canvasSugg = makeSymbolSuggestion(canvasNode, SymbolType.CanvasNode);
      const getPreferredViewLinePositionSpy = jest.spyOn(
        Handler.prototype,
        'getPreferredViewLinePosition',
      );
      const defaultLoc = { line: 0, col: 0, offset: 0 };
      const defaultPosition: Pos = { start: defaultLoc, end: defaultLoc };
      getPreferredViewLinePositionSpy.mockReturnValue(defaultPosition);

      // Act
      const result = sut.getPreferredViewLinePosition(canvasSugg);

      // Assert
      expect(result).toBe(defaultPosition);
      expect(getPreferredViewLinePositionSpy).toHaveBeenCalled();

      getPreferredViewLinePositionSpy.mockRestore();
    });

    it('should return symbol position for symbols with position data', () => {
      // Arrange
      const heading = getHeadings()[0];
      const headingSugg = makeSymbolSuggestion(heading, SymbolType.Heading);
      const getPreferredViewLinePositionSpy = jest.spyOn(
        Handler.prototype,
        'getPreferredViewLinePosition',
      );
      const defaultLoc = { line: 0, col: 0, offset: 0 };
      const defaultPosition: Pos = { start: defaultLoc, end: defaultLoc };
      getPreferredViewLinePositionSpy.mockReturnValue(defaultPosition);

      // Act
      const result = sut.getPreferredViewLinePosition(headingSugg);

      // Assert
      expect(result).toBe(heading.position);
      expect(result).not.toBe(defaultPosition);

      getPreferredViewLinePositionSpy.mockRestore();
    });
  });

  describe('getAvailableFacets', () => {
    let inputInfo: InputInfo;
    const baseViewFacetIds = new Set(Object.values(BASE_VIEW_FACET_ID_MAP));
    const mdFacetIds = new Set(Object.values(SymbolType).filter((v) => isNaN(Number(v))));

    beforeEach(() => {
      inputInfo = new InputInfo(symbolTrigger);
      inputInfo.mode = Mode.SymbolList;
    });

    it('should return only Base view facets when source is a Base file', () => {
      // Arrange
      const mockBaseFile = new TFile();
      mockBaseFile.extension = 'base';
      const sourceInfo: SourceInfo = {
        file: mockBaseFile,
        leaf: null,
        suggestion: null,
        isValidSource: true,
      };
      const cmd = inputInfo.parsedCommand(Mode.SymbolList) as SourcedParsedCommand;
      cmd.source = sourceInfo;

      // Act
      const results = sut.getAvailableFacets(inputInfo);

      // Assert
      expect(results.length).toBeGreaterThan(0);
      expect(results.every((facet) => baseViewFacetIds.has(facet.id))).toBe(true);
      // Verify no markdown facets are included
      expect(results.some((facet) => mdFacetIds.has(facet.id))).toBe(false);
      // Verify no canvas facets are included
      const canvasFacetIds = new Set(Object.values(CANVAS_NODE_FACET_ID_MAP));
      expect(results.some((facet) => canvasFacetIds.has(facet.id))).toBe(false);
    });

    it('should return only Canvas facets when source is a Canvas file', () => {
      // Arrange
      const mockCanvasFile = new TFile();
      mockCanvasFile.extension = 'canvas';
      const sourceInfo: SourceInfo = {
        file: mockCanvasFile,
        leaf: null,
        suggestion: null,
        isValidSource: true,
      };
      const cmd = inputInfo.parsedCommand(Mode.SymbolList) as SourcedParsedCommand;
      cmd.source = sourceInfo;

      // Act
      const results = sut.getAvailableFacets(inputInfo);

      // Assert
      const canvasFacetIds = new Set(Object.values(CANVAS_NODE_FACET_ID_MAP));
      expect(results.length).toBeGreaterThan(0);
      expect(results.every((facet) => canvasFacetIds.has(facet.id))).toBe(true);
      // Verify no markdown facets are included
      expect(results.some((facet) => mdFacetIds.has(facet.id))).toBe(false);
      // Verify no base view facets are included
      expect(results.some((facet) => baseViewFacetIds.has(facet.id))).toBe(false);
    });

    it('should return only markdown facets when source is a markdown file', () => {
      // Arrange
      const mockMdFile = new TFile();
      mockMdFile.extension = 'md';
      const sourceInfo: SourceInfo = {
        file: mockMdFile,
        leaf: null,
        suggestion: null,
        isValidSource: true,
      };
      const cmd = inputInfo.parsedCommand(Mode.SymbolList) as SourcedParsedCommand;
      cmd.source = sourceInfo;

      // Act
      const results = sut.getAvailableFacets(inputInfo);

      // Assert
      expect(results.length).toBeGreaterThan(0);
      expect(results.every((facet) => mdFacetIds.has(facet.id))).toBe(true);
      // Verify no canvas facets are included
      const canvasFacetIds = new Set(Object.values(CANVAS_NODE_FACET_ID_MAP));
      expect(results.some((facet) => canvasFacetIds.has(facet.id))).toBe(false);
      // Verify no base view facets are included
      expect(results.some((facet) => baseViewFacetIds.has(facet.id))).toBe(false);
    });

    it('should check Base files before Canvas files when both checks would match', () => {
      // Arrange
      // Create a Base file (in practice, a file can only have one extension,
      // but this test verifies the order of checks)
      const mockBaseFile = new TFile();
      mockBaseFile.extension = 'base';
      const sourceInfo: SourceInfo = {
        file: mockBaseFile,
        leaf: null,
        suggestion: null,
        isValidSource: true,
      };
      const cmd = inputInfo.parsedCommand(Mode.SymbolList) as SourcedParsedCommand;
      cmd.source = sourceInfo;

      // Act
      const results = sut.getAvailableFacets(inputInfo);

      // Assert
      // Should return Base view facets, not Canvas facets
      expect(results.length).toBeGreaterThan(0);
      expect(results.every((facet) => baseViewFacetIds.has(facet.id))).toBe(true);
      const canvasFacetIds = new Set(Object.values(CANVAS_NODE_FACET_ID_MAP));
      expect(results.some((facet) => canvasFacetIds.has(facet.id))).toBe(false);
    });

    it('should return markdown facets when source file is null', () => {
      // Arrange
      const sourceInfo: SourceInfo = {
        file: null,
        leaf: null,
        suggestion: null,
        isValidSource: false,
      };
      const cmd = inputInfo.parsedCommand(Mode.SymbolList) as SourcedParsedCommand;
      cmd.source = sourceInfo;

      // Act
      const results = sut.getAvailableFacets(inputInfo);

      // Assert
      // When file is null, it should default to markdown facets
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      expect(results.every((facet) => mdFacetIds.has(facet.id))).toBe(true);
    });

    it('should return markdown facets when source is null', () => {
      // Arrange
      const cmd = inputInfo.parsedCommand(Mode.SymbolList) as SourcedParsedCommand;
      cmd.source = null;

      // Act
      const results = sut.getAvailableFacets(inputInfo);

      // Assert
      // When source is null, it should default to markdown facets
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      expect(results.every((facet) => mdFacetIds.has(facet.id))).toBe(true);
    });
  });

  describe('getMarkdownContentForSymbol', () => {
    const mockFile = new TFile();

    it('should return heading text for Heading symbols', () => {
      // Arrange
      const heading = getHeadings()[0];
      const symbolInfo = makeSymbolSuggestion(heading, SymbolType.Heading).item;

      // Act
      const result = SymbolHandler.getMarkdownContentForSymbol(symbolInfo, mockFile);

      // Assert
      expect(result).toBe(heading.heading);
    });

    it('should return tag with # character for Tag symbols', () => {
      // Arrange
      const tag = getTags()[0];
      const symbolInfo = makeSymbolSuggestion(tag, SymbolType.Tag).item;

      // Act
      const result = SymbolHandler.getMarkdownContentForSymbol(symbolInfo, mockFile);

      // Assert
      expect(result).toBe(tag.tag);
      expect(result).toContain('#');
    });

    it('should return calloutTitle for Callout symbols', () => {
      // Arrange
      const symbolInfo = makeSymbolSuggestion(calloutCache, SymbolType.Callout).item;

      // Act
      const result = SymbolHandler.getMarkdownContentForSymbol(symbolInfo, mockFile);

      // Assert
      expect(result).toBe(calloutCache.calloutTitle);
    });

    it('should return original markdown for Link symbols when original is available', () => {
      // Arrange
      const link = getLinks()[1]; // This link has original markdown
      const symbolInfo = makeSymbolSuggestion(link, SymbolType.Link).item;
      const refCache = link as ReferenceCache;

      // Act
      const result = SymbolHandler.getMarkdownContentForSymbol(symbolInfo, mockFile);

      // Assert
      expect(result).toBe(refCache.original);
    });

    it('should return original markdown for Link symbols', () => {
      // Arrange
      const link = getLinks()[0]; // This link has original markdown
      const symbolInfo = makeSymbolSuggestion(link, SymbolType.Link).item;
      const refCache = link as ReferenceCache;

      // Act
      const result = SymbolHandler.getMarkdownContentForSymbol(symbolInfo, mockFile);

      // Assert
      // Should return original markdown text
      expect(result).toBe(refCache.original);
    });

    it('should return null for Link symbols when original is not available', () => {
      // Arrange
      const linkCache: ReferenceCache = {
        link: 'some-link',
        // No original property
      } as ReferenceCache;
      const symbolInfo: SymbolInfo = {
        type: 'symbolInfo',
        symbol: linkCache,
        symbolType: SymbolType.Link,
      };

      // Act
      const result = SymbolHandler.getMarkdownContentForSymbol(symbolInfo, mockFile);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null for Embed symbols when original is not available', () => {
      // Arrange
      // Embed symbols are ReferenceCache but if they don't have original,
      // they should return null
      const embedCache: ReferenceCache = {
        link: 'test.jpg',
        // No original property
      } as ReferenceCache;
      const symbolInfo: SymbolInfo = {
        type: 'symbolInfo',
        symbol: embedCache,
        symbolType: SymbolType.Embed,
      };

      // Act
      const result = SymbolHandler.getMarkdownContentForSymbol(symbolInfo, mockFile);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null for CanvasNode symbols', () => {
      // Arrange
      const canvasNodes = (JSON.parse(makeCanvasFileContentString()) as CanvasData).nodes;
      const symbolInfo = makeSymbolSuggestion(canvasNodes[0], SymbolType.CanvasNode).item;

      // Act
      const result = SymbolHandler.getMarkdownContentForSymbol(symbolInfo, mockFile);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null for BaseView symbols', () => {
      // Arrange
      const baseViewData: BaseViewData = {
        type: 'table',
        name: chance.word(),
      };
      const symbolInfo = makeSymbolSuggestion(baseViewData, SymbolType.BaseView).item;

      // Act
      const result = SymbolHandler.getMarkdownContentForSymbol(symbolInfo, mockFile);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('renderSymbolContent', () => {
    let mockTitleEl: MockProxy<HTMLElement>;
    let mockConfig: MockProxy<SwitcherPlusSettings>;
    const mockFile = new TFile();
    const mockSearchResult = makeFuzzyMatch();

    beforeEach(() => {
      mockTitleEl = mock<HTMLElement>();
      mockConfig = mock<SwitcherPlusSettings>();
    });

    it('should render as HTML when config says to render as HTML', () => {
      // Arrange
      const heading = getHeadings()[0];
      const symbolInfo = makeSymbolSuggestion(heading, SymbolType.Heading).item;
      mockConfig.shouldRenderSymbolAsHTML.mockReturnValue(true);

      const renderMarkdownSpy = jest
        .spyOn(Handler, 'renderMarkdownContentAsync')
        .mockReturnValueOnce();

      // Act
      SymbolHandler.renderSymbolContent(
        mockApp,
        mockConfig,
        mockTitleEl,
        symbolInfo,
        mockFile,
      );

      // Assert
      expect(mockConfig.shouldRenderSymbolAsHTML).toHaveBeenCalledWith(
        SymbolType.Heading,
      );

      expect(renderMarkdownSpy).toHaveBeenCalledWith(
        mockApp,
        mockTitleEl,
        heading.heading,
        mockFile.path,
      );

      renderMarkdownSpy.mockRestore();
    });

    it('should render as raw text when config says not to render as HTML', () => {
      // Arrange
      const heading = getHeadings()[0];
      const symbolInfo = makeSymbolSuggestion(heading, SymbolType.Heading).item;
      mockConfig.shouldRenderSymbolAsHTML.mockReturnValue(false);

      const mockRenderResults = jest.mocked<typeof renderResults>(renderResults);
      const getSuggestionTextSpy = jest
        .spyOn(SymbolHandler, 'getSuggestionTextForSymbol')
        .mockReturnValueOnce(heading.heading);

      // Act
      SymbolHandler.renderSymbolContent(
        mockApp,
        mockConfig,
        mockTitleEl,
        symbolInfo,
        mockFile,
        mockSearchResult,
      );

      // Assert
      expect(mockConfig.shouldRenderSymbolAsHTML).toHaveBeenCalledWith(
        SymbolType.Heading,
      );

      expect(getSuggestionTextSpy).toHaveBeenCalledWith(symbolInfo);
      expect(mockRenderResults).toHaveBeenCalledWith(
        mockTitleEl,
        heading.heading,
        mockSearchResult,
      );

      getSuggestionTextSpy.mockRestore();
    });

    it('should render as HTML when renderAsHTMLOverride is true, regardless of config', () => {
      // Arrange
      const heading = getHeadings()[0];
      const symbolInfo = makeSymbolSuggestion(heading, SymbolType.Heading).item;
      mockConfig.shouldRenderSymbolAsHTML.mockReturnValue(false); // Config says no HTML

      const renderMarkdownSpy = jest
        .spyOn(Handler, 'renderMarkdownContentAsync')
        .mockReturnValueOnce();

      // Act
      SymbolHandler.renderSymbolContent(
        mockApp,
        mockConfig,
        mockTitleEl,
        symbolInfo,
        mockFile,
        mockSearchResult,
        true, // Override to HTML
      );

      // Assert
      expect(renderMarkdownSpy).toHaveBeenCalledWith(
        mockApp,
        mockTitleEl,
        heading.heading,
        mockFile.path,
      );

      // Config should not be checked when override is provided
      expect(mockConfig.shouldRenderSymbolAsHTML).not.toHaveBeenCalled();

      renderMarkdownSpy.mockRestore();
    });

    it('should render as raw text when renderAsHTMLOverride is false, regardless of config', () => {
      // Arrange
      const heading = getHeadings()[0];
      const symbolInfo = makeSymbolSuggestion(heading, SymbolType.Heading).item;
      mockConfig.shouldRenderSymbolAsHTML.mockReturnValue(true); // Config says HTML

      const mockRenderResults = jest.mocked<typeof renderResults>(renderResults);
      const getSuggestionTextSpy = jest
        .spyOn(SymbolHandler, 'getSuggestionTextForSymbol')
        .mockReturnValueOnce(heading.heading);

      // Act
      SymbolHandler.renderSymbolContent(
        mockApp,
        mockConfig,
        mockTitleEl,
        symbolInfo,
        mockFile,
        mockSearchResult,
        false, // Override to text
      );

      // Assert
      expect(getSuggestionTextSpy).toHaveBeenCalledWith(symbolInfo);
      expect(mockRenderResults).toHaveBeenCalledWith(
        mockTitleEl,
        heading.heading,
        mockSearchResult,
      );

      // Config should not be checked when override is provided
      expect(mockConfig.shouldRenderSymbolAsHTML).not.toHaveBeenCalled();

      getSuggestionTextSpy.mockRestore();
    });

    it('should fall back to config when renderAsHTMLOverride is undefined', () => {
      // Arrange
      const heading = getHeadings()[0];
      const symbolInfo = makeSymbolSuggestion(heading, SymbolType.Heading).item;
      mockConfig.shouldRenderSymbolAsHTML.mockReturnValue(true);

      const renderMarkdownSpy = jest
        .spyOn(Handler, 'renderMarkdownContentAsync')
        .mockReturnValueOnce();

      // Act
      SymbolHandler.renderSymbolContent(
        mockApp,
        mockConfig,
        mockTitleEl,
        symbolInfo,
        mockFile,
        mockSearchResult,
        undefined, // No override
      );

      // Assert
      expect(mockConfig.shouldRenderSymbolAsHTML).toHaveBeenCalledWith(
        SymbolType.Heading,
      );

      expect(renderMarkdownSpy).toHaveBeenCalledWith(
        mockApp,
        mockTitleEl,
        heading.heading,
        mockFile.path,
      );

      renderMarkdownSpy.mockRestore();
    });

    it('should render as raw text when markdown content is null', () => {
      // Arrange
      const canvasNodes = (JSON.parse(makeCanvasFileContentString()) as CanvasData).nodes;
      const symbolInfo = makeSymbolSuggestion(canvasNodes[0], SymbolType.CanvasNode).item;
      mockConfig.shouldRenderSymbolAsHTML.mockReturnValue(true); // Config says HTML

      const mockRenderResults = jest.mocked<typeof renderResults>(renderResults);
      const getSuggestionTextSpy = jest
        .spyOn(SymbolHandler, 'getSuggestionTextForSymbol')
        .mockReturnValueOnce('canvas node text');

      // Act
      SymbolHandler.renderSymbolContent(
        mockApp,
        mockConfig,
        mockTitleEl,
        symbolInfo,
        mockFile,
        mockSearchResult,
      );

      // Assert
      // Should fall back to raw text when markdown content is null
      expect(getSuggestionTextSpy).toHaveBeenCalledWith(symbolInfo);
      expect(mockRenderResults).toHaveBeenCalledWith(
        mockTitleEl,
        'canvas node text',
        mockSearchResult,
      );

      getSuggestionTextSpy.mockRestore();
    });

    it('should render Tag symbols as HTML when configured', () => {
      // Arrange
      const tag = getTags()[0];
      const symbolInfo = makeSymbolSuggestion(tag, SymbolType.Tag).item;
      mockConfig.shouldRenderSymbolAsHTML.mockReturnValue(true);

      const renderMarkdownSpy = jest
        .spyOn(Handler, 'renderMarkdownContentAsync')
        .mockReturnValueOnce();

      // Act
      SymbolHandler.renderSymbolContent(
        mockApp,
        mockConfig,
        mockTitleEl,
        symbolInfo,
        mockFile,
      );

      // Assert
      expect(renderMarkdownSpy).toHaveBeenCalledWith(
        mockApp,
        mockTitleEl,
        tag.tag, // Should include the # character
        mockFile.path,
      );

      renderMarkdownSpy.mockRestore();
    });

    it('should render Callout symbols as HTML when configured', () => {
      // Arrange
      const symbolInfo = makeSymbolSuggestion(calloutCache, SymbolType.Callout).item;
      mockConfig.shouldRenderSymbolAsHTML.mockReturnValue(true);

      const renderMarkdownSpy = jest
        .spyOn(Handler, 'renderMarkdownContentAsync')
        .mockReturnValueOnce();

      // Act
      SymbolHandler.renderSymbolContent(
        mockApp,
        mockConfig,
        mockTitleEl,
        symbolInfo,
        mockFile,
      );

      // Assert
      expect(renderMarkdownSpy).toHaveBeenCalledWith(
        mockApp,
        mockTitleEl,
        calloutCache.calloutTitle,
        mockFile.path,
      );

      renderMarkdownSpy.mockRestore();
    });

    it('should render Link symbols as HTML when configured', () => {
      // Arrange
      const link = getLinks()[1]; // Link with displayText
      const symbolInfo = makeSymbolSuggestion(link, SymbolType.Link).item;
      mockConfig.shouldRenderSymbolAsHTML.mockReturnValue(true);

      const renderMarkdownSpy = jest
        .spyOn(Handler, 'renderMarkdownContentAsync')
        .mockReturnValueOnce();

      // Act
      SymbolHandler.renderSymbolContent(
        mockApp,
        mockConfig,
        mockTitleEl,
        symbolInfo,
        mockFile,
      );

      // Assert
      const refCache = link as ReferenceCache;
      expect(renderMarkdownSpy).toHaveBeenCalledWith(
        mockApp,
        mockTitleEl,
        refCache.original,
        mockFile.path,
      );

      renderMarkdownSpy.mockRestore();
    });

    it('should not call renderMarkdownContentAsync when markdown content is null and override is true', () => {
      // Arrange
      const canvasNodes = (JSON.parse(makeCanvasFileContentString()) as CanvasData).nodes;
      const symbolInfo = makeSymbolSuggestion(canvasNodes[0], SymbolType.CanvasNode).item;

      const renderMarkdownSpy = jest
        .spyOn(Handler, 'renderMarkdownContentAsync')
        .mockReturnValueOnce();
      const mockRenderResults = jest.mocked<typeof renderResults>(renderResults);
      const getSuggestionTextSpy = jest
        .spyOn(SymbolHandler, 'getSuggestionTextForSymbol')
        .mockReturnValueOnce('canvas node text');

      // Act
      SymbolHandler.renderSymbolContent(
        mockApp,
        mockConfig,
        mockTitleEl,
        symbolInfo,
        mockFile,
        mockSearchResult,
        true, // Override to HTML, but markdown content is null
      );

      // Assert
      // Should fall back to raw text even with override when markdown content is null
      expect(renderMarkdownSpy).not.toHaveBeenCalled();
      expect(getSuggestionTextSpy).toHaveBeenCalledWith(symbolInfo);
      expect(mockRenderResults).toHaveBeenCalledWith(
        mockTitleEl,
        'canvas node text',
        mockSearchResult,
      );

      renderMarkdownSpy.mockRestore();
      getSuggestionTextSpy.mockRestore();
    });
  });

  describe('getSymbolsFromSource - frontmatter tags', () => {
    const mockFile = new TFile();

    beforeEach(() => {
      mockMetadataCache.getFileCache.mockClear();
    });

    it('should include frontmatter tags in symbol list', async () => {
      // Arrange
      const metadata = getCachedMetadata({
        includeFrontmatter: true,
        frontmatterTags: ['frontmatter-tag1', 'frontmatter-tag2'],
        frontmatterStartLine: 0,
        frontmatterEndLine: 2,
      });
      mockMetadataCache.getFileCache.mockReturnValue(metadata);
      const sourceInfo: SourceInfo = {
        file: mockFile,
        leaf: null,
        suggestion: null,
        isValidSource: true,
      };
      sut.inputInfo = makeInputInfo({
        mode: Mode.SymbolList,
        sourceInfo,
      });

      // Act
      const results = await sut.getSymbolsFromSource(sourceInfo, false);

      // Assert
      const tagSymbols = results.filter((r) => r.symbolType === SymbolType.Tag);
      expect(tagSymbols.length).toBeGreaterThanOrEqual(2);

      const frontmatterTagSymbols = tagSymbols.filter((r) => {
        const tag = r.symbol as TagCache;
        return tag.tag === '#frontmatter-tag1' || tag.tag === '#frontmatter-tag2';
      });
      expect(frontmatterTagSymbols.length).toBe(2);

      frontmatterTagSymbols.forEach((symbolInfo) => {
        expect(symbolInfo.symbolType).toBe(SymbolType.Tag);
        expect(symbolInfo.type).toBe('symbolInfo');
        const tag = symbolInfo.symbol as TagCache;
        expect(tag.tag).toMatch(/^#frontmatter-tag[12]$/);
      });
    });

    it('should not duplicate tags when same tag exists in both inline and frontmatter', async () => {
      // Arrange
      // Create metadata with inline tag '#tag1' and frontmatter tag 'tag1'
      const inlineTags = getTags(); // Contains #tag1 and #tag2
      const metadata = getCachedMetadata({
        includeFrontmatter: true,
        frontmatterTags: ['tag1'], // Same as inline tag1 (case-insensitive)
        frontmatterStartLine: 0,
        frontmatterEndLine: 2,
      });
      metadata.tags = inlineTags; // Override with inline tags
      mockMetadataCache.getFileCache.mockReturnValue(metadata);
      const sourceInfo: SourceInfo = {
        file: mockFile,
        leaf: null,
        suggestion: null,
        isValidSource: true,
      };
      sut.inputInfo = makeInputInfo({
        mode: Mode.SymbolList,
        sourceInfo,
      });

      // Act
      const results = await sut.getSymbolsFromSource(sourceInfo, false);

      // Assert
      const tagSymbols = results.filter((r) => r.symbolType === SymbolType.Tag);
      const tag1Symbols = tagSymbols.filter((r) => {
        const tag = r.symbol as TagCache;
        return tag.tag.toLowerCase() === '#tag1';
      });

      // Should only have one #tag1 (the inline version)
      expect(tag1Symbols.length).toBe(1);
      const tag1Symbol = tag1Symbols[0];
      const tag1 = tag1Symbol.symbol as TagCache;
      // Should be the inline version (has original position from getTags fixture)
      expect(tag1.position.start.line).toBe(20); // From getTags fixture
    });

    it('should use frontmatterPosition for frontmatter tags when available', async () => {
      // Arrange
      const startLine = 0;
      const endLine = 3;
      const metadata = getCachedMetadata({
        includeFrontmatter: true,
        frontmatterTags: ['fm-tag1', 'fm-tag2'],
        frontmatterStartLine: startLine,
        frontmatterEndLine: endLine,
      });
      // Remove inline tags to test only frontmatter tags
      metadata.tags = [];
      mockMetadataCache.getFileCache.mockReturnValue(metadata);
      const sourceInfo: SourceInfo = {
        file: mockFile,
        leaf: null,
        suggestion: null,
        isValidSource: true,
      };
      sut.inputInfo = makeInputInfo({
        mode: Mode.SymbolList,
        sourceInfo,
      });

      // Act
      const results = await sut.getSymbolsFromSource(sourceInfo, false);

      // Assert
      const tagSymbols = results.filter((r) => r.symbolType === SymbolType.Tag);
      expect(tagSymbols.length).toBe(2);

      tagSymbols.forEach((symbolInfo) => {
        const tag = symbolInfo.symbol as TagCache;
        expect(tag.position.start.line).toBe(startLine);
        expect(tag.position.end.line).toBe(endLine);
      });
    });

    it('should fallback to line 0 position when frontmatterPosition is not available', async () => {
      // Arrange
      const metadata = getCachedMetadata({
        includeFrontmatter: true,
        frontmatterTags: ['fm-tag1'],
        frontmatterStartLine: 0,
        frontmatterEndLine: 2,
      });
      // Remove frontmatterPosition
      metadata.frontmatterPosition = undefined;
      // Remove inline tags to test only frontmatter tags
      metadata.tags = [];
      mockMetadataCache.getFileCache.mockReturnValue(metadata);
      const sourceInfo: SourceInfo = {
        file: mockFile,
        leaf: null,
        suggestion: null,
        isValidSource: true,
      };
      sut.inputInfo = makeInputInfo({
        mode: Mode.SymbolList,
        sourceInfo,
      });

      // Act
      const results = await sut.getSymbolsFromSource(sourceInfo, false);

      // Assert
      const tagSymbols = results.filter((r) => r.symbolType === SymbolType.Tag);
      expect(tagSymbols.length).toBe(1);

      const tag = tagSymbols[0].symbol as TagCache;
      expect(tag.position.start.line).toBe(0);
      expect(tag.position.start.col).toBe(0);
      expect(tag.position.start.offset).toBe(0);
      expect(tag.position.end.line).toBe(0);
      expect(tag.position.end.col).toBe(0);
      expect(tag.position.end.offset).toBe(0);
    });

    it('should normalize frontmatter tags by adding # prefix when missing', async () => {
      // Arrange
      const metadata = getCachedMetadata({
        includeFrontmatter: true,
        frontmatterTags: ['tag-without-prefix', '#tag-with-prefix'],
        frontmatterStartLine: 0,
        frontmatterEndLine: 2,
      });
      // Remove inline tags to test only frontmatter tags
      metadata.tags = [];
      mockMetadataCache.getFileCache.mockReturnValue(metadata);
      const sourceInfo: SourceInfo = {
        file: mockFile,
        leaf: null,
        suggestion: null,
        isValidSource: true,
      };
      sut.inputInfo = makeInputInfo({
        mode: Mode.SymbolList,
        sourceInfo,
      });

      // Act
      const results = await sut.getSymbolsFromSource(sourceInfo, false);

      // Assert
      const tagSymbols = results.filter((r) => r.symbolType === SymbolType.Tag);
      expect(tagSymbols.length).toBe(2);

      const tag1 = tagSymbols.find((r) => {
        const tag = r.symbol as TagCache;
        return tag.tag === '#tag-without-prefix';
      });
      const tag2 = tagSymbols.find((r) => {
        const tag = r.symbol as TagCache;
        return tag.tag === '#tag-with-prefix';
      });

      expect(tag1).toBeDefined();
      expect(tag2).toBeDefined();
      expect((tag1.symbol as TagCache).tag).toBe('#tag-without-prefix');
      expect((tag2.symbol as TagCache).tag).toBe('#tag-with-prefix');
    });

    it('should perform case-insensitive deduplication between inline and frontmatter tags', async () => {
      // Arrange
      const inlineTags = getTags(); // Contains #tag1 and #tag2
      const metadata = getCachedMetadata({
        includeFrontmatter: true,
        frontmatterTags: ['TAG1', 'Tag2'], // Different case
        frontmatterStartLine: 0,
        frontmatterEndLine: 2,
      });
      metadata.tags = inlineTags;
      mockMetadataCache.getFileCache.mockReturnValue(metadata);
      const sourceInfo: SourceInfo = {
        file: mockFile,
        leaf: null,
        suggestion: null,
        isValidSource: true,
      };
      sut.inputInfo = makeInputInfo({
        mode: Mode.SymbolList,
        sourceInfo,
      });

      // Act
      const results = await sut.getSymbolsFromSource(sourceInfo, false);

      // Assert
      const tagSymbols = results.filter((r) => r.symbolType === SymbolType.Tag);
      // Should only have 2 tags (inline versions), not 4
      expect(tagSymbols.length).toBe(2);

      const uniqueTags = new Set(
        tagSymbols.map((r) => (r.symbol as TagCache).tag.toLowerCase()),
      );
      expect(uniqueTags.size).toBe(2);
      expect(uniqueTags.has('#tag1')).toBe(true);
      expect(uniqueTags.has('#tag2')).toBe(true);
    });

    it('should only include inline tags when no frontmatter is present', async () => {
      // Arrange
      const metadata = getCachedMetadata(); // No frontmatter
      mockMetadataCache.getFileCache.mockReturnValue(metadata);
      const sourceInfo: SourceInfo = {
        file: mockFile,
        leaf: null,
        suggestion: null,
        isValidSource: true,
      };
      sut.inputInfo = makeInputInfo({
        mode: Mode.SymbolList,
        sourceInfo,
      });

      // Act
      const results = await sut.getSymbolsFromSource(sourceInfo, false);

      // Assert
      const tagSymbols = results.filter((r) => r.symbolType === SymbolType.Tag);
      // Should only have inline tags from getTags fixture
      expect(tagSymbols.length).toBe(2);

      tagSymbols.forEach((symbolInfo) => {
        const tag = symbolInfo.symbol as TagCache;
        // Inline tags should have their original positions (from getTags fixture)
        expect(tag.position.start.line).toBe(20);
      });
    });

    it('should not add frontmatter tags when frontmatter tags array is empty', async () => {
      // Arrange
      const metadata = getCachedMetadata({
        includeFrontmatter: true,
        frontmatterTags: [], // Empty array
        frontmatterStartLine: 0,
        frontmatterEndLine: 2,
      });
      // Remove inline tags to test only frontmatter behavior
      metadata.tags = [];
      mockMetadataCache.getFileCache.mockReturnValue(metadata);
      const sourceInfo: SourceInfo = {
        file: mockFile,
        leaf: null,
        suggestion: null,
        isValidSource: true,
      };
      sut.inputInfo = makeInputInfo({
        mode: Mode.SymbolList,
        sourceInfo,
      });

      // Act
      const results = await sut.getSymbolsFromSource(sourceInfo, false);

      // Assert
      const tagSymbols = results.filter((r) => r.symbolType === SymbolType.Tag);
      expect(tagSymbols.length).toBe(0);
    });

    it('should prefer inline tag over frontmatter tag when both exist', async () => {
      // Arrange
      const inlineTags = getTags(); // Contains #tag1 at line 20
      const metadata = getCachedMetadata({
        includeFrontmatter: true,
        frontmatterTags: ['tag1'], // Same tag in frontmatter
        frontmatterStartLine: 0,
        frontmatterEndLine: 2,
      });
      metadata.tags = inlineTags;
      mockMetadataCache.getFileCache.mockReturnValue(metadata);
      const sourceInfo: SourceInfo = {
        file: mockFile,
        leaf: null,
        suggestion: null,
        isValidSource: true,
      };
      sut.inputInfo = makeInputInfo({
        mode: Mode.SymbolList,
        sourceInfo,
      });

      // Act
      const results = await sut.getSymbolsFromSource(sourceInfo, false);

      // Assert
      const tagSymbols = results.filter((r) => r.symbolType === SymbolType.Tag);
      const tag1Symbols = tagSymbols.filter((r) => {
        const tag = r.symbol as TagCache;
        return tag.tag.toLowerCase() === '#tag1';
      });

      expect(tag1Symbols.length).toBe(1);
      const tag1 = tag1Symbols[0].symbol as TagCache;
      // Should use inline position (line 20), not frontmatter position (line 0)
      expect(tag1.position.start.line).toBe(20);
    });

    it('should handle frontmatter tags with string format', async () => {
      // Arrange
      // FrontMatterParser.getTags() should handle string format via getValueForKey
      const metadata = getCachedMetadata({
        includeFrontmatter: true,
        frontmatterTags: 'single-tag', // String format
        frontmatterStartLine: 0,
        frontmatterEndLine: 2,
      });
      metadata.tags = [];
      mockMetadataCache.getFileCache.mockReturnValue(metadata);
      const sourceInfo: SourceInfo = {
        file: mockFile,
        leaf: null,
        suggestion: null,
        isValidSource: true,
      };
      sut.inputInfo = makeInputInfo({
        mode: Mode.SymbolList,
        sourceInfo,
      });

      // Act
      const results = await sut.getSymbolsFromSource(sourceInfo, false);

      // Assert
      const tagSymbols = results.filter((r) => r.symbolType === SymbolType.Tag);
      expect(tagSymbols.length).toBeGreaterThanOrEqual(1);

      const singleTag = tagSymbols.find((r) => {
        const tag = r.symbol as TagCache;
        return tag.tag === '#single-tag';
      });
      expect(singleTag).toBeDefined();
    });

    it('should handle frontmatter tags with array format', async () => {
      // Arrange
      const metadata = getCachedMetadata({
        includeFrontmatter: true,
        frontmatterTags: ['array-tag1', 'array-tag2'], // Array format
        frontmatterStartLine: 0,
        frontmatterEndLine: 2,
      });
      metadata.tags = [];
      mockMetadataCache.getFileCache.mockReturnValue(metadata);
      const sourceInfo: SourceInfo = {
        file: mockFile,
        leaf: null,
        suggestion: null,
        isValidSource: true,
      };
      sut.inputInfo = makeInputInfo({
        mode: Mode.SymbolList,
        sourceInfo,
      });

      // Act
      const results = await sut.getSymbolsFromSource(sourceInfo, false);

      // Assert
      const tagSymbols = results.filter((r) => r.symbolType === SymbolType.Tag);
      expect(tagSymbols.length).toBe(2);

      const tag1 = tagSymbols.find((r) => {
        const tag = r.symbol as TagCache;
        return tag.tag === '#array-tag1';
      });
      const tag2 = tagSymbols.find((r) => {
        const tag = r.symbol as TagCache;
        return tag.tag === '#array-tag2';
      });

      expect(tag1).toBeDefined();
      expect(tag2).toBeDefined();
    });

    it('should not include frontmatter tags when Tag symbol type is disabled', async () => {
      // Arrange
      const metadata = getCachedMetadata({
        includeFrontmatter: true,
        frontmatterTags: ['fm-tag1', 'fm-tag2'],
        frontmatterStartLine: 0,
        frontmatterEndLine: 2,
      });
      metadata.tags = [];
      mockMetadataCache.getFileCache.mockReturnValue(metadata);

      const isSymbolTypeEnabledSpy = jest
        .spyOn(settings, 'isSymbolTypeEnabled')
        .mockImplementation((type) => (type === SymbolType.Tag ? false : true));

      const sourceInfo: SourceInfo = {
        file: mockFile,
        leaf: null,
        suggestion: null,
        isValidSource: true,
      };
      sut.inputInfo = makeInputInfo({
        mode: Mode.SymbolList,
        sourceInfo,
      });

      // Act
      const results = await sut.getSymbolsFromSource(sourceInfo, false);

      // Assert
      const tagSymbols = results.filter((r) => r.symbolType === SymbolType.Tag);
      expect(tagSymbols.length).toBe(0);

      isSymbolTypeEnabledSpy.mockRestore();
    });

    it('should include both inline and frontmatter tags when they are different', async () => {
      // Arrange
      const inlineTags = getTags(); // Contains #tag1 and #tag2
      const metadata = getCachedMetadata({
        includeFrontmatter: true,
        frontmatterTags: ['fm-tag1', 'fm-tag2'], // Different tags
        frontmatterStartLine: 0,
        frontmatterEndLine: 2,
      });
      metadata.tags = inlineTags;
      mockMetadataCache.getFileCache.mockReturnValue(metadata);
      const sourceInfo: SourceInfo = {
        file: mockFile,
        leaf: null,
        suggestion: null,
        isValidSource: true,
      };
      sut.inputInfo = makeInputInfo({
        mode: Mode.SymbolList,
        sourceInfo,
      });

      // Act
      const results = await sut.getSymbolsFromSource(sourceInfo, false);

      // Assert
      const tagSymbols = results.filter((r) => r.symbolType === SymbolType.Tag);
      // Should have 2 inline + 2 frontmatter = 4 total
      expect(tagSymbols.length).toBe(4);

      const tagNames = tagSymbols.map((r) => (r.symbol as TagCache).tag.toLowerCase());
      expect(tagNames).toContain('#tag1');
      expect(tagNames).toContain('#tag2');
      expect(tagNames).toContain('#fm-tag1');
      expect(tagNames).toContain('#fm-tag2');
    });

    it('should create proper SymbolInfo structure for frontmatter tags', async () => {
      // Arrange
      const metadata = getCachedMetadata({
        includeFrontmatter: true,
        frontmatterTags: ['test-tag'],
        frontmatterStartLine: 0,
        frontmatterEndLine: 2,
      });
      metadata.tags = [];
      mockMetadataCache.getFileCache.mockReturnValue(metadata);
      const sourceInfo: SourceInfo = {
        file: mockFile,
        leaf: null,
        suggestion: null,
        isValidSource: true,
      };
      sut.inputInfo = makeInputInfo({
        mode: Mode.SymbolList,
        sourceInfo,
      });

      // Act
      const results = await sut.getSymbolsFromSource(sourceInfo, false);

      // Assert
      const tagSymbols = results.filter((r) => r.symbolType === SymbolType.Tag);
      expect(tagSymbols.length).toBe(1);

      const symbolInfo = tagSymbols[0];
      expect(symbolInfo.type).toBe('symbolInfo');
      expect(symbolInfo.symbolType).toBe(SymbolType.Tag);
      expect(symbolInfo.symbol).toBeDefined();

      const tag = symbolInfo.symbol as TagCache;
      expect(tag.tag).toBe('#test-tag');
      expect(tag.position).toBeDefined();
      expect(tag.position.start).toBeDefined();
      expect(tag.position.end).toBeDefined();
    });
  });
});
