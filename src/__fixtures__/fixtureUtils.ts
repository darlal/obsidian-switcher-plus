import { PreparedQuery, SearchMatches, SearchResult } from 'obsidian';

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

export function makePreparedQueryEmpty(): PreparedQuery {
  return {
    query: '',
    tokens: [],
    fuzzy: [],
  };
}

export function makeFuzzyMatch(
  matches: SearchMatches = [[0, 5]],
  score = -0.0115,
): SearchResult {
  return {
    matches,
    score,
  };
}
