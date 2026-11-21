#!/usr/bin/env node
/**
 * Type-checks the project with lib checking enabled, failing only on
 * diagnostics in our own source.
 *
 * tsconfig.json sets skipLibCheck: true because a dependency's d.ts fails
 * lib checking. Originally that was obsidian 1.13.1 (Menu, Modal, and
 * PopoverSuggest declared `implements HistoryHandler` without onHistoryBack());
 * obsidian 1.14.4 lib-checks clean. As of 11/21/2026 the remaining failure is
 * @jest/environment 29.7.0, whose JestImportMeta no longer matches the newer
 * `jest` global type (TS2430).
 *
 * skipLibCheck also silently stops our own src/types/obsidian/index.d.ts from
 * being type-checked. This restores that coverage: run tsc with lib checking
 * on, discard the node_modules noise, and report what is left.
 *
 * Once every dependency's d.ts lib-checks clean, skipLibCheck and this script
 * can both be removed.
 */
const { spawnSync } = require('child_process');

/**
 * Retains whole diagnostics whose opening line points at our own source. tsc
 * indents the continuation lines of a multi-line diagnostic, so filtering
 * every line against the prefix would discard the explanation.
 * @param  {string} output combined tsc stdout and stderr
 * @returns {string[]} the retained lines
 */
function selectSourceDiagnostics(output) {
  let isOurs = false;

  return output.split('\n').filter((line) => {
    const isDiagnosticStart = line.length > 0 && !/^\s/.test(line);

    if (isDiagnosticStart) {
      isOurs = line.startsWith('src/');
    }

    return isOurs;
  });
}

const result = spawnSync('npx', ['tsc', '--noEmit', '--skipLibCheck', 'false'], {
  encoding: 'utf8',
});

if (result.error) {
  console.error(`Could not run tsc: ${result.error.message}`);
  process.exit(2);
}

const diagnostics = selectSourceDiagnostics(`${result.stdout}${result.stderr}`);

if (diagnostics.length > 0) {
  console.error(diagnostics.join('\n').trimEnd());
  console.error('\nType errors under src/ that tsconfig skipLibCheck hides.');
  process.exit(1);
}

console.log('check-dts: no type errors under src/ with lib checking enabled.');
