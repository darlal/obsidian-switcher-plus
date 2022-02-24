import {
  App,
  HeadingCache,
  InstalledPlugin,
  LinkCache,
  QuickSwitcherPluginInstance,
  FileStarredItem,
  TagCache,
  TFile,
} from 'obsidian';
import {
  SymbolSuggestion,
  EditorSuggestion,
  FileSuggestion,
  AliasSuggestion,
  UnresolvedSuggestion,
  AnySystemSuggestion,
  WorkspaceSuggestion,
  HeadingSuggestion,
  AnySuggestion,
  AnyExSuggestion,
  LinkType,
  StarredSuggestion,
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
  return isOfType<SymbolSuggestion>(obj, 'type', 'symbol');
}

export function isEditorSuggestion(obj: unknown): obj is EditorSuggestion {
  return isOfType<EditorSuggestion>(obj, 'type', 'editor');
}

export function isWorkspaceSuggestion(obj: unknown): obj is WorkspaceSuggestion {
  return isOfType<WorkspaceSuggestion>(obj, 'type', 'workspace');
}

export function isHeadingSuggestion(obj: unknown): obj is HeadingSuggestion {
  return isOfType<HeadingSuggestion>(obj, 'type', 'heading');
}

export function isStarredSuggestion(obj: unknown): obj is StarredSuggestion {
  return isOfType<StarredSuggestion>(obj, 'type', 'starred');
}

export function isFileSuggestion(obj: unknown): obj is FileSuggestion {
  return isOfType<FileSuggestion>(obj, 'type', 'file');
}

export function isAliasSuggestion(obj: unknown): obj is AliasSuggestion {
  return isOfType<AliasSuggestion>(obj, 'type', 'alias');
}

export function isUnresolvedSuggestion(obj: unknown): obj is UnresolvedSuggestion {
  return isOfType<UnresolvedSuggestion>(obj, 'type', 'unresolved');
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

export function isTFile(obj: unknown): obj is TFile {
  return isOfType<TFile>(obj, 'extension');
}

export function isFileStarredItem(obj: unknown): obj is FileStarredItem {
  return isOfType<FileStarredItem>(obj, 'type', 'file');
}

export function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function getInternalPluginById(app: App, id: string): InstalledPlugin {
  return app?.internalPlugins?.getPluginById(id);
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
