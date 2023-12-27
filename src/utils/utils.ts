import {
  App,
  HeadingCache,
  InstalledPlugin,
  LinkCache,
  QuickSwitcherPluginInstance,
  TagCache,
  TFile,
  PluginInstance,
  FileManager,
  ReferenceCache,
  parseLinktext,
  Vault,
} from 'obsidian';
import {
  SymbolSuggestion,
  EditorSuggestion,
  FileSuggestion,
  AliasSuggestion,
  UnresolvedSuggestion,
  AnySystemSuggestion,
  HeadingSuggestion,
  AnySuggestion,
  AnyExSuggestion,
  LinkType,
  SuggestionType,
  CalloutCache,
} from 'src/types';

export function isOfType<T>(
  obj: unknown,
  discriminator: keyof T,
  val?: unknown,
): obj is T {
  let ret = false;

  if (obj && (obj as T)[discriminator] !== undefined) {
    ret = true;
    if (val !== undefined && val !== obj[discriminator]) {
      ret = false;
    }
  }

  return ret;
}

export function isSymbolSuggestion(obj: unknown): obj is SymbolSuggestion {
  return isOfType<SymbolSuggestion>(obj, 'type', SuggestionType.SymbolList);
}

export function isEditorSuggestion(obj: unknown): obj is EditorSuggestion {
  return isOfType<EditorSuggestion>(obj, 'type', SuggestionType.EditorList);
}

export function isHeadingSuggestion(obj: unknown): obj is HeadingSuggestion {
  return isOfType<HeadingSuggestion>(obj, 'type', SuggestionType.HeadingsList);
}

export function isFileSuggestion(obj: unknown): obj is FileSuggestion {
  return isOfType<FileSuggestion>(obj, 'type', SuggestionType.File);
}

export function isAliasSuggestion(obj: unknown): obj is AliasSuggestion {
  return isOfType<AliasSuggestion>(obj, 'type', SuggestionType.Alias);
}

export function isUnresolvedSuggestion(obj: unknown): obj is UnresolvedSuggestion {
  return isOfType<UnresolvedSuggestion>(obj, 'type', SuggestionType.Unresolved);
}

export function isSystemSuggestion(obj: unknown): obj is AnySystemSuggestion {
  return isFileSuggestion(obj) || isUnresolvedSuggestion(obj) || isAliasSuggestion(obj);
}

export function isExSuggestion(sugg: AnySuggestion): sugg is AnyExSuggestion {
  return sugg && !isSystemSuggestion(sugg);
}

export function isHeadingCache(obj: unknown): obj is HeadingCache {
  return isOfType<HeadingCache>(obj, 'level');
}

export function isTagCache(obj: unknown): obj is TagCache {
  return isOfType<TagCache>(obj, 'tag');
}

export function isCalloutCache(obj: unknown): obj is CalloutCache {
  return isOfType<CalloutCache>(obj, 'type', 'callout');
}

export function isTFile(obj: unknown): obj is TFile {
  return isOfType<TFile>(obj, 'extension');
}

export function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function getInternalPluginById(app: App, id: string): InstalledPlugin {
  return app?.internalPlugins?.getPluginById(id);
}

export function getInternalEnabledPluginById(app: App, id: string): PluginInstance {
  return app?.internalPlugins?.getEnabledPluginById(id);
}

export function getSystemSwitcherInstance(app: App): QuickSwitcherPluginInstance {
  const plugin = getInternalPluginById(app, 'switcher');
  return plugin?.instance as QuickSwitcherPluginInstance;
}

export function stripMDExtensionFromPath(file: TFile): string {
  let retVal: string = null;

  if (file) {
    const { path } = file;
    retVal = path;

    if (file.extension === 'md') {
      const index = path.lastIndexOf('.');

      if (index !== -1 && index !== path.length - 1 && index !== 0) {
        retVal = path.slice(0, index);
      }
    }
  }

  return retVal;
}

export function filenameFromPath(path: string): string {
  let retVal = null;

  if (path) {
    const index = path.lastIndexOf('/');
    retVal = index === -1 ? path : path.slice(index + 1);
  }

  return retVal;
}

export function matcherFnForRegExList(
  regExStrings: string[],
): (input: string) => boolean {
  regExStrings = regExStrings ?? [];
  const regExList: RegExp[] = [];

  for (const str of regExStrings) {
    try {
      const rx = new RegExp(str);
      regExList.push(rx);
    } catch (err) {
      console.log(`Switcher++: error creating RegExp from string: ${str}`, err);
    }
  }

  const isMatchFn: (input: string) => boolean = (input) => {
    for (const rx of regExList) {
      if (rx.test(input)) {
        return true;
      }
    }

    return false;
  };

  return isMatchFn;
}

export function getLinkType(linkCache: LinkCache): LinkType {
  let type = LinkType.None;

  if (linkCache) {
    // remove the display text before trying to parse the link target
    const linkStr = linkCache.link.split('|')[0];

    if (linkStr.includes('#^')) {
      type = LinkType.Block;
    } else if (linkStr.includes('#')) {
      type = LinkType.Heading;
    } else {
      type = LinkType.Normal;
    }
  }

  return type;
}

/**
 * Retrieves a TFile object using path. Return null if path does not represent
 * a TFile object.
 * @param  {string} path
 * @param  {Vault} vault
 * @returns TFile
 */
export function getTFileByPath(path: string, vault: Vault): TFile | null {
  let file: TFile = null;
  const abstractItem = vault.getAbstractFileByPath(path);

  if (isTFile(abstractItem)) {
    file = abstractItem;
  }

  return file;
}

export function generateMarkdownLink(
  fileManager: FileManager,
  vault: Vault,
  sugg: AnySuggestion,
  sourcePath: string,
  options?: { useBasenameAsAlias?: boolean; useHeadingAsAlias?: boolean },
): string {
  let linkStr: string = null;
  options = Object.assign({ useBasenameAsAlias: true, useHeadingAsAlias: true }, options);

  if (sugg) {
    let destFile: TFile = null;
    let alias = null;
    let subpath = null;
    const fileSuggTypes = [
      SuggestionType.Alias,
      SuggestionType.Bookmark,
      SuggestionType.HeadingsList,
      SuggestionType.SymbolList,
      SuggestionType.RelatedItemsList,
      SuggestionType.EditorList,
      SuggestionType.File,
    ];

    // for file based suggestions, get the destination file
    if (fileSuggTypes.includes(sugg.type)) {
      destFile = (sugg as { file: TFile }).file;
    }

    const linkSubPathForHeading = (heading: string) => {
      return {
        subpath: `#${heading}`,
        alias: options.useHeadingAsAlias ? heading : null,
      };
    };

    switch (sugg.type) {
      case SuggestionType.Unresolved:
        linkStr = generateMarkdownLinkForUnresolved(sugg.linktext);
        break;
      case SuggestionType.Alias:
        alias = sugg.alias;
        break;
      case SuggestionType.Bookmark: {
        const { item } = sugg;
        if (item.type === 'file' && item.title) {
          alias = item.title;
        }
        break;
      }
      case SuggestionType.HeadingsList: {
        const { heading } = sugg.item;
        ({ subpath, alias } = linkSubPathForHeading(heading));
        break;
      }
      case SuggestionType.SymbolList: {
        const {
          item: { symbol },
        } = sugg;

        if (isHeadingCache(symbol)) {
          ({ subpath, alias } = linkSubPathForHeading(symbol.heading));
        } else if (isOfType<ReferenceCache>(symbol, 'link')) {
          // Test if the link matches the external link format [text](url)
          const isExternalLink = new RegExp(/^\[(.*?)\]\((.+?)\)/).test(symbol.original);

          if (isExternalLink) {
            linkStr = symbol.original;
          } else {
            linkStr = generateMarkdownLinkForReferenceCache(
              fileManager,
              vault,
              sourcePath,
              symbol,
              destFile,
              options.useBasenameAsAlias,
            );
          }
        } else {
          // Disable link generation for other symbol types by setting destFile to null
          destFile = null;
        }
        break;
      }
      case SuggestionType.RelatedItemsList: {
        const { item } = sugg;
        if (item.unresolvedText) {
          linkStr = generateMarkdownLinkForUnresolved(item.unresolvedText);
        }
        break;
      }
    }

    if (destFile && !linkStr) {
      // if an alias has be not identified use the filename as alias
      if (!alias && options.useBasenameAsAlias) {
        alias = destFile.basename;
      }

      linkStr = fileManager.generateMarkdownLink(destFile, sourcePath, subpath, alias);
    }
  }

  return linkStr;
}

function generateMarkdownLinkForUnresolved(path: string, displayText?: string): string {
  displayText = displayText?.length ? `|${displayText}` : '';
  return `[[${path}${displayText}]]`;
}

function generateMarkdownLinkForReferenceCache(
  fileManager: FileManager,
  vault: Vault,
  sourcePath: string,
  refCache: ReferenceCache,
  refCacheSourceFile: TFile,
  useBasenameAsAlias: boolean,
): string {
  const { link, displayText } = refCache;
  const { path, subpath } = parseLinktext(link);
  let alias = displayText;
  let destFile: TFile = null;
  let linkStr: string = null;

  if (!path?.length) {
    // the path portion of the link is empty, meaning the destination path
    // is the file that contains the ReferenceCache
    destFile = refCacheSourceFile;
  } else {
    destFile = getTFileByPath(path, vault);
  }

  if (destFile) {
    if (!alias?.length && useBasenameAsAlias) {
      alias = destFile.basename;
    }

    linkStr = fileManager.generateMarkdownLink(destFile, sourcePath, subpath, alias);
  } else {
    linkStr = generateMarkdownLinkForUnresolved(path, alias);
  }

  return linkStr;
}
