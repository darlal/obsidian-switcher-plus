import {
  App,
  EditorPosition,
  HeadingCache,
  MarkdownView,
  normalizePath,
  OpenViewState,
  Platform,
  renderResults,
  SearchResult,
  setIcon,
  TFile,
  View,
  WorkspaceLeaf,
} from 'obsidian';
import { AnySuggestion, Mode, PathDisplayFormat, SourceInfo } from 'src/types';
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

  abstract validateCommand(
    inputInfo: InputInfo,
    index: number,
    filterText: string,
    activeSuggestion: AnySuggestion,
    activeLeaf: WorkspaceLeaf,
  ): void;
  abstract renderSuggestion(sugg: T, parentEl: HTMLElement): void;
  abstract onChooseSuggestion(sugg: T, evt: MouseEvent | KeyboardEvent): void;
  abstract getSuggestions(inputInfo: InputInfo): T[];

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
   * @param  {} shouldIncludeRefViews=false set to true to make reference view types valid return candidates.
   * @returns TargetInfo
   */
  findOpenEditor(
    file: TFile,
    leaf?: WorkspaceLeaf,
    shouldIncludeRefViews = false,
  ): SourceInfo {
    let matchingLeaf = null;
    const hasSourceLeaf = !!leaf;
    const {
      settings: { referenceViews, excludeViewTypes, includeSidePanelViewTypes },
      app: { workspace },
    } = this;

    const isMatch = (candidateLeaf: WorkspaceLeaf) => {
      let val = false;

      if (candidateLeaf?.view) {
        const isCandidateRefView = referenceViews.includes(
          candidateLeaf.view.getViewType(),
        );
        const isValidCandidate = shouldIncludeRefViews || !isCandidateRefView;
        const isSourceRefView =
          hasSourceLeaf && referenceViews.includes(leaf.view.getViewType());

        if (isValidCandidate) {
          if (hasSourceLeaf && (shouldIncludeRefViews || !isSourceRefView)) {
            val = candidateLeaf === leaf;
          } else {
            val = candidateLeaf.view.file === file;
          }
        }
      }

      return val;
    };

    // Prioritize the active leaf matches first, otherwise find the first matching leaf
    if (isMatch(workspace.activeLeaf)) {
      matchingLeaf = workspace.activeLeaf;
    } else {
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
    shouldIncludeRefViews = false,
  ): void {
    const { leaf: targetLeaf } = this.findOpenEditor(file, leaf, shouldIncludeRefViews);
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

  /**
   * Renders the UI elements to display path information for file using the
   * stored configuration settings
   * @param  {HTMLElement} parentEl
   * @param  {TFile} file
   * @param  {boolean} excludeOptionalFilename? set to true to hide the filename in cases
   * where it's optional
   * @returns void
   */
  renderPath(
    parentEl: HTMLElement,
    file: TFile,
    excludeOptionalFilename?: boolean,
  ): void {
    if (parentEl && file) {
      const { pathDisplayFormat, hidePathIfRoot } = this.settings;
      const isRoot = file.parent?.name.length === 0;
      const hidePath =
        pathDisplayFormat === PathDisplayFormat.None || (isRoot && hidePathIfRoot);

      if (!hidePath) {
        const wrapperEl = parentEl.createDiv({ cls: ['suggestion-note', 'qsp-note'] });
        const path = this.getPathDisplayText(
          file,
          pathDisplayFormat,
          excludeOptionalFilename,
        );

        const iconEl = wrapperEl.createSpan({ cls: ['qsp-path-indicator'] });
        setIcon(iconEl, 'folder', 13);

        wrapperEl.createSpan({
          cls: 'qsp-path',
          text: path,
        });
      }
    }
  }

  /**
   * Formats the path of file based on displayFormat
   * @param  {TFile} file
   * @param  {PathDisplayFormat} displayFormat
   * @param  {boolean} excludeOptionalFilename? Only applicable to
   * {PathDisplayFormat.FolderPathFilenameOptional}. When true will exclude the filename from the returned string
   * @returns string
   */
  getPathDisplayText(
    file: TFile,
    displayFormat: PathDisplayFormat,
    excludeOptionalFilename?: boolean,
  ): string {
    let text = '';

    if (file) {
      const { parent } = file;
      const dirname = parent.name;
      const isRoot = parent.isRoot();

      // root path is expected to always be "/"
      const rootPath = this.app.vault.getRoot().path;

      switch (displayFormat) {
        case PathDisplayFormat.FolderWithFilename:
          text = isRoot ? `${file.name}` : normalizePath(`${dirname}/${file.name}`);
          break;
        case PathDisplayFormat.FolderOnly:
          text = isRoot ? rootPath : dirname;
          break;
        case PathDisplayFormat.Full:
          text = file.path;
          break;
        case PathDisplayFormat.FolderPathFilenameOptional:
          if (excludeOptionalFilename) {
            text = parent.path;

            if (!isRoot) {
              text += rootPath; // add explicit trailing /
            }
          } else {
            text = this.getPathDisplayText(file, PathDisplayFormat.Full);
          }
          break;
      }
    }

    return text;
  }

  /**
   * Creates the UI elements to display the primary suggestion text using
   * the correct styles.
   * @param  {HTMLElement} parentEl
   * @param  {string} content
   * @param  {SearchResult} result
   * @param  {number} offset?
   * @returns HTMLSpanElement
   */
  renderContent(
    parentEl: HTMLElement,
    content: string,
    result: SearchResult,
    offset?: number,
  ): HTMLSpanElement {
    const contentEl = parentEl.createSpan({
      cls: ['suggestion-content', 'qsp-content'],
    });

    renderResults(contentEl, content, result, offset);

    return contentEl;
  }
}
