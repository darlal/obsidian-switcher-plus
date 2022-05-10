import {
  App,
  Editor,
  MarkdownView,
  TFile,
  WorkspaceLeaf,
  EditorPosition,
  Workspace,
  MetadataCache,
  HeadingCache,
  Loc,
  Pos,
} from 'obsidian';
import { AnySuggestion, EditorSuggestion } from 'src/types';
import { mock, MockProxy } from 'jest-mock-extended';
import { Handler } from '../handler';
import { SwitcherPlusSettings } from 'src/settings';
import { stripMDExtensionFromPath } from 'src/utils';

class SUT extends Handler<AnySuggestion> {}

describe('Handler', () => {
  let mockApp: MockProxy<App>;
  let mockWorkspace: MockProxy<Workspace>;
  let mockMetadataCache: MockProxy<MetadataCache>;
  let mockSettings: MockProxy<SwitcherPlusSettings>;
  let sut: SUT;

  beforeAll(() => {
    mockWorkspace = mock<Workspace>();
    mockMetadataCache = mock<MetadataCache>();
    mockApp = mock<App>({ workspace: mockWorkspace, metadataCache: mockMetadataCache });
    mockSettings = mock<SwitcherPlusSettings>({
      excludeViewTypes: [],
      referenceViews: [],
      includeSidePanelViewTypes: [],
    });

    sut = new SUT(mockApp, mockSettings);
  });

  describe('commandString property', () => {
    it('should return null', () => {
      expect(sut.commandString).toBeNull();
    });
  });

  describe('validateCommand', () => {
    it('should not throw', () => {
      expect(() => sut.validateCommand(null, 0, null, null, null)).not.toThrow();
    });
  });

  describe('getSuggestions', () => {
    it('should return an empy array', () => {
      const result = sut.getSuggestions(null);

      expect(result).toBeInstanceOf(Array);
      expect(result).toHaveLength(0);
    });
  });

  describe('renderSuggestion', () => {
    it('should not throw', () => {
      expect(() => sut.renderSuggestion(null, null)).not.toThrow();
    });
  });

  describe('onChooseSuggestion', () => {
    it('should not throw', () => {
      expect(() => sut.onChooseSuggestion(null, null)).not.toThrow();
    });
  });

  describe('getEditorInfo', () => {
    it('should return an object with falsy values for falsy input', () => {
      const result = sut.getEditorInfo(null);

      expect(result).toEqual(
        expect.objectContaining({
          isValidSource: false,
          leaf: null,
          file: null,
          suggestion: null,
          cursor: null,
        }),
      );
    });

    it('should return TargetInfo for a markdown WorkspaceLeaf', () => {
      const mockFile = new TFile();
      const mockCursorPos = mock<EditorPosition>();
      const mockView = mock<MarkdownView>({
        file: mockFile,
      });

      mockView.getViewType.mockReturnValueOnce('markdown');
      const getCursorPosSpy = jest.spyOn(sut, 'getCursorPosition');
      getCursorPosSpy.mockReturnValueOnce(mockCursorPos);

      const mockLeaf = mock<WorkspaceLeaf>({ view: mockView });

      const result = sut.getEditorInfo(mockLeaf);

      expect(mockView.getViewType).toHaveBeenCalled();
      expect(getCursorPosSpy).toHaveBeenCalledWith(mockView);
      expect(result).toEqual(
        expect.objectContaining({
          isValidSource: true,
          leaf: mockLeaf,
          file: mockFile,
          suggestion: null,
          cursor: mockCursorPos,
        }),
      );

      getCursorPosSpy.mockRestore();
    });
  });

  describe('getSuggestionInfo', () => {
    it('should return an object with falsy values for falsy input', () => {
      const result = sut.getSuggestionInfo(null);

      expect(result).toEqual(
        expect.objectContaining({
          isValidSource: false,
          leaf: null,
          file: null,
          suggestion: null,
          cursor: null,
        }),
      );
    });

    it('should return TargetInfo for EditorSuggestion using active workspace leaf', () => {
      const mockFile = new TFile();
      const mockCursorPos = mock<EditorPosition>();
      const mockView = mock<MarkdownView>({
        file: mockFile,
      });

      const getCursorPosSpy = jest.spyOn(sut, 'getCursorPosition');
      getCursorPosSpy.mockReturnValueOnce(mockCursorPos);

      const mockLeaf = mock<WorkspaceLeaf>({ view: mockView });

      mockWorkspace.activeLeaf = mockLeaf; // <- set as active leaf

      const sugg: EditorSuggestion = {
        type: 'editor',
        file: mockFile,
        item: mockLeaf,
        match: null,
      };

      const result = sut.getSuggestionInfo(sugg);

      expect(getCursorPosSpy).toHaveBeenCalledWith(mockView);
      expect(result).toEqual(
        expect.objectContaining({
          isValidSource: true,
          leaf: mockWorkspace.activeLeaf,
          file: mockFile,
          suggestion: sugg,
          cursor: mockCursorPos,
        }),
      );

      getCursorPosSpy.mockRestore();
      mockWorkspace.activeLeaf = null;
    });
  });

  describe('getCursorPosition', () => {
    let mockView: MockProxy<MarkdownView>;
    let mockEditor: MockProxy<Editor>;

    beforeAll(() => {
      mockEditor = mock<Editor>();
      mockView = mock<MarkdownView>({
        editor: mockEditor,
      });
    });

    it('should not throw on falsy input', () => {
      let result;

      expect(() => {
        result = sut.getCursorPosition(null);
      }).not.toThrow();

      expect(result).toBe(null);
    });

    it('should return null for view type that is not markdown', () => {
      mockView.getViewType.mockReturnValueOnce('not markdown');
      const result = sut.getCursorPosition(mockView);

      expect(result).toBe(null);
      expect(mockView.getViewType).toHaveBeenCalled();
    });

    it('should return null for view that is in preview mode', () => {
      mockView.getViewType.mockReturnValueOnce('markdown');
      mockView.getMode.mockReturnValueOnce('preview');

      const result = sut.getCursorPosition(mockView);

      expect(result).toBe(null);
      expect(mockView.getMode).toHaveBeenCalled();
    });

    it('should return cursor position for markdown view that is not in preview mode', () => {
      const mockCursorPos = mock<EditorPosition>();

      mockView.getViewType.mockReturnValueOnce('markdown');
      mockView.getMode.mockReturnValueOnce('source');
      mockEditor.getCursor.mockReturnValueOnce(mockCursorPos);

      const result = sut.getCursorPosition(mockView);

      expect(result).toBe(mockCursorPos);
      expect(mockView.getViewType).toHaveBeenCalled();
      expect(mockView.getMode).toHaveBeenCalled();
      expect(mockEditor.getCursor).toHaveBeenCalledWith('head');
    });
  });

  describe('getTitleText', () => {
    it('should return file path for file without H1', () => {
      const mockFile = new TFile();

      const result = sut.getTitleText(mockFile);

      expect(result).toBe(stripMDExtensionFromPath(mockFile));
    });

    it('should return H1 text for file with H1', () => {
      const mockFile = new TFile();
      const headingText = 'h1 heading text';
      const mockHeading = mock<HeadingCache>({ heading: headingText, level: 1 });

      mockMetadataCache.getFileCache
        .calledWith(mockFile)
        .mockReturnValueOnce({ headings: [mockHeading] });

      const result = sut.getTitleText(mockFile);

      expect(mockMetadataCache.getFileCache).toHaveBeenCalledWith(mockFile);
      expect(result).toBe(headingText);
    });
  });

  describe('getFirstH1', () => {
    let mockH1: MockProxy<HeadingCache>;
    let mockH2: MockProxy<HeadingCache>;

    beforeAll(() => {
      mockH1 = mock<HeadingCache>({
        level: 1,
        position: mock<Pos>({
          start: mock<Loc>({ line: 5 }),
        }),
      });

      mockH2 = mock<HeadingCache>({
        level: 2,
        position: mock<Pos>({
          start: mock<Loc>({ line: 10 }),
        }),
      });
    });

    it('should return null if there is no fileCache available', () => {
      const mockFile = new TFile();
      mockMetadataCache.getFileCache.calledWith(mockFile).mockReturnValueOnce(null);

      const result = sut.getFirstH1(mockFile);

      expect(result).toBe(null);
      expect(mockMetadataCache.getFileCache).toHaveBeenCalledWith(mockFile);
    });

    it('should return null if there are no headings', () => {
      const mockFile = new TFile();
      mockMetadataCache.getFileCache
        .calledWith(mockFile)
        .mockReturnValueOnce({ headings: [] });

      const result = sut.getFirstH1(mockFile);

      expect(result).toBe(null);
      expect(mockMetadataCache.getFileCache).toHaveBeenCalledWith(mockFile);
    });

    it('should return the H1 when there is only one', () => {
      const mockFile = new TFile();
      mockMetadataCache.getFileCache
        .calledWith(mockFile)
        .mockReturnValueOnce({ headings: [mockH1, mockH2] });

      const result = sut.getFirstH1(mockFile);

      expect(mockMetadataCache.getFileCache).toHaveBeenCalledWith(mockFile);
      expect(result).toBe(mockH1);
    });

    it('should return the first H1 when there is more than one regardless of position in headings list', () => {
      const mockFile = new TFile();
      const mockH1Mid = mock<HeadingCache>({
        level: 1,
        position: mock<Pos>({
          start: mock<Loc>({ line: 7 }),
        }),
      });

      const mockH1Last = mock<HeadingCache>({
        level: 1,
        position: mock<Pos>({
          start: mock<Loc>({ line: 15 }),
        }),
      });

      mockMetadataCache.getFileCache
        .calledWith(mockFile)
        .mockReturnValueOnce({ headings: [mockH2, mockH1Mid, mockH1, mockH1Last] });

      const result = sut.getFirstH1(mockFile);

      expect(mockMetadataCache.getFileCache).toHaveBeenCalledWith(mockFile);
      expect(result).toBe(mockH1);
    });

    it('should return the first H1 even when it appears after other lower level headings', () => {
      const mockFile = new TFile();
      const mockH3First = mock<HeadingCache>({
        level: 3,
        position: mock<Pos>({
          start: mock<Loc>({ line: 1 }),
        }),
      });

      mockMetadataCache.getFileCache
        .calledWith(mockFile)
        .mockReturnValueOnce({ headings: [mockH1, mockH2, mockH3First] });

      const result = sut.getFirstH1(mockFile);

      expect(mockMetadataCache.getFileCache).toHaveBeenCalledWith(mockFile);
      expect(result).toBe(mockH1);
    });
  });

  describe('findOpenEditor', () => {
    it.todo('should match a file in the active editor');
    it.todo('should match a file in an in-active editor');
    it.todo('should match using a reference WorkspaceLeaf as a source');
    it.todo('should not match any reference view types');
  });
});
