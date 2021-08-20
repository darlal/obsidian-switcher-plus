import { WorkspaceHandler, HeadingsHandler } from 'src/Handlers';
import { InputInfo } from './inputInfo';
import { SwitcherPlusSettings } from 'src/settings';
import {
  isSymbolSuggestion,
  isEditorSuggestion,
  isHeadingCache,
  isUnresolvedSuggestion,
  escapeRegExp,
  isSymbolInfo,
  isTagCache,
  isWorkspaceSuggestion,
  isWorkspaceInfo,
  isHeadingSuggestion,
} from 'src/utils';
import {
  View,
  ReferenceCache,
  TFile,
  WorkspaceLeaf,
  Workspace,
  renderResults,
  fuzzySearch,
  sortSearchResults,
  SearchResult,
  MetadataCache,
  App,
  Platform,
  MarkdownView,
  EditorPosition,
} from 'obsidian';
import {
  Mode,
  SymbolType,
  SymbolIndicators,
  HeadingIndicators,
  AnySuggestion,
  SymbolSuggestion,
  SymbolInfo,
  AnySymbolInfoPayload,
  AnyExSuggestionPayload,
  AnyExSuggestion,
  TargetInfo,
} from 'src/types';

function fileFromView(view: View): TFile {
  return view?.file;
}

export class ModeHandler {
  public get mode(): Mode {
    return this.inputInfo.mode;
  }

  private workspace: Workspace;
  private metadataCache: MetadataCache;
  private inputInfo: InputInfo;
  private wsHandler: WorkspaceHandler;
  private hsHandler: HeadingsHandler;

  constructor(app: App, private settings: SwitcherPlusSettings) {
    this.workspace = app?.workspace;
    this.metadataCache = app?.metadataCache;
    this.wsHandler = new WorkspaceHandler(app, settings);
    this.hsHandler = new HeadingsHandler(app, settings);
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

  onChooseSuggestion(sugg: AnyExSuggestion, evt: MouseEvent | KeyboardEvent): void {
    if (isEditorSuggestion(sugg)) {
      this.activateEditorLeaf(sugg.item, false);
    } else if (isWorkspaceSuggestion(sugg)) {
      this.wsHandler.onChooseSuggestion(sugg);
    } else if (isHeadingSuggestion(sugg)) {
      this.hsHandler.onChooseSuggestion(sugg, evt);
    } else {
      this.navigateToSymbol(sugg);
    }
  }

  renderSuggestion(sugg: AnyExSuggestion, parentEl: HTMLElement): void {
    let containerEl = parentEl;

    if (isSymbolSuggestion(sugg)) {
      const { item } = sugg;

      if (this.settings.symbolsInlineOrder && !this.inputInfo.searchQuery.hasSearchTerm) {
        parentEl.addClass(`qsp-symbol-l${item.indentLevel}`);
      }

      ModeHandler.addSymbolIndicator(item, containerEl);
      containerEl = createSpan({
        cls: 'qsp-symbol-text',
        parent: containerEl,
      });
    }

    if (isWorkspaceSuggestion(sugg)) {
      this.wsHandler.renderSuggestion(sugg, parentEl);
    } else if (isHeadingSuggestion(sugg)) {
      this.hsHandler.renderSuggestion(sugg, parentEl);
    } else {
      const text = ModeHandler.getItemText(sugg.item);
      renderResults(containerEl, text, sugg.match);
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
        this.validateEditorCommand(info, index, ft);
      } else if (wp) {
        this.wsHandler.validateCommand(info, index, ft);
      } else if (hp) {
        this.hsHandler.validateCommand(info, index, ft);
      }
    }
  }

  private validateEditorCommand(
    inputInfo: InputInfo,
    index: number,
    filterText: string,
  ): void {
    const { editorCmd } = inputInfo;

    inputInfo.mode = Mode.EditorList;
    editorCmd.index = index;
    editorCmd.parsedInput = filterText;
    editorCmd.isValidated = true;
  }

  private validateSymbolCommand(
    inputInfo: InputInfo,
    activeSuggestion: AnySuggestion,
    activeLeaf: WorkspaceLeaf,
  ): void {
    const { mode, symbolCmd, inputText } = inputInfo;

    // Both Standard and EditorList mode can have an embedded symbol command
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

        const target = this.getSymbolTarget(activeSuggestion, activeLeaf, index === 0);
        if (target) {
          inputInfo.mode = Mode.SymbolList;
          symbolCmd.target = target;
          symbolCmd.index = index;
          symbolCmd.parsedInput = ft;
          symbolCmd.isValidated = true;
        }
      }
    }
  }

  private getSymbolTarget(
    activeSuggestion: AnySuggestion,
    activeLeaf: WorkspaceLeaf,
    isSymbolCmdPrefix: boolean,
  ): TargetInfo {
    // figure out if the previous operation was a symbol operation
    const prevInputInfo = this.inputInfo;
    let prevTarget: TargetInfo = null;
    let hasPrevSymbolTarget = false;

    prevTarget = prevInputInfo.symbolCmd?.target;
    hasPrevSymbolTarget = prevInputInfo.mode === Mode.SymbolList && !!prevTarget;

    const activeSuggInfo = ModeHandler.getActiveSuggestionInfo(activeSuggestion);
    const activeEditorInfo = this.getActiveEditorInfo(activeLeaf);

    // Pick the target for a potential symbol operation, prioritizing
    // any pre-existing symbol operation that was in progress
    let target: TargetInfo = null;
    if (hasPrevSymbolTarget) {
      target = prevTarget;
    } else if (activeSuggInfo.isValidSymbolTarget) {
      target = activeSuggInfo;
    } else if (activeEditorInfo.isValidSymbolTarget && isSymbolCmdPrefix) {
      target = activeEditorInfo;
    }

    return target;
  }

  private getActiveEditorInfo(activeLeaf: WorkspaceLeaf): TargetInfo {
    const { excludeViewTypes } = this.settings;
    let file: TFile = null;
    let isValidSymbolTarget = false;
    let cursor: EditorPosition = null;

    if (activeLeaf) {
      const { view } = activeLeaf;
      let isCurrentEditorValid = false;

      if (view) {
        const viewType = view.getViewType();
        file = fileFromView(view);

        // determine if the current active editor pane is valid
        isCurrentEditorValid = !excludeViewTypes.includes(viewType);

        if (viewType === 'markdown') {
          const md = view as MarkdownView;

          if (md.getMode() !== 'preview') {
            const { editor } = view as MarkdownView;
            cursor = editor.getCursor('head');
          }
        }
      }

      // whether or not the current active editor can be used as the target for
      // symbol search
      isValidSymbolTarget = isCurrentEditorValid && !!file;
    }

    return { isValidSymbolTarget, leaf: activeLeaf, file, suggestion: null, cursor };
  }

  private static getActiveSuggestionInfo(activeSuggestion: AnySuggestion): TargetInfo {
    let file: TFile = null,
      leaf: WorkspaceLeaf = null,
      isValidSymbolTarget = false;

    if (
      activeSuggestion &&
      !isSymbolSuggestion(activeSuggestion) &&
      !isUnresolvedSuggestion(activeSuggestion) &&
      !isWorkspaceSuggestion(activeSuggestion)
    ) {
      // Can't use a symbol, workspace, unresolved (non-existent file) suggestions as
      // the target for another symbol command
      isValidSymbolTarget = true;

      if (isEditorSuggestion(activeSuggestion)) {
        leaf = activeSuggestion.item;
        file = fileFromView(leaf.view);
      } else {
        // this catches system File suggestion, Heading, and Alias suggestion
        file = activeSuggestion.file;
      }
    }

    return { isValidSymbolTarget, leaf, file, suggestion: activeSuggestion };
  }

  getSuggestions(inputInfo: InputInfo): AnySuggestion[] {
    let suggestions: AnySuggestion[] = [];

    const push = (item: AnyExSuggestionPayload, match: SearchResult) => {
      if (isSymbolInfo(item)) {
        suggestions.push({ type: 'symbol', item, match });
      } else if (!isWorkspaceInfo(item)) {
        // item is workspace leaf
        suggestions.push({ type: 'editor', item, match });
      }
    };

    if (inputInfo) {
      this.inputInfo = inputInfo;
      inputInfo.buildSearchQuery();
      const { hasSearchTerm, prepQuery } = inputInfo.searchQuery;
      const { mode } = inputInfo;

      if (mode === Mode.WorkspaceList) {
        suggestions = this.wsHandler.getSuggestions(inputInfo);
      } else if (mode === Mode.HeadingsList) {
        suggestions = this.hsHandler.getSuggestions(inputInfo);
      } else {
        const items = this.getItems(inputInfo);

        items.forEach((item) => {
          let match: SearchResult = null;

          if (hasSearchTerm) {
            const text = ModeHandler.getItemText(item);
            match = fuzzySearch(prepQuery, text);

            if (match) {
              push(item, match);
            }
          } else {
            push(item, null);
          }
        });

        if (hasSearchTerm) {
          sortSearchResults(suggestions);
        }
      }
    }

    return suggestions;
  }

  private getItems(inputInfo: InputInfo): AnyExSuggestionPayload[] {
    let items: AnyExSuggestionPayload[] = [];
    const {
      mode,
      searchQuery: { hasSearchTerm },
      symbolCmd: { target },
    } = inputInfo;

    if (mode === Mode.EditorList) {
      items = this.getOpenRootSplits();
    } else if (mode === Mode.SymbolList) {
      let symbolsInlineOrder = false;
      let selectNearestHeading = false;

      if (!hasSearchTerm) {
        ({ selectNearestHeading, symbolsInlineOrder } = this.settings);
      }

      items = this.getSymbolsForTarget(target, symbolsInlineOrder);

      if (selectNearestHeading) {
        ModeHandler.FindNearestHeadingSymbol(items, target);
      }
    }

    return items;
  }

  private static FindNearestHeadingSymbol(
    items: AnyExSuggestionPayload[],
    targetInfo: TargetInfo,
  ): void {
    const cursorLine = targetInfo?.cursor?.line;

    // find the nearest heading to the current cursor pos, if applicable
    if (cursorLine) {
      const found = items
        .filter((v): v is SymbolInfo => isSymbolInfo(v) && isHeadingCache(v.symbol))
        .reduce((acc, curr) => {
          const { line: currLine } = curr.symbol.position.start;
          const accLine = acc ? acc.symbol.position.start.line : -1;

          return currLine > accLine && currLine <= cursorLine ? curr : acc;
        });

      if (found) {
        found.isSelected = true;
      }
    }
  }

  private getOpenRootSplits(): WorkspaceLeaf[] {
    const {
      workspace,
      settings: { excludeViewTypes, includeSidePanelViewTypes },
    } = this;
    const leaves: WorkspaceLeaf[] = [];

    const saveLeaf = (l: WorkspaceLeaf) => {
      const viewType = l.view?.getViewType();

      if (this.isMainPanelLeaf(l)) {
        if (!excludeViewTypes.includes(viewType)) {
          leaves.push(l);
        }
      } else if (includeSidePanelViewTypes.includes(viewType)) {
        leaves.push(l);
      }
    };

    workspace.iterateAllLeaves(saveLeaf);
    return leaves;
  }

  private isMainPanelLeaf(leaf: WorkspaceLeaf): boolean {
    return leaf?.getRoot() === this.workspace.rootSplit;
  }

  private activateEditorLeaf(
    leaf: WorkspaceLeaf,
    pushHistory?: boolean,
    eState?: Record<string, unknown>,
  ) {
    const { workspace } = this;
    const isInSidePanel = !this.isMainPanelLeaf(leaf);
    const state = { focus: true, ...eState };

    if (isInSidePanel) {
      workspace.revealLeaf(leaf);
    }

    workspace.setActiveLeaf(leaf, pushHistory);
    leaf.view.setEphemeralState(state);
  }

  private getSymbolsForTarget(
    targetInfo: TargetInfo,
    orderByLineNumber: boolean,
  ): SymbolInfo[] {
    const { metadataCache, settings } = this;
    const ret: SymbolInfo[] = [];

    if (targetInfo?.file) {
      const file = targetInfo.file;
      const symbolData = metadataCache.getFileCache(file);

      if (symbolData) {
        const push = (symbols: AnySymbolInfoPayload[] = [], symbolType: SymbolType) => {
          if (settings.isSymbolTypeEnabled(symbolType)) {
            symbols.forEach((symbol) =>
              ret.push({ type: 'symbolInfo', symbol, symbolType }),
            );
          }
        };

        push(symbolData.headings, SymbolType.Heading);
        push(symbolData.tags, SymbolType.Tag);
        push(symbolData.links, SymbolType.Link);
        push(symbolData.embeds, SymbolType.Embed);
      }
    }

    return orderByLineNumber ? ModeHandler.orderSymbolsByLineNumber(ret) : ret;
  }

  private static orderSymbolsByLineNumber(symbols: SymbolInfo[] = []): SymbolInfo[] {
    const sorted = symbols.sort((a: SymbolInfo, b: SymbolInfo) => {
      const { start: aStart } = a.symbol.position;
      const { start: bStart } = b.symbol.position;
      const lineDiff = aStart.line - bStart.line;
      return lineDiff === 0 ? aStart.col - bStart.col : lineDiff;
    });

    let currIndentLevel = 0;

    sorted.forEach((si) => {
      let indentLevel = 0;
      if (isHeadingCache(si.symbol)) {
        currIndentLevel = si.symbol.level;
        indentLevel = si.symbol.level - 1;
      } else {
        indentLevel = currIndentLevel;
      }

      si.indentLevel = indentLevel;
    });

    return sorted;
  }

  private static getItemText(item: AnyExSuggestionPayload): string {
    let text;

    if (isSymbolInfo(item)) {
      text = ModeHandler.getSuggestionTextForSymbol(item);
    } else if (!isWorkspaceInfo(item)) {
      // item is workspace leaf
      text = item.getDisplayText();
    }

    return text;
  }

  private static getSuggestionTextForSymbol(symbolInfo: SymbolInfo): string {
    const { symbol } = symbolInfo;
    let text;

    if (isHeadingCache(symbol)) {
      text = symbol.heading;
    } else if (isTagCache(symbol)) {
      text = symbol.tag.slice(1);
    } else {
      const refCache = symbol as ReferenceCache;
      ({ link: text } = refCache);
      const { displayText } = refCache;

      if (displayText && displayText !== text) {
        text += `|${displayText}`;
      }
    }

    return text;
  }

  private navigateToSymbol(sugg: SymbolSuggestion): void {
    const {
      workspace,
      settings: { alwaysNewPaneForSymbols, useActivePaneForSymbolsOnMobile },
    } = this;

    // determine if the target is already open in a pane
    const {
      leaf,
      file: { path },
    } = this.findOpenEditorMatchingSymbolTarget();

    const {
      start: { line, col },
      end: endLoc,
    } = sugg.item.symbol.position;

    // object containing the state information for the target editor,
    // start with the range to highlight in target editor
    const eState = {
      startLoc: { line, col },
      endLoc,
      line,
      cursor: {
        from: { line, ch: col },
        to: { line, ch: col },
      },
    };

    if (leaf && !alwaysNewPaneForSymbols) {
      this.activateEditorLeaf(leaf, true, eState);
    } else {
      const { isDesktop, isMobile } = Platform;
      const createNewLeaf = isDesktop || (isMobile && !useActivePaneForSymbolsOnMobile);

      workspace
        .openLinkText(path, '', createNewLeaf, { eState })
        .catch(() => console.log('Switcher++: unable to navigate to symbol'));
    }
  }

  private findOpenEditorMatchingSymbolTarget(): TargetInfo {
    const { referenceViews } = this.settings;
    const { file, leaf } = this.inputInfo.symbolCmd.target;
    const isTargetLeaf = !!leaf;

    const predicate = (l: WorkspaceLeaf) => {
      let val = false;
      const isRefView = referenceViews.includes(l.view.getViewType());
      const isTargetRefView =
        isTargetLeaf && referenceViews.includes(leaf.view.getViewType());

      if (!isRefView) {
        val =
          isTargetLeaf && !isTargetRefView ? l === leaf : fileFromView(l.view) === file;
      }

      return val;
    };

    const l = this.getOpenRootSplits().find(predicate);
    return { leaf: l, file, suggestion: null, isValidSymbolTarget: false };
  }

  private static addSymbolIndicator(symbolInfo: SymbolInfo, parentEl: HTMLElement): void {
    const { symbolType, symbol } = symbolInfo;
    let indicator: string;

    if (isHeadingCache(symbol)) {
      indicator = HeadingIndicators[symbol.level];
    } else {
      indicator = SymbolIndicators[symbolType];
    }

    createDiv({
      text: indicator,
      cls: 'qsp-symbol-indicator',
      parent: parentEl,
    });
  }
}
