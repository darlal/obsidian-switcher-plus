import { SearchMatches, CachedMetadata } from 'obsidian';
import { editorTrigger } from './modeTrigger.fixture';
import { getCachedMetadata, getTags } from './fileCachedMetadata.fixture';

interface EditorFixtureFilter {
  inputText: string;
  displayText: string;
  cachedMetadata: CachedMetadata;
}

function makeEditorFilter(
  filterText: string,
  displayText: string,
  matches: SearchMatches,
  score: number,
  metadata?: CachedMetadata,
): EditorFixtureFilter {
  const cachedMetadata = metadata ?? getCachedMetadata();

  return {
    inputText: `${editorTrigger}${filterText}`,
    displayText,
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
