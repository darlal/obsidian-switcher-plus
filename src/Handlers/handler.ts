import {
  App,
  EditorPosition,
  HeadingCache,
  MarkdownView,
  OpenViewState,
  Platform,
  TFile,
  View,
  WorkspaceLeaf,
} from 'obsidian';
import { AnySuggestion, Mode, SourceInfo } from 'src/types';
import { InputInfo } from 'src/switcherPlus';
import { SwitcherPlusSettings } from 'src/settings';
import {
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
   * @param  {WorkspaceLeaf} leaf An already open editor, or, a 'reference' WorkspaceLeaf (example: backlinks, outline, etc.. views) that is used to find the associated editor if one exists.
   * @returns TargetInfo
   */
  findOpenEditor(file: TFile, leaf?: WorkspaceLeaf): SourceInfo {
    let matchingLeaf = null;
    const isTargetLeaf = !!leaf;
    const {
      settings: { referenceViews, excludeViewTypes, includeSidePanelViewTypes },
      app: { workspace },
    } = this;

    const isMatch = (l: WorkspaceLeaf) => {
      let val = false;

      if (l?.view) {
        const isRefView = referenceViews.includes(l.view.getViewType());
        const isTargetRefView =
          isTargetLeaf && referenceViews.includes(leaf.view.getViewType());

        if (!isRefView) {
          val = isTargetLeaf && !isTargetRefView ? l === leaf : l.view.file === file;
        }
      }

      return val;
    };

    // Prioritize the active leaf matches first, otherwise find the first matching leaf
    if (isMatch(workspace.activeLeaf)) {
      matchingLeaf = workspace.activeLeaf;
    }

    if (!matchingLeaf) {
      const leaves = this.getOpenLeaves(excludeViewTypes, includeSidePanelViewTypes);

      // put leaf at the first index so it gets checked first
      matchingLeaf = [leaf, ...leaves].find(isMatch);
    }

    return {
      leaf: matchingLeaf ?? null,
      file,
      suggestion: null,
      isValidSource: false,
    };
  }

  /**
   * Determines whether or not a new leaf should be created
   * @param  {boolean} isModDown Set to true if the user holding cmd/ctrl
   * @param  {} isAlreadyOpen=false Set to true if there is a pane showing the file already
   * @param  {Mode} mode? Only Symbol mode has special handling.
   * @returns boolean
   */
  shouldCreateNewLeaf(isModDown: boolean, isAlreadyOpen = false, mode?: Mode): boolean {
    const {
      onOpenPreferNewPane,
      alwaysNewPaneForSymbols,
      useActivePaneForSymbolsOnMobile,
    } = this.settings;

    const isNewPaneRequested = !isAlreadyOpen && onOpenPreferNewPane;
    let shouldCreateNew = isModDown || isNewPaneRequested;

    if (mode === Mode.SymbolList && !onOpenPreferNewPane) {
      const { isMobile } = Platform;
      shouldCreateNew = alwaysNewPaneForSymbols || isModDown;

      if (isMobile) {
        shouldCreateNew = isModDown || !useActivePaneForSymbolsOnMobile;
      }
    }

    return shouldCreateNew;
  }

  /**
   * Determines if a leaf belongs to the main editor panel (workspace.rootSplit)
   * as opposed to the side panels
   * @param  {WorkspaceLeaf} leaf
   * @returns boolean
   */
  isMainPanelLeaf(leaf: WorkspaceLeaf): boolean {
    return leaf?.getRoot() === this.app.workspace.rootSplit;
  }

  /**
   * Reveals and optionally bring into focus a WorkspaceLeaf, including leaves
   * from the side panels.
   * @param  {WorkspaceLeaf} leaf
   * @param  {boolean} pushHistory?
   * @param  {Record<string} eState?
   * @param  {} unknown>
   * @returns void
   */
  activateLeaf(
    leaf: WorkspaceLeaf,
    pushHistory?: boolean,
    eState?: Record<string, unknown>,
  ): void {
    const { workspace } = this.app;
    const isInSidePanel = !this.isMainPanelLeaf(leaf);
    const state = { focus: true, ...eState };

    if (isInSidePanel) {
      workspace.revealLeaf(leaf);
    }

    workspace.setActiveLeaf(leaf, pushHistory);
    leaf.view.setEphemeralState(state);
  }

  /**
   * Returns a array of all open WorkspaceLeaf taking into account
   * excludeMainPanelViewTypes and includeSidePanelViewTypes.
   * @param  {string[]} excludeMainPanelViewTypes?
   * @param  {string[]} includeSidePanelViewTypes?
   * @returns WorkspaceLeaf[]
   */
  getOpenLeaves(
    excludeMainPanelViewTypes?: string[],
    includeSidePanelViewTypes?: string[],
  ): WorkspaceLeaf[] {
    const leaves: WorkspaceLeaf[] = [];

    const saveLeaf = (l: WorkspaceLeaf) => {
      const viewType = l.view?.getViewType();

      if (this.isMainPanelLeaf(l)) {
        if (!excludeMainPanelViewTypes?.includes(viewType)) {
          leaves.push(l);
        }
      } else if (includeSidePanelViewTypes?.includes(viewType)) {
        leaves.push(l);
      }
    };

    this.app.workspace.iterateAllLeaves(saveLeaf);
    return leaves;
  }

  /**
   * Loads a file into a (optionally new) WorkspaceLeaf
   * @param  {TFile} file
   * @param  {boolean} shouldCreateNewLeaf
   * @param  {OpenViewState} openState?
   * @param  {} errorContext=''
   * @returns void
   */
  openFileInLeaf(
    file: TFile,
    shouldCreateNewLeaf: boolean,
    openState?: OpenViewState,
    errorContext?: string,
  ): void {
    errorContext = errorContext ?? '';
    const message = `Switcher++: error opening file. ${errorContext}`;

    try {
      this.app.workspace
        .getLeaf(shouldCreateNewLeaf)
        .openFile(file, openState)
        .catch((reason) => {
          // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
          console.log(`${message} ${reason}`);
        });
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      console.log(`${message} ${error}`);
    }
  }

  /**
   * Determines whether to activate (make active and focused) an existing WorkspaceLeaf,
   * or, create a new WorkspaceLeaf, or, reuse an unpinned WorkspaceLeaf in order to
   * dispay file. This takes user settings and Mod key status into account.
   * @param  {boolean} isModDown Set to true if the user is holding down cmd/ctrl keys
   * @param  {TFile} file The file to display
   * @param  {string} errorContext Custom text to save in error messages
   * @param  {OpenViewState} openState? State to pass to the new, or activated view. If
   * falsy, default values will be used
   * @param  {WorkspaceLeaf} leaf? Editor, or reference WorkspaceLeaf to activate if it's
   * already known
   * @param  {Mode} mode? Only Symbol mode has custom handling
   * @returns void
   */
  navigateToLeafOrOpenFile(
    isModDown: boolean,
    file: TFile,
    errorContext: string,
    openState?: OpenViewState,
    leaf?: WorkspaceLeaf,
    mode?: Mode,
  ): void {
    const { leaf: targetLeaf } = this.findOpenEditor(file, leaf);
    const isAlreadyOpen = !!targetLeaf;
    const shouldCreateNew = this.shouldCreateNewLeaf(isModDown, isAlreadyOpen, mode);

    // default to having the pane active and focused
    openState = openState ?? { active: true, eState: { active: true, focus: true } };

    if (targetLeaf && !shouldCreateNew) {
      const eState = openState?.eState as Record<string, unknown>;
      this.activateLeaf(targetLeaf, true, eState);
    } else {
      this.openFileInLeaf(file, shouldCreateNew, openState, errorContext);
    }
  }
}
