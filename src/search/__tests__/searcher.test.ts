import { Searcher, SearchDelegate, StringSearcher } from 'src/search';
import { makeFuzzyMatch } from '@fixtures';
import { mockFn, mockReset } from 'jest-mock-extended';
import { prepareFuzzySearch, prepareSimpleSearch, TFile } from 'obsidian';
import { Chance } from 'chance';
import { MatchType } from 'src/types';

const chance = new Chance();

describe('searcher', () => {
  const query = 'query';
  let sut: StringSearcher;

  const mockSearchDelegate = mockFn<SearchDelegate>();

  const mockPrepareFuzzySearch = jest
    .mocked<typeof prepareFuzzySearch>(prepareFuzzySearch)
    .mockReturnValue(mockSearchDelegate);

  const mockPrepareSimpleSearch = jest
    .mocked<typeof prepareSimpleSearch>(prepareSimpleSearch)
    .mockReturnValue(mockSearchDelegate);

  afterAll(() => {
    mockPrepareFuzzySearch.mockReset();
    mockPrepareSimpleSearch.mockReset();
  });

  it('should return results using the Fuzzy matcher by default', () => {
    const text = chance.word();

    const match = makeFuzzyMatch();
    mockSearchDelegate.calledWith(text).mockReturnValueOnce(match);

    const result = Searcher.create(query).executeSearch(text);

    expect(result).toBe(match);
    expect(mockSearchDelegate).toHaveBeenCalledWith(text);
    expect(mockPrepareFuzzySearch).toHaveBeenCalledWith(query);

    mockReset(mockSearchDelegate);
    mockPrepareFuzzySearch.mockClear();
  });

  it('should return results using the simple search matcher when requested', () => {
    const text = chance.word();
    const useSimpleSearch = true;

    const match = makeFuzzyMatch();
    mockSearchDelegate.calledWith(text).mockReturnValueOnce(match);

    const result = Searcher.create(query, useSimpleSearch).executeSearch(text);

    expect(result).toBe(match);
    expect(mockSearchDelegate).toHaveBeenCalledWith(text);
    expect(mockPrepareSimpleSearch).toHaveBeenCalledWith(query);

    mockReset(mockSearchDelegate);
    mockPrepareSimpleSearch.mockClear();
  });

  it('should return null when the SearchDelegate is null', () => {
    mockPrepareFuzzySearch.mockReturnValueOnce(null);

    const result = Searcher.create(query).executeSearch(null);

    expect(result).toBe(null);
    expect(mockPrepareFuzzySearch).toHaveBeenCalledWith(query);

    mockReset(mockSearchDelegate);
    mockPrepareFuzzySearch.mockClear();
  });

  it('should not throw on null query', () => {
    expect(() => Searcher.create(null)).not.toThrow();
  });

  describe('searchWithFallback', () => {
    const text = chance.word();
    const filepath = `path/to/${text}/${text} name.md`;
    const match = makeFuzzyMatch();

    beforeAll(() => {
      sut = Searcher.create(query);
      mockSearchDelegate.calledWith(text).mockReturnValue(match);
      mockSearchDelegate.calledWith(filepath).mockReturnValue(match);
    });

    afterAll(() => {
      sut = null;
      mockReset(mockSearchDelegate);
    });

    it('should match for primary string', () => {
      const mockFile = new TFile();
      mockFile.path = text;

      const result = sut.searchWithFallback(text, mockFile);

      expect(result).toEqual(
        expect.objectContaining({
          matchType: MatchType.Primary,
          matchText: text,
          match,
        }),
      );
    });

    it('should match file basename', () => {
      const mockFile = new TFile();
      mockFile.basename = text;

      const result = sut.searchWithFallback(null, mockFile);

      expect(result).toEqual(
        expect.objectContaining({
          matchType: MatchType.Basename,
          matchText: text,
          match,
        }),
      );
    });

    it('should match file path', () => {
      const mockFile = new TFile();
      mockFile.path = text;

      const result = sut.searchWithFallback(null, mockFile);

      expect(result).toEqual(
        expect.objectContaining({
          matchType: MatchType.Path,
          matchText: mockFile.path,
          match,
        }),
      );
    });

    it("should partially match filepath and basename segments when there isn't a full basename match", () => {
      const mockFile = new TFile();
      mockFile.path = filepath;

      const result = sut.searchWithFallback(null, mockFile);

      expect(result).toEqual(
        expect.objectContaining({
          matchType: MatchType.Path,
          matchText: mockFile.path,
          match,
        }),
      );
    });

    it('should return result for secondary string with a downranked score', () => {
      const mockFile = new TFile();
      mockFile.path = text;

      const initialScore = match.score;
      mockSearchDelegate.calledWith(text).mockReturnValueOnce(match);

      const result = sut.searchWithFallback(null, mockFile);

      expect(result.matchType).toBe(MatchType.Path);
      expect(result.match).toBe(match);
      expect(result.match.score).toBe(initialScore - 1);
      expect(mockSearchDelegate).toHaveBeenCalledWith(text);

      mockReset(mockSearchDelegate);
    });
  });
});
