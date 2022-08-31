import {
  fuzzySearch,
  LinkCache,
  ReferenceCache,
  SearchResult,
  SectionCache,
  setIcon,
  sortSearchResults,
  TFile,
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
} from 'src/types';
import { getLinkType, isCalloutCache, isHeadingCache, isTagCache } from 'src/utils';
import { InputInfo, SourcedParsedCommand } from 'src/switcherPlus';
import { Handler } from './handler';

export class SymbolHandler extends Handler<SymbolSuggestion> {
  private inputInfo: InputInfo;

  override get commandString(): string {
    return this.settings?.symbolListCommand;
  }

  validateCommand(
    inputInfo: InputInfo,
    index: number,
    filterText: string,
    activeSuggestion: AnySuggestion,
    activeLeaf: WorkspaceLeaf,
  ): void {
    const sourceInfo = this.getSourceInfoForSymbolOperation(
      activeSuggestion,
      activeLeaf,
      index === 0,
    );

    if (sourceInfo) {
      inputInfo.mode = Mode.SymbolList;

      const symbolCmd = inputInfo.parsedCommand(Mode.SymbolList) as SourcedParsedCommand;

      symbolCmd.source = sourceInfo;
      symbolCmd.index = index;
      symbolCmd.parsedInput = filterText;
      symbolCmd.isValidated = true;
    }
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

  renderSuggestion(sugg: SymbolSuggestion, parentEl: HTMLElement): void {
    if (sugg) {
      const { item } = sugg;
      const parentElClasses = ['qsp-suggestion-symbol'];

      if (
        this.settings.symbolsInLineOrder &&
        !this.inputInfo?.searchQuery?.hasSearchTerm
      ) {
        parentElClasses.push(`qsp-symbol-l${item.indentLevel}`);
      }

      this.addClassesToSuggestionContainer(parentEl, parentElClasses);

      const text = SymbolHandler.getSuggestionTextForSymbol(item);
      this.renderContent(parentEl, text, sugg.match);
      this.addSymbolIndicator(item, parentEl);
    }
  }

  onChooseSuggestion(sugg: SymbolSuggestion, evt: MouseEvent | KeyboardEvent): void {
    if (sugg) {
      const symbolCmd = this.inputInfo.parsedCommand() as SourcedParsedCommand;
      const { leaf, file } = symbolCmd.source;

      const {
        start: { line, col },
        end: endLoc,
      } = sugg.item.symbol.position;

      // object containing the state information for the target editor,
      // start with the range to highlight in target editor
      const eState = {
        active: true,
        focus: true,
        startLoc: { line, col },
        endLoc,
        line,
        cursor: {
          from: { line, ch: col },
          to: { line, ch: col },
        },
      };

      this.navigateToLeafOrOpenFile(
        evt,
        file,
        `Unable to navigate to symbol for file ${file.path}`,
        { active: true, eState },
        leaf,
        Mode.SymbolList,
      );
    }
  }

  reset(): void {
    this.inputInfo = null;
  }

  private getSourceInfoForSymbolOperation(
    activeSuggestion: AnySuggestion,
    activeLeaf: WorkspaceLeaf,
    isSymbolCmdPrefix: boolean,
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
    } else if (activeSuggInfo.isValidSource) {
      sourceInfo = activeSuggInfo;
    } else if (activeEditorInfo.isValidSource && isSymbolCmdPrefix) {
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
      SymbolHandler.FindNearestHeadingSymbol(items, sourceInfo);
    }

    return items;
  }

  private static FindNearestHeadingSymbol(
    items: SymbolInfo[],
    sourceInfo: SourceInfo,
  ): void {
    const cursorLine = sourceInfo?.cursor?.line;

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

  async getSymbolsFromSource(
    sourceInfo: SourceInfo,
    orderByLineNumber: boolean,
  ): Promise<SymbolInfo[]> {
    const {
      app: { metadataCache },
      settings,
    } = this;
    const ret: SymbolInfo[] = [];

    if (sourceInfo?.file) {
      const file = sourceInfo.file;
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
        this.addLinksFromSource(symbolData.links, ret);
        push(symbolData.embeds, SymbolType.Embed);

        await this.addCalloutsFromSource(
          file,
          symbolData.sections?.filter((v) => v.type === 'callout'),
          ret,
        );
      }
    }

    return orderByLineNumber ? SymbolHandler.orderSymbolsByLineNumber(ret) : ret;
  }

  async addCalloutsFromSource(
    file: TFile,
    sectionCache: SectionCache[],
    symbolList: SymbolInfo[],
  ): Promise<void> {
    const {
      app: { vault },
      settings,
    } = this;

    const isCalloutEnabled = settings.isSymbolTypeEnabled(SymbolType.Callout);

    if (isCalloutEnabled && sectionCache?.length && file) {
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

  private addLinksFromSource(linkData: LinkCache[], symbolList: SymbolInfo[]): void {
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

  private static orderSymbolsByLineNumber(symbols: SymbolInfo[]): SymbolInfo[] {
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

  static getSuggestionTextForSymbol(symbolInfo: SymbolInfo): string {
    const { symbol } = symbolInfo;
    let text;

    if (isHeadingCache(symbol)) {
      text = symbol.heading;
    } else if (isTagCache(symbol)) {
      text = symbol.tag.slice(1);
    } else if (isCalloutCache(symbol)) {
      text = symbol.calloutTitle;
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

  addSymbolIndicator(symbolInfo: SymbolInfo, parentEl: HTMLElement): void {
    const { symbolType, symbol } = symbolInfo;
    const flairElClasses = ['suggestion-flair', 'qsp-symbol-indicator'];
    const flairContainerEl = this.createFlairContainer(parentEl);

    if (isCalloutCache(symbol)) {
      flairElClasses.push(...['callout', 'callout-icon', 'svg-icon']);
      const calloutFlairEl = flairContainerEl.createSpan({
        cls: flairElClasses,
        // Obsidian 0.15.9: the icon glyph is set in css based on the data-callout attr
        attr: { 'data-callout': symbol.calloutType },
      });

      // Obsidian 0.15.9 the --callout-icon css prop holds the name of the icon glyph
      const iconName = calloutFlairEl.getCssPropertyValue('--callout-icon');
      setIcon(calloutFlairEl, iconName);
    } else {
      let indicator: string;

      if (isHeadingCache(symbol)) {
        indicator = HeadingIndicators[symbol.level];
      } else {
        indicator = SymbolIndicators[symbolType];
      }

      flairContainerEl.createSpan({
        cls: flairElClasses,
        text: indicator,
      });
    }
  }
}
