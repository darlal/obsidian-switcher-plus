import { SymbolSuggestion, EditorSuggestion, SystemSuggestion } from 'src/types';

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
  return isOfType<SymbolSuggestion>(obj, 'type', 'Symbol');
}

export function isEditorSuggestion(obj: unknown): obj is EditorSuggestion {
  return isOfType<EditorSuggestion>(obj, 'type', 'Editor');
}

export function isSystemSuggestion(obj: unknown): obj is SystemSuggestion {
  return isOfType<SystemSuggestion>(obj, 'file');
}
