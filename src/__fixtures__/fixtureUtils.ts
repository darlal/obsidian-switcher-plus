import { mock, MockProxy } from 'jest-mock-extended';
import { Chance } from 'chance';
import {
  BookmarksPluginFileItem,
  BookmarksPluginFolderItem,
  BookmarksPluginGroupItem,
  BookmarksPluginSearchItem,
  Command,
  Editor,
  MarkdownView,
  SearchMatches,
  SearchResult,
  TFile,
  WorkspaceLeaf,
} from 'obsidian';

const chance = new Chance();

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

export function makeBookmarksPluginFileItem(
  options?: Partial<BookmarksPluginFileItem>,
): BookmarksPluginFileItem {
  return {
    type: 'file',
    title: options?.title ?? '',
    path: options?.path ?? `path/to/${chance.word()}.md`,
    subpath: options?.subpath,
  };
}

export function makeBookmarksPluginFolderItem(
  options?: Partial<BookmarksPluginFolderItem>,
): BookmarksPluginFolderItem {
  return {
    type: 'folder',
    title: options?.title ?? '',
    path: options?.path ?? `path/to/${chance.word()}`,
  };
}

export function makeBookmarksPluginSearchItem(
  options?: Partial<BookmarksPluginSearchItem>,
): BookmarksPluginSearchItem {
  return {
    type: 'search',
    title: options?.title ?? '',
    query: options?.query ?? `file:(${chance.word()}) ${chance.word()}`,
  };
}

export function makeBookmarksPluginGroupItem(
  options?: Partial<BookmarksPluginGroupItem>,
): BookmarksPluginGroupItem {
  return {
    type: 'group',
    title: options?.title ?? `BOOKMARK_GROUP_${chance.word()}`,
    items: options?.items ?? [makeBookmarksPluginFileItem()],
  };
}

export function makeCommandItem(options?: { id?: string; name?: string }): Command {
  return {
    id: options?.id ?? chance.word(),
    name: options?.name ?? chance.word(),
  };
}
