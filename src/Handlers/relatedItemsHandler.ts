import { StandardExHandler } from './standardExHandler';
import {
  sortSearchResults,
  WorkspaceLeaf,
  TFile,
  TAbstractFile,
  TFolder,
} from 'obsidian';
import {
  AnySuggestion,
  MatchType,
  Mode,
  RelatedItemsInfo,
  RelatedItemsSuggestion,
  RelationType,
  SearchResultWithFallback,
  SessionOpts,
  SourceInfo,
  SuggestionType,
  TitleSource,
  UnresolvedSuggestion,
} from 'src/types';
import {
  InputInfo,
  ParsedCommand,
  SourcedParsedCommand,
  WorkspaceEnvList,
} from 'src/switcherPlus';
import { Handler } from './handler';
import { isTFile, isUnresolvedSuggestion, matcherFnForRegExList } from 'src/utils';
import { Searcher, StringSearcher } from 'src/search';

export class RelatedItemsHandler extends Handler<
  RelatedItemsSuggestion | UnresolvedSuggestion
> {
  private inputInfo: InputInfo;

  getCommandString(sessionOpts?: SessionOpts): string {
    const { settings } = this;
    return sessionOpts?.useActiveEditorAsSource
      ? settings.relatedItemsListActiveEditorCommand
      : settings.relatedItemsListCommand;
  }

  validateCommand(
    inputInfo: InputInfo,
    index: number,
    filterText: string,
    activeSuggestion: AnySuggestion,
    activeLeaf: WorkspaceLeaf,
  ): ParsedCommand {
    const cmd = inputInfo.parsedCommand(Mode.RelatedItemsList) as SourcedParsedCommand;
    const sourceInfo = this.getSourceInfo(
      activeSuggestion,
      activeLeaf,
      index === 0,
      inputInfo.sessionOpts,
    );

    if (sourceInfo) {
      inputInfo.mode = Mode.RelatedItemsList;

      cmd.source = sourceInfo;
      cmd.index = index;
      cmd.parsedInput = filterText;
      cmd.isValidated = true;
    }

    return cmd;
  }

  getSuggestions(
    inputInfo: InputInfo,
  ): (RelatedItemsSuggestion | UnresolvedSuggestion)[] {
    const suggestions: (RelatedItemsSuggestion | UnresolvedSuggestion)[] = [];

    if (inputInfo) {
      this.inputInfo = inputInfo;
      const searcher = Searcher.create(inputInfo.parsedInputQuery.query);
      const cmd = inputInfo.parsedCommand(Mode.RelatedItemsList) as SourcedParsedCommand;
      const items = this.getItems(cmd.source, inputInfo);

      items.forEach((item) => {
        const sugg = this.searchAndCreateSuggestion(inputInfo, searcher, item);
        if (sugg) {
          suggestions.push(sugg);
        }
      });

      if (searcher.hasSearchTerm) {
        sortSearchResults(suggestions);
      }
    }

    return suggestions;
  }

  renderSuggestion(sugg: RelatedItemsSuggestion, parentEl: HTMLElement): boolean {
    let handled = false;
    if (sugg) {
      const { file, matchType, match, item } = sugg;

      const iconMap = new Map<RelationType, string>([
        [RelationType.Backlink, 'links-coming-in'],
        [RelationType.DiskLocation, 'folder-tree'],
        [RelationType.OutgoingLink, 'links-going-out'],
      ]);

      parentEl.setAttribute('data-relation-type', item.relationType);

      this.renderAsFileInfoPanel(
        parentEl,
        ['qsp-suggestion-related'],
        sugg.preferredTitle,
        file,
        matchType,
        match,
      );

      const flairContainerEl = this.renderOptionalIndicators(parentEl, sugg);

      if (sugg.item.count) {
        // show the count of backlinks
        this.renderIndicator(flairContainerEl, [], null, `${sugg.item.count}`);
      }

      // render the flair icon
      this.renderIndicator(
        flairContainerEl,
        ['qsp-related-indicator'],
        iconMap.get(item.relationType),
      );

      handled = true;
    }

    return handled;
  }

  onChooseSuggestion(
    sugg: RelatedItemsSuggestion,
    evt: MouseEvent | KeyboardEvent,
  ): boolean {
    let handled = false;
    if (sugg) {
      const { file } = sugg;

      this.navigateToLeafOrOpenFile(
        evt,
        file,
        `Unable to open related file ${file.path}`,
      );

      handled = true;
    }

    return handled;
  }

  getPreferredTitle(item: RelatedItemsInfo, preferredSource: TitleSource): string {
    let text: string = null;
    const { file, unresolvedText } = item;

    if (file) {
      if (preferredSource === 'H1') {
        text = this.getFirstH1(file)?.heading ?? null;
      }
    } else {
      const isUnresolved = !!unresolvedText?.length;

      if (isUnresolved) {
        text = unresolvedText;
      }
    }

    return text;
  }

  searchAndCreateSuggestion(
    inputInfo: InputInfo,
    searcher: StringSearcher,
    item: RelatedItemsInfo,
  ): RelatedItemsSuggestion | UnresolvedSuggestion | null {
    const { file, unresolvedText } = item;
    let result: SearchResultWithFallback = { matchType: MatchType.None, match: null };
    const isUnresolved = file === null && unresolvedText?.length;

    const { currentWorkspaceEnvList } = inputInfo;

    const {
      settings,
      app: { metadataCache },
    } = this;

    const preferredTitle = this.getPreferredTitle(item, settings.preferredSourceForTitle);

    if (searcher.hasSearchTerm) {
      result = searcher.searchWithFallback(preferredTitle, file);
      if (result.matchType === MatchType.None) {
        return null;
      }
    }

    return isUnresolved
      ? StandardExHandler.createUnresolvedSuggestion(
          preferredTitle,
          result,
          settings,
          metadataCache,
        )
      : this.createSuggestion(currentWorkspaceEnvList, item, result, preferredTitle);
  }

  getItems(sourceInfo: SourceInfo, inputInfo: InputInfo): RelatedItemsInfo[] {
    const relatedItems: RelatedItemsInfo[] = [];
    const { metadataCache } = this.app;
    const { file, suggestion } = sourceInfo;
    const enabledRelatedItems = new Set(this.settings.enabledRelatedItems);
    const activeFacetIds = this.getActiveFacetIds(inputInfo);

    const shouldIncludeRelation = (relationType: RelationType) => {
      return (
        enabledRelatedItems.has(relationType) &&
        this.isFacetedWith(activeFacetIds, relationType)
      );
    };

    if (shouldIncludeRelation(RelationType.Backlink)) {
      let targetPath = file?.path;
      let linkMap = metadataCache.resolvedLinks;

      if (isUnresolvedSuggestion(suggestion)) {
        targetPath = suggestion.linktext;
        linkMap = metadataCache.unresolvedLinks;
      }

      this.addBacklinks(targetPath, linkMap, relatedItems);
    }

    if (shouldIncludeRelation(RelationType.DiskLocation)) {
      this.addRelatedDiskFiles(file, relatedItems);
    }

    if (shouldIncludeRelation(RelationType.OutgoingLink)) {
      this.addOutgoingLinks(file, relatedItems);
    }

    return relatedItems;
  }

  addRelatedDiskFiles(sourceFile: TFile, collection: RelatedItemsInfo[]): void {
    const { excludeRelatedFolders, excludeOpenRelatedFiles } = this.settings;

    if (sourceFile) {
      const isExcludedFolder = matcherFnForRegExList(excludeRelatedFolders);
      let nodes: TAbstractFile[] = [...sourceFile.parent.children];

      while (nodes.length > 0) {
        const node = nodes.pop();

        if (isTFile(node)) {
          const isSourceFile = node === sourceFile;
          const isExcluded =
            isSourceFile ||
            (excludeOpenRelatedFiles && !!this.findMatchingLeaf(node).leaf);

          if (!isExcluded) {
            collection.push({ file: node, relationType: RelationType.DiskLocation });
          }
        } else if (!isExcludedFolder(node.path)) {
          nodes = nodes.concat((node as TFolder).children);
        }
      }
    }
  }

  addOutgoingLinks(sourceFile: TFile, collection: RelatedItemsInfo[]): void {
    if (sourceFile) {
      const destUnresolved = new Map<string, RelatedItemsInfo>();
      const destFiles = new Map<TFile, RelatedItemsInfo>();
      const { metadataCache } = this.app;
      const outgoingLinks = metadataCache.getFileCache(sourceFile).links ?? [];
      const incrementCount = (info: RelatedItemsInfo) =>
        info ? !!(info.count += 1) : false;

      outgoingLinks.forEach((linkCache) => {
        const destPath = linkCache.link;
        const destFile = metadataCache.getFirstLinkpathDest(destPath, sourceFile.path);
        let info: RelatedItemsInfo;

        if (destFile) {
          if (!incrementCount(destFiles.get(destFile)) && destFile !== sourceFile) {
            info = { file: destFile, relationType: RelationType.OutgoingLink, count: 1 };
            destFiles.set(destFile, info);
            collection.push(info);
          }
        } else {
          if (!incrementCount(destUnresolved.get(destPath))) {
            info = {
              file: null,
              relationType: RelationType.OutgoingLink,
              unresolvedText: destPath,
              count: 1,
            };

            destUnresolved.set(destPath, info);
            collection.push(info);
          }
        }
      });
    }
  }

  addBacklinks(
    targetPath: string,
    linkMap: Record<string, Record<string, number>>,
    collection: RelatedItemsInfo[],
  ): void {
    for (const [originFilePath, destPathMap] of Object.entries(linkMap)) {
      if (
        originFilePath !== targetPath &&
        Object.prototype.hasOwnProperty.call(destPathMap, targetPath)
      ) {
        const count = destPathMap[targetPath];
        const originFile = this.getTFileByPath(originFilePath);

        if (originFile) {
          collection.push({
            count,
            file: originFile,
            relationType: RelationType.Backlink,
          });
        }
      }
    }
  }

  override reset(): void {
    this.inputInfo = null;
  }

  private getSourceInfo(
    activeSuggestion: AnySuggestion,
    activeLeaf: WorkspaceLeaf,
    isPrefixCmd: boolean,
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
    const hasPrevSource = prevMode === Mode.RelatedItemsList && !!prevSourceInfo;
    const activeEditorInfo = this.getEditorInfo(activeLeaf);
    const activeSuggInfo = this.getSuggestionInfo(activeSuggestion);

    if (!activeSuggInfo.isValidSource && isUnresolvedSuggestion(activeSuggestion)) {
      // related items supports retrieving backlinks for unresolved suggestion, so
      // force UnresolvedSuggestion to be valid, even though it would otherwise not be
      activeSuggInfo.isValidSource = true;
    }

    // Pick the source file for the operation, prioritizing
    // any pre-existing operation that was in progress
    let sourceInfo: SourceInfo = null;
    if (hasPrevSource) {
      sourceInfo = prevSourceInfo;
    } else if (activeSuggInfo.isValidSource && !sessionOpts.useActiveEditorAsSource) {
      sourceInfo = activeSuggInfo;
    } else if (activeEditorInfo.isValidSource && isPrefixCmd) {
      sourceInfo = activeEditorInfo;
    }

    return sourceInfo;
  }

  createSuggestion(
    currentWorkspaceEnvList: WorkspaceEnvList,
    item: RelatedItemsInfo,
    result: SearchResultWithFallback,
    preferredTitle: string,
  ): RelatedItemsSuggestion {
    let sugg: RelatedItemsSuggestion = {
      item,
      file: item?.file,
      type: SuggestionType.RelatedItemsList,
      preferredTitle,
      ...result,
    };

    sugg = Handler.updateWorkspaceEnvListStatus(currentWorkspaceEnvList, sugg);
    return this.applyMatchPriorityPreferences(sugg);
  }
}
