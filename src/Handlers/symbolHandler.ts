import {
  AllCanvasNodeData,
  CanvasData,
  CanvasFileData,
  CanvasGroupData,
  CanvasLinkData,
  CanvasNodeData,
  CanvasTextData,
} from 'obsidian/canvas';
import {
  CanvasFileView,
  fuzzySearch,
  LinkCache,
  OpenViewState,
  ReferenceCache,
  SearchResult,
  SectionCache,
  setIcon,
  sortSearchResults,
  TFile,
  View,
  WorkspaceLeaf,
} from 'obsidian';
import {
  Mode,
  SymbolSuggestion,
  AnySuggestion,
  SourceInfo,
  SymbolInfo,
  AnySymbolInfoPayload,
  SymbolType,
  HeadingIndicators,
  SymbolIndicators,
  SuggestionType,
  CalloutCache,
  Facet,
  SessionOpts,
} from 'src/types';
import { getLinkType, isCalloutCache, isHeadingCache, isTagCache } from 'src/utils';
import { InputInfo, ParsedCommand, SourcedParsedCommand } from 'src/switcherPlus';
import { Handler } from './handler';
import { CANVAS_NODE_FACET_ID_MAP } from 'src/settings';

export type SymbolInfoExcludingCanvasNodes = Omit<SymbolInfo, 'symbol'> & {
  symbol: Exclude<AnySymbolInfoPayload, AllCanvasNodeData>;
};

const CANVAS_ICON_MAP: Record<string, string> = {
  file: 'lucide-file-text',
  text: 'lucide-sticky-note',
  link: 'lucide-globe',
  group: 'create-group',
};

export class SymbolHandler extends Handler<SymbolSuggestion> {
  inputInfo: InputInfo;

  getCommandString(sessionOpts?: SessionOpts): string {
    const { settings } = this;
    return sessionOpts?.useActiveEditorAsSource
      ? settings.symbolListActiveEditorCommand
      : settings.symbolListCommand;
  }

  validateCommand(
    inputInfo: InputInfo,
    index: number,
    filterText: string,
    activeSuggestion: AnySuggestion,
    activeLeaf: WorkspaceLeaf,
  ): ParsedCommand {
    const cmd = inputInfo.parsedCommand(Mode.SymbolList) as SourcedParsedCommand;
    const sourceInfo = this.getSourceInfoForSymbolOperation(
      activeSuggestion,
      activeLeaf,
      index === 0,
      inputInfo.sessionOpts,
    );

    if (sourceInfo) {
      inputInfo.mode = Mode.SymbolList;

      cmd.source = sourceInfo;
      cmd.index = index;
      cmd.parsedInput = filterText;
      cmd.isValidated = true;
    }

    return cmd;
  }

  override async getSuggestions(inputInfo: InputInfo): Promise<SymbolSuggestion[]> {
    const suggestions: SymbolSuggestion[] = [];

    if (inputInfo) {
      this.inputInfo = inputInfo;

      inputInfo.buildSearchQuery();
      const { hasSearchTerm, prepQuery } = inputInfo.searchQuery;
      const symbolCmd = inputInfo.parsedCommand(Mode.SymbolList) as SourcedParsedCommand;
      const items = await this.getItems(symbolCmd.source, hasSearchTerm);

      items.forEach((item) => {
        let shouldPush = true;
        let match: SearchResult = null;

        if (hasSearchTerm) {
          match = fuzzySearch(prepQuery, SymbolHandler.getSuggestionTextForSymbol(item));
          shouldPush = !!match;
        }

        if (shouldPush) {
          const { file } = symbolCmd.source;
          suggestions.push({ type: SuggestionType.SymbolList, file, item, match });
        }
      });

      if (hasSearchTerm) {
        sortSearchResults(suggestions);
      }
    }

    return suggestions;
  }

  renderSuggestion(sugg: SymbolSuggestion, parentEl: HTMLElement): boolean {
    let handled = false;
    if (sugg) {
      const { item } = sugg;
      const parentElClasses = ['qsp-suggestion-symbol'];

      if (
        Object.prototype.hasOwnProperty.call(item, 'indentLevel') &&
        this.settings.symbolsInLineOrder &&
        !this.inputInfo?.searchQuery?.hasSearchTerm
      ) {
        parentElClasses.push(`qsp-symbol-l${item.indentLevel}`);
      }

      this.addClassesToSuggestionContainer(parentEl, parentElClasses);

      const text = SymbolHandler.getSuggestionTextForSymbol(item);
      this.renderContent(parentEl, text, sugg.match);
      this.addSymbolIndicator(item, parentEl);
      handled = true;
    }

    return handled;
  }

  onChooseSuggestion(sugg: SymbolSuggestion, evt: MouseEvent | KeyboardEvent): boolean {
    let handled = false;
    if (sugg) {
      const symbolCmd = this.inputInfo.parsedCommand() as SourcedParsedCommand;
      const { leaf, file } = symbolCmd.source;
      const openState: OpenViewState = { active: true };
      const { item } = sugg;

      if (item.symbolType !== SymbolType.CanvasNode) {
        openState.eState = this.constructMDFileNavigationState(
          item as SymbolInfoExcludingCanvasNodes,
        ).eState as Record<string, unknown>;
      }

      this.navigateToLeafOrOpenFileAsync(
        evt,
        file,
        openState,
        leaf,
        Mode.SymbolList,
      ).then(
        () => {
          const { symbol } = item;

          if (SymbolHandler.isCanvasSymbolPayload(item, symbol)) {
            this.zoomToCanvasNode(this.getActiveLeaf().view, symbol);
          }
        },
        (reason) => {
          console.log(
            `Switcher++: Unable to navigate to symbols for file ${file.path}`,
            reason,
          );
        },
      );

      handled = true;
    }

    return handled;
  }

  override reset(): void {
    this.inputInfo = null;
  }

  override getAvailableFacets(inputInfo: InputInfo): Facet[] {
    const cmd = inputInfo.parsedCommand(Mode.SymbolList) as SourcedParsedCommand;
    const isCanvasFile = SymbolHandler.isCanvasFile(cmd?.source?.file);
    const facets = this.getFacets(inputInfo.mode);
    const canvasFacetIds = new Set(Object.values(CANVAS_NODE_FACET_ID_MAP));

    // get only the string values of SymbolType as they are used as the face ids
    const mdFacetIds = new Set(Object.values(SymbolType).filter((v) => isNaN(Number(v))));

    facets.forEach((facet) => {
      const { id } = facet;
      facet.isAvailable = isCanvasFile ? canvasFacetIds.has(id) : mdFacetIds.has(id);
    });

    return facets.filter((v) => v.isAvailable);
  }

  zoomToCanvasNode(view: View, nodeData: CanvasNodeData): void {
    if (SymbolHandler.isCanvasView(view)) {
      const canvas = view.canvas;
      const node = canvas.nodes.get(nodeData.id);

      canvas.selectOnly(node);
      canvas.zoomToSelection();
    }
  }

  constructMDFileNavigationState(
    symbolInfo: SymbolInfoExcludingCanvasNodes,
  ): OpenViewState {
    const {
      start: { line, col },
      end: endLoc,
    } = symbolInfo.symbol.position;

    // object containing the state information for the target editor,
    // start with the range to highlight in target editor
    return {
      eState: {
        active: true,
        focus: true,
        startLoc: { line, col },
        endLoc,
        line,
        cursor: {
          from: { line, ch: col },
          to: { line, ch: col },
        },
      },
    };
  }

  private getSourceInfoForSymbolOperation(
    activeSuggestion: AnySuggestion,
    activeLeaf: WorkspaceLeaf,
    isSymbolCmdPrefix: boolean,
    sessionOpts: SessionOpts,
  ): SourceInfo {
    const prevInputInfo = this.inputInfo;
    let prevSourceInfo: SourceInfo = null;
    let prevMode: Mode = Mode.Standard;

    if (prevInputInfo) {
      prevSourceInfo = (prevInputInfo.parsedCommand() as SourcedParsedCommand).source;
      prevMode = prevInputInfo.mode;
    }

    // figure out if the previous operation was a symbol operation
    const hasPrevSymbolSource = prevMode === Mode.SymbolList && !!prevSourceInfo;
    const activeEditorInfo = this.getEditorInfo(activeLeaf);
    const activeSuggInfo = this.getSuggestionInfo(activeSuggestion);

    // Pick the source file for a potential symbol operation, prioritizing
    // any pre-existing symbol operation that was in progress
    let sourceInfo: SourceInfo = null;
    if (hasPrevSymbolSource) {
      sourceInfo = prevSourceInfo;
    } else if (activeSuggInfo.isValidSource && !sessionOpts.useActiveEditorAsSource) {
      sourceInfo = activeSuggInfo;
    } else if (activeEditorInfo.isValidSource && isSymbolCmdPrefix) {
      // Check isSymbolCmdPrefix to prevent the case where an embedded command would
      // trigger this mode for the active editor.
      sourceInfo = activeEditorInfo;
    }

    return sourceInfo;
  }

  async getItems(sourceInfo: SourceInfo, hasSearchTerm: boolean): Promise<SymbolInfo[]> {
    let items: SymbolInfo[] = [];

    let symbolsInLineOrder = false;
    let selectNearestHeading = false;

    if (!hasSearchTerm) {
      ({ selectNearestHeading, symbolsInLineOrder } = this.settings);
    }

    items = await this.getSymbolsFromSource(sourceInfo, symbolsInLineOrder);

    if (selectNearestHeading) {
      SymbolHandler.FindNearestHeadingSymbol(
        items as SymbolInfoExcludingCanvasNodes[],
        sourceInfo,
      );
    }

    return items;
  }

  private static FindNearestHeadingSymbol(
    items: SymbolInfoExcludingCanvasNodes[],
    sourceInfo: SourceInfo,
  ): void {
    const cursorLine = sourceInfo?.cursor?.line;

    // find the nearest heading to the current cursor pos, if applicable
    if (cursorLine) {
      let found: SymbolInfo = null;
      const headings = items.filter((v): v is SymbolInfoExcludingCanvasNodes =>
        isHeadingCache(v.symbol),
      );

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

  async getSymbolsFromSource(
    sourceInfo: SourceInfo,
    orderByLineNumber: boolean,
  ): Promise<SymbolInfo[]> {
    const {
      app: { metadataCache },
      inputInfo,
    } = this;
    const ret: SymbolInfo[] = [];

    if (sourceInfo?.file) {
      const { file } = sourceInfo;
      const activeFacetIds = this.getActiveFacetIds(inputInfo);

      if (SymbolHandler.isCanvasFile(file)) {
        await this.addCanvasSymbolsFromSource(file, ret, activeFacetIds);
      } else {
        const symbolData = metadataCache.getFileCache(file);

        if (symbolData) {
          const push = (symbols: AnySymbolInfoPayload[] = [], symbolType: SymbolType) => {
            if (this.shouldIncludeSymbol(symbolType, activeFacetIds)) {
              symbols.forEach((symbol) =>
                ret.push({ type: 'symbolInfo', symbol, symbolType }),
              );
            }
          };

          push(symbolData.headings, SymbolType.Heading);
          push(symbolData.tags, SymbolType.Tag);
          this.addLinksFromSource(symbolData.links, ret, activeFacetIds);
          push(symbolData.embeds, SymbolType.Embed);

          await this.addCalloutsFromSource(
            file,
            symbolData.sections?.filter((v) => v.type === 'callout'),
            ret,
            activeFacetIds,
          );

          if (orderByLineNumber) {
            SymbolHandler.orderSymbolsByLineNumber(
              ret as SymbolInfoExcludingCanvasNodes[],
            );
          }
        }
      }
    }

    return ret;
  }

  shouldIncludeSymbol(
    symbolType: SymbolType | string,
    activeFacetIds: Set<string>,
  ): boolean {
    let shouldInclude = false;

    if (typeof symbolType === 'string') {
      shouldInclude = this.isFacetedWith(activeFacetIds, symbolType);
    } else {
      shouldInclude =
        this.settings.isSymbolTypeEnabled(symbolType) &&
        this.isFacetedWith(activeFacetIds, SymbolType[symbolType]);
    }

    return shouldInclude;
  }

  async addCanvasSymbolsFromSource(
    file: TFile,
    symbolList: SymbolInfo[],
    activeFacetIds: Set<string>,
  ): Promise<void> {
    let canvasNodes: AllCanvasNodeData[];

    try {
      const fileContent = await this.app.vault.cachedRead(file);
      canvasNodes = (JSON.parse(fileContent) as CanvasData).nodes;
    } catch (e) {
      console.log(
        `Switcher++: error reading file to extract canvas node information. ${file.path} `,
        e,
      );
    }

    if (Array.isArray(canvasNodes)) {
      canvasNodes.forEach((node) => {
        if (
          this.shouldIncludeSymbol(CANVAS_NODE_FACET_ID_MAP[node.type], activeFacetIds)
        ) {
          symbolList.push({
            type: 'symbolInfo',
            symbolType: SymbolType.CanvasNode,
            symbol: { ...node },
          });
        }
      });
    }
  }

  async addCalloutsFromSource(
    file: TFile,
    sectionCache: SectionCache[],
    symbolList: SymbolInfo[],
    activeFacetIds: Set<string>,
  ): Promise<void> {
    const {
      app: { vault },
    } = this;

    const shouldInclude = this.shouldIncludeSymbol(SymbolType.Callout, activeFacetIds);

    if (shouldInclude && sectionCache?.length && file) {
      let fileContent: string = null;

      try {
        fileContent = await vault.cachedRead(file);
      } catch (e) {
        console.log(
          `Switcher++: error reading file to extract callout information. ${file.path} `,
          e,
        );
      }

      if (fileContent) {
        for (const cache of sectionCache) {
          const { start, end } = cache.position;
          const calloutStr = fileContent.slice(start.offset, end.offset);
          const match = calloutStr.match(/^> \[!([^\]]+)\][+-]?(.*?)(?:\n>|$)/);

          if (match) {
            const calloutType = match[1];
            const calloutTitle = match[match.length - 1];
            const symbol: CalloutCache = {
              calloutTitle: calloutTitle.trim(),
              calloutType,
              ...cache,
            };

            symbolList.push({
              type: 'symbolInfo',
              symbolType: SymbolType.Callout,
              symbol,
            });
          }
        }
      }
    }
  }

  private addLinksFromSource(
    linkData: LinkCache[],
    symbolList: SymbolInfo[],
    activeFacetIds: Set<string>,
  ): void {
    const { settings } = this;
    linkData = linkData ?? [];

    if (this.shouldIncludeSymbol(SymbolType.Link, activeFacetIds)) {
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

  private static orderSymbolsByLineNumber(
    symbols: SymbolInfoExcludingCanvasNodes[],
  ): SymbolInfoExcludingCanvasNodes[] {
    const sorted = symbols.sort((a, b) => {
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

  static getSuggestionTextForSymbol(symbolInfo: SymbolInfo): string {
    const { symbol } = symbolInfo;
    let text;

    if (isHeadingCache(symbol)) {
      text = symbol.heading;
    } else if (isTagCache(symbol)) {
      text = symbol.tag.slice(1);
    } else if (isCalloutCache(symbol)) {
      text = symbol.calloutTitle;
    } else if (SymbolHandler.isCanvasSymbolPayload(symbolInfo, symbol)) {
      text = SymbolHandler.getSuggestionTextForCanvasNode(symbol);
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

  static getSuggestionTextForCanvasNode(node: AllCanvasNodeData): string {
    let text = '';

    const accessors: Record<string, () => string> = {
      file: () => (node as CanvasFileData).file,
      text: () => (node as CanvasTextData).text,
      link: () => (node as CanvasLinkData).url,
      group: () => (node as CanvasGroupData).label,
    };

    const fn = accessors[node?.type];
    if (fn) {
      text = fn();
    }

    return text;
  }

  addSymbolIndicator(symbolInfo: SymbolInfo, parentEl: HTMLElement): void {
    const { symbolType, symbol } = symbolInfo;
    const flairElClasses = ['qsp-symbol-indicator'];
    const flairContainerEl = this.createFlairContainer(parentEl);

    if (isCalloutCache(symbol)) {
      flairElClasses.push(...['suggestion-flair', 'callout', 'callout-icon', 'svg-icon']);
      const calloutFlairEl = flairContainerEl.createSpan({
        cls: flairElClasses,
        // Obsidian 0.15.9: the icon glyph is set in css based on the data-callout attr
        attr: { 'data-callout': symbol.calloutType },
      });

      // Obsidian 0.15.9 the --callout-icon css prop holds the name of the icon glyph
      const iconName = calloutFlairEl.getCssPropertyValue('--callout-icon');
      setIcon(calloutFlairEl, iconName);
    } else if (SymbolHandler.isCanvasSymbolPayload(symbolInfo, symbol)) {
      const icon = CANVAS_ICON_MAP[symbol.type];
      this.renderIndicator(flairContainerEl, flairElClasses, icon, null);
    } else {
      let indicator: string;

      if (isHeadingCache(symbol)) {
        indicator = HeadingIndicators[symbol.level];
      } else {
        indicator = SymbolIndicators[symbolType];
      }

      this.renderIndicator(flairContainerEl, flairElClasses, null, indicator);
    }
  }

  static isCanvasSymbolPayload(
    symbolInfo: SymbolInfo,
    payload: AnySymbolInfoPayload,
  ): payload is AllCanvasNodeData {
    return symbolInfo.symbolType === SymbolType.CanvasNode;
  }

  static isCanvasFile(sourceFile: TFile): boolean {
    return sourceFile?.extension === 'canvas';
  }

  static isCanvasView(view: View): view is CanvasFileView {
    return view?.getViewType() === 'canvas';
  }
}
