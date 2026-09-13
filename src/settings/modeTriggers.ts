import type { SettingsData, TriggerSettingKey } from 'src/types';

export const TRIGGER_LABELS: Record<TriggerSettingKey, string> = {
  editorListCommand: 'Editor Mode',
  symbolListCommand: 'Symbol Mode (selected suggestion)',
  symbolListActiveEditorCommand: 'Symbol Mode (active editor)',
  workspaceListCommand: 'Workspace Mode',
  headingsListCommand: 'Headings Mode',
  bookmarksListCommand: 'Bookmarks Mode',
  commandListCommand: 'Command Mode',
  vaultListCommand: 'Vault Mode',
  relatedItemsListCommand: 'Related Items (selected suggestion)',
  relatedItemsListActiveEditorCommand: 'Related Items (active editor)',
};

type TriggerConfig = Pick<SettingsData, TriggerSettingKey | 'triggerAliases'>;

export function isValidTrigger(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && !/[\r\n\t]/.test(value);
}

/** Spaces are visible in summaries, but the stored trigger is never trimmed. */
export function displayTrigger(value: string): string {
  return value.replace(/ /g, '␠');
}

export function getModeTriggers(config: TriggerConfig, key: TriggerSettingKey): string[] {
  const aliases = config.triggerAliases?.[key];
  return [...new Set([config[key], ...(Array.isArray(aliases) ? aliases : [])])].filter(
    isValidTrigger,
  );
}

/** Validate against live settings so changing another mode cannot leave stale checks. */
export function validateModeTrigger(
  config: TriggerConfig,
  key: TriggerSettingKey,
  value: string,
  editing: 'primary' | number,
): string | undefined {
  if (!value.trim().length) return 'Enter a trigger, not just spaces.';
  if (/[\r\n\t]/.test(value)) return 'Enter one trigger without line breaks or tabs.';

  const aliases = config.triggerAliases?.[key] ?? [];
  const siblings = aliases.filter((_entry, index) => index !== editing);
  if (editing !== 'primary') siblings.push(config[key]);
  if (siblings.includes(value)) return 'This trigger is already used in this mode.';

  const conflict = (Object.keys(TRIGGER_LABELS) as TriggerSettingKey[]).find(
    (other) => other !== key && getModeTriggers(config, other).includes(value),
  );
  return conflict
    ? `This trigger is already used by ${TRIGGER_LABELS[conflict]}.`
    : undefined;
}

/** Upgrade the earlier local multiline preview without changing single-line values. */
export function migrateModeTriggers(data: SettingsData): void {
  const stored = data.triggerAliases;
  const next: SettingsData['triggerAliases'] = {};
  for (const key of Object.keys(TRIGGER_LABELS) as TriggerSettingKey[]) {
    const primary = data[key];
    const lines =
      typeof primary === 'string' ? primary.split(/\r?\n/).filter(isValidTrigger) : [];
    const aliases = stored?.[key];
    if (typeof primary === 'string' && /[\r\n]/.test(primary)) {
      data[key] = lines.shift() ?? '';
    } else {
      lines.length = 0;
    }
    const values = [...new Set([...lines, ...(Array.isArray(aliases) ? aliases : [])])]
      .filter(isValidTrigger)
      .filter((value) => value !== data[key]);
    if (values.length) next[key] = values;
  }
  data.triggerAliases = next;
}
