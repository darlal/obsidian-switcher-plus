import { InputInfo } from './inputInfo';
import { SwitcherPlusSettings } from 'src/settings';
import {
  isSymbolSuggestion,
  isOfType,
  isEditorSuggestion,
  isHeadingCache,
  isUnresolvedSuggestion,
  escapeRegExp,
} from 'src/utils';
import {
  View,
  TagCache,
  ReferenceCache,
  TFile,
  WorkspaceLeaf,
  Workspace,
  prepareQuery,
  renderResults,
  fuzzySearch,
  sortSearchResults,
  PreparedQuery,
  SearchResult,
  MetadataCache,
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
  return (view as any)?.file;
}

export class ModeHandler {
  public get mode(): Mode {
    return this.inputInfo.mode;
  }

  private inputInfo: InputInfo;

  constructor(
    private workspace: Workspace,
    private metadataCache: MetadataCache,
    private settings: SwitcherPlusSettings,
  ) {
    this.reset();
  }

  reset(): void {
    this.inputInfo = new InputInfo();
  }

  getCommandStringForMode(mode: Mode): string {
    let val = '';
    const { editorListCommand, symbolListCommand } = this.settings;

    if (mode === Mode.EditorList) {
      val = editorListCommand;
    } else if (mode === Mode.SymbolList) {
      val = symbolListCommand;
    }

    return val;
  }

  onChooseSuggestion(sugg: AnyExSuggestion): void {
    if (isEditorSuggestion(sugg)) {
      this.activateEditorLeaf(sugg.item, false);
    } else {
      this.navigateToSymbol(sugg);
    }
  }

  renderSuggestion(sugg: AnyExSuggestion, parentEl: HTMLElement): void {
    let containerEl = parentEl;

    if (isSymbolSuggestion(sugg)) {
      const { item } = sugg;

      if (this.settings.symbolsInlineOrder && !this.inputInfo.hasSearchTerm) {
        parentEl.addClass(`qsp-symbol-l${item.indentLevel}`);
      }

      ModeHandler.addSymbolIndicator(item, containerEl);
      containerEl = createSpan({
        cls: 'qsp-symbol-text',
        parent: containerEl,
      });
    }

    const text = ModeHandler.getItemText(sugg.item);
    renderResults(containerEl, text, sugg.match);
  }

  determineRunMode(
    input: string,
    activeSuggestion: AnySuggestion,
    activeLeaf: WorkspaceLeaf,
  ): InputInfo {
    const { editorListCommand, symbolListCommand } = this.settings;
    const info = new InputInfo(input);

    if (!input || input.length === 0) {
      this.reset();
    }

    const escSymbolCmd = escapeRegExp(symbolListCommand);
    const escEditorCmd = escapeRegExp(editorListCommand);
    const prefixCmds = [`(?<sp>${escSymbolCmd})`, `(?<ep>${escEditorCmd})`].sort(
      (a, b) => b.length - a.length,
    );

    // regex that matches symbol, editor prefixes, and embedded symbol command
    // as long as it's not preceded by another symbol command
    // ^(?:(?<ep>edt )|(?<sp>@))|(?<!@.*)(?<se>@)
    const re = new RegExp(
      `^(?:${prefixCmds[0]}|${prefixCmds[1]})|(?<!${escSymbolCmd}.*)(?<se>${escSymbolCmd})`,
      'g',
    );

    const matches = input.matchAll(re);
    for (const match of matches) {
      if (match.groups) {
        const { groups, index } = match;

        if (groups.ep) {
          this.validateEditorCommand(info, index);
        } else if (groups.sp || groups.se) {
          this.validateSymbolCommand(info, index, activeSuggestion, activeLeaf);
        }
      }
    }

    return info;
  }

  private validateEditorCommand(inputInfo: InputInfo, index: number): void {
    const { editorListCommand } = this.settings;
    const { editorCmd, inputText } = inputInfo;

    inputInfo.mode = Mode.EditorList;
    editorCmd.index = index;
    editorCmd.parsedInput = inputText.slice(editorListCommand.length);
    editorCmd.isValidated = true;
  }

  private validateSymbolCommand(
    inputInfo: InputInfo,
    index: number,
    activeSuggestion: AnySuggestion,
    activeLeaf: WorkspaceLeaf,
  ): void {
    const { symbolListCommand } = this.settings;
    const { mode, symbolCmd, inputText } = inputInfo;

    // Both Standard and EditorList mode can have an embedded symbol command
    if (mode === Mode.Standard || mode === Mode.EditorList) {
      const target = this.getSymbolTarget(activeSuggestion, activeLeaf, index === 0);

      if (target) {
        inputInfo.mode = Mode.SymbolList;
        symbolCmd.target = target;
        symbolCmd.index = index;
        symbolCmd.parsedInput = inputText.slice(index + symbolListCommand.length);
        symbolCmd.isValidated = true;
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
    if (prevInputInfo) {
      prevTarget = prevInputInfo.symbolCmd?.target;
      hasPrevSymbolTarget = prevInputInfo.mode === Mode.SymbolList && !!prevTarget;
    }

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
    const { view } = activeLeaf;
    const { excludeViewTypes } = this.settings;

    // determine if the current active editor pane is valid
    const isCurrentEditorValid = !excludeViewTypes.includes(view.getViewType());

    const file = fileFromView(view);

    // whether or not the current active editor can be used as the target for
    // symbol search
    const isValidSymbolTarget = isCurrentEditorValid && !!file;

    return { isValidSymbolTarget, leaf: activeLeaf, file, suggestion: null };
  }

  private static getActiveSuggestionInfo(activeSuggestion: AnySuggestion): TargetInfo {
    let file: TFile = null,
      leaf: WorkspaceLeaf = null,
      isValidSymbolTarget = false;

    if (
      activeSuggestion &&
      !isSymbolSuggestion(activeSuggestion) &&
      !isUnresolvedSuggestion(activeSuggestion)
    ) {
      // Can't use a symbol suggestion, or unresolved (non-existent file) as
      // the target for another symbol command
      isValidSymbolTarget = true;

      if (isEditorSuggestion(activeSuggestion)) {
        leaf = activeSuggestion.item;
        file = fileFromView(leaf.view);
      } else {
        // this catches system File suggestion and Alias suggestion
        file = activeSuggestion.file;
      }
    }

    return { isValidSymbolTarget, leaf, file, suggestion: activeSuggestion };
  }

  private static extractSearchQuery(inputInfo: InputInfo): PreparedQuery {
    const { mode, symbolCmd, editorCmd } = inputInfo;
    let input = '';

    if (mode === Mode.SymbolList) {
      input = symbolCmd.parsedInput;
    } else if (mode === Mode.EditorList) {
      input = editorCmd.parsedInput;
    }

    const queryStr = input.trim().toLowerCase();
    const prepQuery = prepareQuery(queryStr);

    return prepQuery;
  }

  getSuggestions(inputInfo: InputInfo): AnyExSuggestion[] {
    const suggestions: AnyExSuggestion[] = [];

    const push = (item: AnyExSuggestionPayload, match: SearchResult) => {
      if (item instanceof WorkspaceLeaf) {
        suggestions.push({ type: 'Editor', item, match });
      } else {
        suggestions.push({ type: 'Symbol', item, match });
      }
    };

    if (inputInfo) {
      this.inputInfo = inputInfo;
      const prepQuery = ModeHandler.extractSearchQuery(inputInfo);
      const hasSearchTerm = prepQuery?.query?.length > 0;

      inputInfo.hasSearchTerm = hasSearchTerm;
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

    return suggestions;
  }

  private getItems(inputInfo: InputInfo): AnyExSuggestionPayload[] {
    let items: AnyExSuggestionPayload[];
    const {
      mode,
      hasSearchTerm,
      symbolCmd: { target },
    } = inputInfo;

    if (mode === Mode.EditorList) {
      items = this.getOpenRootSplits();
    } else if (mode === Mode.SymbolList) {
      const orderByLineNumber = this.settings.symbolsInlineOrder && !hasSearchTerm;
      items = this.getSymbolsForTarget(target, orderByLineNumber);
    }

    return items;
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
    const { metadataCache } = this;
    const ret: SymbolInfo[] = [];

    if (targetInfo && targetInfo.file) {
      const file = targetInfo.file;
      const symbolData = metadataCache.getFileCache(file);

      if (symbolData) {
        const push = (symbols: AnySymbolInfoPayload[] = [], type: SymbolType) => {
          symbols.forEach((symbol) => ret.push({ symbol, type }));
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

    if (item instanceof WorkspaceLeaf) {
      text = item.getDisplayText();
    } else {
      text = ModeHandler.getSuggestionTextForSymbol(item);
    }

    return text;
  }

  private static getSuggestionTextForSymbol(symbolInfo: SymbolInfo): string {
    const { symbol } = symbolInfo;
    let text;

    if (isHeadingCache(symbol)) {
      text = symbol.heading;
    } else if (isOfType<TagCache>(symbol, 'tag')) {
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
    const { workspace } = this;

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

    if (leaf && !this.settings.alwaysNewPaneForSymbols) {
      this.activateEditorLeaf(leaf, true, eState);
    } else {
      workspace
        .openLinkText(path, '', true, { eState })
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
    const { type, symbol } = symbolInfo;
    let indicator: string;

    if (isHeadingCache(symbol)) {
      indicator = HeadingIndicators[symbol.level];
    } else {
      indicator = SymbolIndicators[type];
    }

    createDiv({
      text: indicator,
      cls: 'qsp-symbol-indicator',
      parent: parentEl,
    });
  }
}
