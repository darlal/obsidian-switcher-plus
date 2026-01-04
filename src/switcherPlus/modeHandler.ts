import { SwitcherPlusKeymap } from './switcherPlusKeymap';
import { InputInfo, SourcedParsedCommand, WorkspaceEnvList } from './inputInfo';
import { SwitcherPlusSettings } from 'src/settings';
import { getCommandDefinitions } from './commandDefinitions';
import { HandlerRegistry } from './handlerRegistry';
import { InputParser } from './inputParser';
import {
  Handler,
  EditorHandler,
  BookmarksHandler,
  StandardExHandler,
} from 'src/Handlers';
import {
  isSymbolSuggestion,
  isExSuggestion,
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
  Workspace,
  Vault,
} from 'obsidian';

const previousInputInfoByMode = {} as Record<Mode, InputInfo>;

export class ModeHandler implements ModeDispatcher {
  private _inputInfo: InputInfo;
  get inputInfo(): InputInfo {
    return this._inputInfo;
  }

  get previousInputHistory(): Record<Mode, InputInfo> {
    return previousInputInfoByMode;
  }

  private _handlerRegistry: HandlerRegistry;
  public get handlerRegistry(): HandlerRegistry {
    return this._handlerRegistry;
  }

  private _inputParser: InputParser;
  public get inputParser(): InputParser {
    return this._inputParser;
  }

  private debouncedGetSuggestions: Debouncer<
    [InputInfo, Chooser<AnySuggestion>, SwitcherPlus],
    void
  >;

  private workspaceEnvList: WorkspaceEnvList = null;

  sessionOpts: SessionOpts = {};
  noResultActionModes = [Mode.HeadingsList, Mode.WorkspaceList];

  constructor(
    private app: App,
    private settings: SwitcherPlusSettings,
    public exKeymap: SwitcherPlusKeymap,
  ) {
    const commandDefinitions = getCommandDefinitions(settings);

    if (!HandlerRegistry.getInstance()) {
      HandlerRegistry.initialize(app, settings, commandDefinitions);
    }

    this._handlerRegistry = HandlerRegistry.getInstance();
    this._inputParser = new InputParser(
      this._handlerRegistry,
      settings,
      commandDefinitions,
    );

    this.debouncedGetSuggestions = debounce(
      this.getSuggestions.bind(this),
      settings.headingsSearchDebounceMilli,
      true,
    );

    this.reset();
  }

  onOpen(): void {
    const { app, exKeymap, handlerRegistry, settings } = this;
    exKeymap.isOpen = true;

    if (settings.quickFilters?.shouldResetActiveFacets) {
      Object.values(settings.quickFilters.facetList).forEach((f) => (f.isActive = false));
    }

    this.workspaceEnvList = this.buildWorkspaceEnvList(
      app.workspace,
      app.vault,
      app.viewRegistry,
      handlerRegistry,
      settings,
    );
  }

  onClose() {
    this.exKeymap.isOpen = false;
    ComponentManager.unload();
  }

  setSessionOpenMode(chooser: Chooser<AnySuggestion>, sessionOpts: SessionOpts): void {
    this.reset();
    chooser?.setSuggestions([]);
    this.sessionOpts = Object.assign({}, sessionOpts);
  }

  setInitialInputForSession(inputEl: HTMLInputElement): void {
    const { mode } = this.sessionOpts;
    if (!mode) {
      return;
    }

    // This method should only run once per session opening.
    this.sessionOpts.mode = null;

    // Extract only the parsedInput (filter text) from the previous session, not the full inputText.
    // This ensures that when restoring input for sourced modes (Symbol/RelatedItems), we correctly
    // use the current session's command variant (e.g., active editor vs embedded command) rather
    // than restoring the previous session's full input which may have used a different command variant.
    const prevParsedInput =
      this.previousInputHistory[mode]?.parsedCommand(mode)?.parsedInput;
    const handler = this.handlerRegistry.getHandler(mode);
    const commandString =
      mode !== Mode.Standard ? handler.getCommandString(this.sessionOpts) : '';

    const shouldPreserveInput =
      (mode === Mode.CommandList && this.settings.preserveCommandPaletteLastInput) ||
      (mode !== Mode.CommandList && this.settings.preserveQuickSwitcherLastInput);

    if (shouldPreserveInput && prevParsedInput !== undefined) {
      // Reconstruct the input by combining the current session's command string with the previous filter text.
      // This ensures the restored input uses the correct command variant for the current session.
      inputEl.value = commandString + prevParsedInput;
      const selectionStart = commandString?.length ?? 0;
      inputEl.setSelectionRange(selectionStart, inputEl.value.length);
    } else if (commandString) {
      inputEl.value = commandString;
    }
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
    this.previousInputHistory[mode] = inputInfo;

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
    const handler = this.handlerRegistry.getHandler(mode);
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
      handlerRegistry,
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
        const headingHandler = handlerRegistry.getHandler(mode);
        const searchText = inputInfo.parsedCommand(mode)?.parsedInput;

        headingHandler.renderFileCreationSuggestion(parentEl, searchText);
        handled = true;
      }
    } else if (!systemBehaviorPreferred.has(sugg.type)) {
      if (overrideStandardModeRendering || isHeadingMode || isExSuggestion(sugg)) {
        // when overriding standard mode, or, in Headings mode, StandardExHandler should
        // handle rendering for FileSuggestion and Alias suggestion
        const handler = handlerRegistry.getHandler(sugg);
        if (handler) {
          handled = handler.renderSuggestion(sugg, parentEl);
        }
      }
    }

    return handled;
  }

  onChooseSuggestion(sugg: AnySuggestion, evt: MouseEvent | KeyboardEvent): boolean {
    const {
      handlerRegistry,
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
        const handler = handlerRegistry.getHandler(mode);
        handled = !!handler?.onNoResultsCreateAction(inputInfo, evt);
      }
    } else if (!systemBehaviorPreferred.has(sugg.type)) {
      if (overrideStandardModeBehaviors || isHeadingMode || isExSuggestion(sugg)) {
        // when overriding standard mode, or, in Headings mode, StandardExHandler should
        // handle the onChoose action for File and Alias suggestion so that
        // the preferOpenInNewPane setting can be handled properly
        const handler = handlerRegistry.getHandler(sugg);
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

    if (input.length === 0) {
      this.reset();
      return info;
    }

    info.currentWorkspaceEnvList = this.workspaceEnvList;
    this.inputParser.parseInputForMode(info, activeSugg, activeLeaf);

    return info;
  }

  getSuggestions(
    inputInfo: InputInfo,
    chooser: Chooser<AnySuggestion>,
    modal: SwitcherPlus,
  ): void {
    chooser.setSuggestions([]);

    const { mode } = inputInfo;
    const suggestions = this.handlerRegistry.getHandler(mode).getSuggestions(inputInfo);

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
    this.handlerRegistry.resetSourcedHandlers();
  }

  buildWorkspaceEnvList(
    workspace: Workspace,
    vault: Vault,
    viewRegistry: ViewRegistry,
    handlerRegistry: HandlerRegistry,
    config: SwitcherPlusSettings,
  ): WorkspaceEnvList {
    const openEditors = (
      handlerRegistry.getHandler(Mode.EditorList) as EditorHandler
    ).getItems();

    // Create a Set containing the files from all the open editors
    const openEditorFilesSet = openEditors.reduce((collection, leaf) => {
      const file = getTFileFromLeaf(leaf);
      if (file) {
        collection.add(file);
      }
      return collection;
    }, new Set<TFile>());

    // Get the list of bookmarks split into file bookmarks and non-file bookmarks
    const { fileBookmarks, nonFileBookmarks } = (
      handlerRegistry.getHandler(Mode.BookmarksList) as BookmarksHandler
    ).getItems(null);

    const attachmentFileExtensions = this.getAttachmentFileExtensions(
      viewRegistry,
      config.fileExtAllowList,
    );

    // Get the list of recently closed files excluding the currently open ones
    const maxCount = openEditorFilesSet.size + config.maxRecentFileSuggestionsOnInit;
    const mostRecentFiles = this.getRecentFiles(
      workspace,
      vault,
      openEditorFilesSet,
      maxCount,
    );

    return {
      openWorkspaceLeaves: new Set(openEditors),
      openWorkspaceFiles: openEditorFilesSet,
      fileBookmarks,
      nonFileBookmarks,
      attachmentFileExtensions,
      mostRecentFiles,
    };
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

  getRecentFiles(
    workspace: Workspace,
    vault: Vault,
    ignoreFiles: Set<TFile>,
    maxCount = 75,
  ): Set<TFile> {
    ignoreFiles = ignoreFiles ?? new Set<TFile>();
    const recentFiles = new Set<TFile>();

    if (maxCount > 0) {
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
    const { mode, cleanInput } = this.inputInfo;
    let searchText = input;

    if (mode === Mode.Standard && cleanInput?.length) {
      searchText = cleanInput;
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

    // .cleanInput holds a version of inputText that is
    // suitable for Standard mode. This covers the case when the mode is Standard
    //  and inputText is needed for global search.
    let parsedInput = inputInfo.cleanInput;

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

    const {
      handlerRegistry,
      inputInfo: { currentWorkspaceEnvList },
    } = this;

    for (let i = 0; i < suggestions.length; i++) {
      const sugg = suggestions[i];

      if (isBookmarksSuggestion(sugg)) {
        const handler = handlerRegistry.getHandler(
          Mode.BookmarksList,
        ) as BookmarksHandler;
        handler.addPropertiesToStandardSuggestions(currentWorkspaceEnvList, sugg);
      } else if (isFileSuggestion(sugg) || isAliasSuggestion(sugg)) {
        const handler = handlerRegistry.getHandler(Mode.Standard) as StandardExHandler;
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

    const openState = this.handlerRegistry.getHandler(sugg)?.getOpenViewState(sugg, {
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
}
