import { PreparedQuery, SearchMatches, SearchResult } from 'obsidian';
import { editorTrigger } from 'src/__fixtures__/modeTrigger.fixture';

interface EditorFixtureFilter {
  inputText: string;
  displayText: string;
  prepQuery: PreparedQuery;
  fuzzyMatch: SearchResult;
}

function makeEditorFilter(
  filterText: string,
  displayText: string,
  matches: SearchMatches = [[0, 0]],
  score = 0.0,
): EditorFixtureFilter {
  // WARNING: this is obviously not a faithful representation of the core obsidian
  // function that generates search tokens. Care should be taken here, only the simple
  // search text will work
  const tokens = [filterText];

  const prepQuery: PreparedQuery = {
    query: filterText,
    tokens,
    fuzzy: filterText.toLowerCase().split(''),
  };

  const fuzzyMatch: SearchResult = {
    matches,
    score,
  };

  return {
    inputText: `${editorTrigger}${filterText}`,
    displayText,
    prepQuery,
    fuzzyMatch,
  };
}

export const rootSplitEditorFixtures = [
  makeEditorFilter('root', 'root split leaf', [[0, 4]], -0.0115),
];

export const leftSplitEditorFixtures = [
  makeEditorFilter('left', 'left split leaf', [[0, 4]], -0.0115),
];

export const rightSplitEditorFixtures = [
  makeEditorFilter('right', 'right split leaf', [[0, 5]], -0.011600000000000001),
];
