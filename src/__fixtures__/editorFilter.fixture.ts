import { PreparedQuery, SearchMatches, SearchResult, CachedMetadata } from 'obsidian';
import { editorTrigger } from 'src/__fixtures__/modeTrigger.fixture';
import { getCachedMetadata, getTags } from 'src/__fixtures__/fileCachedMetadata.fixture';

interface EditorFixtureFilter {
  inputText: string;
  displayText: string;
  prepQuery: PreparedQuery;
  fuzzyMatch: SearchResult;
  cachedMetadata: CachedMetadata;
}

export function makePreparedQuery(filterText: string): PreparedQuery {
  // WARNING: this is obviously not a faithful representation of the core obsidian
  // function that generates search tokens. Care should be taken here, only the simple
  // search text will work
  const tokens = [filterText];

  return {
    query: filterText,
    tokens,
    fuzzy: filterText.toLowerCase().split(''),
  };
}

export function makeFuzzyMatch(matches: SearchMatches, score: number): SearchResult {
  return {
    matches,
    score,
  };
}

function makeEditorFilter(
  filterText: string,
  displayText: string,
  matches: SearchMatches,
  score: number,
  metadata?: CachedMetadata,
): EditorFixtureFilter {
  const prepQuery = makePreparedQuery(filterText);
  const fuzzyMatch = makeFuzzyMatch(matches, score);
  const cachedMetadata = metadata ?? getCachedMetadata();

  return {
    inputText: `${editorTrigger}${filterText}`,
    displayText,
    prepQuery,
    fuzzyMatch,
    cachedMetadata,
  };
}

export const rootSplitEditorFixtures = [
  makeEditorFilter('root', 'root split leaf', [[0, 4]], -0.0115),
];

const leftMetadata: CachedMetadata = { tags: getTags() };
export const leftSplitEditorFixtures = [
  makeEditorFilter('left', 'left split leaf', [[0, 4]], -0.0115, leftMetadata),
];

export const rightSplitEditorFixtures = [
  makeEditorFilter('right', 'right split leaf', [[0, 5]], -0.011600000000000001),
];
