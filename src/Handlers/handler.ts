import {
  App,
  Component,
  EditorPosition,
  FileView,
  HeadingCache,
  Keymap,
  MarkdownRenderer,
  MarkdownView,
  MetadataCache,
  normalizePath,
  OpenViewState,
  PaneType,
  Platform,
  renderResults,
  SearchMatches,
  SearchResult,
  setIcon,
  SplitDirection,
  TFile,
  View,
  Workspace,
  WorkspaceLeaf,
} from 'obsidian';
import {
  AnySuggestion,
  Facet,
  MatchPriorityData,
  MatchType,
  Mode,
  PathDisplayFormat,
  PathSegments,
  SessionOpts,
  SourceInfo,
  Suggestion,
  SuggestionType,
} from 'src/types';
import { InputInfo, ParsedCommand, WorkspaceEnvList } from 'src/switcherPlus';
import { SwitcherPlusSettings } from 'src/settings';
import {
  ComponentManager,
  getTFileByPath,
  isEditorSuggestion,
  isHeadingSuggestion,
  stripMDExtensionFromPath,
} from 'src/utils';

export abstract class Handler<T> {
  facets: Facet[];

  constructor(
    protected app: App,
    protected settings: SwitcherPlusSettings,
  ) {}

  abstract renderSuggestion(sugg: T, parentEl: HTMLElement): boolean;
  abstract onChooseSuggestion(sugg: T, evt: MouseEvent | KeyboardEvent): boolean;
  abstract getSuggestions(inputInfo: InputInfo): T[] | Promise<T[]>;
  abstract getCommandString(sessionOpts?: SessionOpts): string;

  abstract validateCommand(
    inputInfo: InputInfo,
    index: number,
    filterText: string,
    activeSuggestion: AnySuggestion,
    activeLeaf: WorkspaceLeaf,
  ): ParsedCommand;

  reset(): void {
    /* noop */
  }

  onNoResultsCreateAction(
    _inputInfo: InputInfo,
    _evt: MouseEvent | KeyboardEvent,
  ): boolean {
    return false;
  }

  getFacets(mode: Mode): Facet[] {
    if (!this.facets) {
      const facetList = this.settings?.quickFilters?.facetList;

      if (facetList) {
        this.facets = Object.values(facetList).filter((facet) => facet.mode === mode);
      }
    }

    return this.facets ?? [];
  }

  getAvailableFacets(inputInfo: InputInfo): Facet[] {
    return this.getFacets(inputInfo.mode).filter((v) => v.isAvailable);
  }

  activateFacet(facets: Facet[], isActive: boolean): void {
    facets.forEach((v) => (v.isActive = isActive));

    if (!this.settings.quickFilters.shouldResetActiveFacets) {
      this.settings.save();
    }
  }

  getActiveFacetIds(inputInfo: InputInfo): Set<string> {
    const facetIds = this.getAvailableFacets(inputInfo)
      .filter((v) => v.isActive)
      .map((v) => v.id);

    return new Set(facetIds);
  }

  isFacetedWith(activeFacetIds: Set<string>, facetId: string): boolean {
    const hasActiveFacets = !!activeFacetIds.size;
    return (hasActiveFacets && activeFacetIds.has(facetId)) || !hasActiveFacets;
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
      ({ leaf } = this.findMatchingLeaf(info.file, info.leaf));
    }

    // Get the cursor information to support `selectNearestHeading`
    const cursor = this.getCursorPosition(leaf?.view);

    return { ...info, leaf, cursor };
  }

  protected getSourceInfoFromSuggestion(suggestion: AnySuggestion): SourceInfo {
    let file: TFile = null;
    let leaf: WorkspaceLeaf = null;

    // Can't use these suggestions as the target for another symbol command,
    // because they don't point to a file
    const invalidTypes = [
      SuggestionType.SymbolList,
      SuggestionType.Unresolved,
      SuggestionType.WorkspaceList,
      SuggestionType.CommandList,
      SuggestionType.VaultList,
    ];

    const isFileBasedSuggestion = suggestion && !invalidTypes.includes(suggestion.type);
    if (isFileBasedSuggestion) {
      file = (suggestion as { file: TFile }).file;
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
    return Handler.getFirstH1(sourceFile, this.app.metadataCache);
  }

  static getFirstH1(
    sourceFile: TFile,
    metadataCache: MetadataCache,
  ): HeadingCache | null {
    let h1: HeadingCache = null;
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
  findMatchingLeaf(
    file: TFile,
    leaf?: WorkspaceLeaf,
    shouldIncludeRefViews = false,
  ): SourceInfo {
    let matchingLeaf = null;
    const hasSourceLeaf = !!leaf;
    const {
      settings: { referenceViews, excludeViewTypes, includeSidePanelViewTypes },
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
    const activeLeaf = this.getActiveLeaf();
    if (isMatch(activeLeaf)) {
      matchingLeaf = activeLeaf;
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

  /** Determines if an existing tab should be reused, or create new tab, or create new window based on evt and taking into account user preferences
   * @param  {MouseEvent|KeyboardEvent} evt
   * @param  {boolean} isAlreadyOpen?
   * @param  {Mode} mode? Only Symbol mode has special handling.
   * @returns {navType: boolean | PaneType; splitDirection: SplitDirection}
   */
  extractTabNavigationType(
    evt: MouseEvent | KeyboardEvent,
    isAlreadyOpen?: boolean,
    mode?: Mode,
  ): { navType: boolean | PaneType; splitDirection: SplitDirection } {
    const splitDirection: SplitDirection = evt?.shiftKey ? 'horizontal' : 'vertical';

    const key = (evt as KeyboardEvent)?.key;
    let navType = Keymap.isModEvent(evt) ?? false;

    if (navType === true || navType === 'tab') {
      if (key === 'o') {
        // cmd-o to create new window
        navType = 'window';
      } else if (key === '\\') {
        // cmd-\ to create split
        navType = 'split';
      }
    }

    navType = this.applyTabCreationPreferences(navType, isAlreadyOpen, mode);
    return { navType, splitDirection };
  }

  /**
   * Determines whether or not a new leaf should be created taking user
   * settings into account
   * @param  {PaneType | boolean} navType
   * @param  {} isAlreadyOpen=false Set to true if there is a pane showing the file already
   * @param  {Mode} mode? Only Symbol mode has special handling.
   * @returns boolean
   */
  applyTabCreationPreferences(
    navType: PaneType | boolean,
    isAlreadyOpen = false,
    mode?: Mode,
  ): PaneType | boolean {
    let preferredNavType = navType;
    const { onOpenPreferNewTab, alwaysNewTabForSymbols, useActiveTabForSymbolsOnMobile } =
      this.settings;

    if (navType === false) {
      if (onOpenPreferNewTab) {
        preferredNavType = !isAlreadyOpen;
      } else if (mode === Mode.SymbolList) {
        preferredNavType = Platform.isMobile
          ? !useActiveTabForSymbolsOnMobile
          : alwaysNewTabForSymbols;
      }
    }

    return preferredNavType;
  }

  /**
   * Determines if a leaf belongs to the main editor panel (workspace.rootSplit or
   * workspace.floatingSplit) as opposed to the side panels
   * @param  {WorkspaceLeaf} leaf
   * @returns boolean
   */
  isMainPanelLeaf(leaf: WorkspaceLeaf): boolean {
    const { workspace } = this.app;
    const root = leaf?.getRoot();
    return root === workspace.rootSplit || root === workspace.floatingSplit;
  }

  /**
   * Reveals and optionally bring into focus a WorkspaceLeaf, including leaves
   * from the side panels.
   * @param  {WorkspaceLeaf} leaf
   * @param  {Record<string, unknown>} eState?
   * @returns void
   */
  async activateLeaf(
    leaf: WorkspaceLeaf,
    eState?: Record<string, unknown>,
  ): Promise<void> {
    const { workspace } = this.app;

    try {
      await workspace.revealLeaf(leaf);
      workspace.setActiveLeaf(leaf, { focus: true });
      leaf.view.setEphemeralState({ focus: true, ...eState });
    } catch (err) {
      const title = leaf?.getDisplayText();
      console.log(`Switcher++: error activating WorkspaceLeaf with title: ${title}`, err);
    }
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
    options?: { orderByAccessTime?: boolean },
  ): WorkspaceLeaf[] {
    const leaves: WorkspaceLeaf[] = [];

    const saveLeaf = (l: WorkspaceLeaf) => {
      const viewType = l?.view?.getViewType();

      if (this.isMainPanelLeaf(l)) {
        if (!excludeMainPanelViewTypes?.includes(viewType)) {
          leaves.push(l);
        }
      } else if (includeSidePanelViewTypes?.includes(viewType)) {
        leaves.push(l);
      }
    };

    this.app.workspace.iterateAllLeaves(saveLeaf);

    if (options?.orderByAccessTime) {
      leaves.sort((a, b) => {
        const t1 = a?.activeTime ?? 0;
        const t2 = b?.activeTime ?? 0;
        return t2 - t1;
      });
    }

    return leaves;
  }

  /**
   * Loads a file into a WorkspaceLeaf based on navType
   * @param  {TFile} file
   * @param  {PaneType|boolean} navType
   * @param  {OpenViewState} openState?
   * @param  {SplitDirection} splitDirection if navType is 'split', the direction to
   * open the split. Defaults to 'vertical'
   * @returns void
   */
  async openFileInLeaf(
    file: TFile,
    navType: PaneType | boolean,
    openState?: OpenViewState,
    splitDirection: SplitDirection = 'vertical',
  ): Promise<void> {
    const { workspace } = this.app;
    const leaf =
      navType === 'split'
        ? workspace.getLeaf(navType, splitDirection)
        : workspace.getLeaf(navType);

    await leaf.openFile(file, openState);
  }

  /**
   * Determines whether to activate (make active and focused) an existing WorkspaceLeaf
   * (searches through all leaves), or create a new WorkspaceLeaf, or reuse an unpinned
   * WorkspaceLeaf, or create a new window in order to display file. This takes user
   * settings and event status into account.
   * @param  {MouseEvent|KeyboardEvent} evt navigation trigger event
   * @param  {TFile} file The file to display
   * @param  {string} errorContext Custom text to save in error messages
   * @param  {OpenViewState} openState? State to pass to the new, or activated view. If
   * falsy, default values will be used
   * @param  {WorkspaceLeaf} leaf? WorkspaceLeaf, or reference WorkspaceLeaf
   * (backlink, outline, etc..) to activate if it's already known
   * @param  {Mode} mode? Only Symbol mode has custom handling
   * @param  {boolean} shouldIncludeRefViews whether reference WorkspaceLeaves are valid
   * targets for activation
   * @returns void
   */
  navigateToLeafOrOpenFile(
    evt: MouseEvent | KeyboardEvent,
    file: TFile,
    errorContext: string,
    openState?: OpenViewState,
    leaf?: WorkspaceLeaf,
    mode?: Mode,
    shouldIncludeRefViews = false,
  ): void {
    this.navigateToLeafOrOpenFileAsync(
      evt,
      file,
      openState,
      leaf,
      mode,
      shouldIncludeRefViews,
    ).catch((reason) => {
      console.log(`Switcher++: error navigating to open file. ${errorContext}`, reason);
    });
  }

  /**
   * Determines whether to activate (make active and focused) an existing WorkspaceLeaf
   * (searches through all leaves), or create a new WorkspaceLeaf, or reuse an unpinned
   * WorkspaceLeaf, or create a new window in order to display file. This takes user
   * settings and event status into account.
   * @param  {MouseEvent|KeyboardEvent} evt navigation trigger event
   * @param  {TFile} file The file to display
   * @param  {OpenViewState} openState? State to pass to the new, or activated view. If
   * falsy, default values will be used
   * @param  {WorkspaceLeaf} leaf? WorkspaceLeaf, or reference WorkspaceLeaf
   * (backlink, outline, etc..) to activate if it's already known
   * @param  {Mode} mode? Only Symbol mode has custom handling
   * @param  {boolean} shouldIncludeRefViews whether reference WorkspaceLeaves are valid
   * targets for activation
   * @returns void
   */
  async navigateToLeafOrOpenFileAsync(
    evt: MouseEvent | KeyboardEvent,
    file: TFile,
    openState?: OpenViewState,
    leaf?: WorkspaceLeaf,
    mode?: Mode,
    shouldIncludeRefViews = false,
  ): Promise<void> {
    const { leaf: targetLeaf } = this.findMatchingLeaf(file, leaf, shouldIncludeRefViews);
    const isAlreadyOpen = !!targetLeaf;

    const { navType, splitDirection } = this.extractTabNavigationType(
      evt,
      isAlreadyOpen,
      mode,
    );

    await this.activateLeafOrOpenFile(
      navType,
      file,
      targetLeaf,
      openState,
      splitDirection,
    );
  }

  /**
   * Activates leaf (if provided), or load file into another leaf based on navType
   * @param  {PaneType|boolean} navType
   * @param  {TFile} file
   * @param  {WorkspaceLeaf} leaf? optional if supplied and navType is
   * false then leaf will be activated
   * @param  {OpenViewState} openState?
   * @param  {SplitDirection} splitDirection? if navType is 'split', the direction to
   * open the split
   * @returns void
   */
  async activateLeafOrOpenFile(
    navType: PaneType | boolean,
    file: TFile,
    leaf?: WorkspaceLeaf,
    openState?: OpenViewState,
    splitDirection?: SplitDirection,
  ): Promise<void> {
    // default to having the pane active and focused
    openState = openState ?? { active: true, eState: { active: true, focus: true } };

    if (leaf && navType === false) {
      const eState = openState?.eState;
      await this.activateLeaf(leaf, eState);
    } else {
      await this.openFileInLeaf(file, navType, openState, splitDirection);
    }
  }

  /**
   * Renders the UI elements to display path information for file using the
   * stored configuration settings
   * @param  {HTMLElement} parentEl containing element, this should be the element with
   * the "suggestion-content" style
   * @param  {TFile} file
   * @param  {boolean} excludeOptionalFilename? set to true to hide the filename in cases
   * where when {PathDisplayFormat} is set to FolderPathFilenameOptional
   * @param  {SearchResult} match?
   * @param  {boolean} overridePathFormat? set to true force display the path and set
   * {PathDisplayFormat} to FolderPathFilenameOptional
   * @returns void
   */
  renderPath(
    parentEl: HTMLElement,
    file: TFile,
    excludeOptionalFilename?: boolean,
    match?: SearchResult,
    overridePathFormat?: boolean,
  ): void {
    if (parentEl && file) {
      const isRoot = file.parent.isRoot();
      let format = this.settings.pathDisplayFormat;
      let hidePath =
        format === PathDisplayFormat.None || (isRoot && this.settings.hidePathIfRoot);

      if (overridePathFormat) {
        format = PathDisplayFormat.FolderPathFilenameOptional;
        hidePath = false;
      }

      if (!hidePath) {
        const wrapperEl = parentEl.createDiv({ cls: ['suggestion-note', 'qsp-note'] });
        const path = this.getPathDisplayText(file, format, excludeOptionalFilename);

        const iconEl = wrapperEl.createSpan({ cls: ['qsp-path-indicator'] });
        setIcon(iconEl, 'folder');

        const pathEl = wrapperEl.createSpan({ cls: 'qsp-path' });
        renderResults(pathEl, path, match);
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
   * Displays the primary suggestion content.
   * @param  {HTMLElement} parentEl containing element, this should be the element with
   * the "suggestion-item" style
   * @param  {string} content
   * @param  {SearchResult} match
   * @param  {number} offset?
   * @returns HTMLDivElement
   */
  renderContent(
    parentEl: HTMLElement,
    content: string,
    match: SearchResult,
    offset?: number,
  ): HTMLDivElement {
    const { contentEl, titleEl } = Handler.createContentStructureElements(parentEl);
    renderResults(titleEl, content, match, offset);

    return contentEl;
  }

  /**
   * Creates the DOM structure for displaying the primary suggestion content
   *
   * @static
   * @param {HTMLElement} parentEl
   * @returns {{
   *     contentEl: HTMLDivElement;
   *     titleEl: HTMLDivElement;
   *   }}
   */
  static createContentStructureElements(parentEl: HTMLElement): {
    contentEl: HTMLDivElement;
    titleEl: HTMLDivElement;
  } {
    const contentEl = parentEl.createDiv({
      cls: ['suggestion-content', 'qsp-content'],
    });

    const titleEl = contentEl.createDiv({
      cls: ['suggestion-title', 'qsp-title'],
    });

    return { contentEl, titleEl };
  }

  /**
   * Asynchronously renders (converts) markdown string content to an HTML element
   *
   * @param {App} app
   * @param {HTMLElement} containerEl The parent element for the rendered content. This
   * should usually be the 'suggestion-title' element.
   * @param {string} content The markdown source to render
   * @param {string} sourcePath The normalized path of this markdown file, used to resolve relative internal links
   */
  static renderMarkdownContentAsync(
    app: App,
    containerEl: HTMLElement,
    content: string,
    sourcePath: string,
  ): void {
    Handler.renderMarkdownContent(
      app,
      containerEl,
      content,
      sourcePath,
      ComponentManager.getRootComponent(),
    ).catch((reason) => {
      console.log(
        'Switcher++: error rendering markdown to html. ',
        reason,
        `content: ${content}`,
      );
    });
  }

  /**
   * Renders (converts) markdown string content to an HTML element
   *
   * @async
   * @param {App} app
   * @param {HTMLElement} containerEl The parent element for the rendered content. This
   * should usually be the 'suggestion-title' element.
   * @param {string} content The markdown source to render
   * @param {string} sourcePath The normalized path of this markdown file, used to resolve relative internal links
   * @param {Component} component A parent component to manage the lifecycle of the rendered child components.
   * @returns {Promise<HTMLSpanElement>} the root element containing the rendered elements
   */
  static async renderMarkdownContent(
    app: App,
    containerEl: HTMLElement,
    content: string,
    sourcePath: string,
    component: Component,
  ): Promise<HTMLSpanElement> {
    const wrapperEl = containerEl.createSpan({ cls: ['qsp-rendered-container'] });
    await MarkdownRenderer.render(app, content, wrapperEl, sourcePath, component);

    // Find the inserted <p> wrapping node and replace it with it's children
    // Note: it's important to operate at the Node abstraction here so that all
    // Node types that may exist get moved from <p> to wrapperEl
    if (wrapperEl.childNodes.length === 1 && wrapperEl.firstChild.nodeName === 'P') {
      const paraNode = wrapperEl.firstChild;
      paraNode.replaceWith(...Array.from(paraNode.childNodes));
    }

    return wrapperEl;
  }

  /** add the base suggestion styles to the suggestion container element
   * @param  {HTMLElement} parentEl container element
   * @param  {string[]} additionalStyles? optional styles to add
   */
  addClassesToSuggestionContainer(parentEl: HTMLElement, additionalStyles?: string[]) {
    const styles = ['mod-complex'];

    if (additionalStyles) {
      styles.push(...additionalStyles);
    }

    parentEl?.addClasses(styles);
  }

  /**
   * Separate match into two groups, one that only matches the path segment of file, and
   * a second that only matches the filename segment
   * @param  {PathSegments} pathSegments
   * @param  {SearchResult} match
   * @returns {SearchResult; SearchResult}
   */
  splitSearchMatchesAtBasename(
    pathSegments: PathSegments,
    match: SearchResult,
  ): { pathMatch: SearchResult; basenameMatch: SearchResult } {
    let basenameMatch: SearchResult = null;
    let pathMatch: SearchResult = null;

    // function to re-anchor offsets by a certain amount
    const decrementOffsets = (offsets: SearchMatches, amount: number) => {
      offsets.forEach((offset) => {
        offset[0] -= amount;
        offset[1] -= amount;
      });
    };

    if (pathSegments && match?.matches) {
      const nameIndex = pathSegments.path.lastIndexOf(pathSegments.basename);

      if (nameIndex >= 0) {
        const { matches, score } = match;
        const matchStartIndex = matches[0][0];
        const matchEndIndex = matches[matches.length - 1][1];

        if (matchStartIndex >= nameIndex) {
          // the entire match offset is in the basename segment, so match can be used
          // for basename
          basenameMatch = match;
          decrementOffsets(basenameMatch.matches, nameIndex);
        } else if (matchEndIndex <= nameIndex) {
          // the entire match offset is in the path segment
          pathMatch = match;
        } else {
          // the match offset spans both path and basename, so they will have to
          // to be split up. Note that the entire SearchResult can span both, and
          // a single SearchMatchPart inside the SearchResult can also span both
          let i = matches.length;
          while (i--) {
            const matchPartStartIndex = matches[i][0];
            const matchPartEndIndex = matches[i][1];
            const nextMatchPartIndex = i + 1;

            if (matchPartEndIndex <= nameIndex) {
              // the last path segment MatchPart ends cleanly in the path segment
              pathMatch = { score, matches: matches.slice(0, nextMatchPartIndex) };

              basenameMatch = { score, matches: matches.slice(nextMatchPartIndex) };
              decrementOffsets(basenameMatch.matches, nameIndex);
              break;
            } else if (matchPartStartIndex < nameIndex) {
              // the last MatchPart starts in path segment and ends in basename segment
              // adjust the end of the path segment MatchPart to finish at the end
              // of the path segment
              let offsets = matches.slice(0, nextMatchPartIndex);
              offsets[offsets.length - 1] = [matchPartStartIndex, nameIndex];
              pathMatch = { score, matches: offsets };

              // adjust the beginning of the first basename segment MatchPart to start
              // at the beginning of the basename segment
              offsets = matches.slice(i);
              decrementOffsets(offsets, nameIndex);
              offsets[0][0] = 0;
              basenameMatch = { score, matches: offsets };
              break;
            }
          }
        }
      }
    }

    return { pathMatch, basenameMatch };
  }

  /**
   * Display the provided information as a suggestion with the content and path information on separate lines
   * @param  {HTMLElement} parentEl
   * @param  {string[]} parentElStyles
   * @param  {string} primaryString
   * @param  {TFile} file
   * @param  {MatchType} matchType
   * @param  {SearchResult} match
   * @param  {} excludeOptionalFilename=true
   * @returns void
   */
  renderAsFileInfoPanel(
    parentEl: HTMLElement,
    parentElStyles: string[],
    primaryString: string,
    file: TFile,
    matchType: MatchType,
    match: SearchResult,
    excludeOptionalFilename = true,
  ): void {
    let primaryMatch: SearchResult = null;
    let pathMatch: SearchResult = null;

    if (primaryString?.length) {
      if (matchType === MatchType.Primary) {
        primaryMatch = match;
      } else if (matchType === MatchType.Path) {
        pathMatch = match;
      }
    } else if (file) {
      primaryString = file.basename;

      if (matchType === MatchType.Basename) {
        primaryMatch = match;
      } else if (matchType === MatchType.Path) {
        // MatchType.ParentPath can span both filename and basename
        // (partial match in each) so try to split the match offsets
        ({ pathMatch, basenameMatch: primaryMatch } = this.splitSearchMatchesAtBasename(
          file,
          match,
        ));
      }
    }

    this.addClassesToSuggestionContainer(parentEl, parentElStyles);

    const contentEl = this.renderContent(parentEl, primaryString, primaryMatch);
    this.renderPath(contentEl, file, excludeOptionalFilename, pathMatch, !!pathMatch);
  }

  /**
   * Returns the currently active leaf across all root workspace splits
   * @returns WorkspaceLeaf | null
   */
  getActiveLeaf(): WorkspaceLeaf | null {
    return Handler.getActiveLeaf(this.app.workspace);
  }

  /**
   * Returns the currently active leaf across all root workspace splits
   * @param  {Workspace} workspace
   * @returns WorkspaceLeaf | null
   */
  static getActiveLeaf(workspace: Workspace): WorkspaceLeaf | null {
    const leaf = workspace?.getActiveViewOfType(View)?.leaf;
    return leaf ?? null;
  }

  /**
   * Displays extra flair icons for an item, and adds any associated css classes
   * to parentEl
   * @param  {HTMLElement} parentEl the suggestion container element
   * @param  {AnySuggestion} sugg the suggestion item
   * @param  {HTMLDivElement=null} flairContainerEl optional, if null, it will be created
   * @returns HTMLDivElement the flairContainerEl that was passed in or created
   */
  renderOptionalIndicators(
    parentEl: HTMLElement,
    sugg: AnySuggestion,
    flairContainerEl: HTMLDivElement = null,
  ): HTMLDivElement {
    const { showOptionalIndicatorIcons } = this.settings;
    const indicatorData = new Map<keyof AnySuggestion, Record<string, string>>();
    indicatorData.set('isRecent', {
      iconName: 'history',
      parentElClass: 'qsp-recent-file',
      indicatorElClass: 'qsp-recent-indicator',
    });

    indicatorData.set('isOpenInEditor', {
      iconName: 'lucide-file-edit',
      parentElClass: 'qsp-open-editor',
      indicatorElClass: 'qsp-editor-indicator',
    });

    indicatorData.set('isBookmarked', {
      iconName: 'lucide-bookmark',
      parentElClass: 'qsp-bookmarked-file',
      indicatorElClass: 'qsp-bookmarked-indicator',
    });

    if (!flairContainerEl) {
      flairContainerEl = this.createFlairContainer(parentEl);
    }

    if (showOptionalIndicatorIcons) {
      for (const [state, data] of indicatorData.entries()) {
        if (sugg[state] === true) {
          if (data.parentElClass) {
            parentEl?.addClass(data.parentElClass);
          }

          this.renderIndicator(flairContainerEl, [data.indicatorElClass], data.iconName);
        }
      }
    }

    return flairContainerEl;
  }

  /**
   * @param  {HTMLDivElement} flairContainerEl
   * @param  {string[]} indicatorClasses additional css classes to add to flair element
   * @param  {string} svgIconName? the name of the svg icon to use
   * @param  {string} indicatorText? the text content of the flair element
   * @returns HTMLElement the flair icon wrapper element
   */
  renderIndicator(
    flairContainerEl: HTMLDivElement,
    indicatorClasses: string[],
    svgIconName?: string,
    indicatorText?: string,
  ): HTMLElement {
    const cls = ['suggestion-flair', ...indicatorClasses];
    const flairEl = flairContainerEl?.createSpan({ cls });

    if (flairEl) {
      if (svgIconName) {
        flairEl.addClass('svg-icon');
        setIcon(flairEl, svgIconName);
      }

      if (indicatorText) {
        flairEl.setText(indicatorText);
      }
    }

    return flairEl;
  }

  /**
   * Creates a child Div element with the appropriate css classes for flair icons
   * @param  {HTMLElement} parentEl
   * @returns HTMLDivElement
   */
  createFlairContainer(parentEl: HTMLElement): HTMLDivElement {
    return parentEl?.createDiv({ cls: ['suggestion-aux', 'qsp-aux'] });
  }

  /**
   * Retrieves a TFile object using path. Return null if path does not represent
   * a TFile object.
   * @param  {string} path
   * @returns TFile|null
   */
  getTFileByPath(path: string): TFile | null {
    return getTFileByPath(path, this.app.vault);
  }

  /**
   * Downranks suggestions for files that live in Obsidian ignored paths, or,
   * increases the suggestion score by a factor specified in settings. This instance
   * version just forwards to the static version
   * @param  {V} sugg the suggestion objects
   * @returns V
   */
  applyMatchPriorityPreferences<
    U,
    V extends Omit<Suggestion<U>, 'file' | 'item'> & { file?: TFile },
  >(sugg: V): V {
    return Handler.applyMatchPriorityPreferences(
      sugg,
      this.settings,
      this.app.metadataCache,
    );
  }

  /**
   * Downranks suggestions for files that live in Obsidian ignored paths, or,
   * increases the suggestion score by a factor specified in settings.
   * @param  {V} sugg the suggestion objects
   * @param  {SwitcherPlusSettings} settings
   * @param  {MetadataCache} metadataCache
   * @returns V
   */
  static applyMatchPriorityPreferences<
    U,
    V extends Omit<Suggestion<U>, 'file' | 'item'> & { file?: TFile },
  >(sugg: V, settings: SwitcherPlusSettings, metadataCache: MetadataCache): V {
    if (sugg?.match) {
      const { match, type, file } = sugg;

      if (file && metadataCache?.isUserIgnored(file.path)) {
        // downrank suggestions that are in an obsidian ignored paths
        sugg.downranked = true;
        sugg.match.score -= 10;
      } else if (settings?.matchPriorityAdjustments?.isEnabled) {
        const { matchPriorityAdjustments } = settings;
        const adjustments = matchPriorityAdjustments.adjustments ?? {};
        const fileExtAdjustments = matchPriorityAdjustments.fileExtAdjustments ?? {};
        let factor = 0;

        const getFactor = (
          key: string,
          collection?: Record<string, MatchPriorityData>,
        ) => {
          collection = collection ?? adjustments;
          let val = 0;

          if (Object.prototype.hasOwnProperty.call(collection, key)) {
            val = Number(collection[key]?.value);
          }

          return isNaN(val) ? 0 : val;
        };

        const getFactorConstrained = (searchType: SuggestionType, searchKey: keyof V) => {
          let val = 0;

          if ((searchType !== null && searchType === type) || sugg[searchKey]) {
            val = getFactor(searchKey as string);
          }

          return val;
        };

        factor += getFactorConstrained(SuggestionType.Bookmark, 'isBookmarked');
        factor += getFactorConstrained(SuggestionType.EditorList, 'isOpenInEditor');
        factor += getFactorConstrained(null, 'isRecent');
        factor += getFactorConstrained(null, 'isAttachment');
        factor += getFactor(file?.extension, fileExtAdjustments);

        if (isHeadingSuggestion(sugg)) {
          factor += getFactor(`h${sugg.item?.level}`);
        }

        // check for adjustments defined for other suggestion types, the types that are
        // explicitly checked above should not be in the adjustment list so
        // they don't get counted twice (above and then again here)
        const typeStr = type.toString();
        factor += getFactor(typeStr);

        // update score by the percentage define by factor
        // find one percent of score by dividing the absolute value of score by 100,
        // multiply factor by 100 to convert into percentage
        // multiply the two to get the change amount, and add it to score
        match.score += (Math.abs(match.score) / 100) * (factor * 100);
      }
    }

    return sugg;
  }

  /**
   * Sets isOpenInEditor, isRecent, isBookmarked, isAttachment, status of sugg
   * based on currentWorkspaceEnvList
   * @param  {WorkspaceEnvList} currentWorkspaceEnvList
   * @param  {V} sugg
   * @returns V
   */
  static updateWorkspaceEnvListStatus<U, V extends Omit<Suggestion<U>, 'item'>>(
    currentWorkspaceEnvList: WorkspaceEnvList,
    sugg: V,
  ): V {
    if (currentWorkspaceEnvList && sugg?.file) {
      const { file } = sugg;

      sugg.isOpenInEditor = currentWorkspaceEnvList.openWorkspaceFiles?.has(file);
      sugg.isRecent = currentWorkspaceEnvList.mostRecentFiles?.has(file);
      sugg.isBookmarked = currentWorkspaceEnvList.fileBookmarks?.has(file);

      sugg.isAttachment = currentWorkspaceEnvList.attachmentFileExtensions?.has(
        file.extension,
      );
    }

    return sugg;
  }

  /**
   * Renders a suggestion hint for creating a new note
   * @param  {HTMLElement} parentEl
   * @param  {string} filename
   * @returns HTMLDivElement
   */
  renderFileCreationSuggestion(parentEl: HTMLElement, filename: string): HTMLDivElement {
    this.addClassesToSuggestionContainer(parentEl);
    const contentEl = this.renderContent(parentEl, filename, null);

    const flairEl = this.createFlairContainer(parentEl);
    flairEl?.createSpan({
      cls: 'suggestion-hotkey',
      text: 'Enter to create',
    });

    return contentEl;
  }

  /**
   * Creates a new note in the vault with filename. Uses evt to determine the
   * navigation type (reuse tab, new tab, new window) to use for opening the newly
   * created note.
   * @param  {string} filename
   * @param  {MouseEvent|KeyboardEvent} evt
   * @returns void
   */
  createFile(filename: string, evt: MouseEvent | KeyboardEvent): void {
    const { workspace } = this.app;
    const { navType } = this.extractTabNavigationType(evt);
    const activeView = workspace.getActiveViewOfType(FileView);
    let sourcePath = '';

    if (activeView?.file) {
      sourcePath = activeView.file.path;
    }

    workspace
      .openLinkText(filename, sourcePath, navType, { active: true })
      .catch((err) => {
        console.log('Switcher++: error creating new file. ', err);
      });
  }
}
