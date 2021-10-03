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
import { Mode, AnySuggestion, AnyExSuggestion } from 'src/types';

export class ModeHandler {
  public get mode(): Mode {
    return this.inputInfo.mode;
  }

  private inputInfo: InputInfo;
  private wsHandler: WorkspaceHandler;
  private hsHandler: HeadingsHandler;
  private editorHandler: EditorHandler;
  private symbolHandler: SymbolHandler;

  constructor(app: App, private settings: SwitcherPlusSettings) {
    this.wsHandler = new WorkspaceHandler(app, settings);
    this.hsHandler = new HeadingsHandler(app, settings);
    this.editorHandler = new EditorHandler(app, settings);
    this.symbolHandler = new SymbolHandler(app, settings);
    this.reset();
  }

  reset(): void {
    this.inputInfo = new InputInfo();
  }

  getCommandStringForMode(mode: Mode): string {
    let val = '';
    const {
      editorListCommand,
      symbolListCommand,
      workspaceListCommand,
      headingsListCommand,
    } = this.settings;

    switch (mode) {
      case Mode.EditorList:
        val = editorListCommand;
        break;
      case Mode.SymbolList:
        val = symbolListCommand;
        break;
      case Mode.WorkspaceList:
        val = workspaceListCommand;
        break;
      case Mode.HeadingsList:
        val = headingsListCommand;
        break;
    }

    return val;
  }

  getSuggestions(inputInfo: InputInfo): AnySuggestion[] {
    let suggestions: AnySuggestion[] = [];

    if (inputInfo) {
      this.inputInfo = inputInfo;
      const { mode } = inputInfo;

      if (mode === Mode.WorkspaceList) {
        suggestions = this.wsHandler.getSuggestions(inputInfo);
      } else if (mode === Mode.HeadingsList) {
        suggestions = this.hsHandler.getSuggestions(inputInfo);
      } else if (mode === Mode.EditorList) {
        suggestions = this.editorHandler.getSuggestions(inputInfo);
      } else if (mode === Mode.SymbolList) {
        suggestions = this.symbolHandler.getSuggestions(inputInfo);
      }
    }

    return suggestions;
  }

  renderSuggestion(sugg: AnyExSuggestion, parentEl: HTMLElement): void {
    if (isSymbolSuggestion(sugg)) {
      this.symbolHandler.renderSuggestion(sugg, parentEl);
    } else if (isWorkspaceSuggestion(sugg)) {
      this.wsHandler.renderSuggestion(sugg, parentEl);
    } else if (isHeadingSuggestion(sugg)) {
      this.hsHandler.renderSuggestion(sugg, parentEl);
    } else {
      this.editorHandler.renderSuggestion(sugg, parentEl);
    }
  }

  onChooseSuggestion(sugg: AnyExSuggestion, evt: MouseEvent | KeyboardEvent): void {
    if (isEditorSuggestion(sugg)) {
      this.editorHandler.onChooseSuggestion(sugg);
    } else if (isWorkspaceSuggestion(sugg)) {
      this.wsHandler.onChooseSuggestion(sugg);
    } else if (isHeadingSuggestion(sugg)) {
      this.hsHandler.onChooseSuggestion(sugg, evt);
    } else {
      this.symbolHandler.onChooseSuggestion(sugg, evt);
    }
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

    this.validatePrefixCommands(info);
    this.validateSymbolCommand(info, activeSuggestion, activeLeaf);

    return info;
  }

  private validatePrefixCommands(info: InputInfo): void {
    const { inputText } = info;
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
      const {
        index,
        groups: { ep, wp, hp, ft },
      } = match;

      if (ep) {
        this.editorHandler.validateCommand(info, index, ft);
      } else if (wp) {
        this.wsHandler.validateCommand(info, index, ft);
      } else if (hp) {
        this.hsHandler.validateCommand(info, index, ft);
      }
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

        this.symbolHandler.validateCommand(
          inputInfo,
          index,
          ft,
          activeSuggestion,
          activeLeaf,
        );
      }
    }
  }
}
