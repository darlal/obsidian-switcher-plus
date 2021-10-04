import {
  WorkspaceHandler,
  HeadingsHandler,
  EditorHandler,
  SymbolHandler,
} from 'src/Handlers';
import {
  isSymbolSuggestion,
  isEditorSuggestion,
  escapeRegExp,
  isWorkspaceSuggestion,
  isHeadingSuggestion,
} from 'src/utils';
import { InputInfo } from './inputInfo';
import { SwitcherPlusSettings } from 'src/settings';
import { WorkspaceLeaf, App } from 'obsidian';
import { Mode, AnySuggestion, AnyExSuggestion, Handler } from 'src/types';

export class ModeHandler {
  public get mode(): Mode {
    return this.inputInfo.mode;
  }

  private inputInfo: InputInfo;
  private handlersByMode: Map<Omit<Mode, 'Standard'>, Handler<AnySuggestion>>;

  constructor(app: App, private settings: SwitcherPlusSettings) {
    const handlersByMode = new Map<Omit<Mode, 'Standard'>, Handler<AnySuggestion>>();
    handlersByMode.set(Mode.SymbolList, new SymbolHandler(app, settings));
    handlersByMode.set(Mode.WorkspaceList, new WorkspaceHandler(app, settings));
    handlersByMode.set(Mode.HeadingsList, new HeadingsHandler(app, settings));
    handlersByMode.set(Mode.EditorList, new EditorHandler(app, settings));

    this.handlersByMode = handlersByMode;
    this.reset();
  }

  reset(): void {
    this.inputInfo = new InputInfo();
  }

  getCommandStringForMode(mode: Mode): string {
    let val = '';

    if (mode !== Mode.Standard) {
      val = this.getHandler(mode).commandString;
    }

    return val;
  }

  getSuggestions(inputInfo: InputInfo): AnySuggestion[] {
    let suggestions: AnySuggestion[] = [];

    if (inputInfo) {
      this.inputInfo = inputInfo;
      const { mode } = inputInfo;

      if (mode !== Mode.Standard) {
        suggestions = this.getHandler(mode).getSuggestions(inputInfo);
      }
    }

    return suggestions;
  }

  renderSuggestion(sugg: AnyExSuggestion, parentEl: HTMLElement): void {
    this.getHandler(sugg).renderSuggestion(sugg, parentEl);
  }

  onChooseSuggestion(sugg: AnyExSuggestion, evt: MouseEvent | KeyboardEvent): void {
    this.getHandler(sugg).onChooseSuggestion(sugg, evt);
  }

  determineRunMode(
    inputText: string,
    activeSuggestion: AnySuggestion,
    activeLeaf: WorkspaceLeaf,
  ): InputInfo {
    const input = inputText ?? '';
    const info = new InputInfo(input);

    if (input.length === 0) {
      this.reset();
    }

    this.validatePrefixCommands(info, activeSuggestion, activeLeaf);
    this.validateSymbolCommand(info, activeSuggestion, activeLeaf);

    return info;
  }

  private validatePrefixCommands(
    inputInfo: InputInfo,
    activeSuggestion: AnySuggestion,
    activeLeaf: WorkspaceLeaf,
  ): void {
    const { inputText } = inputInfo;
    const { editorListCommand, workspaceListCommand, headingsListCommand } =
      this.settings;
    const escEditorCmd = escapeRegExp(editorListCommand);
    const escWorkspaceCmd = escapeRegExp(workspaceListCommand);
    const escHeadingsCmd = escapeRegExp(headingsListCommand);

    // account for potential overlapping command strings
    const prefixCmds = [
      `(?<ep>${escEditorCmd})`,
      `(?<wp>${escWorkspaceCmd})`,
      `(?<hp>${escHeadingsCmd})`,
    ].sort((a, b) => b.length - a.length);

    // regex that matches editor, workspace, headings prefixes, and extract filter text
    // ^(?:(?<ep>edt )|(?<wp>+)|(?<hp>#))(?<ft>.*)$
    const match = new RegExp(
      `^(?:${prefixCmds[0]}|${prefixCmds[1]}|${prefixCmds[2]})(?<ft>.*)$`,
    ).exec(inputText);

    if (match?.groups) {
      let mode: Mode;
      const {
        index,
        groups: { ep, wp, hp, ft },
      } = match;

      if (ep) {
        mode = Mode.EditorList;
      } else if (wp) {
        mode = Mode.WorkspaceList;
      } else if (hp) {
        mode = Mode.HeadingsList;
      }

      this.getHandler(mode).validateCommand(
        inputInfo,
        index,
        ft,
        activeSuggestion,
        activeLeaf,
      );
    }
  }

  private validateSymbolCommand(
    inputInfo: InputInfo,
    activeSuggestion: AnySuggestion,
    activeLeaf: WorkspaceLeaf,
  ): void {
    const { mode, inputText } = inputInfo;

    // Standard, Headings, and EditorList mode can have an embedded symbol command
    if (
      mode === Mode.Standard ||
      mode === Mode.EditorList ||
      mode === Mode.HeadingsList
    ) {
      const { symbolListCommand } = this.settings;
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
          activeSuggestion,
          activeLeaf,
        );
      }
    }
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
      }
    }

    return this.handlersByMode.get(mode);
  }
}
