import { App, HeadingCache, TagCache } from 'obsidian';
import {
  SymbolSuggestion,
  EditorSuggestion,
  FileSuggestion,
  AliasSuggestion,
  UnresolvedSuggestion,
  AnySystemSuggestion,
  SymbolInfo,
  WorkspaceSuggestion,
  WorkspaceInfo,
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

export function isHeadingCache(obj: unknown): obj is HeadingCache {
  return isOfType<HeadingCache>(obj, 'level');
}

export function isTagCache(obj: unknown): obj is TagCache {
  return isOfType<TagCache>(obj, 'tag');
}

export function isSymbolInfo(obj: unknown): obj is SymbolInfo {
  return isOfType<SymbolInfo>(obj, 'type', 'symbolInfo');
}

export function isWorkspaceInfo(obj: unknown): obj is WorkspaceInfo {
  return isOfType<WorkspaceInfo>(obj, 'type', 'WorkspaceInfo');
}

export function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function getInternalPluginById(app: App, id: string): Record<string, unknown> {
  return (app as any)?.internalPlugins?.getPluginById(id);
}

export function getSystemSwitcherInstance(app: App): Record<string, unknown> {
  const plugin = getInternalPluginById(app, 'switcher');
  return plugin?.instance as Record<string, unknown>;
}
