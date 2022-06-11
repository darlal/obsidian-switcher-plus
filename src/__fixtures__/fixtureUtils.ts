import { mock, MockProxy } from 'jest-mock-extended';
import { Chance } from 'chance';
import {
  Command,
  Editor,
  FileStarredItem,
  MarkdownView,
  PreparedQuery,
  SearchMatches,
  SearchResult,
  SearchStarredItem,
  TFile,
  WorkspaceLeaf,
} from 'obsidian';

const chance = new Chance();

export function makePreparedQuery(filterText = ''): PreparedQuery {
  // WARNING: this is obviously not a faithful representation of the core obsidian
  // function that generates search tokens. Care should be taken here, only the simple
  // search text will work
  let query = '';
  let tokens: string[] = [];
  let fuzzy: string[] = [];

  if (filterText.length) {
    query = filterText;
    tokens = [filterText];
    fuzzy = filterText.toLowerCase().split('');
  }

  return {
    query,
    tokens,
    fuzzy,
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

export const defaultOpenViewState = {
  active: true,
  eState: { active: true, focus: true },
};

export function makeLeaf(sourceFile?: TFile): MockProxy<WorkspaceLeaf> {
  const mockView = mock<MarkdownView>({
    file: sourceFile ?? new TFile(),
    editor: mock<Editor>(),
  });

  mockView.getViewType.mockReturnValue('markdown');

  return mock<WorkspaceLeaf>({
    view: mockView,
  });
}

export function makeFileStarredItem(title?: string, path?: string): FileStarredItem {
  const item = {} as FileStarredItem;

  item.type = 'file';
  item.title = title ?? chance.word({ length: 4 });
  item.path = path ?? `path/to/${item.title}.md`;

  return item;
}

export function makeSearchStarredItem(): SearchStarredItem {
  const item = {} as SearchStarredItem;
  item.type = 'search';
  item.title = chance.word({ length: 4 });
  item.query = chance.word({ length: 4 });

  return item;
}

export function makeCommandItem(options?: { id?: string; name?: string }): Command {
  return {
    id: options?.id ?? chance.word(),
    name: options?.name ?? chance.word(),
  };
}
