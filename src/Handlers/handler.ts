import {
  App,
  EditorPosition,
  HeadingCache,
  MarkdownView,
  TFile,
  View,
  WorkspaceLeaf,
} from 'obsidian';
import { AnySuggestion, SourceInfo } from 'src/types';
import { InputInfo } from 'src/switcherPlus';
import { SwitcherPlusSettings } from 'src/settings';
import {
  getOpenLeaves,
  isCommandSuggestion,
  isEditorSuggestion,
  isSymbolSuggestion,
  isUnresolvedSuggestion,
  isWorkspaceSuggestion,
  stripMDExtensionFromPath,
} from 'src/utils';

export abstract class Handler<T> {
  get commandString(): string {
    return null;
  }

  constructor(protected app: App, protected settings: SwitcherPlusSettings) {}

  validateCommand(
    _inputInfo: InputInfo,
    _index: number,
    _filterText: string,
    _activeSuggestion: AnySuggestion,
    _activeLeaf: WorkspaceLeaf,
  ): void {
    // no op
  }

  getSuggestions(_inputInfo: InputInfo): T[] {
    return [];
  }

  renderSuggestion(_sugg: T, _parentEl: HTMLElement): void {
    // no op
  }

  onChooseSuggestion(_sugg: T, _evt: MouseEvent | KeyboardEvent): void {
    // no op
  }

  getEditorInfo(leaf: WorkspaceLeaf): SourceInfo {
    const { excludeViewTypes } = this.settings;
    let file: TFile = null;
    let isValidSource = false;
    let cursor: EditorPosition = null;

    if (leaf) {
      const { view } = leaf;

      const viewType = view.getViewType();
      file = view.file;
      cursor = this.getCursorPosition(view);

      // determine if the current active editor pane is valid
      const isCurrentEditorValid = !excludeViewTypes.includes(viewType);

      // whether or not the current active editor can be used as the target for
      // symbol search
      isValidSource = isCurrentEditorValid && !!file;
    }

    return { isValidSource, leaf, file, suggestion: null, cursor };
  }

  getSuggestionInfo(suggestion: AnySuggestion): SourceInfo {
    const info = this.getSourceInfoFromSuggestion(suggestion);
    let leaf = info.leaf;

    if (info.isValidSource) {
      // try to find a matching leaf for suggestion types that don't explicitly
      // provide one. This is primarily needed to be able to focus an
      // existing pane if there is one
      ({ leaf } = this.findOpenEditor(info.file, info.leaf));
    }

    // Get the cursor information to support `selectNearestHeading`
    const cursor = this.getCursorPosition(leaf?.view);

    return { ...info, leaf, cursor };
  }

  protected getSourceInfoFromSuggestion(suggestion: AnySuggestion): SourceInfo {
    let file: TFile = null;
    let leaf: WorkspaceLeaf = null;

    // Can't use a symbol, workspace, unresolved (non-existent file) suggestions as
    // the target for another symbol command, because they don't point to a file
    const isFileBasedSuggestion =
      suggestion &&
      !isSymbolSuggestion(suggestion) &&
      !isUnresolvedSuggestion(suggestion) &&
      !isWorkspaceSuggestion(suggestion) &&
      !isCommandSuggestion(suggestion);

    if (isFileBasedSuggestion) {
      file = suggestion.file;
    }

    if (isEditorSuggestion(suggestion)) {
      leaf = suggestion.item;
    }

    const isValidSource = !!file;

    return { isValidSource, leaf, file, suggestion };
  }

  /**
   * Retrieves the position of the cursor, given that view is in a Mode that supports cursors.
   * @param  {View} view
   * @returns EditorPosition
   */
  getCursorPosition(view: View): EditorPosition {
    let cursor: EditorPosition = null;

    if (view?.getViewType() === 'markdown') {
      const md = view as MarkdownView;

      if (md.getMode() !== 'preview') {
        const { editor } = md;
        cursor = editor.getCursor('head');
      }
    }

    return cursor;
  }

  /**
   * Returns the text of the first H1 contained in sourceFile, or sourceFile
   * path if an H1 does not exist
   * @param  {TFile} sourceFile
   * @returns string
   */
  getTitleText(sourceFile: TFile): string {
    const path = stripMDExtensionFromPath(sourceFile);
    const h1 = this.getFirstH1(sourceFile);

    return h1?.heading ?? path;
  }

  /**
   * Finds and returns the first H1 from sourceFile
   * @param  {TFile} sourceFile
   * @returns HeadingCache
   */
  getFirstH1(sourceFile: TFile): HeadingCache | null {
    let h1: HeadingCache = null;
    const { metadataCache } = this.app;
    const headingList: HeadingCache[] =
      metadataCache.getFileCache(sourceFile)?.headings?.filter((v) => v.level === 1) ??
      [];

    if (headingList.length) {
      h1 = headingList.reduce((acc, curr) => {
        const { line: currLine } = curr.position.start;
        const accLine = acc.position.start.line;

        return currLine < accLine ? curr : acc;
      });
    }

    return h1;
  }

  /**
   * Finds the first open WorkspaceLeaf that is showing source file.
   * @param  {TFile} file The source file that is being shown to find
   * @param  {WorkspaceLeaf} leaf Optional, a 'reference' WorkspaceLeaf (example: backlinks, outline, etc.. views) that is used as a pointer to a source file.
   * @returns TargetInfo
   */
  findOpenEditor(file: TFile, leaf?: WorkspaceLeaf): SourceInfo {
    const isTargetLeaf = !!leaf;
    const {
      settings: { referenceViews, excludeViewTypes, includeSidePanelViewTypes },
      app: { workspace },
    } = this;

    const isMatch = (l: WorkspaceLeaf) => {
      let val = false;

      if (l) {
        const isRefView = referenceViews.includes(l.view.getViewType());
        const isTargetRefView =
          isTargetLeaf && referenceViews.includes(leaf.view.getViewType());

        if (!isRefView) {
          val = isTargetLeaf && !isTargetRefView ? l === leaf : l.view?.file === file;
        }
      }

      return val;
    };

    // See if the active leaf matches first, otherwise find the first matching leaf,
    // if there is one
    let matchingLeaf = workspace.activeLeaf;
    if (!isMatch(matchingLeaf)) {
      const leaves = getOpenLeaves(
        workspace,
        excludeViewTypes,
        includeSidePanelViewTypes,
      );

      matchingLeaf = leaves.find(isMatch);
    }

    return {
      leaf: matchingLeaf ?? null,
      file,
      suggestion: null,
      isValidSource: false,
    };
  }
}
