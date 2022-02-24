import {
  WorkspaceHandler,
  HeadingsHandler,
  EditorHandler,
  SymbolHandler,
  StarredHandler,
} from 'src/Handlers';
import {
  isSymbolSuggestion,
  isEditorSuggestion,
  escapeRegExp,
  isWorkspaceSuggestion,
  isHeadingSuggestion,
  isExSuggestion,
  isStarredSuggestion,
} from 'src/utils';
import { InputInfo } from './inputInfo';
import { SwitcherPlusSettings } from 'src/settings';
import { WorkspaceLeaf, App, Chooser, Debouncer, debounce } from 'obsidian';
import {
  Mode,
  AnySuggestion,
  AnyExSuggestion,
  Handler,
  SymbolSuggestion,
} from 'src/types';
import { Keymap } from './keymap';

export class ModeHandler {
  private inputInfo: InputInfo;
  private handlersByMode: Map<Omit<Mode, 'Standard'>, Handler<AnySuggestion>>;
  private debouncedGetSuggestions: Debouncer<[InputInfo, Chooser<AnySuggestion>]>;
  private sessionOpenModeString: string;

  constructor(
    private app: App,
    private settings: SwitcherPlusSettings,
    public exKeymap: Keymap,
  ) {
    const handlersByMode = new Map<Omit<Mode, 'Standard'>, Handler<AnySuggestion>>();
    this.handlersByMode = handlersByMode;
    handlersByMode.set(Mode.SymbolList, new SymbolHandler(app, settings));
    handlersByMode.set(Mode.WorkspaceList, new WorkspaceHandler(app, settings));
    handlersByMode.set(Mode.HeadingsList, new HeadingsHandler(app, settings));
    handlersByMode.set(Mode.EditorList, new EditorHandler(app, settings));
    handlersByMode.set(Mode.StarredList, new StarredHandler(app, settings));

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
    const {
      exKeymap,
      app: {
        workspace: { activeLeaf },
      },
    } = this;

    const activeSugg = ModeHandler.getActiveSuggestion(chooser);
    const inputInfo = this.determineRunMode(query, activeSugg, activeLeaf);

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

    if (isExSuggestion(sugg)) {
      this.getHandler(sugg).renderSuggestion(sugg, parentEl);
      handled = true;
    }

    return handled;
  }

  onChooseSuggestion(sugg: AnySuggestion, evt: MouseEvent | KeyboardEvent): boolean {
    let handled = false;

    if (isExSuggestion(sugg)) {
      this.getHandler(sugg).onChooseSuggestion(sugg, evt);
      handled = true;
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
    this.validateSymbolCommand(info, activeSugg, activeLeaf);

    return info;
  }

  private getSuggestions(inputInfo: InputInfo, chooser: Chooser<AnySuggestion>): void {
    this.inputInfo = inputInfo;
    const { mode } = inputInfo;

    chooser.setSuggestions([]);

    const suggestions = this.getHandler(mode).getSuggestions(inputInfo);

    chooser.setSuggestions(suggestions);
    ModeHandler.setActiveSuggestion(mode, chooser);
  }

  private validatePrefixCommands(
    inputInfo: InputInfo,
    activeSugg: AnySuggestion,
    activeLeaf: WorkspaceLeaf,
  ): void {
    const { inputText } = inputInfo;
    const {
      editorListCommand,
      workspaceListCommand,
      headingsListCommand,
      starredListCommand,
    } = this.settings;

    const escEditorCmd = escapeRegExp(editorListCommand);
    const escWorkspaceCmd = escapeRegExp(workspaceListCommand);
    const escHeadingsCmd = escapeRegExp(headingsListCommand);
    const escStarredCmd = escapeRegExp(starredListCommand);

    // account for potential overlapping command strings
    const prefixCmds = [
      `(?<ep>${escEditorCmd})`,
      `(?<wp>${escWorkspaceCmd})`,
      `(?<hp>${escHeadingsCmd})`,
      `(?<sp>${escStarredCmd})`,
    ].sort((a, b) => b.length - a.length);

    // regex that matches editor, workspace, headings prefixes, and extract filter text
    // ^(?:(?<ep>edt )|(?<wp>+)|(?<hp>#)|(?<sp>*))(?<ft>.*)$
    const match = new RegExp(
      `^(?:${prefixCmds[0]}|${prefixCmds[1]}|${prefixCmds[2]}|${prefixCmds[3]})(?<ft>.*)$`,
    ).exec(inputText);

    if (match?.groups) {
      let mode: Mode = null;
      const {
        index,
        groups: { ep, wp, hp, sp, ft },
      } = match;

      if (ep) {
        mode = Mode.EditorList;
      } else if (wp) {
        mode = Mode.WorkspaceList;
      } else if (hp) {
        mode = Mode.HeadingsList;
      } else if (sp) {
        mode = Mode.StarredList;
      }

      if (mode) {
        this.getHandler(mode).validateCommand(
          inputInfo,
          index,
          ft,
          activeSugg,
          activeLeaf,
        );
      }
    }
  }

  private validateSymbolCommand(
    inputInfo: InputInfo,
    activeSugg: AnySuggestion,
    activeLeaf: WorkspaceLeaf,
  ): void {
    const { mode, inputText } = inputInfo;
    const { symbolListCommand } = this.settings;

    // Standard, Headings, Starred, and EditorList mode can have an embedded symbol command
    if (
      symbolListCommand.length &&
      (mode === Mode.Standard ||
        mode === Mode.EditorList ||
        mode === Mode.HeadingsList ||
        mode === Mode.StarredList)
    ) {
      const escSymbolCmd = escapeRegExp(symbolListCommand);

      // regex that matches symbol command, and extract filter text
      // @(?<ft>.*)$
      const match = new RegExp(`${escSymbolCmd}(?<ft>.*)$`).exec(inputText);
      if (match?.groups) {
        const {
          index,
          groups: { ft },
        } = match;

        this.getHandler(Mode.SymbolList).validateCommand(
          inputInfo,
          index,
          ft,
          activeSugg,
          activeLeaf,
        );
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
        chooser.setSelectedItem(index, true);
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
  }

  private getHandler(
    kind: Omit<Mode, 'Standard'> | AnyExSuggestion,
  ): Handler<AnySuggestion> {
    let mode: Mode;

    if (typeof kind === 'number') {
      mode = kind;
    } else {
      if (isEditorSuggestion(kind)) {
        mode = Mode.EditorList;
      } else if (isWorkspaceSuggestion(kind)) {
        mode = Mode.WorkspaceList;
      } else if (isHeadingSuggestion(kind)) {
        mode = Mode.HeadingsList;
      } else if (isSymbolSuggestion(kind)) {
        mode = Mode.SymbolList;
      } else if (isStarredSuggestion(kind)) {
        mode = Mode.StarredList;
      }
    }

    return this.handlersByMode.get(mode);
  }
}
