import {
  Handler,
  WorkspaceHandler,
  HeadingsHandler,
  EditorHandler,
  RelatedItemsHandler,
  SymbolHandler,
  StarredHandler,
  CommandHandler,
  StandardExHandler,
} from 'src/Handlers';
import {
  isSymbolSuggestion,
  escapeRegExp,
  isExSuggestion,
  isOfType,
  isUnresolvedSuggestion,
  isFileSuggestion,
} from 'src/utils';
import { InputInfo } from './inputInfo';
import { SwitcherPlusSettings } from 'src/settings';
import { WorkspaceLeaf, App, Chooser, Debouncer, debounce } from 'obsidian';
import { Mode, AnySuggestion, SymbolSuggestion, SuggestionType } from 'src/types';
import { SwitcherPlusKeymap } from './switcherPlusKeymap';

export class ModeHandler {
  private inputInfo: InputInfo;
  private handlersByMode: Map<Omit<Mode, 'Standard'>, Handler<AnySuggestion>>;
  private handlersByType: Map<SuggestionType, Handler<AnySuggestion>>;
  private debouncedGetSuggestions: Debouncer<[InputInfo, Chooser<AnySuggestion>], void>;
  private sessionOpenModeString: string;

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
      [Mode.StarredList, new StarredHandler(app, settings)],
      [Mode.CommandList, new CommandHandler(app, settings)],
      [Mode.RelatedItemsList, new RelatedItemsHandler(app, settings)],
    ]);

    this.handlersByMode = handlersByMode;
    this.handlersByType = new Map<SuggestionType, Handler<AnySuggestion>>([
      [SuggestionType.CommandList, handlersByMode.get(Mode.CommandList)],
      [SuggestionType.EditorList, handlersByMode.get(Mode.EditorList)],
      [SuggestionType.HeadingsList, handlersByMode.get(Mode.HeadingsList)],
      [SuggestionType.RelatedItemsList, handlersByMode.get(Mode.RelatedItemsList)],
      [SuggestionType.StarredList, handlersByMode.get(Mode.StarredList)],
      [SuggestionType.SymbolList, handlersByMode.get(Mode.SymbolList)],
      [SuggestionType.WorkspaceList, handlersByMode.get(Mode.WorkspaceList)],
      [SuggestionType.File, standardExHandler],
      [SuggestionType.Alias, standardExHandler],
    ]);

    this.debouncedGetSuggestions = debounce(this.getSuggestions.bind(this), 400, true);
    this.reset();
  }

  onOpen(): void {
    this.exKeymap.isOpen = true;
  }

  onClose() {
    this.exKeymap.isOpen = false;
  }

  setSessionOpenMode(mode: Mode, chooser: Chooser<AnySuggestion>): void {
    this.reset();
    chooser?.setSuggestions([]);

    if (mode !== Mode.Standard) {
      this.sessionOpenModeString = this.getHandler(mode).commandString;
    }
  }

  insertSessionOpenModeCommandString(inputEl: HTMLInputElement): void {
    const { sessionOpenModeString } = this;

    if (sessionOpenModeString !== null && sessionOpenModeString !== '') {
      // update UI with current command string in the case were openInMode was called
      inputEl.value = sessionOpenModeString;

      // reset to null so user input is not overridden the next time onInput is called
      this.sessionOpenModeString = null;
    }
  }

  updateSuggestions(query: string, chooser: Chooser<AnySuggestion>): boolean {
    let handled = false;
    const { exKeymap } = this;

    // cancel any potentially previously running debounced getsuggestions call
    this.debouncedGetSuggestions.cancel();

    // get the currently active leaf across all rootSplits
    const activeLeaf = Handler.getActiveLeaf(this.app.workspace);
    const activeSugg = ModeHandler.getActiveSuggestion(chooser);
    const inputInfo = this.determineRunMode(query, activeSugg, activeLeaf);
    this.inputInfo = inputInfo;

    const { mode } = inputInfo;
    exKeymap.updateKeymapForMode(mode);

    if (mode !== Mode.Standard) {
      if (mode === Mode.HeadingsList && inputInfo.parsedCommand().parsedInput?.length) {
        // if headings mode and user is typing a query, delay getting suggestions
        this.debouncedGetSuggestions(inputInfo, chooser);
      } else {
        this.getSuggestions(inputInfo, chooser);
      }

      handled = true;
    }

    return handled;
  }

  renderSuggestion(sugg: AnySuggestion, parentEl: HTMLElement): boolean {
    let handled = false;

    if (sugg) {
      // in Headings mode, StandardExHandler should handle rendering for File
      // suggestions
      const useExHandler =
        this.inputInfo.mode === Mode.HeadingsList && isFileSuggestion(sugg);

      if (useExHandler || isExSuggestion(sugg)) {
        this.getHandler(sugg).renderSuggestion(sugg, parentEl);
        handled = true;
      }
    }

    return handled;
  }

  onChooseSuggestion(sugg: AnySuggestion, evt: MouseEvent | KeyboardEvent): boolean {
    let handled = false;

    if (sugg) {
      // in Headings mode, StandardExHandler should handle the onChoose action for File
      // and Alias suggestion so that the preferOpenInNewPane setting can be handled properly
      const useExHandler =
        this.inputInfo.mode === Mode.HeadingsList && !isUnresolvedSuggestion(sugg);

      if (useExHandler || isExSuggestion(sugg)) {
        this.getHandler(sugg).onChooseSuggestion(sugg, evt);
        handled = true;
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
    const info = new InputInfo(input);

    if (input.length === 0) {
      this.reset();
    }

    this.validatePrefixCommands(info, activeSugg, activeLeaf);
    this.validateSourcedCommands(info, activeSugg, activeLeaf);

    return info;
  }

  getSuggestions(inputInfo: InputInfo, chooser: Chooser<AnySuggestion>): void {
    chooser.setSuggestions([]);

    const { mode } = inputInfo;
    const suggestions = this.getHandler(mode).getSuggestions(inputInfo);

    const setSuggestions = (suggs: AnySuggestion[]) => {
      chooser.setSuggestions(suggs);
      ModeHandler.setActiveSuggestion(mode, chooser);
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
      settings.starredListCommand,
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

    // Standard, Headings, Starred, and EditorList mode can have an embedded command
    const supportedModes = [
      Mode.Standard,
      Mode.EditorList,
      Mode.HeadingsList,
      Mode.StarredList,
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
      }
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

  private static getActiveSuggestion(chooser: Chooser<AnySuggestion>): AnySuggestion {
    let activeSuggestion: AnySuggestion = null;

    if (chooser?.values) {
      activeSuggestion = chooser.values[chooser.selectedItem];
    }

    return activeSuggestion;
  }

  private reset(): void {
    this.inputInfo = new InputInfo();
    this.sessionOpenModeString = null;
    (this.getHandler(Mode.SymbolList) as SymbolHandler).reset();
    (this.getHandler(Mode.RelatedItemsList) as RelatedItemsHandler).reset();
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
        [settings.starredListCommand, handlersByMode.get(Mode.StarredList)],
        [settings.commandListCommand, handlersByMode.get(Mode.CommandList)],
        [settings.symbolListCommand, handlersByMode.get(Mode.SymbolList)],
        [settings.relatedItemsListCommand, handlersByMode.get(Mode.RelatedItemsList)],
      ]);

      handler = handlersByCommand.get(kind);
    }

    return handler;
  }
}
