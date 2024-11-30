import { mock, mockFn, MockProxy } from 'jest-mock-extended';
import { InputInfo, ParsedCommand, SourcedParsedCommand } from 'src/switcherPlus';
import { Chance } from 'chance';
import { Mode, SourceInfo } from 'src/types';
import { getSourcedModes } from 'src/utils';
import {
  App,
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
  Vault,
  View,
  ViewState,
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
    getViewType: mockFn().mockReturnValue('markdown'),
  });

  return mock<WorkspaceLeaf>({
    view: mockView,
    isDeferred: false,
  });
}

/**
 * Returns a WorkspaceLeaf that is marked as deferred along with associated View, and
 * ViewState.
 *
 * @export
 * @param {?{ file?: TFile }} [options]
 * @returns {MockProxy<WorkspaceLeaf>}
 */
export function makeLeafDeferred(options?: { file?: TFile }): MockProxy<WorkspaceLeaf> {
  options = Object.assign({ file: new TFile() }, options);

  const mockGetFileByPath = mockFn<Vault['getFileByPath']>()
    .calledWith(options.file.path)
    .mockReturnValue(options.file);

  const mockDeferredLeaf = mock<WorkspaceLeaf>({
    isDeferred: true,
    // Deferred leaves contain ViewState with the path of the underlying file.
    getViewState: () => mock<ViewState>({ state: { file: options.file.path } }),
    // Deferred views still report their materialized ViewType
    view: mock<View>({ getViewType: () => 'markdown' }),
    app: mock<App>({
      vault: mock<Vault>({
        // The file path from ViewState is resolved to a TFile using getFileByPath
        getFileByPath: mockGetFileByPath,
      }),
    }),
  });

  return mockDeferredLeaf;
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

/**
 * Returns a non-mocked InputInfo object with the specified parameters
 *
 * @export
 * @param {?{
 *   inputText?: string;
 *   mode?: Mode;
 *   parsedCommand?: Partial<ParsedCommand>;
 *   sourceInfo?: Partial<SourceInfo>;
 * }} [options]
 * @returns {InputInfo}
 */
export function makeInputInfo(options?: {
  inputText?: string;
  mode?: Mode;
  parsedCommand?: Partial<ParsedCommand>;
  sourceInfo?: Partial<SourceInfo>;
}): InputInfo {
  options = Object.assign({}, options);

  const mode = options.mode ?? Mode.Standard;
  const inputInfo = new InputInfo(options.inputText ?? '', mode);

  // Update the parsedCommand property with passed in params
  const parsedCommand = inputInfo.parsedCommand(mode);
  Object.assign(parsedCommand, options.parsedCommand);

  // For sourced modes, add the SourcedInfo
  if (getSourcedModes().includes(mode)) {
    const sourceInfo: SourceInfo = {
      file: null,
      leaf: null,
      suggestion: null,
      isValidSource: null,
    };

    (parsedCommand as SourcedParsedCommand).source = Object.assign(
      sourceInfo,
      options.sourceInfo,
    );
  }

  return inputInfo;
}
