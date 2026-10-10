import type { SwitcherPlusSettings } from 'src/settings/switcherPlusSettings';

/** Registration order matches the parser commands in commandDefinitions.ts. */
const MODE_TRIGGERS = [
  { key: 'editorListCommand', name: 'Editor mode' },
  { key: 'symbolListCommand', name: 'Symbol mode' },
  { key: 'symbolListActiveEditorCommand', name: 'Symbol mode (active editor)' },
  { key: 'workspaceListCommand', name: 'Workspace mode' },
  { key: 'headingsListCommand', name: 'Headings mode' },
  { key: 'bookmarksListCommand', name: 'Bookmarks mode' },
  { key: 'commandListCommand', name: 'Command mode' },
  { key: 'relatedItemsListCommand', name: 'Related items mode' },
  { key: 'relatedItemsListActiveEditorCommand', name: 'Related items (active editor)' },
  { key: 'vaultListCommand', name: 'Vault mode' },
] as const;

type ModeTriggerKey = (typeof MODE_TRIGGERS)[number]['key'];
type TriggerSettings = Pick<SwitcherPlusSettings, ModeTriggerKey>;

export interface TriggerDefinition {
  key: string;
  name: string;
  cmdStr: string;
}

export interface FoldedTrigger {
  cmdStr: string;
  foldedCmdStr: string;
}

export interface TriggerConflict {
  id: string;
  keys: string[];
  message: string;
}

/** IME punctuation that NFKC does not map to the ASCII trigger. */
const IME_PUNCTUATION_FOLD: Readonly<Record<string, string>> = {
  '》': '>',
  '《': '<',
  '￥': '$',
  '¥': '$',
  '‘': "'",
  '’': "'",
};

/** Fold code units independently, preserving raw input offsets and length. */
export function foldTriggerString(value: string): string {
  let folded = '';
  for (let i = 0; i < value.length; i += 1) {
    const ch = value[i];
    const mapped = IME_PUNCTUATION_FOLD[ch];
    if (mapped !== undefined) {
      folded += mapped;
    } else {
      const normalized = ch.normalize('NFKC');
      folded += normalized.length === 1 ? normalized : ch;
    }
  }
  return folded;
}

/** Longest first, then canonical first; stable sort preserves registration order. */
export function prepareTriggers<T extends { cmdStr: string }>(
  triggers: readonly T[],
): (T & FoldedTrigger)[] {
  return triggers
    .filter(({ cmdStr }) => cmdStr.length > 0)
    .map((trigger) => ({
      ...trigger,
      foldedCmdStr: foldTriggerString(trigger.cmdStr),
    }))
    .sort(
      (a, b) =>
        b.foldedCmdStr.length - a.foldedCmdStr.length ||
        Number(b.cmdStr === b.foldedCmdStr) - Number(a.cmdStr === a.foldedCmdStr),
    );
}

export function getConfiguredTriggers(config: TriggerSettings): TriggerDefinition[] {
  return MODE_TRIGGERS.map(({ key, name }) => ({ key, name, cmdStr: config[key] }));
}

export function isTriggerSettingKey(key: string): boolean {
  return key === 'escapeCmdChar' || MODE_TRIGGERS.some((trigger) => trigger.key === key);
}

function describeTrigger(trigger: TriggerDefinition): string {
  return `${trigger.name} ${JSON.stringify(trigger.cmdStr.replace(/ /g, '␠'))}`;
}

/** Pure analysis shared by settings and startup, including existing saved configs. */
export function analyzeTriggerConflicts(
  triggers: readonly TriggerDefinition[],
  escapeCmdChar: string,
): TriggerConflict[] {
  const groups = new Map<string, (TriggerDefinition & FoldedTrigger)[]>();
  for (const trigger of prepareTriggers(triggers)) {
    const group = groups.get(trigger.foldedCmdStr);
    if (group) {
      group.push(trigger);
    } else {
      groups.set(trigger.foldedCmdStr, [trigger]);
    }
  }

  const conflicts: TriggerConflict[] = [];
  const foldedEscape = foldTriggerString(escapeCmdChar);
  for (const [foldedCmdStr, group] of groups) {
    const originals = new Map<string, TriggerDefinition[]>();
    for (const trigger of group) {
      const entries = originals.get(trigger.cmdStr);
      if (entries) {
        entries.push(trigger);
      } else {
        originals.set(trigger.cmdStr, [trigger]);
      }
    }

    for (const [cmdStr, entries] of originals) {
      if (entries.length > 1) {
        conflicts.push({
          id: JSON.stringify(['duplicate', cmdStr, entries.map(({ key }) => key)]),
          keys: entries.map(({ key }) => key),
          message: `${entries.map(describeTrigger).join(' and ')} use the same trigger. ${describeTrigger(entries[0])} wins by registration order. Choose different triggers.`,
        });
      }
    }

    if (originals.size > 1 && !group.some(({ cmdStr }) => cmdStr === foldedCmdStr)) {
      conflicts.push({
        id: JSON.stringify(['folded', foldedCmdStr, group.map(({ key }) => key)]),
        keys: group.map(({ key }) => key),
        message: `${group.map(describeTrigger).join(' and ')} share IME variants. Exact spellings work separately, but other variants select ${describeTrigger(group[0])} by registration order. Configure ${JSON.stringify(foldedCmdStr.replace(/ /g, '␠'))} on one of these behaviors for a predictable fallback.`,
      });
    }

    if (foldedCmdStr === foldedEscape) {
      conflicts.push({
        id: JSON.stringify(['escape', escapeCmdChar, group.map(({ key }) => key)]),
        keys: ['escapeCmdChar', ...group.map(({ key }) => key)],
        message: `${group.map(describeTrigger).join(' and ')} share the escape character ${JSON.stringify(escapeCmdChar.replace(/ /g, '␠'))} or its IME variants. Escape processing takes priority when followed by a mode trigger. Choose a different escape character or mode trigger.`,
      });
    }
  }
  return conflicts;
}
