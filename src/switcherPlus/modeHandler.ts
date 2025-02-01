import { SwitcherPlusKeymap } from './switcherPlusKeymap';
import { InputInfo, SourcedParsedCommand } from './inputInfo';
import { SwitcherPlusSettings } from 'src/settings';
import {
  Handler,
  WorkspaceHandler,
  HeadingsHandler,
  EditorHandler,
  RelatedItemsHandler,
  SymbolHandler,
  BookmarksHandler,
  CommandHandler,
  VaultHandler,
  StandardExHandler,
} from 'src/Handlers';
import {
  isSymbolSuggestion,
  escapeRegExp,
  isExSuggestion,
  isOfType,
  isTFile,
  ComponentManager,
  getTFileFromLeaf,
  getSourcedModes,
  isBookmarksSuggestion,
  isFileSuggestion,
  isAliasSuggestion,
  getDestinationFileForSuggestion,
} from 'src/utils';
import {
  Mode,
  AnySuggestion,
  SymbolSuggestion,
  SuggestionType,
  SwitcherPlus,
  Facet,
  KeymapConfig,
  SessionOpts,
  ModeDispatcher,
} from 'src/types';
import {
  WorkspaceLeaf,
  App,
  Chooser,
  Debouncer,
  debounce,
  TFile,
  ViewRegistry,
  Platform,
  PaneType,
  SplitDirection,
} from 'obsidian';

const lastInputInfoByMode = {} as Record<Mode, InputInfo>;

export class ModeHandler implements ModeDispatcher {
  private _inputInfo: InputInfo;
  get inputInfo(): InputInfo {
    return this._inputInfo;
  }

  private handlersByMode: Map<Mode, Handler<AnySuggestion>>;
  private handlersByType: Map<SuggestionType, Handler<AnySuggestion>>;
  private handlersByCommand: Map<string, Handler<AnySuggestion>>;
  private lastInput: string;
  private debouncedGetSuggestions: Debouncer<
    [InputInfo, Chooser<AnySuggestion>, SwitcherPlus],
    void
  >;

  sessionOpts: SessionOpts = {};
  noResultActionModes = [Mode.HeadingsList, Mode.WorkspaceList];

  constructor(
    private app: App,
    private settings: SwitcherPlusSettings,
    public exKeymap: SwitcherPlusKeymap,
  ) {
    const handlersByMode = new Map<Mode, Handler<AnySuggestion>>([
      [Mode.SymbolList, new SymbolHandler(app, settings)],
      [Mode.WorkspaceList, new WorkspaceHandler(app, settings)],
      [Mode.HeadingsList, new HeadingsHandler(app, settings)],
      [Mode.EditorList, new EditorHandler(app, settings)],
      [Mode.BookmarksList, new BookmarksHandler(app, settings)],
      [Mode.CommandList, new CommandHandler(app, settings)],
      [Mode.RelatedItemsList, new RelatedItemsHandler(app, settings)],
      [Mode.VaultList, new VaultHandler(app, settings)],
      [Mode.Standard, new StandardExHandler(app, settings)],
    ]);

    this.handlersByMode = handlersByMode;
    this.handlersByType = new Map<SuggestionType, Handler<AnySuggestion>>([
      [SuggestionType.CommandList, handlersByMode.get(Mode.CommandList)],
      [SuggestionType.EditorList, handlersByMode.get(Mode.EditorList)],
      [SuggestionType.HeadingsList, handlersByMode.get(Mode.HeadingsList)],
      [SuggestionType.RelatedItemsList, handlersByMode.get(Mode.RelatedItemsList)],
      [SuggestionType.Bookmark, handlersByMode.get(Mode.BookmarksList)],
      [SuggestionType.SymbolList, handlersByMode.get(Mode.SymbolList)],
      [SuggestionType.WorkspaceList, handlersByMode.get(Mode.WorkspaceList)],
      [SuggestionType.VaultList, handlersByMode.get(Mode.VaultList)],
      [SuggestionType.File, handlersByMode.get(Mode.Standard)],
      [SuggestionType.Alias, handlersByMode.get(Mode.Standard)],
    ]);

    this.handlersByCommand = new Map<string, Handler<AnySuggestion>>([
      [settings.editorListCommand, handlersByMode.get(Mode.EditorList)],
      [settings.workspaceListCommand, handlersByMode.get(Mode.WorkspaceList)],
      [settings.headingsListCommand, handlersByMode.get(Mode.HeadingsList)],
      [settings.bookmarksListCommand, handlersByMode.get(Mode.BookmarksList)],
      [settings.commandListCommand, handlersByMode.get(Mode.CommandList)],
      [settings.symbolListCommand, handlersByMode.get(Mode.SymbolList)],
      [settings.symbolListActiveEditorCommand, handlersByMode.get(Mode.SymbolList)],
      [settings.relatedItemsListCommand, handlersByMode.get(Mode.RelatedItemsList)],
      [settings.vaultListCommand, handlersByMode.get(Mode.VaultList)],
      [
        settings.relatedItemsListActiveEditorCommand,
        handlersByMode.get(Mode.RelatedItemsList),
      ],
    ]);

    this.debouncedGetSuggestions = debounce(
      this.getSuggestions.bind(this),
      settings.headingsSearchDebounceMilli,
      true,
    );

    this.reset();
  }

  onOpen(): void {
    const { exKeymap, settings } = this;
    exKeymap.isOpen = true;

    if (settings.quickFilters?.shouldResetActiveFacets) {
      Object.values(settings.quickFilters.facetList).forEach((f) => (f.isActive = false));
    }
  }

  onClose() {
    this.exKeymap.isOpen = false;
    ComponentManager.unload();
  }

  setSessionOpenMode(
    mode: Mode,
    chooser: Chooser<AnySuggestion>,
    sessionOpts?: SessionOpts,
  ): void {
    this.reset();
    chooser?.setSuggestions([]);

    if (mode !== Mode.Standard) {
      const openModeString = this.getHandler(mode).getCommandString(sessionOpts);
      Object.assign(this.sessionOpts, sessionOpts, { openModeString });
    }

    if (lastInputInfoByMode[mode]) {
      if (
        (mode === Mode.CommandList && this.settings.preserveCommandPaletteLastInput) ||
        (mode !== Mode.CommandList && this.settings.preserveQuickSwitcherLastInput)
      ) {
        const lastInfo = lastInputInfoByMode[mode];
        this.lastInput = lastInfo.inputText;
      }
    }
  }

  insertSessionOpenModeOrLastInputString(inputEl: HTMLInputElement): void {
    const { sessionOpts, lastInput } = this;
    const openModeString = sessionOpts.openModeString ?? null;

    if (lastInput && lastInput !== openModeString) {
      inputEl.value = lastInput;
      // `openModeString` may `null` when in standard mode
      // otherwise `lastInput` starts with `openModeString`
      const startsNumber = openModeString ? openModeString.length : 0;
      inputEl.setSelectionRange(startsNumber, inputEl.value.length);
    } else if (openModeString !== null && openModeString !== '') {
      // update UI with current command string in the case were openInMode was called
      inputEl.value = openModeString;

      // reset to null so user input is not overridden the next time onInput is called
      sessionOpts.openModeString = null;
    }

    // the same logic as `openModeString`
    // make sure it will not override user's normal input.
    this.lastInput = null;
  }

  updateSuggestions(
    query: string,
    chooser: Chooser<AnySuggestion>,
    modal: SwitcherPlus,
  ): boolean {
    const { exKeymap, settings, sessionOpts } = this;
    let handled = false;

    // cancel any potentially previously running debounced getSuggestions call
    this.debouncedGetSuggestions.cancel();

    // get the currently active leaf across all rootSplits
    const activeLeaf = Handler.getActiveLeaf(this.app.workspace);
    const activeSugg = ModeHandler.getActiveSuggestion(chooser);
    const inputInfo = this.determineRunMode(query, activeSugg, activeLeaf, sessionOpts);
    this._inputInfo = inputInfo;

    const { mode } = inputInfo;
    lastInputInfoByMode[mode] = inputInfo;

    this.updatedKeymapForMode(inputInfo, chooser, modal, exKeymap, settings, activeLeaf);
    this.toggleMobileCreateFileButton(modal, mode, settings);

    if (mode !== Mode.Standard) {
      if (mode === Mode.HeadingsList && inputInfo.parsedCommand().parsedInput?.length) {
        // if headings mode and user is typing a query, delay getting suggestions
        this.debouncedGetSuggestions(inputInfo, chooser, modal);
      } else {
        this.getSuggestions(inputInfo, chooser, modal);
      }

      handled = true;
    }

    return handled;
  }

  /**
   * Sets the allowCreateNewFile property of the modal based on config settings and mode
   * @param  {SwitcherPlus} modal
   * @param  {Mode} mode
   * @param  {SwitcherPlusSettings} config
   * @returns void
   */
  toggleMobileCreateFileButton(
    modal: SwitcherPlus,
    mode: Mode,
    config: SwitcherPlusSettings,
  ): void {
    if (!Platform.isMobile) {
      return;
    }

    const modeName = Mode[mode] as keyof typeof Mode;

    modal.allowCreateNewFile = config.allowCreateNewFileInModeNames.includes(modeName);
    if (!modal.allowCreateNewFile) {
      // If file creation is disabled, remove the button from the DOM.
      // Note that when enabled, the core switcher will add automatically add
      // createButtonEl back to the DOM.
      modal.createButtonEl?.detach();
    }
  }

  updatedKeymapForMode(
    inputInfo: InputInfo,
    chooser: Chooser<AnySuggestion>,
    modal: SwitcherPlus,
    exKeymap: SwitcherPlusKeymap,
    settings: SwitcherPlusSettings,
    activeLeaf: WorkspaceLeaf,
  ): void {
    const { mode } = inputInfo;
    const handler = this.getHandler(mode);
    const facetList = handler?.getAvailableFacets(inputInfo) ?? [];

    const handleFacetKeyEvent = (facets: Facet[], isReset: boolean) => {
      if (isReset) {
        // cycle between making all facets active/inactive
        const hasActive = facets.some((v) => v.isActive === true);
        handler.activateFacet(facets, !hasActive);
      } else {
        // expect facets to contain only one item that needs to be toggled
        handler.activateFacet(facets, !facets[0].isActive);
      }

      // refresh the suggestion list after changing the list of active facets
      this.updatedKeymapForMode(
        inputInfo,
        chooser,
        modal,
        exKeymap,
        settings,
        activeLeaf,
      );

      this.getSuggestions(inputInfo, chooser, modal);

      // prevent default handling of key press afterwards
      return false;
    };

    const keymapConfig: KeymapConfig = {
      mode,
      activeLeaf,
      facets: {
        facetList,
        facetSettings: settings.quickFilters,
        onToggleFacet: handleFacetKeyEvent.bind(this),
      },
    };

    exKeymap.updateKeymapForMode(keymapConfig);
  }

  renderSuggestion(sugg: AnySuggestion, parentEl: HTMLElement): boolean {
    const {
      inputInfo,
      settings: { overrideStandardModeRendering },
    } = this;
    const { mode } = inputInfo;
    const isHeadingMode = mode === Mode.HeadingsList;
    let handled = false;
    const systemBehaviorPreferred = new Set<SuggestionType>([SuggestionType.Unresolved]);

    if (sugg === null) {
      if (isHeadingMode) {
        // in Headings mode, a null suggestion should be rendered to allow for note creation
        const headingHandler = this.getHandler(mode);
        const searchText = inputInfo.parsedCommand(mode)?.parsedInput;

        headingHandler.renderFileCreationSuggestion(parentEl, searchText);
        handled = true;
      }
    } else if (!systemBehaviorPreferred.has(sugg.type)) {
      if (overrideStandardModeRendering || isHeadingMode || isExSuggestion(sugg)) {
        // when overriding standard mode, or, in Headings mode, StandardExHandler should
        // handle rendering for FileSuggestion and Alias suggestion
        const handler = this.getHandler(sugg);
        if (handler) {
          handled = handler.renderSuggestion(sugg, parentEl);
        }
      }
    }

    return handled;
  }

  onChooseSuggestion(sugg: AnySuggestion, evt: MouseEvent | KeyboardEvent): boolean {
    const {
      inputInfo,
      settings: { overrideStandardModeBehaviors },
    } = this;
    const { mode } = inputInfo;
    const isHeadingMode = mode === Mode.HeadingsList;
    let handled = false;
    const systemBehaviorPreferred = new Set<SuggestionType>([SuggestionType.Unresolved]);

    if (sugg === null) {
      if (this.noResultActionModes.includes(mode)) {
        // In these modes, a null suggestion indicates that
        // the <enter to create> UI action was chosen
        const handler = this.getHandler(mode);
        handled = !!handler?.onNoResultsCreateAction(inputInfo, evt);
      }
    } else if (!systemBehaviorPreferred.has(sugg.type)) {
      if (overrideStandardModeBehaviors || isHeadingMode || isExSuggestion(sugg)) {
        // when overriding standard mode, or, in Headings mode, StandardExHandler should
        // handle the onChoose action for File and Alias suggestion so that
        // the preferOpenInNewPane setting can be handled properly
        const handler = this.getHandler(sugg);
        if (handler) {
          handled = handler.onChooseSuggestion(sugg, evt);
        }
      }
    }

    return handled;
  }

  determineRunMode(
    query: string,
    activeSugg: AnySuggestion,
    activeLeaf: WorkspaceLeaf,
    sessionOpts?: SessionOpts,
  ): InputInfo {
    const input = query ?? '';
    const info = new InputInfo(input, Mode.Standard, sessionOpts);
    this.addWorkspaceEnvLists(info);

    if (input.length === 0) {
      this.reset();
    }

    this.validatePrefixCommands(info, activeSugg, activeLeaf, this.settings);

    return info;
  }

  getSuggestions(
    inputInfo: InputInfo,
    chooser: Chooser<AnySuggestion>,
    modal: SwitcherPlus,
  ): void {
    chooser.setSuggestions([]);

    const { mode } = inputInfo;
    const suggestions = this.getHandler(mode).getSuggestions(inputInfo);

    const setSuggestions = (suggs: AnySuggestion[]) => {
      if (suggs?.length) {
        chooser.setSuggestions(suggs);
        ModeHandler.setActiveSuggestion(mode, chooser);
        this.exKeymap?.renderQuickOpenFlairIcons(chooser.suggestions, this.settings);
      } else {
        if (
          this.noResultActionModes.includes(mode) &&
          inputInfo.parsedCommand(mode).parsedInput
        ) {
          modal.onNoSuggestion();
        } else {
          chooser.setSuggestions(null);
        }
      }
    };

    if (Array.isArray(suggestions)) {
      setSuggestions(suggestions);
    } else {
      suggestions.then(
        (values) => {
          setSuggestions(values);
        },
        (reason) => {
          console.log('Switcher++: error retrieving suggestions as Promise. ', reason);
        },
      );
    }
  }

  /**
   * Searches inputInfo, if cmdStr is found with a preceding escapeChar, then
   * escapeCmdChar is stripped out. The result string is saved to .inputTextSansEscapeChar
   *
   * @param {InputInfo} inputInfo
   * @param {string} escapeCmdChar
   * @param {string} cmdStr
   * @returns {string} InputText with escapeCmdChar stripped out
   */
  removeEscapeCommandCharFromInput(
    inputInfo: InputInfo,
    escapeCmdChar: string,
    cmdStr: string,
  ): string {
    const sansEscapeInput = inputInfo.inputTextSansEscapeChar.replace(
      new RegExp(`(?:${escapeRegExp(escapeCmdChar)})(?:${escapeRegExp(cmdStr)})`),
      cmdStr,
    );

    inputInfo.inputTextSansEscapeChar = sansEscapeInput;
    return sansEscapeInput;
  }

  validatePrefixCommands(
    inputInfo: InputInfo,
    activeSugg: AnySuggestion,
    activeLeaf: WorkspaceLeaf,
    config: SwitcherPlusSettings,
  ): void {
    let cmdStr: string = null;
    let handler: Handler<AnySuggestion> = null;

    const activeEditorCmds = [
      config.symbolListActiveEditorCommand,
      config.relatedItemsListActiveEditorCommand,
    ];

    const prefixCmds = [
      config.editorListCommand,
      config.workspaceListCommand,
      config.headingsListCommand,
      config.bookmarksListCommand,
      config.commandListCommand,
      config.vaultListCommand,
    ]
      .concat(activeEditorCmds)
      .map((v) => `(?:${escapeRegExp(v)})`)
      // account for potential overlapping command strings
      .sort((a, b) => b.length - a.length);

    // regex that matches any of the prefix commands
    const match = new RegExp(
      `^((?:${escapeRegExp(config.escapeCmdChar)})?)(${prefixCmds.join('|')})`,
    ).exec(inputInfo.inputText);

    if (match) {
      const containsNegation = !!match[1].length;
      cmdStr = match[2];

      if (containsNegation) {
        this.removeEscapeCommandCharFromInput(inputInfo, config.escapeCmdChar, cmdStr);
        cmdStr = null;
      } else {
        handler = this.getHandler(cmdStr);
      }
    }

    const isValidated = this.validateSourcedCommands(
      inputInfo,
      cmdStr,
      activeSugg,
      activeLeaf,
      config,
    );

    if (!isValidated && handler) {
      inputInfo.sessionOpts.useActiveEditorAsSource = activeEditorCmds.includes(cmdStr);

      const filterText = inputInfo.inputTextSansEscapeChar.slice(cmdStr.length);
      handler.validateCommand(inputInfo, match.index, filterText, activeSugg, activeLeaf);
    }
  }

  validateSourcedCommands(
    inputInfo: InputInfo,
    parsedPrefixCmd: string,
    activeSugg: AnySuggestion,
    activeLeaf: WorkspaceLeaf,
    config: SwitcherPlusSettings,
  ): boolean {
    let isValidated = false;
    const unmatchedHandlers: Handler<AnySuggestion>[] = [];
    const searchText = inputInfo.inputTextSansEscapeChar;

    // Headings, Bookmarks, and EditorList mode can have an embedded command
    const supportedModes = [
      config.editorListCommand,
      config.headingsListCommand,
      config.bookmarksListCommand,
    ];

    // A falsy parsedPrefixCmd indicates Standard mode since no prefix command was matched
    if (!parsedPrefixCmd || supportedModes.includes(parsedPrefixCmd)) {
      let match: RegExpExecArray = null;

      const sourcedCmds = [config.symbolListCommand, config.relatedItemsListCommand]
        .map((v) => `(?:${escapeRegExp(v)})`)
        .sort((a, b) => b.length - a.length);

      const re = new RegExp(
        `((?:${escapeRegExp(config.escapeCmdChar)})?)(${sourcedCmds.join('|')})`,
        'g',
      );

      while ((match = re.exec(searchText)) !== null) {
        const containsNegation = !!match[1].length;
        const cmdStr = match[2];

        if (containsNegation) {
          this.removeEscapeCommandCharFromInput(inputInfo, config.escapeCmdChar, cmdStr);
        } else {
          const filterText = searchText.slice(re.lastIndex);
          const handler = this.getHandler(cmdStr);

          if (handler) {
            const cmd = handler.validateCommand(
              inputInfo,
              match.index,
              filterText,
              activeSugg,
              activeLeaf,
            );

            isValidated = !!cmd?.isValidated;

            // Find all sourced handlers that did not match
            const unmatched = this.getSourcedHandlers().filter((v) => v !== handler);
            unmatchedHandlers.push(...unmatched);
          }

          break;
        }
      }
    }

    // if unmatchedHandlers has items then there was a match, so reset all others
    // otherwise reset all sourced handlers
    this.resetSourcedHandlers(unmatchedHandlers.length ? unmatchedHandlers : null);
    return isValidated;
  }

  private static setActiveSuggestion(mode: Mode, chooser: Chooser<AnySuggestion>): void {
    // only symbol mode currently sets an active selection
    if (mode === Mode.SymbolList) {
      const index = chooser.values
        .filter((v): v is SymbolSuggestion => isSymbolSuggestion(v))
        .findIndex((v) => v.item.isSelected);

      if (index !== -1) {
        chooser.setSelectedItem(index, null);
        chooser.suggestions[chooser.selectedItem].scrollIntoView(false);
      }
    }
  }

  static getActiveSuggestion(chooser: Chooser<AnySuggestion>): AnySuggestion {
    let activeSuggestion: AnySuggestion = null;

    if (chooser?.values) {
      activeSuggestion = chooser.values[chooser.selectedItem];
    }

    return activeSuggestion;
  }

  reset(): void {
    this._inputInfo = new InputInfo();
    this.sessionOpts = {};
    this.resetSourcedHandlers();
  }

  resetSourcedHandlers(handlers?: Handler<AnySuggestion>[]): void {
    handlers = handlers ?? this.getSourcedHandlers();
    handlers.forEach((handler) => handler?.reset());
  }

  getSourcedHandlers(): Handler<AnySuggestion>[] {
    return getSourcedModes().map((v) => this.getHandler(v));
  }

  addWorkspaceEnvLists(inputInfo: InputInfo): InputInfo {
    if (inputInfo) {
      const openEditors = (this.getHandler(Mode.EditorList) as EditorHandler).getItems();

      // Create a Set containing the files from all the open editors
      const openEditorFilesSet = openEditors
        .map((leaf) => getTFileFromLeaf(leaf))
        .filter((file) => !!file)
        .reduce((collection, file) => collection.add(file), new Set<TFile>());

      // Get the list of bookmarks split into file bookmarks and non-file bookmarks
      const { fileBookmarks, nonFileBookmarks } = (
        this.getHandler(Mode.BookmarksList) as BookmarksHandler
      ).getItems(null);

      const lists = inputInfo.currentWorkspaceEnvList;
      lists.openWorkspaceLeaves = new Set(openEditors);
      lists.openWorkspaceFiles = openEditorFilesSet;
      lists.fileBookmarks = fileBookmarks;
      lists.nonFileBookmarks = nonFileBookmarks;

      lists.attachmentFileExtensions = this.getAttachmentFileExtensions(
        this.app.viewRegistry,
        this.settings.fileExtAllowList,
      );

      // Get the list of recently closed files excluding the currently open ones
      const maxCount =
        openEditorFilesSet.size + this.settings.maxRecentFileSuggestionsOnInit;
      lists.mostRecentFiles = this.getRecentFiles(openEditorFilesSet, maxCount);
    }

    return inputInfo;
  }

  getAttachmentFileExtensions(
    viewRegistry: ViewRegistry,
    exemptFileExtensions: string[],
  ): Set<string> {
    const extList = new Set<string>();

    try {
      const coreExts = new Set<string>(['md', 'canvas', ...exemptFileExtensions]);

      // Add the list of registered extensions to extList, excluding the markdown and canvas
      Object.keys(viewRegistry.typeByExtension).reduce((collection, ext) => {
        if (!coreExts.has(ext)) {
          collection.add(ext);
        }

        return collection;
      }, extList);
    } catch (err) {
      console.log('Switcher++: error retrieving attachment list from ViewRegistry', err);
    }

    return extList;
  }

  getRecentFiles(ignoreFiles: Set<TFile>, maxCount = 75): Set<TFile> {
    ignoreFiles = ignoreFiles ?? new Set<TFile>();
    const recentFiles = new Set<TFile>();

    if (maxCount > 0) {
      const { workspace, vault } = this.app;
      const recentFilePaths = workspace.getRecentFiles({
        showMarkdown: true,
        showCanvas: true,
        showNonImageAttachments: true,
        showImages: true,
        maxCount,
      });

      recentFilePaths?.forEach((path) => {
        const file = vault.getAbstractFileByPath(path);

        if (isTFile(file) && !ignoreFiles.has(file)) {
          recentFiles.add(file);
        }
      });
    }

    return recentFiles;
  }

  inputTextForStandardMode(input: string): string {
    const { mode, inputTextSansEscapeChar } = this.inputInfo;
    let searchText = input;

    if (mode === Mode.Standard && inputTextSansEscapeChar?.length) {
      searchText = inputTextSansEscapeChar;
    }

    return searchText;
  }

  inputTextForFulltextSearch(): {
    mode: Mode;
    parsedInput: string;
    file?: TFile;
  } {
    const { inputInfo } = this;
    const mode = inputInfo.mode;
    let file: TFile = null;

    // .inputTextSansEscapeChar holds a version of inputText that is
    // suitable for Standard mode. This covers the case when the mode is Standard
    //  and inputText is needed for global search.
    let parsedInput = inputInfo.inputTextSansEscapeChar;

    if (mode !== Mode.Standard) {
      // Custom modes contain the filtered text that can be retrieved directly
      // from the ParsedCommand.
      const cmd = inputInfo.parsedCommand();
      parsedInput = cmd.parsedInput;

      if (getSourcedModes().includes(mode)) {
        file = (cmd as SourcedParsedCommand).source?.file;
      }
    }

    return { mode, parsedInput, file };
  }

  addPropertiesToStandardSuggestions(
    suggestions: AnySuggestion[],
    options: {
      overrideStandardModeBehaviors: boolean;
      overrideStandardModeRendering: boolean;
    },
  ): void {
    if (
      !suggestions ||
      !(options.overrideStandardModeBehaviors || options.overrideStandardModeRendering)
    ) {
      return;
    }

    const { currentWorkspaceEnvList } = this.inputInfo;
    for (let i = 0; i < suggestions.length; i++) {
      const sugg = suggestions[i];

      if (isBookmarksSuggestion(sugg)) {
        const handler = this.getHandler(Mode.BookmarksList) as BookmarksHandler;
        handler.addPropertiesToStandardSuggestions(currentWorkspaceEnvList, sugg);
      } else if (isFileSuggestion(sugg) || isAliasSuggestion(sugg)) {
        const handler = this.getHandler(Mode.Standard) as StandardExHandler;
        handler.addPropertiesToStandardSuggestions(currentWorkspaceEnvList, sugg);
      }
    }
  }

  /**
   * Gets the file associated with sugg and generates the ViewState to open it.
   *
   * @param {AnySuggestion} sugg
   * @param {PaneType} paneType
   * @param {SplitDirection} splitDirection
   */
  openSuggestionInBackground(
    sugg: AnySuggestion,
    paneType: PaneType,
    splitDirection: SplitDirection,
  ): void {
    const destFile = getDestinationFileForSuggestion(sugg);
    if (!destFile) {
      console.log(
        `Switcher++: error cannot open in background. The selected suggestion object does not seem to have an associated file. Suggestion obj: `,
        sugg,
      );
      return;
    }

    const openState = this.getHandler(sugg)?.getOpenViewState(sugg, {
      active: false,
      focus: false,
    });

    Handler.openFileInLeaf(
      destFile,
      paneType,
      this.app.workspace,
      openState,
      splitDirection,
    ).catch((reason) => {
      console.log(
        `Switcher++: error opening file (${destFile?.path}) in background. `,
        reason,
      );
    });
  }

  private getHandler(kind: Mode | AnySuggestion | string): Handler<AnySuggestion> {
    let handler: Handler<AnySuggestion>;
    const { handlersByMode, handlersByType, handlersByCommand } = this;

    if (typeof kind === 'number') {
      handler = handlersByMode.get(kind);
    } else if (isOfType<AnySuggestion>(kind, 'type')) {
      handler = handlersByType.get(kind.type);
    } else if (typeof kind === 'string') {
      handler = handlersByCommand.get(kind);
    }

    return handler;
  }
}
