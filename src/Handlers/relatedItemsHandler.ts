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
  SourceInfo,
  SuggestionType,
  UnresolvedSuggestion,
} from 'src/types';
import { InputInfo, SourcedParsedCommand, WorkspaceEnvList } from 'src/switcherPlus';
import { Handler } from './handler';
import { isTFile, isUnresolvedSuggestion, matcherFnForRegExList } from 'src/utils';

export class RelatedItemsHandler extends Handler<
  RelatedItemsSuggestion | UnresolvedSuggestion
> {
  private inputInfo: InputInfo;

  override get commandString(): string {
    return this.settings?.relatedItemsListCommand;
  }

  validateCommand(
    inputInfo: InputInfo,
    index: number,
    filterText: string,
    activeSuggestion: AnySuggestion,
    activeLeaf: WorkspaceLeaf,
  ): void {
    const sourceInfo = this.getSourceInfo(activeSuggestion, activeLeaf, index === 0);

    if (sourceInfo) {
      inputInfo.mode = Mode.RelatedItemsList;

      const cmd = inputInfo.parsedCommand(Mode.RelatedItemsList) as SourcedParsedCommand;

      cmd.source = sourceInfo;
      cmd.index = index;
      cmd.parsedInput = filterText;
      cmd.isValidated = true;
    }
  }

  getSuggestions(
    inputInfo: InputInfo,
  ): (RelatedItemsSuggestion | UnresolvedSuggestion)[] {
    const suggestions: (RelatedItemsSuggestion | UnresolvedSuggestion)[] = [];

    if (inputInfo) {
      this.inputInfo = inputInfo;
      inputInfo.buildSearchQuery();

      const { hasSearchTerm } = inputInfo.searchQuery;
      const cmd = inputInfo.parsedCommand(Mode.RelatedItemsList) as SourcedParsedCommand;
      const items = this.getItems(cmd.source);

      items.forEach((item) => {
        const sugg = this.searchAndCreateSuggestion(inputInfo, item);
        if (sugg) {
          suggestions.push(sugg);
        }
      });

      if (hasSearchTerm) {
        sortSearchResults(suggestions);
      }
    }

    return suggestions;
  }

  renderSuggestion(sugg: RelatedItemsSuggestion, parentEl: HTMLElement): void {
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
        null,
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
    }
  }

  onChooseSuggestion(
    sugg: RelatedItemsSuggestion,
    evt: MouseEvent | KeyboardEvent,
  ): void {
    if (sugg) {
      const { file } = sugg;

      this.navigateToLeafOrOpenFile(
        evt,
        file,
        `Unable to open related file ${file.path}`,
      );
    }
  }

  searchAndCreateSuggestion(
    inputInfo: InputInfo,
    item: RelatedItemsInfo,
  ): RelatedItemsSuggestion | UnresolvedSuggestion | null {
    let primaryString = null;
    let file = item.file;
    let result: SearchResultWithFallback = { matchType: MatchType.None, match: null };
    const isUnresolved = file === null && item.unresolvedText?.length;
    const {
      currentWorkspaceEnvList,
      searchQuery: { hasSearchTerm, prepQuery },
    } = inputInfo;
    const {
      settings,
      app: { metadataCache },
    } = this;

    if (isUnresolved) {
      primaryString = item.unresolvedText;
      file = null;
    }

    if (hasSearchTerm) {
      result = this.fuzzySearchWithFallback(prepQuery, primaryString, file);
      if (result.matchType === MatchType.None) {
        return null;
      }
    }

    return isUnresolved
      ? StandardExHandler.createUnresolvedSuggestion(
          primaryString,
          result,
          settings,
          metadataCache,
        )
      : this.createSuggestion(currentWorkspaceEnvList, item, result);
  }

  getItems(sourceInfo: SourceInfo): RelatedItemsInfo[] {
    const relatedItems: RelatedItemsInfo[] = [];
    const { metadataCache } = this.app;
    const { enabledRelatedItems } = this.settings;
    const { file, suggestion } = sourceInfo;

    enabledRelatedItems.forEach((relationType) => {
      if (relationType === RelationType.Backlink) {
        let targetPath = file?.path;
        let linkMap = metadataCache.resolvedLinks;

        if (isUnresolvedSuggestion(suggestion)) {
          targetPath = suggestion.linktext;
          linkMap = metadataCache.unresolvedLinks;
        }

        this.addBacklinks(targetPath, linkMap, relatedItems);
      } else if (relationType === RelationType.DiskLocation) {
        this.addRelatedDiskFiles(file, relatedItems);
      } else {
        this.addOutgoingLinks(file, relatedItems);
      }
    });

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
    } else if (activeSuggInfo.isValidSource) {
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
  ): RelatedItemsSuggestion {
    let sugg: RelatedItemsSuggestion = {
      item,
      file: item?.file,
      type: SuggestionType.RelatedItemsList,
      ...result,
    };

    sugg = Handler.updateWorkspaceEnvListStatus(currentWorkspaceEnvList, sugg);
    return this.applyMatchPriorityPreferences(sugg);
  }
}
