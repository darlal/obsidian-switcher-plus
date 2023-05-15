import {
  Handler,
  WorkspaceHandler,
  HeadingsHandler,
  EditorHandler,
  RelatedItemsHandler,
  SymbolHandler,
  BookmarksHandler,
  CommandHandler,
  StandardExHandler,
  SupportedSystemSuggestions,
} from 'src/Handlers';
import {
  isSymbolSuggestion,
  escapeRegExp,
  isExSuggestion,
  isOfType,
  isTFile,
} from 'src/utils';
import {
  Mode,
  AnySuggestion,
  SymbolSuggestion,
  SuggestionType,
  SwitcherPlus,
  Facet,
  KeymapConfig,
} from 'src/types';
import { InputInfo } from './inputInfo';
import { SwitcherPlusSettings } from 'src/settings';
import { WorkspaceLeaf, App, Chooser, Debouncer, debounce, TFile } from 'obsidian';
import { SwitcherPlusKeymap } from './switcherPlusKeymap';

const lastInputInfoByMode = {} as Record<Mode, InputInfo>;

export class ModeHandler {
  private inputInfo: InputInfo;
  private handlersByMode: Map<Omit<Mode, 'Standard'>, Handler<AnySuggestion>>;
  private handlersByType: Map<SuggestionType, Handler<AnySuggestion>>;
  private sessionOpenModeString: string;
  private lastInput: string;
  private debouncedGetSuggestions: Debouncer<
    [InputInfo, Chooser<AnySuggestion>, SwitcherPlus],
    void
  >;

  constructor(
    private app: App,
    private settings: SwitcherPlusSettings,
    public exKeymap: SwitcherPlusKeymap,
  ) {
    // StandardExHandler one is special in that it is not a "full" handler,
    // and not attached to a mode, as a result it is not in the handlersByMode list
    const standardExHandler = new StandardExHandler(app, settings);
    const handlersByMode = new Map<Omit<Mode, 'Standard'>, Handler<AnySuggestion>>([
      [Mode.SymbolList, new SymbolHandler(app, settings)],
      [Mode.WorkspaceList, new WorkspaceHandler(app, settings)],
      [Mode.HeadingsList, new HeadingsHandler(app, settings)],
      [Mode.EditorList, new EditorHandler(app, settings)],
      [Mode.BookmarksList, new BookmarksHandler(app, settings)],
      [Mode.CommandList, new CommandHandler(app, settings)],
      [Mode.RelatedItemsList, new RelatedItemsHandler(app, settings)],
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
      [SuggestionType.File, standardExHandler],
      [SuggestionType.Alias, standardExHandler],
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
      settings.quickFilters.facetList?.forEach((f) => (f.isActive = false));
    }
  }

  onClose() {
    this.exKeymap.isOpen = false;
  }

  setSessionOpenMode(mode: Mode, chooser: Chooser<AnySuggestion>): void {
    this.reset();
    chooser?.setSuggestions([]);

    if (mode !== Mode.Standard) {
      this.sessionOpenModeString = this.getHandler(mode).getCommandString();
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
    const { sessionOpenModeString, lastInput } = this;
    if (lastInput && lastInput !== sessionOpenModeString) {
      inputEl.value = lastInput;
      // `sessionOpenModeString` may `null` when in standard mode
      // otherwise `lastInput` starts with `sessionOpenModeString`
      const startsNumber = sessionOpenModeString ? sessionOpenModeString.length : 0;
      inputEl.setSelectionRange(startsNumber, inputEl.value.length);
    } else if (sessionOpenModeString !== null && sessionOpenModeString !== '') {
      // update UI with current command string in the case were openInMode was called
      inputEl.value = sessionOpenModeString;

      // reset to null so user input is not overridden the next time onInput is called
      this.sessionOpenModeString = null;
    }

    // the same logic as `sessionOpenModeString`
    // make sure it will not override user's normal input.
    this.lastInput = null;
  }

  updateSuggestions(
    query: string,
    chooser: Chooser<AnySuggestion>,
    modal: SwitcherPlus,
  ): boolean {
    const { exKeymap, settings } = this;
    let handled = false;

    // cancel any potentially previously running debounced getSuggestions call
    this.debouncedGetSuggestions.cancel();

    // get the currently active leaf across all rootSplits
    const activeLeaf = Handler.getActiveLeaf(this.app.workspace);
    const activeSugg = ModeHandler.getActiveSuggestion(chooser);
    const inputInfo = this.determineRunMode(query, activeSugg, activeLeaf);
    this.inputInfo = inputInfo;

    const { mode } = inputInfo;
    lastInputInfoByMode[mode] = inputInfo;

    this.updatedKeymapForMode(inputInfo, chooser, modal, exKeymap, settings);

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

  updatedKeymapForMode(
    inputInfo: InputInfo,
    chooser: Chooser<AnySuggestion>,
    modal: SwitcherPlus,
    exKeymap: SwitcherPlusKeymap,
    settings: SwitcherPlusSettings,
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
      this.updatedKeymapForMode(inputInfo, chooser, modal, exKeymap, settings);
      this.getSuggestions(inputInfo, chooser, modal);

      // prevent default handling of key press afterwards
      return false;
    };

    const keymapConfig: KeymapConfig = {
      mode,
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
      settings: { overrideStandardModeBehaviors },
    } = this;
    const { mode } = inputInfo;
    const isHeadingMode = mode === Mode.HeadingsList;
    let handled = false;
    const systemBehaviorPreferred = new Set<SuggestionType>([
      SuggestionType.Unresolved,
      SuggestionType.Bookmark,
    ]);

    if (sugg === null) {
      if (isHeadingMode) {
        // in Headings mode, a null suggestion should be rendered to allow for note creation
        const headingHandler = this.getHandler(mode);
        const searchText = inputInfo.parsedCommand(mode)?.parsedInput;

        headingHandler.renderFileCreationSuggestion(parentEl, searchText);
        handled = true;
      }
    } else if (!systemBehaviorPreferred.has(sugg.type)) {
      if (overrideStandardModeBehaviors || isHeadingMode || isExSuggestion(sugg)) {
        // when overriding standard mode, or, in Headings mode, StandardExHandler should
        // handle rendering for FileSuggestion and Alias suggestion
        const handler = this.getHandler(sugg);

        if (handler) {
          if (mode === Mode.Standard) {
            // suggestions in standard mode are created by core Obsidian and are
            // missing some properties, try to add them
            (handler as StandardExHandler).addPropertiesToStandardSuggestions(
              inputInfo,
              sugg as SupportedSystemSuggestions,
            );
          }

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
    const systemBehaviorPreferred = new Set<SuggestionType>([
      SuggestionType.Unresolved,
      SuggestionType.Bookmark,
    ]);

    if (sugg === null) {
      if (isHeadingMode) {
        // in Headings mode, a null suggestion should create a new note
        const headingHandler = this.getHandler(mode);
        const filename = inputInfo.parsedCommand(mode)?.parsedInput;

        headingHandler.createFile(filename, evt);
        handled = true;
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
  ): InputInfo {
    const input = query ?? '';
    const info = this.addWorkspaceEnvLists(new InputInfo(input));

    if (input.length === 0) {
      this.reset();
    }

    this.validatePrefixCommands(info, activeSugg, activeLeaf);
    this.validateSourcedCommands(info, activeSugg, activeLeaf);

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
      } else {
        if (mode === Mode.HeadingsList && inputInfo.parsedCommand(mode).parsedInput) {
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

  private validatePrefixCommands(
    inputInfo: InputInfo,
    activeSugg: AnySuggestion,
    activeLeaf: WorkspaceLeaf,
  ): void {
    const { settings } = this;
    const prefixCmds = [
      settings.editorListCommand,
      settings.workspaceListCommand,
      settings.headingsListCommand,
      settings.bookmarksListCommand,
      settings.commandListCommand,
    ]
      .map((v) => `(${escapeRegExp(v)})`)
      // account for potential overlapping command strings
      .sort((a, b) => b.length - a.length);

    // regex that matches any of the prefix commands, and extract filter text
    const match = new RegExp(`^(${prefixCmds.join('|')})(.*)$`).exec(inputInfo.inputText);

    if (match) {
      const cmdStr = match[1];
      const filterText = match[match.length - 1];
      const handler = this.getHandler(cmdStr);

      if (handler) {
        handler.validateCommand(
          inputInfo,
          match.index,
          filterText,
          activeSugg,
          activeLeaf,
        );
      }
    }
  }

  private validateSourcedCommands(
    inputInfo: InputInfo,
    activeSugg: AnySuggestion,
    activeLeaf: WorkspaceLeaf,
  ): void {
    const { mode, inputText } = inputInfo;
    const unmatchedHandlers: Handler<AnySuggestion>[] = [];

    // Standard, Headings, Bookmarks, and EditorList mode can have an embedded command
    const supportedModes = [
      Mode.Standard,
      Mode.EditorList,
      Mode.HeadingsList,
      Mode.BookmarksList,
    ];

    if (supportedModes.includes(mode)) {
      const { settings } = this;
      const embeddedCmds = [settings.symbolListCommand, settings.relatedItemsListCommand]
        .map((v) => `(${escapeRegExp(v)})`)
        .sort((a, b) => b.length - a.length);

      // regex that matches any sourced command, and extract filter text
      const match = new RegExp(`(${embeddedCmds.join('|')})(.*)$`).exec(inputText);

      if (match) {
        const cmdStr = match[1];
        const filterText = match[match.length - 1];
        const handler = this.getHandler(cmdStr);

        if (handler) {
          handler.validateCommand(
            inputInfo,
            match.index,
            filterText,
            activeSugg,
            activeLeaf,
          );
        }

        // find all sourced handlers that did not match
        unmatchedHandlers.push(...this.getSourcedHandlers().filter((v) => v != handler));
      }
    }

    // if unmatchedHandlers has items then there was a match, so reset all others
    // otherwise reset all sourced handlers
    this.resetSourcedHandlers(unmatchedHandlers.length ? unmatchedHandlers : null);
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

  private static getActiveSuggestion(chooser: Chooser<AnySuggestion>): AnySuggestion {
    let activeSuggestion: AnySuggestion = null;

    if (chooser?.values) {
      activeSuggestion = chooser.values[chooser.selectedItem];
    }

    return activeSuggestion;
  }

  reset(): void {
    this.inputInfo = new InputInfo();
    this.sessionOpenModeString = null;
    this.resetSourcedHandlers();
  }

  resetSourcedHandlers(handlers?: Handler<AnySuggestion>[]): void {
    handlers = handlers ?? this.getSourcedHandlers();
    handlers.forEach((handler) => handler?.reset());
  }

  getSourcedHandlers(): Handler<AnySuggestion>[] {
    const sourcedModes = [Mode.RelatedItemsList, Mode.SymbolList];
    return sourcedModes.map((v) => this.getHandler(v));
  }

  addWorkspaceEnvLists(inputInfo: InputInfo): InputInfo {
    if (inputInfo) {
      const openEditors = (this.getHandler(Mode.EditorList) as EditorHandler).getItems();
      const openEditorFiles = openEditors.map((v) => v?.view?.file);
      const bookmarkedFiles = (this.getHandler(Mode.BookmarksList) as BookmarksHandler)
        .getItems(null)
        .filter((v) => BookmarksHandler.isBookmarksPluginFileItem(v.item) && v.file)
        .map((v) => v.file);

      const lists = inputInfo.currentWorkspaceEnvList;
      lists.openWorkspaceLeaves = new Set(openEditors);
      lists.openWorkspaceFiles = new Set(openEditorFiles);
      lists.bookmarkedFiles = new Set(bookmarkedFiles);
      lists.mostRecentFiles = this.getRecentFiles(new Set(openEditorFiles));
    }

    return inputInfo;
  }

  getRecentFiles(ignoreFiles: Set<TFile>): Set<TFile> {
    const recentFiles = new Set<TFile>();
    const { workspace, vault } = this.app;
    const recentFilePaths = workspace.getLastOpenFiles();
    ignoreFiles = ignoreFiles ?? new Set<TFile>();

    recentFilePaths?.forEach((path) => {
      const file = vault.getAbstractFileByPath(path);

      if (isTFile(file) && !ignoreFiles.has(file)) {
        recentFiles.add(file);
      }
    });

    return recentFiles;
  }

  private getHandler(
    kind: Omit<Mode, 'Standard'> | AnySuggestion | string,
  ): Handler<AnySuggestion> {
    let handler: Handler<AnySuggestion>;
    const { handlersByMode, handlersByType } = this;

    if (typeof kind === 'number') {
      handler = handlersByMode.get(kind);
    } else if (isOfType<AnySuggestion>(kind, 'type')) {
      handler = handlersByType.get(kind.type);
    } else if (typeof kind === 'string') {
      const { settings } = this;
      const handlersByCommand = new Map<string, Handler<AnySuggestion>>([
        [settings.editorListCommand, handlersByMode.get(Mode.EditorList)],
        [settings.workspaceListCommand, handlersByMode.get(Mode.WorkspaceList)],
        [settings.headingsListCommand, handlersByMode.get(Mode.HeadingsList)],
        [settings.bookmarksListCommand, handlersByMode.get(Mode.BookmarksList)],
        [settings.commandListCommand, handlersByMode.get(Mode.CommandList)],
        [settings.symbolListCommand, handlersByMode.get(Mode.SymbolList)],
        [settings.relatedItemsListCommand, handlersByMode.get(Mode.RelatedItemsList)],
      ]);

      handler = handlersByCommand.get(kind);
    }

    return handler;
  }
}
