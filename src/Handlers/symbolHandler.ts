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
  App,
  BasesConfigFile,
  BaseViewData,
  CanvasFileView,
  CachedMetadata,
  LinkCache,
  parseYaml,
  Pos,
  ReferenceCache,
  renderResults,
  SearchResult,
  SectionCache,
  setIcon,
  sortSearchResults,
  TagCache,
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
import {
  FrontMatterParser,
  getLinkType,
  isCalloutCache,
  isHeadingCache,
  isTagCache,
} from 'src/utils';
import { InputInfo, ParsedCommand, SourcedParsedCommand } from 'src/switcherPlus';
import { Handler } from './handler';
import {
  BASE_VIEW_FACET_ID_MAP,
  CANVAS_NODE_FACET_ID_MAP,
  SwitcherPlusSettings,
} from 'src/settings';
import { Searcher } from 'src/search';

export type SymbolInfoExcludingSpecialFiles = Omit<SymbolInfo, 'symbol'> & {
  symbol: Exclude<AnySymbolInfoPayload, AllCanvasNodeData | BaseViewData>;
};

const CANVAS_ICON_MAP: Record<string, string> = {
  file: 'lucide-file-text',
  text: 'lucide-sticky-note',
  link: 'lucide-globe',
  group: 'create-group',
};

// Base views use different icons for each view type to provide visual distinction
const BASE_VIEW_ICON_MAP: Record<string, string> = {
  table: 'lucide-table',
  list: 'lucide-list',
  cards: 'lucide-layout-grid',
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

      const { query, hasSearchTerm } = inputInfo.parsedInputQuery;
      const searcher = Searcher.create(query);
      const symbolCmd = inputInfo.parsedCommand(Mode.SymbolList) as SourcedParsedCommand;
      const items = await this.getItems(symbolCmd.source, hasSearchTerm);

      items.forEach((item) => {
        let shouldPush = true;
        let match: SearchResult = null;

        if (hasSearchTerm) {
          const itemText = SymbolHandler.getSuggestionTextForSymbol(item);
          ({ match } = searcher.searchWithFallback(itemText));
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
      const { item, file, match } = sugg;
      const parentElClasses = ['qsp-suggestion-symbol'];

      if (
        Object.prototype.hasOwnProperty.call(item, 'indentLevel') &&
        this.settings.symbolsInLineOrder &&
        !this.inputInfo?.parsedInputQuery?.hasSearchTerm
      ) {
        parentElClasses.push(`qsp-symbol-l${item.indentLevel}`);
      }

      this.addClassesToSuggestionContainer(parentEl, parentElClasses);
      const { contentEl, titleEl } = Handler.createContentStructureElements(parentEl);

      SymbolHandler.renderSymbolContent(
        this.app,
        this.settings,
        titleEl,
        item,
        file,
        match,
      );

      this.renderHeadingBreadcrumbsInSymbolMode(contentEl, item.symbol, file);

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
      const openState = this.getOpenViewState(sugg);
      const { item } = sugg;

      this.navigateToLeafOrOpenFileAsync(
        evt,
        file,
        openState,
        leaf,
        Mode.SymbolList,
      ).then(
        () => {
          if (SymbolHandler.isCanvasSymbolPayload(item)) {
            this.zoomToCanvasNode(this.getActiveLeaf().view, item.symbol);
          }

          if (SymbolHandler.isBaseViewSymbolPayload(item)) {
            const baseView = item.symbol as BaseViewData;
            const filePath = sugg.file?.path;
            const linktext = `${filePath}#${baseView.name}`;

            // Dec 2025: there is not an API available to open/navigate to a specific
            // base file view, so use openLinkText() to simulate the open, hopefully this
            // should cause Obsidian to configure any internal state needed for the view.
            // Doing this after navigateToLeafOrOpenFileAsync() allows us to respect the
            // navigation preferences the user has configured, passing false as the last
            // param should force the 'open' to happen in the current tab.
            this.app.workspace.openLinkText(linktext, filePath, false).catch((err) => {
              console.log(
                `Switcher++: Unable to navigate to Base view ${baseView.name} in file ${filePath}`,
                err,
              );
            });
          }
        },
        (reason) => {
          console.log(
            `Switcher++: Unable to navigate to symbols for file ${file?.path}`,
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
    const isBaseFile = SymbolHandler.isBaseFile(cmd?.source?.file);
    const isCanvasFile = SymbolHandler.isCanvasFile(cmd?.source?.file);
    const facets = this.getFacets(inputInfo.mode);
    const baseViewFacetIds = new Set(Object.values(BASE_VIEW_FACET_ID_MAP));
    const canvasFacetIds = new Set(Object.values(CANVAS_NODE_FACET_ID_MAP));

    // get only the string values of SymbolType as they are used as the face ids
    const mdFacetIds = new Set(Object.values(SymbolType).filter((v) => isNaN(Number(v))));

    facets.forEach((facet) => {
      const { id } = facet;
      if (isBaseFile) {
        facet.isAvailable = baseViewFacetIds.has(id);
      } else if (isCanvasFile) {
        facet.isAvailable = canvasFacetIds.has(id);
      } else {
        facet.isAvailable = mdFacetIds.has(id);
      }
    });

    return facets.filter((v) => v.isAvailable);
  }

  zoomToCanvasNode(view: View, nodeData: CanvasNodeData): void {
    if (SymbolHandler.isCanvasView(view) && nodeData) {
      const canvas = view.canvas;
      const node = canvas.nodes.get(nodeData.id);

      canvas.selectOnly(node);
      canvas.zoomToSelection();
    }
  }

  override getPreferredViewLinePosition(sugg?: SymbolSuggestion): Pos {
    let position = super.getPreferredViewLinePosition();

    if (sugg?.item?.symbol) {
      const { item } = sugg;

      if (
        !SymbolHandler.isCanvasSymbolPayload(item) &&
        !SymbolHandler.isBaseViewSymbolPayload(item)
      ) {
        const symbolInfo = item as SymbolInfoExcludingSpecialFiles;
        position = symbolInfo.symbol.position;
      }
    }

    return position;
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
        items as SymbolInfoExcludingSpecialFiles[],
        sourceInfo,
      );
    }

    return items;
  }

  private static FindNearestHeadingSymbol(
    items: SymbolInfoExcludingSpecialFiles[],
    sourceInfo: SourceInfo,
  ): void {
    const cursorLine = sourceInfo?.cursor?.line;

    // find the nearest heading to the current cursor pos, if applicable
    if (cursorLine) {
      let found: SymbolInfo = null;
      const headings = items.filter((v): v is SymbolInfoExcludingSpecialFiles =>
        isHeadingCache(v.symbol),
      );

      if (headings.length) {
        found = headings.reduce(
          (acc, curr) => {
            const { line: currLine } = curr.symbol.position.start;
            const accLine = acc ? acc.symbol.position.start.line : -1;

            // If acc is null (first iteration), use curr if it meets the condition
            if (!acc) {
              return currLine <= cursorLine ? curr : null;
            }

            return currLine > accLine && currLine <= cursorLine ? curr : acc;
          },
          null as SymbolInfoExcludingSpecialFiles | null,
        );
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

      if (SymbolHandler.isBaseFile(file)) {
        await this.addBaseViewsFromSource(file, ret, activeFacetIds);
      } else if (SymbolHandler.isCanvasFile(file)) {
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
          this.addTagsFromSource(symbolData, ret, activeFacetIds);
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
              ret as SymbolInfoExcludingSpecialFiles[],
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

  /**
   * Extracts Base view information from a Base configuration file and adds them to the symbol list.
   * Base files contain YAML configuration that defines views (table, list, cards, etc.) which
   * can be navigated to in symbol mode.
   *
   * This method follows the same pattern as `addCanvasSymbolsFromSource()` but parses YAML
   * instead of JSON. It handles unknown view types by including them only when no facets are
   * active, allowing custom view types to be shown in the default unfiltered state.
   *
   * @param file - The Base configuration file (.base extension) to read
   * @param symbolList - The array to append extracted view symbols to
   * @param activeFacetIds - Set of active facet IDs used for filtering which views to include
   */
  async addBaseViewsFromSource(
    file: TFile,
    symbolList: SymbolInfo[],
    activeFacetIds: Set<string>,
  ): Promise<void> {
    let parsedData: BasesConfigFile;

    try {
      const fileContent = await this.app.vault.cachedRead(file);
      parsedData = parseYaml(fileContent) as BasesConfigFile;
    } catch (e) {
      console.log(
        `Switcher++: error reading file to extract base view information. ${file.path} `,
        e,
      );
      return;
    }

    // Handle case where parseYaml returns null/undefined for invalid YAML
    if (!parsedData) {
      return;
    }

    if (parsedData?.views && Array.isArray(parsedData.views)) {
      parsedData.views.forEach((view) => {
        const facetId = BASE_VIEW_FACET_ID_MAP[view.type];

        // For unknown view types (not in the facet map), include them only when no facets
        // are active. This allows custom view types to be shown in the default unfiltered
        // state while respecting facet filters when they are active.
        const shouldInclude = facetId
          ? this.shouldIncludeSymbol(facetId, activeFacetIds)
          : activeFacetIds.size === 0;

        if (shouldInclude) {
          symbolList.push({
            type: 'symbolInfo',
            symbolType: SymbolType.BaseView,
            symbol: {
              type: view.type,
              name: view.name,
            } as BaseViewData,
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
        const type: number = getLinkType(link);
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

  /**
   * Adds tags from both inline content and frontmatter to the symbol list.
   * Inline tags are added first (they have accurate position data), then frontmatter tags
   * are added with deduplication to avoid duplicates. Frontmatter tags use frontmatterPosition
   * for positioning, falling back to line 0 if not available.
   *
   * @param symbolData - The cached metadata containing tags and optional frontmatter
   * @param symbolList - The array to add symbol info objects to
   * @param activeFacetIds - Set of active facet IDs for filtering
   */
  private addTagsFromSource(
    symbolData: CachedMetadata,
    symbolList: SymbolInfo[],
    activeFacetIds: Set<string>,
  ): void {
    if (!this.shouldIncludeSymbol(SymbolType.Tag, activeFacetIds)) {
      return;
    }

    // Track tags we've already added (to avoid duplicates between inline and frontmatter)
    const addedTags = new Set<string>();

    // First, add inline tags (these have accurate position data)
    const inlineTags = symbolData.tags ?? [];
    for (const tag of inlineTags) {
      addedTags.add(tag.tag.toLowerCase());
      symbolList.push({
        type: 'symbolInfo',
        symbol: tag,
        symbolType: SymbolType.Tag,
      });
    }

    // Then, add frontmatter tags that aren't already in inline tags
    const frontmatter = symbolData.frontmatter;
    if (frontmatter) {
      const fmTags = FrontMatterParser.getTags(frontmatter);

      // Use frontmatterPosition if available, otherwise default to line 0
      const fmPosition = symbolData.frontmatterPosition ?? {
        start: { line: 0, col: 0, offset: 0 },
        end: { line: 0, col: 0, offset: 0 },
      };

      for (const tagStr of fmTags) {
        const normalizedTag = tagStr.startsWith('#') ? tagStr : `#${tagStr}`;

        // Skip if we already have this tag from inline
        if (addedTags.has(normalizedTag.toLowerCase())) {
          continue;
        }

        // Create a TagCache-like object for frontmatter tags
        const fmTagCache: TagCache = {
          tag: normalizedTag,
          position: fmPosition,
        };

        symbolList.push({
          type: 'symbolInfo',
          symbol: fmTagCache,
          symbolType: SymbolType.Tag,
        });
      }
    }
  }

  /**
   * Sorts symbols by their line number position in the file.
   * Base views and Canvas nodes are excluded from this method because they don't have
   * position data (unlike markdown symbols like headings, tags, links, etc.).
   *
   * @param symbols - Array of symbol info objects that have position data
   * @returns Sorted array with indent levels calculated based on heading hierarchy
   */
  private static orderSymbolsByLineNumber(
    symbols: SymbolInfoExcludingSpecialFiles[],
  ): SymbolInfoExcludingSpecialFiles[] {
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

  /**
   * Extracts markdown content from a symbol for HTML rendering purposes.
   * Returns the raw markdown string that should be rendered, or null if
   * the symbol type doesn't support markdown rendering.
   *
   * This method differs from `getSuggestionTextForSymbol()` in that it returns
   * the raw markdown content (e.g., tags include the `#` character) rather than
   * processed text suitable for display. The returned content is intended to be
   * passed to a markdown renderer for HTML conversion.
   *
   * @param symbolInfo - The symbol information containing the symbol payload
   * @param _sourceFile - The source file containing the symbol (currently unused
   *   but included for consistency with rendering methods and potential future use)
   * @returns The markdown content string, or null if the symbol type doesn't
   *   support markdown rendering (e.g., Embed, CanvasNode, BaseView)
   */
  static getMarkdownContentForSymbol(
    symbolInfo: SymbolInfo,
    _sourceFile: TFile,
  ): string | null {
    const { symbol } = symbolInfo;

    if (isHeadingCache(symbol)) {
      // Escape "N." at the start to prevent markdown from treating it as an ordered list
      return symbol.heading.replace(/^(\d+)\./, '$1\\.');
    }

    if (isTagCache(symbol)) {
      // Include the # character for tags (unlike getSuggestionTextForSymbol which slices it)
      return symbol.tag;
    }

    if (isCalloutCache(symbol)) {
      return symbol.calloutTitle;
    }

    // Handle Link types (ReferenceCache)
    const refCache = symbol as ReferenceCache;
    if (refCache.original) {
      return refCache.original;
    }

    // Return null for unsupported types (Embed, CanvasNode, BaseView)
    return null;
  }

  /**
   * Renders symbol content as either HTML (Live Preview) or raw text based on
   * configuration settings and optional override parameter.
   *
   * This method provides a unified rendering approach for all symbol types
   * (Headings, Links, Tags, Callouts) that can be used by both `SymbolHandler`
   * and `HeadingsHandler`. It determines the rendering mode by checking:
   * 1. The `renderAsHTMLOverride` parameter (if provided)
   * 2. The configuration setting via `config.shouldRenderSymbolAsHTML()`
   *
   * When HTML rendering is enabled, the markdown content is converted to HTML
   * asynchronously using Obsidian's markdown renderer. When raw text rendering
   * is used, search result highlighting is preserved.
   *
   * @param app - The Obsidian App instance
   * @param config - The SwitcherPlusSettings configuration
   * @param titleEl - The HTML element to render into
   * @param symbolInfo - The symbol information to render
   * @param sourceFile - The source file containing the symbol, used for
   *   resolving relative links during HTML rendering
   * @param searchResult - Optional search result for highlighting when rendering
   *   as raw text
   * @param renderAsHTMLOverride - Optional override to force HTML or text rendering.
   *   If `true`, renders as HTML regardless of config. If `false`, renders as raw
   *   text regardless of config. If `null` or `undefined`, falls back to config value.
   */
  static renderSymbolContent(
    app: App,
    config: SwitcherPlusSettings,
    titleEl: HTMLElement,
    symbolInfo: SymbolInfo,
    sourceFile: TFile,
    searchResult?: SearchResult,
    renderAsHTMLOverride?: boolean,
  ): void {
    // Get markdown content for HTML rendering
    const markdownContent = SymbolHandler.getMarkdownContentForSymbol(
      symbolInfo,
      sourceFile,
    );

    // Determine if HTML rendering should be used
    // If override is explicitly set (true/false), use it; otherwise check config
    const shouldRenderAsHTML =
      renderAsHTMLOverride ??
      (markdownContent !== null &&
        config.shouldRenderSymbolAsHTML(symbolInfo.symbolType));

    if (shouldRenderAsHTML && markdownContent !== null) {
      // Render as HTML using markdown renderer
      Handler.renderMarkdownContentAsync(app, titleEl, markdownContent, sourceFile.path);
    } else {
      // Render as raw text with search highlighting
      const text = SymbolHandler.getSuggestionTextForSymbol(symbolInfo);
      renderResults(titleEl, text, searchResult);
    }
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
    } else if (SymbolHandler.isCanvasSymbolPayload(symbolInfo)) {
      text = SymbolHandler.getSuggestionTextForCanvasNode(symbolInfo.symbol);
    } else if (SymbolHandler.isBaseViewSymbolPayload(symbolInfo)) {
      text = (symbolInfo.symbol as BaseViewData).name;
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
    } else if (SymbolHandler.isCanvasSymbolPayload(symbolInfo)) {
      const icon = CANVAS_ICON_MAP[symbolInfo.symbol.type];
      this.renderIndicator(flairContainerEl, flairElClasses, icon, null);
    } else if (SymbolHandler.isBaseViewSymbolPayload(symbolInfo)) {
      const baseView = symbolInfo.symbol as BaseViewData;
      // Use table icon as fallback for unknown view types
      const icon = BASE_VIEW_ICON_MAP[baseView.type] || BASE_VIEW_ICON_MAP.table;
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

  /**
   * Renders heading breadcrumbs when displaying a heading symbol in symbol mode.
   * This wraps the base class `renderHeadingBreadcrumbs()` method with a type guard
   * to ensure the symbol is a heading, and passes the symbol mode setting.
   *
   * @param contentEl - The containing element for the breadcrumb
   * @param symbol - The symbol payload to check and render
   * @param file - The file containing the heading
   */
  private renderHeadingBreadcrumbsInSymbolMode(
    contentEl: HTMLElement,
    symbol: AnySymbolInfoPayload,
    file: TFile,
  ): void {
    if (!isHeadingCache(symbol)) {
      return;
    }

    this.renderHeadingBreadcrumbs(
      contentEl,
      symbol,
      file,
      this.settings.showHeadingBreadcrumbsInSymbolMode,
    );
  }

  static isCanvasSymbolPayload(
    symbolInfo: SymbolInfo,
  ): symbolInfo is SymbolInfo & { symbol: AllCanvasNodeData } {
    return symbolInfo.symbolType === SymbolType.CanvasNode;
  }

  static isBaseViewSymbolPayload(
    symbolInfo: SymbolInfo,
  ): symbolInfo is SymbolInfo & { symbol: BaseViewData } {
    return symbolInfo.symbolType === SymbolType.BaseView;
  }

  static isCanvasFile(sourceFile: TFile): boolean {
    return sourceFile?.extension === 'canvas';
  }

  static isCanvasView(view: View): view is CanvasFileView {
    return view?.getViewType() === 'canvas';
  }

  /**
   * Determines if a file is a Base configuration file.
   * Base files are used to define views and configurations in Obsidian.
   *
   * @param sourceFile - The file to check, may be null or undefined.
   * @returns True if the file has a '.base' extension, false otherwise.
   */
  static isBaseFile(sourceFile: TFile): boolean {
    return sourceFile?.extension === 'base';
  }

  /**
   * Determines if a view is a Base view.
   * Unlike Canvas views, there's no specific BasesFileView type in Obsidian's type system,
   * so this method performs a simple runtime check using the view type string.
   *
   * @param view - The view to check, may be null or undefined.
   * @returns True if the view type is 'bases', false otherwise.
   */
  static isBaseView(view: View): boolean {
    return view?.getViewType() === 'bases';
  }
}
