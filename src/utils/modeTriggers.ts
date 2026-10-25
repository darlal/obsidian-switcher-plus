/**
 * Mode trigger folding and conflict analysis shared by the input parser, the
 * settings tab, and the startup check, so all three use the same logic.
 *
 * Users typing with an IME often produce full-width or CJK punctuation (`＞`, `》`)
 * where the configured trigger is ASCII (`>`). Triggers and input are compared
 * after folding both, and the parser breaks ties between triggers that fold to
 * the same string in three tiers, an exact match of the raw spelling, then a
 * trigger configured with the canonical (already folded) spelling, then
 * registration order. Conflicts are the cases that reach tier 3 or that the
 * escape character makes unreachable.
 */
import type { CommandDefinition } from 'src/switcherPlus/commandDefinitions';
import { groupBy } from './utils';

/** A configured mode trigger, identified by its setting and settings row label. */
export interface TriggerDefinition {
  key: string;
  name: string;
  cmdStr: string;
}

/** A trigger paired with its folded spelling, which is what matching compares. */
export interface FoldedTrigger {
  cmdStr: string;
  foldedCmdStr: string;
}

/**
 * Trigger conflicts the parser can only settle by registration order, or cannot
 * settle at all. Each kind carries the data its message needs; the wording lives
 * in {@link describeTriggerConflict}. `keys` lists every setting the conflict
 * should be shown on, including `escapeCmdChar` when the escape is involved.
 */
export type TriggerConflict =
  | DuplicateTriggerConflict
  | FoldedTriggerConflict
  | EscapeTriggerConflict
  | EscapePrefixTriggerConflict;

/** Two or more triggers configured with the same spelling. `triggers[0]` wins. */
export interface DuplicateTriggerConflict {
  kind: 'duplicate';
  keys: string[];
  triggers: TriggerDefinition[];
}

/**
 * Triggers whose spellings fold to the same string, none of which is configured
 * with that folded spelling. Exact input still reaches each one, but any other
 * variant falls back to `triggers[0]`.
 */
export interface FoldedTriggerConflict {
  kind: 'folded';
  keys: string[];
  triggers: TriggerDefinition[];
  foldedCmdStr: string;
}

/** Triggers that fold to the same string as the escape character. */
export interface EscapeTriggerConflict {
  kind: 'escape';
  keys: string[];
  triggers: TriggerDefinition[];
  escapeCmdChar: string;
}

/**
 * Triggers that start with the escape character followed by another trigger.
 * The parser consumes the escape and that shorter trigger first, so the longer
 * trigger can never match.
 */
export interface EscapePrefixTriggerConflict {
  kind: 'escape-prefix';
  keys: string[];
  triggers: TriggerDefinition[];
  escapedTriggers: TriggerDefinition[];
  escapeCmdChar: string;
}

/**
 * IME punctuation that NFKC leaves alone but users mean as an ASCII trigger, e.g.
 * the CJK angle quote `》` typed where `>` is configured. NFKC already handles the
 * full-width forms such as `＞`.
 */
const IME_PUNCTUATION_FOLD: Readonly<Record<string, string>> = {
  '》': '>',
  '《': '<',
  '￥': '$',
  '¥': '$',
  '‘': "'",
  '’': "'",
};

/**
 * Folds a trigger or input string to the spelling triggers are matched on. Each
 * UTF-16 code unit is folded on its own and always to exactly one code unit, so
 * the result has the same length as the input and an index into the folded
 * string is also an index into the raw one. That lets the parser match on the
 * folded copy while slicing the user's raw characters into the filter text.
 * NFKC is applied only when it yields a single code unit; anything it would
 * expand or that is half of a surrogate pair is kept as is.
 * @param value - The raw trigger or input text.
 * @returns The folded text, same length as `value`.
 */
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

/**
 * Folds each trigger and orders them for matching. The sort keys encode the
 * parser's tie-break: longest folded trigger first (so `::` is tried before `:`),
 * then, within the same length, triggers configured with the canonical spelling
 * (`cmdStr === foldedCmdStr`, tier 2), and otherwise registration order, which the
 * stable sort preserves (tier 3). Tier 1, an exact raw match, is checked by the
 * parser at match time because it depends on the input. Empty triggers are
 * dropped because they can never match.
 * @param triggers - Triggers in registration order; not mutated.
 * @returns New objects with `foldedCmdStr` added, in matching order.
 */
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

/**
 * Lists the mode triggers that conflict detection checks, built from the command
 * definitions so a new trigger is covered as soon as its definition declares a
 * `settingsTriggerKey`. Definition order is kept because it is the parser's last
 * tie-break (registration order), and conflict messages name the winner by it.
 * @param definitions - The plugin's command definitions, in registration order.
 * @returns One entry per definition with a settings trigger, read from the
 * current settings at call time.
 */
export function getConfiguredTriggers(
  definitions: readonly CommandDefinition[],
): TriggerDefinition[] {
  return definitions
    .filter(({ parserCommand }) => parserCommand.settingsTriggerKey)
    .map(({ parserCommand }) => ({
      key: parserCommand.settingsTriggerKey,
      name: parserCommand.settingsTriggerName,
      cmdStr: parserCommand.getCommandStr(),
    }));
}

/**
 * Identifies settings whose edits can create or clear a trigger conflict. The
 * escape character is included because the parser checks it before any trigger.
 * @param key - The settings key being written.
 * @param definitions - The plugin's command definitions.
 * @returns True when `key` is the escape character or a mode trigger setting.
 */
export function isTriggerSettingKey(
  key: string,
  definitions: readonly CommandDefinition[],
): boolean {
  return (
    key === 'escapeCmdChar' ||
    definitions.some(({ parserCommand }) => parserCommand.settingsTriggerKey === key)
  );
}

/** Quotes a trigger and makes ASCII spaces visible, since they are significant. */
function quoteTrigger(value: string): string {
  return JSON.stringify(value.replace(/ /g, '␠'));
}

function describeTrigger(trigger: TriggerDefinition): string {
  return `${trigger.name} ${quoteTrigger(trigger.cmdStr)}`;
}

/**
 * Finds the trigger configurations that the parser's tie-break cannot resolve
 * from what the user typed. Tier 1 (exact spelling) and tier 2 (canonical
 * spelling) of the parser's tie-break settle most fold groups, so only these are
 * reported:
 * - `duplicate`: byte-identical triggers, e.g. Symbol `@` and Command `@`.
 * - `folded`: a fold group with no canonical member, e.g. `》` and `＞` with no `>`.
 * - `escape`: the escape character folds onto a trigger, e.g. escape `！` and trigger `!`.
 * - `escape-prefix`: a trigger starts with the escape character followed by another
 *   trigger, e.g. escape `!`, triggers `!>` and `>`.
 *
 * A pure function over strings so the settings tab can call it on every render and
 * startup can check saved configurations without building a parser.
 * @param triggers - The configured triggers, in registration order.
 * @param escapeCmdChar - The configured escape character.
 * @returns The conflicts found, empty when every trigger is reachable as typed.
 */
export function analyzeTriggerConflicts(
  triggers: readonly TriggerDefinition[],
  escapeCmdChar: string,
): TriggerConflict[] {
  const groups = groupBy(prepareTriggers(triggers), ({ foldedCmdStr }) => foldedCmdStr);
  const foldedEscape = foldTriggerString(escapeCmdChar);
  const conflicts: TriggerConflict[] = [];

  for (const [foldedCmdStr, group] of groups) {
    const keys = group.map(({ key }) => key);
    const bySpelling = groupBy(group, ({ cmdStr }) => cmdStr);

    for (const entries of bySpelling.values()) {
      if (entries.length > 1) {
        conflicts.push({
          kind: 'duplicate',
          keys: entries.map(({ key }) => key),
          triggers: entries,
        });
      }
    }

    if (bySpelling.size > 1 && !group.some(({ cmdStr }) => cmdStr === foldedCmdStr)) {
      conflicts.push({ kind: 'folded', keys, triggers: group, foldedCmdStr });
    }

    const escapeConflict = findEscapeConflict(
      foldedCmdStr,
      group,
      keys,
      groups,
      foldedEscape,
      escapeCmdChar,
    );
    if (escapeConflict) {
      conflicts.push(escapeConflict);
    }
  }

  return conflicts;
}

/**
 * Checks one fold group against the escape character, which the parser handles
 * before any trigger.
 * @param foldedCmdStr - The folded spelling shared by `group`.
 * @param group - The triggers that fold to `foldedCmdStr`.
 * @param keys - The setting keys of `group`.
 * @param groups - Every fold group, longest folded spelling first.
 * @param foldedEscape - The folded escape character.
 * @param escapeCmdChar - The escape character as configured, for the message.
 * @returns The escape conflict for this group, or undefined when it has none.
 */
function findEscapeConflict(
  foldedCmdStr: string,
  group: TriggerDefinition[],
  keys: string[],
  groups: ReadonlyMap<string, TriggerDefinition[]>,
  foldedEscape: string,
  escapeCmdChar: string,
): EscapeTriggerConflict | EscapePrefixTriggerConflict | undefined {
  if (foldedCmdStr === foldedEscape) {
    return {
      kind: 'escape',
      keys: ['escapeCmdChar', ...keys],
      triggers: group,
      escapeCmdChar,
    };
  }

  if (foldedEscape.length === 0 || !foldedCmdStr.startsWith(foldedEscape)) {
    return undefined;
  }

  // The parser consumes escape + longest following trigger before trying the
  // full trigger, so an escape prefix alone does not cause a conflict. `groups`
  // keeps the longest-first order of prepareTriggers, so the first prefix found
  // is the one the parser would consume.
  const suffix = foldedCmdStr.slice(foldedEscape.length);
  for (const [candidate, escapedGroup] of groups) {
    if (suffix.startsWith(candidate)) {
      return {
        kind: 'escape-prefix',
        keys: ['escapeCmdChar', ...keys, ...escapedGroup.map(({ key }) => key)],
        triggers: group,
        escapedTriggers: escapedGroup,
        escapeCmdChar,
      };
    }
  }

  return undefined;
}

/**
 * Turns a conflict into the text shown in the settings tab and the startup notice.
 * All conflict wording lives here so it can be managed in one place.
 * @param conflict - A conflict from {@link analyzeTriggerConflicts}.
 * @returns The message, naming each trigger by its settings row label.
 */
export function describeTriggerConflict(conflict: TriggerConflict): string {
  const list = conflict.triggers.map(describeTrigger).join(' and ');

  switch (conflict.kind) {
    case 'duplicate':
      return `${list} use the same trigger. ${describeTrigger(conflict.triggers[0])} wins by registration order. Choose different triggers.`;
    case 'folded':
      return `${list} share IME variants. Exact spellings work separately, but other variants select ${describeTrigger(conflict.triggers[0])} by registration order. Configure ${quoteTrigger(conflict.foldedCmdStr)} on one of these behaviors for a predictable fallback.`;
    case 'escape':
      return `${list} share the escape character ${quoteTrigger(conflict.escapeCmdChar)} or its IME variants. Escape processing takes priority when followed by a mode trigger. Choose a different escape character or mode trigger.`;
    case 'escape-prefix':
      return `${list} begin with the escape character ${quoteTrigger(conflict.escapeCmdChar)} followed by ${conflict.escapedTriggers.map(describeTrigger).join(' or ')} or its IME variants. Escape processing consumes this prefix before the full trigger can match. Choose a different escape character or mode trigger.`;
  }
}

/**
 * Groups conflict messages by each setting they affect, so a settings row can
 * show every conflict it is part of.
 * @param conflicts - Conflicts from {@link analyzeTriggerConflicts}.
 * @returns Messages keyed by setting, including `escapeCmdChar`.
 */
export function groupTriggerWarnings(
  conflicts: readonly TriggerConflict[],
): Map<string, string[]> {
  const warnings = new Map<string, string[]>();

  for (const conflict of conflicts) {
    const message = describeTriggerConflict(conflict);

    for (const key of conflict.keys) {
      const messages = warnings.get(key) ?? [];
      messages.push(message);
      warnings.set(key, messages);
    }
  }

  return warnings;
}
