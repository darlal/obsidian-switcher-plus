import { PreparedQuery, SearchMatches, SearchResult, CachedMetadata } from 'obsidian';
import { editorTrigger } from './modeTrigger.fixture';
import { getCachedMetadata, getTags } from './fileCachedMetadata.fixture';
import { makePreparedQuery, makeFuzzyMatch } from './fixtureUtils';

interface EditorFixtureFilter {
  inputText: string;
  displayText: string;
  prepQuery: PreparedQuery;
  fuzzyMatch: SearchResult;
  cachedMetadata: CachedMetadata;
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
