import { Mode } from 'src/types';
import {
  editorTrigger,
  symbolTrigger,
  workspaceTrigger,
  headingsTrigger,
  starredTrigger,
  commandTrigger,
} from './modeTrigger.fixture';

interface InputExpectation {
  input: string;
  expected: {
    mode: Mode;
    isValidated: boolean;
    parsedInput: string;
  };
}

function makeInputExpectation(
  input: string,
  mode: Mode,
  expectedParsedInput?: string,
): InputExpectation {
  return {
    input,
    expected: {
      mode,
      isValidated: true,
      parsedInput: expectedParsedInput,
    },
  };
}

function editorExpectation(
  input: string,
  expectedParsedInput?: string,
): InputExpectation {
  return makeInputExpectation(input, Mode.EditorList, expectedParsedInput);
}

function symbolExpectation(
  input: string,
  expectedParsedInput?: string,
): InputExpectation {
  return makeInputExpectation(input, Mode.SymbolList, expectedParsedInput);
}

function workspaceExpectation(
  input: string,
  expectedParsedInput?: string,
): InputExpectation {
  return makeInputExpectation(input, Mode.WorkspaceList, expectedParsedInput);
}

function headingsExpectation(
  input: string,
  expectedParsedInput?: string,
): InputExpectation {
  return makeInputExpectation(input, Mode.HeadingsList, expectedParsedInput);
}

function starredExpectation(
  input: string,
  expectedParsedInput?: string,
): InputExpectation {
  return makeInputExpectation(input, Mode.StarredList, expectedParsedInput);
}

function commandExpectation(
  input: string,
  expectedParsedInput?: string,
): InputExpectation {
  return makeInputExpectation(input, Mode.CommandList, expectedParsedInput);
}

interface InputExpectationStandard {
  input: string;
  expected: {
    mode: Mode;
  };
}

function standardExpectation(input: string): InputExpectationStandard {
  return {
    input,
    expected: { mode: Mode.Standard },
  };
}

export const standardModeInputFixture = [
  standardExpectation('test string'),
  standardExpectation(`test${editorTrigger}string`),
  standardExpectation(`test${editorTrigger}$string`),
  standardExpectation(` ${editorTrigger}test string`),
  standardExpectation(`test string ${editorTrigger}`),
  standardExpectation(`     ${editorTrigger}test string ${editorTrigger}`),
  standardExpectation(`${symbolTrigger}test string: No active editor or suggestion`),
  standardExpectation(`test ${symbolTrigger}string: No active editor or suggestion`),
  standardExpectation(` ${symbolTrigger}`),
  standardExpectation(`/${symbolTrigger}`),
  standardExpectation(`${symbolTrigger}foo`),
  standardExpectation(`${symbolTrigger} foo`),
  standardExpectation(` ${symbolTrigger}foo`),
  standardExpectation(` ${symbolTrigger} foo`),
  standardExpectation(`bar/${symbolTrigger}foo${symbolTrigger}`),
  standardExpectation(`bar${symbolTrigger}${symbolTrigger}foo${symbolTrigger}`),
  standardExpectation(`bar//${symbolTrigger}foo${symbolTrigger}`),
  standardExpectation(`bar${symbolTrigger}`),
  standardExpectation(`bar ${symbolTrigger}`),
  standardExpectation(`bar!${symbolTrigger}foo`),
  standardExpectation(`bar${symbolTrigger} \\sfoo`),
  standardExpectation(`bar ${symbolTrigger}foo`),
  standardExpectation(`bar ${symbolTrigger} foo`),
  standardExpectation(`test${workspaceTrigger}string`),
  standardExpectation(`test${workspaceTrigger}$string`),
  standardExpectation(`^${workspaceTrigger}string`),
  standardExpectation(` ${workspaceTrigger}test string`),
  standardExpectation(`test string ${workspaceTrigger}`),
  standardExpectation(`     ${workspaceTrigger}test string ${workspaceTrigger}`),
  standardExpectation(`test${headingsTrigger}string`),
  standardExpectation(`test${headingsTrigger}$string`),
  standardExpectation(`^${headingsTrigger}string`),
  standardExpectation(` ${headingsTrigger}test string`),
  standardExpectation(`test string ${headingsTrigger}`),
  standardExpectation(`     ${headingsTrigger}test string ${headingsTrigger}`),
  standardExpectation(`test${starredTrigger}string`),
  standardExpectation(`test${starredTrigger}$string`),
  standardExpectation(`^${starredTrigger}string`),
  standardExpectation(` ${starredTrigger}test string`),
  standardExpectation(`test string ${starredTrigger}`),
  standardExpectation(`     ${starredTrigger}test string ${starredTrigger}`),
];

// Used for editor mode tests
export const editorPrefixOnlyInputFixture = [
  editorExpectation(`${editorTrigger}`, ''),
  editorExpectation(`${editorTrigger}test string`, 'test string'),
  editorExpectation(`${editorTrigger}${symbolTrigger}`, `${symbolTrigger}`),
  editorExpectation(`${editorTrigger} ${symbolTrigger}`, ` ${symbolTrigger}`),
  editorExpectation(`${editorTrigger}${symbolTrigger}  `, `${symbolTrigger}  `),
  editorExpectation(`${editorTrigger}${symbolTrigger}foo`, `${symbolTrigger}foo`),
  editorExpectation(`${editorTrigger}${symbolTrigger} fooo`, `${symbolTrigger} fooo`),
  editorExpectation(`${editorTrigger}bar${symbolTrigger}`, `bar${symbolTrigger}`),
  editorExpectation(`${editorTrigger}bar${symbolTrigger}  `, `bar${symbolTrigger}  `),
  editorExpectation(`${editorTrigger}bar ${symbolTrigger}`, `bar ${symbolTrigger}`),
  editorExpectation(`${editorTrigger}bar ${symbolTrigger}   `, `bar ${symbolTrigger}   `),
  editorExpectation(`${editorTrigger}bar${symbolTrigger}foo`, `bar${symbolTrigger}foo`),
  editorExpectation(`${editorTrigger}bar${symbolTrigger} foo`, `bar${symbolTrigger} foo`),
  editorExpectation(
    `${editorTrigger}bar ${symbolTrigger}foo  `,
    `bar ${symbolTrigger}foo  `,
  ),
  editorExpectation(
    `${editorTrigger}bar ${symbolTrigger} foo`,
    `bar ${symbolTrigger} foo`,
  ),
];

// Used for tests with active leaf only (no suggestions)
export const symbolPrefixOnlyInputFixture = [
  symbolExpectation(`${symbolTrigger}`, ''),
  symbolExpectation(`${symbolTrigger}test string`, 'test string'),
  symbolExpectation(`${symbolTrigger}${symbolTrigger}`, `${symbolTrigger}`),
  symbolExpectation(`${symbolTrigger}bar${symbolTrigger}`, `bar${symbolTrigger}`),
  symbolExpectation(`${symbolTrigger}bar ${symbolTrigger}`, `bar ${symbolTrigger}`),
  symbolExpectation(`${symbolTrigger}bar ${symbolTrigger}   `, `bar ${symbolTrigger}   `),
  symbolExpectation(`${symbolTrigger}bar${symbolTrigger}foo`, `bar${symbolTrigger}foo`),
  symbolExpectation(`${symbolTrigger}bar${symbolTrigger} foo`, `bar${symbolTrigger} foo`),
  symbolExpectation(`${symbolTrigger}bar ${symbolTrigger}foo`, `bar ${symbolTrigger}foo`),
  symbolExpectation(
    `${symbolTrigger}bar ${symbolTrigger} foo`,
    `bar ${symbolTrigger} foo`,
  ),
  symbolExpectation(
    `${symbolTrigger}${symbolTrigger}fooooo${symbolTrigger}${symbolTrigger}`,
    `${symbolTrigger}fooooo${symbolTrigger}${symbolTrigger}`,
  ),
  symbolExpectation(
    `${symbolTrigger}${symbolTrigger}${symbolTrigger}`,
    `${symbolTrigger}${symbolTrigger}`,
  ),
];

// Used for tests with different types of suggestions (File, Editor)
export const symbolModeInputFixture = [
  symbolExpectation(`${symbolTrigger}`, ''),
  symbolExpectation(`${symbolTrigger}test string`, 'test string'),
  symbolExpectation(`${symbolTrigger} `, ' '),
  symbolExpectation(` ${symbolTrigger}`, ''),
  symbolExpectation(`/${symbolTrigger}`, ''),
  symbolExpectation(`${symbolTrigger}${symbolTrigger}`, `${symbolTrigger}`),
  symbolExpectation(`${symbolTrigger}foo`, 'foo'),
  symbolExpectation(`${symbolTrigger} foo`, ' foo'),
  symbolExpectation(` ${symbolTrigger}foo`, 'foo'),
  symbolExpectation(` ${symbolTrigger} foo`, ' foo'),
  symbolExpectation(`bar/${symbolTrigger}foo${symbolTrigger}`, `foo${symbolTrigger}`),
  symbolExpectation(
    `bar${symbolTrigger}${symbolTrigger}foo${symbolTrigger}`,
    `${symbolTrigger}foo${symbolTrigger}`,
  ),
  symbolExpectation(`bar//${symbolTrigger}foo${symbolTrigger}`, `foo${symbolTrigger}`),
  symbolExpectation(`bar${symbolTrigger}`, ''),
  symbolExpectation(`bar ${symbolTrigger}`, ''),
  symbolExpectation(`bar!${symbolTrigger}foo`, 'foo'),
  symbolExpectation(`bar${symbolTrigger}foo`, 'foo'),
  symbolExpectation(`bar${symbolTrigger} foo`, ' foo'),
  symbolExpectation(`bar ${symbolTrigger}foo`, 'foo'),
  symbolExpectation(`bar ${symbolTrigger} foo`, ' foo'),
  symbolExpectation(`${symbolTrigger}bar${symbolTrigger}`, `bar${symbolTrigger}`),
  symbolExpectation(`${symbolTrigger}bar ${symbolTrigger}`, `bar ${symbolTrigger}`),
  symbolExpectation(`${symbolTrigger}bar ${symbolTrigger}   `, `bar ${symbolTrigger}   `),
  symbolExpectation(`${symbolTrigger}bar${symbolTrigger}foo`, `bar${symbolTrigger}foo`),
  symbolExpectation(`${symbolTrigger}bar${symbolTrigger} foo`, `bar${symbolTrigger} foo`),
  symbolExpectation(`${symbolTrigger}bar ${symbolTrigger}foo`, `bar ${symbolTrigger}foo`),
  symbolExpectation(
    `${symbolTrigger}bar ${symbolTrigger} foo`,
    `bar ${symbolTrigger} foo`,
  ),
  symbolExpectation(
    `${symbolTrigger}${symbolTrigger}fooooo${symbolTrigger}${symbolTrigger}`,
    `${symbolTrigger}fooooo${symbolTrigger}${symbolTrigger}`,
  ),
  symbolExpectation(
    `${symbolTrigger}${symbolTrigger}${symbolTrigger}`,
    `${symbolTrigger}${symbolTrigger}`,
  ),
  symbolExpectation(
    `${symbolTrigger}${editorTrigger}sfsas${symbolTrigger}`,
    `${editorTrigger}sfsas${symbolTrigger}`,
  ),
  symbolExpectation(`${editorTrigger}${symbolTrigger}`, ''),
  symbolExpectation(`${editorTrigger} ${symbolTrigger}`, ''),
  symbolExpectation(`${editorTrigger}${symbolTrigger}  `, `  `),
  symbolExpectation(`${editorTrigger}${symbolTrigger}foo`, `foo`),
  symbolExpectation(`${editorTrigger}${symbolTrigger} fooo`, ' fooo'),
  symbolExpectation(`${editorTrigger}bar${symbolTrigger}`, ''),
  symbolExpectation(`${editorTrigger}bar${symbolTrigger}  `, '  '),
  symbolExpectation(`${editorTrigger}bar ${symbolTrigger}$   `, '$   '),
  symbolExpectation(`${editorTrigger}bar.+${symbolTrigger}*foo`, '*foo'),
  symbolExpectation(
    `${editorTrigger}   \\bar  ${symbolTrigger} ^[]foo    `,
    ' ^[]foo    ',
  ),
];

export const unicodeInputFixture = [
  {
    editorTrigger: 'ë',
    input: 'ëfooô',
    expected: { mode: Mode.EditorList, parsedInput: 'fooô' },
  },
  {
    editorTrigger: '☃',
    input: '☃fooô',
    expected: { mode: Mode.EditorList, parsedInput: 'fooô' },
  },
  {
    symbolTrigger: 'n̂',
    input: 'n̂fooô',
    expected: { mode: Mode.SymbolList, parsedInput: 'fooô' },
  },
  {
    symbolTrigger: '👨‍👩‍👧‍👦',
    input: '👨‍👩‍👧‍👦fooô',
    expected: { mode: Mode.SymbolList, parsedInput: 'fooô' },
  },
  {
    editorTrigger: '깍',
    symbolTrigger: '💩',
    input: '깍foo💩barô',
    expected: { mode: Mode.SymbolList, parsedInput: 'barô' },
  },
];

// Used for workspace mode tests
export const workspacePrefixOnlyInputFixture = [
  workspaceExpectation(`${workspaceTrigger}`, ''),
  workspaceExpectation(`${workspaceTrigger}test string`, 'test string'),
  workspaceExpectation(`${workspaceTrigger}${symbolTrigger}`, `${symbolTrigger}`),
  workspaceExpectation(`${workspaceTrigger} ${symbolTrigger}`, ` ${symbolTrigger}`),
  workspaceExpectation(`${workspaceTrigger}${symbolTrigger}  `, `${symbolTrigger}  `),
  workspaceExpectation(`${workspaceTrigger}${symbolTrigger}foo`, `${symbolTrigger}foo`),
  workspaceExpectation(
    `${workspaceTrigger}${symbolTrigger} fooo`,
    `${symbolTrigger} fooo`,
  ),
  workspaceExpectation(`${workspaceTrigger}bar${symbolTrigger}`, `bar${symbolTrigger}`),
  workspaceExpectation(
    `${workspaceTrigger}bar${editorTrigger}  `,
    `bar${editorTrigger}  `,
  ),
  workspaceExpectation(`${workspaceTrigger}bar ${symbolTrigger}`, `bar ${symbolTrigger}`),
  workspaceExpectation(
    `${workspaceTrigger}bar ${symbolTrigger}   `,
    `bar ${symbolTrigger}   `,
  ),
  workspaceExpectation(
    `${workspaceTrigger}bar${symbolTrigger}foo`,
    `bar${symbolTrigger}foo`,
  ),
  workspaceExpectation(
    `${workspaceTrigger}bar${symbolTrigger} foo`,
    `bar${symbolTrigger} foo`,
  ),
  workspaceExpectation(
    `${workspaceTrigger}bar ${symbolTrigger}foo  `,
    `bar ${symbolTrigger}foo  `,
  ),
  workspaceExpectation(
    `${workspaceTrigger}bar ${symbolTrigger} foo`,
    `bar ${symbolTrigger} foo`,
  ),
];

// Used for headings mode tests
export const headingsPrefixOnlyInputFixture = [
  headingsExpectation(`${headingsTrigger}`, ''),
  headingsExpectation(`${headingsTrigger}test string`, 'test string'),
  headingsExpectation(`${headingsTrigger}${symbolTrigger}`, `${symbolTrigger}`),
  headingsExpectation(`${headingsTrigger} ${symbolTrigger}`, ` ${symbolTrigger}`),
  headingsExpectation(`${headingsTrigger}${symbolTrigger}  `, `${symbolTrigger}  `),
  headingsExpectation(`${headingsTrigger}${symbolTrigger}foo`, `${symbolTrigger}foo`),
  headingsExpectation(`${headingsTrigger}${symbolTrigger} fooo`, `${symbolTrigger} fooo`),
  headingsExpectation(`${headingsTrigger}bar${symbolTrigger}`, `bar${symbolTrigger}`),
  headingsExpectation(
    `${headingsTrigger}bar$${symbolTrigger}  `,
    `bar$${symbolTrigger}  `,
  ),
  headingsExpectation(`${headingsTrigger}bar ${symbolTrigger}`, `bar ${symbolTrigger}`),
  headingsExpectation(
    `${headingsTrigger}bar ${symbolTrigger}   `,
    `bar ${symbolTrigger}   `,
  ),
  headingsExpectation(
    `${headingsTrigger}bar${symbolTrigger}foo`,
    `bar${symbolTrigger}foo`,
  ),
  headingsExpectation(
    `${headingsTrigger}bar${editorTrigger} foo`,
    `bar${editorTrigger} foo`,
  ),
  headingsExpectation(
    `${headingsTrigger}bar ${workspaceTrigger}foo  `,
    `bar ${workspaceTrigger}foo  `,
  ),
  headingsExpectation(
    `${headingsTrigger}bar ${symbolTrigger} foo`,
    `bar ${symbolTrigger} foo`,
  ),
];

// Used for starred mode tests
export const starredPrefixOnlyInputFixture = [
  starredExpectation(`${starredTrigger}`, ''),
  starredExpectation(`${starredTrigger}test string`, 'test string'),
  starredExpectation(`${starredTrigger}${symbolTrigger}`, `${symbolTrigger}`),
  starredExpectation(`${starredTrigger} ${symbolTrigger}`, ` ${symbolTrigger}`),
  starredExpectation(`${starredTrigger}${symbolTrigger}  `, `${symbolTrigger}  `),
  starredExpectation(`${starredTrigger}${symbolTrigger}foo`, `${symbolTrigger}foo`),
  starredExpectation(`${starredTrigger}${symbolTrigger} fooo`, `${symbolTrigger} fooo`),
  starredExpectation(`${starredTrigger}bar${symbolTrigger}`, `bar${symbolTrigger}`),
  starredExpectation(`${starredTrigger}bar$${symbolTrigger}  `, `bar$${symbolTrigger}  `),
  starredExpectation(`${starredTrigger}bar ${symbolTrigger}`, `bar ${symbolTrigger}`),
  starredExpectation(
    `${starredTrigger}bar ${symbolTrigger}   `,
    `bar ${symbolTrigger}   `,
  ),
  starredExpectation(`${starredTrigger}bar${symbolTrigger}foo`, `bar${symbolTrigger}foo`),
  starredExpectation(
    `${starredTrigger}bar${editorTrigger} foo`,
    `bar${editorTrigger} foo`,
  ),
  starredExpectation(
    `${starredTrigger}bar ${workspaceTrigger}foo  `,
    `bar ${workspaceTrigger}foo  `,
  ),
  starredExpectation(
    `${starredTrigger}bar ${symbolTrigger} foo`,
    `bar ${symbolTrigger} foo`,
  ),
];

// Used for command mode tests
export const commandPrefixOnlyInputFixture = [
  commandExpectation(`${commandTrigger}`, ''),
  commandExpectation(`${commandTrigger}test string`, 'test string'),
  commandExpectation(`${commandTrigger}${symbolTrigger}`, `${symbolTrigger}`),
  commandExpectation(`${commandTrigger} ${symbolTrigger}`, ` ${symbolTrigger}`),
  commandExpectation(`${commandTrigger}${symbolTrigger}  `, `${symbolTrigger}  `),
  commandExpectation(`${commandTrigger}${symbolTrigger}foo`, `${symbolTrigger}foo`),
  commandExpectation(`${commandTrigger}${symbolTrigger} fooo`, `${symbolTrigger} fooo`),
  commandExpectation(`${commandTrigger}bar${symbolTrigger}`, `bar${symbolTrigger}`),
  commandExpectation(`${commandTrigger}bar${editorTrigger}  `, `bar${editorTrigger}  `),
  commandExpectation(`${commandTrigger}bar ${symbolTrigger}`, `bar ${symbolTrigger}`),
  commandExpectation(
    `${commandTrigger}bar ${symbolTrigger}   `,
    `bar ${symbolTrigger}   `,
  ),
  commandExpectation(`${commandTrigger}bar${symbolTrigger}foo`, `bar${symbolTrigger}foo`),
  commandExpectation(
    `${commandTrigger}bar${symbolTrigger} foo`,
    `bar${symbolTrigger} foo`,
  ),
  commandExpectation(
    `${commandTrigger}bar ${symbolTrigger}foo  `,
    `bar ${symbolTrigger}foo  `,
  ),
  commandExpectation(
    `${commandTrigger}bar ${symbolTrigger} foo`,
    `bar ${symbolTrigger} foo`,
  ),
];
