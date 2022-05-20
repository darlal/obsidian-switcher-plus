import {
  App,
  EditorPosition,
  fuzzySearch,
  Keymap,
  LinkCache,
  MarkdownView,
  Platform,
  ReferenceCache,
  renderResults,
  SearchResult,
  sortSearchResults,
  TFile,
  View,
  Workspace,
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
  getLinkType,
  getOpenLeaves,
  isEditorSuggestion,
  isHeadingCache,
  isStarredSuggestion,
  isFileStarredItem,
  isSymbolSuggestion,
  isTagCache,
  isTFile,
  isUnresolvedSuggestion,
  isWorkspaceSuggestion,
  openFileInLeaf,
  isCommandSuggestion,
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
          const { file } = symbolCmd.target;
          suggestions.push({ type: 'symbol', file, item, match });
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

  onChooseSuggestion(sugg: SymbolSuggestion, evt: MouseEvent | KeyboardEvent): void {
    if (sugg) {
      const isModDown = Keymap.isModEvent(evt);
      const symbolCmd = this.inputInfo.parsedCommand() as SymbolParsedCommand;
      const {
        app: { workspace },
        settings,
      } = this;

      SymbolHandler.navigateToSymbol(sugg, symbolCmd, isModDown, settings, workspace);
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

    const activeEditorInfo = this.getActiveEditorInfo(activeLeaf);
    const activeSuggInfo = this.getActiveSuggestionInfo(activeSuggestion);

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

      const viewType = view.getViewType();
      file = view.file;
      cursor = SymbolHandler.getCursorPos(view);

      // determine if the current active editor pane is valid
      const isCurrentEditorValid = !excludeViewTypes.includes(viewType);

      // whether or not the current active editor can be used as the target for
      // symbol search
      isValidSymbolTarget = isCurrentEditorValid && !!file;
    }

    return { isValidSymbolTarget, leaf: activeLeaf, file, suggestion: null, cursor };
  }

  private getActiveSuggestionInfo(activeSuggestion: AnySuggestion): TargetInfo {
    const info = this.getTargetInfoFromSuggestion(activeSuggestion);
    let leaf = info.leaf;

    if (info.isValidSymbolTarget) {
      // try to find a matching leaf for suggestion types that don't explicitly
      // provide one. This is primarily needed to be able to focus an
      // existing pane if there is one
      ({ leaf } = this.findOpenEditorMatchingSymbolTarget(info.file, info.leaf));
    }

    // Get the cursor information to support `selectNearestHeading`
    const cursor = SymbolHandler.getCursorPos(leaf?.view);

    return { ...info, leaf, cursor };
  }

  private getTargetInfoFromSuggestion(suggestion: AnySuggestion): TargetInfo {
    let file: TFile = null;
    let leaf: WorkspaceLeaf = null;

    // Can't use a symbol, workspace, unresolved (non-existent file) suggestions as
    // the target for another symbol command, because they don't point to a file
    const isFileBasedSuggestion =
      suggestion &&
      !isSymbolSuggestion(suggestion) &&
      !isUnresolvedSuggestion(suggestion) &&
      !isWorkspaceSuggestion(suggestion) &&
      !isCommandSuggestion(suggestion);

    if (isEditorSuggestion(suggestion)) {
      // note: this leaf could be a reference view, which is not usable for
      // `selectNearestHeading` because reference views don't have cursor information
      leaf = suggestion.item;
      file = leaf.view?.file;
    } else if (isStarredSuggestion(suggestion)) {
      // only starred files supported currently
      if (isFileStarredItem(suggestion.item)) {
        const path = suggestion.item.path;
        const abstractFile = this.app.vault.getAbstractFileByPath(path);

        if (isTFile(abstractFile)) {
          file = abstractFile;
        }
      }
    } else if (isFileBasedSuggestion) {
      // this catches system File suggestion, Heading, and Alias suggestion
      file = suggestion.file;
    }

    const isValidSymbolTarget = !!file;

    return { isValidSymbolTarget, leaf, file, suggestion };
  }

  private static getCursorPos(view: View): EditorPosition {
    let cursor: EditorPosition = null;

    if (view?.getViewType() === 'markdown') {
      const md = view as MarkdownView;

      if (md.getMode() !== 'preview') {
        const { editor } = md;
        cursor = editor.getCursor('head');
      }
    }

    return cursor;
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
      let found: SymbolInfo = null;
      const headings = items.filter((v): v is SymbolInfo => isHeadingCache(v.symbol));

      if (headings.length) {
        found = headings.reduce((acc, curr) => {
          const { line: currLine } = curr.symbol.position.start;
          const accLine = acc ? acc.symbol.position.start.line : -1;

          return currLine > accLine && currLine <= cursorLine ? curr : acc;
        });
      }

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
        this.addLinksFromTarget(symbolData.links, ret);
        push(symbolData.embeds, SymbolType.Embed);
      }
    }

    return orderByLineNumber ? SymbolHandler.orderSymbolsByLineNumber(ret) : ret;
  }

  private addLinksFromTarget(linkData: LinkCache[], symbolList: SymbolInfo[]): void {
    const { settings } = this;
    linkData = linkData ?? [];

    if (settings.isSymbolTypeEnabled(SymbolType.Link)) {
      for (const link of linkData) {
        const type = getLinkType(link);
        const isExcluded = (settings.excludeLinkSubTypes & type) === type;

        if (!isExcluded) {
          symbolList.push({
            type: 'symbolInfo',
            symbol: link,
            symbolType: SymbolType.Link,
          });
        }
      }
    }
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

  static navigateToSymbol(
    sugg: SymbolSuggestion,
    symbolCmd: SymbolParsedCommand,
    shouldCreateNewLeaf: boolean,
    settings: SwitcherPlusSettings,
    workspace: Workspace,
  ): void {
    const { alwaysNewPaneForSymbols, useActivePaneForSymbolsOnMobile } = settings;
    const { leaf, file } = symbolCmd.target;

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

    const { isMobile } = Platform;
    let createNewLeaf = shouldCreateNewLeaf || alwaysNewPaneForSymbols;

    if (isMobile) {
      createNewLeaf = shouldCreateNewLeaf || !useActivePaneForSymbolsOnMobile;
    }

    if (leaf && !createNewLeaf) {
      activateLeaf(workspace, leaf, true, eState);
    } else {
      openFileInLeaf(
        workspace,
        file,
        createNewLeaf,
        { eState },
        `Unable to navigate to symbol for file ${file.path}`,
      );
    }
  }

  private findOpenEditorMatchingSymbolTarget(
    file: TFile,
    leaf: WorkspaceLeaf,
  ): TargetInfo {
    const isTargetLeaf = !!leaf;
    const {
      settings: { referenceViews, excludeViewTypes, includeSidePanelViewTypes },
      app: { workspace },
    } = this;

    const isMatch = (l: WorkspaceLeaf) => {
      let val = false;

      if (l) {
        const isRefView = referenceViews.includes(l.view.getViewType());
        const isTargetRefView =
          isTargetLeaf && referenceViews.includes(leaf.view.getViewType());

        if (!isRefView) {
          val = isTargetLeaf && !isTargetRefView ? l === leaf : l.view?.file === file;
        }
      }

      return val;
    };

    // See if the active leaf matches first, otherwise find the first matching leaf,
    // if there is one
    let matchingLeaf = workspace.activeLeaf;
    if (!isMatch(matchingLeaf)) {
      const leaves = getOpenLeaves(
        workspace,
        excludeViewTypes,
        includeSidePanelViewTypes,
      );

      matchingLeaf = leaves.find(isMatch);
    }

    return {
      leaf: matchingLeaf ?? null,
      file,
      suggestion: null,
      isValidSymbolTarget: false,
    };
  }
}
