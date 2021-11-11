import {
  App,
  EditorPosition,
  fuzzySearch,
  MarkdownView,
  Platform,
  ReferenceCache,
  renderResults,
  SearchResult,
  sortSearchResults,
  TFile,
  WorkspaceLeaf,
} from 'obsidian';
import {
  Mode,
  SymbolSuggestion,
  AnySuggestion,
  TargetInfo,
  SymbolInfo,
  AnySymbolInfoPayload,
  SymbolType,
  HeadingIndicators,
  SymbolIndicators,
  Handler,
} from 'src/types';
import {
  activateLeaf,
  getOpenLeaves,
  isEditorSuggestion,
  isHeadingCache,
  isSymbolSuggestion,
  isTagCache,
  isUnresolvedSuggestion,
  isWorkspaceSuggestion,
} from 'src/utils';
import { SwitcherPlusSettings } from 'src/settings';
import { InputInfo, SymbolParsedCommand } from 'src/switcherPlus';

export class SymbolHandler implements Handler<SymbolSuggestion> {
  private inputInfo: InputInfo;

  get commandString(): string {
    return this.settings?.symbolListCommand;
  }

  constructor(private app: App, private settings: SwitcherPlusSettings) {}

  validateCommand(
    inputInfo: InputInfo,
    index: number,
    filterText: string,
    activeSuggestion: AnySuggestion,
    activeLeaf: WorkspaceLeaf,
  ): void {
    const target = this.getSymbolTarget(activeSuggestion, activeLeaf, index === 0);
    if (target) {
      inputInfo.mode = Mode.SymbolList;

      const symbolCmd = inputInfo.parsedCommand(Mode.SymbolList) as SymbolParsedCommand;

      symbolCmd.target = target;
      symbolCmd.index = index;
      symbolCmd.parsedInput = filterText;
      symbolCmd.isValidated = true;
    }
  }

  getSuggestions(inputInfo: InputInfo): SymbolSuggestion[] {
    const suggestions: SymbolSuggestion[] = [];

    if (inputInfo) {
      this.inputInfo = inputInfo;

      inputInfo.buildSearchQuery();
      const { hasSearchTerm, prepQuery } = inputInfo.searchQuery;
      const symbolCmd = inputInfo.parsedCommand(Mode.SymbolList) as SymbolParsedCommand;
      const items = this.getItems(symbolCmd.target, hasSearchTerm);

      items.forEach((item) => {
        let shouldPush = true;
        let match: SearchResult = null;

        if (hasSearchTerm) {
          match = fuzzySearch(prepQuery, SymbolHandler.getSuggestionTextForSymbol(item));
          shouldPush = !!match;
        }

        if (shouldPush) {
          suggestions.push({ type: 'symbol', item, match });
        }
      });

      if (hasSearchTerm) {
        sortSearchResults(suggestions);
      }
    }

    return suggestions;
  }

  renderSuggestion(sugg: SymbolSuggestion, parentEl: HTMLElement): void {
    if (sugg) {
      const { item } = sugg;
      let containerEl = parentEl;

      if (
        this.settings.symbolsInLineOrder &&
        this.inputInfo &&
        !this.inputInfo.searchQuery.hasSearchTerm
      ) {
        containerEl.addClass(`qsp-symbol-l${item.indentLevel}`);
      }

      const text = SymbolHandler.getSuggestionTextForSymbol(item);

      SymbolHandler.addSymbolIndicator(item, containerEl);
      containerEl = parentEl.createSpan({
        cls: 'qsp-symbol-text',
      });

      renderResults(containerEl, text, sugg.match);
    }
  }

  onChooseSuggestion(sugg: SymbolSuggestion, _evt: MouseEvent | KeyboardEvent): void {
    if (sugg) {
      this.navigateToSymbol(sugg);
    }
  }

  reset(): void {
    this.inputInfo = null;
  }

  private getSymbolTarget(
    activeSuggestion: AnySuggestion,
    activeLeaf: WorkspaceLeaf,
    isSymbolCmdPrefix: boolean,
  ): TargetInfo {
    const prevInputInfo = this.inputInfo;
    let prevTarget: TargetInfo = null;
    let prevMode: Mode = Mode.Standard;

    if (prevInputInfo) {
      prevTarget = (prevInputInfo.parsedCommand() as SymbolParsedCommand).target;
      prevMode = prevInputInfo.mode;
    }

    // figure out if the previous operation was a symbol operation
    const hasPrevSymbolTarget = prevMode === Mode.SymbolList && !!prevTarget;

    const activeSuggInfo = SymbolHandler.getActiveSuggestionInfo(activeSuggestion);
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

      const viewType = view.getViewType();
      file = view.file;

      // determine if the current active editor pane is valid
      isCurrentEditorValid = !excludeViewTypes.includes(viewType);

      if (viewType === 'markdown') {
        const md = view as MarkdownView;

        if (md.getMode() !== 'preview') {
          const { editor } = md;
          cursor = editor.getCursor('head');
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
        file = leaf.view?.file;
      } else {
        // this catches system File suggestion, Heading, and Alias suggestion
        file = activeSuggestion.file;
      }
    }

    return { isValidSymbolTarget, leaf, file, suggestion: activeSuggestion };
  }

  private getItems(target: TargetInfo, hasSearchTerm: boolean): SymbolInfo[] {
    let items: SymbolInfo[] = [];

    let symbolsInLineOrder = false;
    let selectNearestHeading = false;

    if (!hasSearchTerm) {
      ({ selectNearestHeading, symbolsInLineOrder } = this.settings);
    }

    items = this.getSymbolsForTarget(target, symbolsInLineOrder);

    if (selectNearestHeading) {
      SymbolHandler.FindNearestHeadingSymbol(items, target);
    }

    return items;
  }

  private static FindNearestHeadingSymbol(
    items: SymbolInfo[],
    targetInfo: TargetInfo,
  ): void {
    const cursorLine = targetInfo?.cursor?.line;

    // find the nearest heading to the current cursor pos, if applicable
    if (cursorLine) {
      const found = items
        .filter((v): v is SymbolInfo => isHeadingCache(v.symbol))
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

  private getSymbolsForTarget(
    targetInfo: TargetInfo,
    orderByLineNumber: boolean,
  ): SymbolInfo[] {
    const {
      app: { metadataCache },
      settings,
    } = this;
    const ret: SymbolInfo[] = [];

    if (targetInfo.file) {
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

    return orderByLineNumber ? SymbolHandler.orderSymbolsByLineNumber(ret) : ret;
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

  private static addSymbolIndicator(symbolInfo: SymbolInfo, parentEl: HTMLElement): void {
    const { symbolType, symbol } = symbolInfo;
    let indicator: string;

    if (isHeadingCache(symbol)) {
      indicator = HeadingIndicators[symbol.level];
    } else {
      indicator = SymbolIndicators[symbolType];
    }

    parentEl.createDiv({
      text: indicator,
      cls: 'qsp-symbol-indicator',
    });
  }

  private navigateToSymbol(sugg: SymbolSuggestion): void {
    const {
      app: { workspace },
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
      activateLeaf(workspace, leaf, true, eState);
    } else {
      const { isDesktop, isMobile } = Platform;
      const createNewLeaf = isDesktop || (isMobile && !useActivePaneForSymbolsOnMobile);

      workspace
        .openLinkText(path, '', createNewLeaf, { eState })
        .catch(() =>
          console.log(`Switcher++: unable to navigate to symbol for file ${path}`),
        );
    }
  }

  private findOpenEditorMatchingSymbolTarget(): TargetInfo {
    const {
      inputInfo,
      settings: { referenceViews, excludeViewTypes, includeSidePanelViewTypes },
      app: { workspace },
    } = this;
    const symbolCmd = inputInfo.parsedCommand() as SymbolParsedCommand;
    const { file, leaf } = symbolCmd.target;
    const isTargetLeaf = !!leaf;

    const predicate = (l: WorkspaceLeaf) => {
      let val = false;
      const isRefView = referenceViews.includes(l.view.getViewType());
      const isTargetRefView =
        isTargetLeaf && referenceViews.includes(leaf.view.getViewType());

      if (!isRefView) {
        val = isTargetLeaf && !isTargetRefView ? l === leaf : l.view?.file === file;
      }

      return val;
    };

    const l = getOpenLeaves(workspace, excludeViewTypes, includeSidePanelViewTypes).find(
      predicate,
    );

    return { leaf: l, file, suggestion: null, isValidSymbolTarget: false };
  }
}
