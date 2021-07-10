import { Mode } from 'src/types';

const editorModeTrigger = '<e-trigger>';
const symbolModeTrigger = '<s-trigger>';

export const modeTriggers = {
  editorTrigger: editorModeTrigger,
  symbolTrigger: symbolModeTrigger,
};

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

export const standardModeInputData = [
  standardExpectation('test string'),
  standardExpectation(`test${editorModeTrigger}string`),
  standardExpectation(`test${editorModeTrigger}string`),
  standardExpectation(` ${editorModeTrigger}test string`),
  standardExpectation(`test string ${editorModeTrigger}`),
  standardExpectation(`     ${editorModeTrigger}test string ${editorModeTrigger}`),
  standardExpectation(`${symbolModeTrigger}test string: No active editor or suggestion`),
  standardExpectation(`test ${symbolModeTrigger}string: No active editor or suggestion`),
  standardExpectation(` ${symbolModeTrigger}`),
  standardExpectation(`/${symbolModeTrigger}`),
  standardExpectation(`${symbolModeTrigger}foo`),
  standardExpectation(`${symbolModeTrigger} foo`),
  standardExpectation(` ${symbolModeTrigger}foo`),
  standardExpectation(` ${symbolModeTrigger} foo`),
  standardExpectation(`bar/${symbolModeTrigger}foo${symbolModeTrigger}`),
  standardExpectation(
    `bar${symbolModeTrigger}${symbolModeTrigger}foo${symbolModeTrigger}`,
  ),
  standardExpectation(`bar//${symbolModeTrigger}foo${symbolModeTrigger}`),
  standardExpectation(`bar${symbolModeTrigger}`),
  standardExpectation(`bar ${symbolModeTrigger}`),
  standardExpectation(`bar!${symbolModeTrigger}foo`),
  standardExpectation(`bar${symbolModeTrigger} \\sfoo`),
  standardExpectation(`bar ${symbolModeTrigger}foo`),
  standardExpectation(`bar ${symbolModeTrigger} foo`),
];

// Used for editor mode tests
export const editorPrefixOnlyInputData = [
  editorExpectation(`${editorModeTrigger}`, ''),
  editorExpectation(`${editorModeTrigger}test string`, 'test string'),
  editorExpectation(`${editorModeTrigger}${symbolModeTrigger}`, `${symbolModeTrigger}`),
  editorExpectation(`${editorModeTrigger} ${symbolModeTrigger}`, ` ${symbolModeTrigger}`),
  editorExpectation(
    `${editorModeTrigger}${symbolModeTrigger}  `,
    `${symbolModeTrigger}  `,
  ),
  editorExpectation(
    `${editorModeTrigger}${symbolModeTrigger}foo`,
    `${symbolModeTrigger}foo`,
  ),
  editorExpectation(
    `${editorModeTrigger}${symbolModeTrigger} fooo`,
    `${symbolModeTrigger} fooo`,
  ),
  editorExpectation(
    `${editorModeTrigger}bar${symbolModeTrigger}`,
    `bar${symbolModeTrigger}`,
  ),
  editorExpectation(
    `${editorModeTrigger}bar${symbolModeTrigger}  `,
    `bar${symbolModeTrigger}  `,
  ),
  editorExpectation(
    `${editorModeTrigger}bar ${symbolModeTrigger}`,
    `bar ${symbolModeTrigger}`,
  ),
  editorExpectation(
    `${editorModeTrigger}bar ${symbolModeTrigger}   `,
    `bar ${symbolModeTrigger}   `,
  ),
  editorExpectation(
    `${editorModeTrigger}bar${symbolModeTrigger}foo`,
    `bar${symbolModeTrigger}foo`,
  ),
  editorExpectation(
    `${editorModeTrigger}bar${symbolModeTrigger} foo`,
    `bar${symbolModeTrigger} foo`,
  ),
  editorExpectation(
    `${editorModeTrigger}bar ${symbolModeTrigger}foo  `,
    `bar ${symbolModeTrigger}foo  `,
  ),
  editorExpectation(
    `${editorModeTrigger}bar ${symbolModeTrigger} foo`,
    `bar ${symbolModeTrigger} foo`,
  ),
];

// Used for tests with active leaf only (no suggestions)
export const symbolPrefixOnlyInputData = [
  symbolExpectation(`${symbolModeTrigger}`, ''),
  symbolExpectation(`${symbolModeTrigger}test string`, 'test string'),
  symbolExpectation(`${symbolModeTrigger}${symbolModeTrigger}`, `${symbolModeTrigger}`),
  symbolExpectation(
    `${symbolModeTrigger}bar${symbolModeTrigger}`,
    `bar${symbolModeTrigger}`,
  ),
  symbolExpectation(
    `${symbolModeTrigger}bar ${symbolModeTrigger}`,
    `bar ${symbolModeTrigger}`,
  ),
  symbolExpectation(
    `${symbolModeTrigger}bar ${symbolModeTrigger}   `,
    `bar ${symbolModeTrigger}   `,
  ),
  symbolExpectation(
    `${symbolModeTrigger}bar${symbolModeTrigger}foo`,
    `bar${symbolModeTrigger}foo`,
  ),
  symbolExpectation(
    `${symbolModeTrigger}bar${symbolModeTrigger} foo`,
    `bar${symbolModeTrigger} foo`,
  ),
  symbolExpectation(
    `${symbolModeTrigger}bar ${symbolModeTrigger}foo`,
    `bar ${symbolModeTrigger}foo`,
  ),
  symbolExpectation(
    `${symbolModeTrigger}bar ${symbolModeTrigger} foo`,
    `bar ${symbolModeTrigger} foo`,
  ),
  symbolExpectation(
    `${symbolModeTrigger}${symbolModeTrigger}fooooo${symbolModeTrigger}${symbolModeTrigger}`,
    `${symbolModeTrigger}fooooo${symbolModeTrigger}${symbolModeTrigger}`,
  ),
  symbolExpectation(
    `${symbolModeTrigger}${symbolModeTrigger}${symbolModeTrigger}`,
    `${symbolModeTrigger}${symbolModeTrigger}`,
  ),
];

// Used for tests with different types of suggestions (File, Editor)
export const symbolModeInputData = [
  symbolExpectation(`${symbolModeTrigger}`, ''),
  symbolExpectation(`${symbolModeTrigger}test string`, 'test string'),
  symbolExpectation(`${symbolModeTrigger} `, ' '),
  symbolExpectation(` ${symbolModeTrigger}`, ''),
  symbolExpectation(`/${symbolModeTrigger}`, ''),
  symbolExpectation(`${symbolModeTrigger}${symbolModeTrigger}`, `${symbolModeTrigger}`),
  symbolExpectation(`${symbolModeTrigger}foo`, 'foo'),
  symbolExpectation(`${symbolModeTrigger} foo`, ' foo'),
  symbolExpectation(` ${symbolModeTrigger}foo`, 'foo'),
  symbolExpectation(` ${symbolModeTrigger} foo`, ' foo'),
  symbolExpectation(
    `bar/${symbolModeTrigger}foo${symbolModeTrigger}`,
    `foo${symbolModeTrigger}`,
  ),
  symbolExpectation(
    `bar${symbolModeTrigger}${symbolModeTrigger}foo${symbolModeTrigger}`,
    `${symbolModeTrigger}foo${symbolModeTrigger}`,
  ),
  symbolExpectation(
    `bar//${symbolModeTrigger}foo${symbolModeTrigger}`,
    `foo${symbolModeTrigger}`,
  ),
  symbolExpectation(`bar${symbolModeTrigger}`, ''),
  symbolExpectation(`bar ${symbolModeTrigger}`, ''),
  symbolExpectation(`bar!${symbolModeTrigger}foo`, 'foo'),
  symbolExpectation(`bar${symbolModeTrigger}foo`, 'foo'),
  symbolExpectation(`bar${symbolModeTrigger} foo`, ' foo'),
  symbolExpectation(`bar ${symbolModeTrigger}foo`, 'foo'),
  symbolExpectation(`bar ${symbolModeTrigger} foo`, ' foo'),
  symbolExpectation(
    `${symbolModeTrigger}bar${symbolModeTrigger}`,
    `bar${symbolModeTrigger}`,
  ),
  symbolExpectation(
    `${symbolModeTrigger}bar ${symbolModeTrigger}`,
    `bar ${symbolModeTrigger}`,
  ),
  symbolExpectation(
    `${symbolModeTrigger}bar ${symbolModeTrigger}   `,
    `bar ${symbolModeTrigger}   `,
  ),
  symbolExpectation(
    `${symbolModeTrigger}bar${symbolModeTrigger}foo`,
    `bar${symbolModeTrigger}foo`,
  ),
  symbolExpectation(
    `${symbolModeTrigger}bar${symbolModeTrigger} foo`,
    `bar${symbolModeTrigger} foo`,
  ),
  symbolExpectation(
    `${symbolModeTrigger}bar ${symbolModeTrigger}foo`,
    `bar ${symbolModeTrigger}foo`,
  ),
  symbolExpectation(
    `${symbolModeTrigger}bar ${symbolModeTrigger} foo`,
    `bar ${symbolModeTrigger} foo`,
  ),
  symbolExpectation(
    `${symbolModeTrigger}${symbolModeTrigger}fooooo${symbolModeTrigger}${symbolModeTrigger}`,
    `${symbolModeTrigger}fooooo${symbolModeTrigger}${symbolModeTrigger}`,
  ),
  symbolExpectation(
    `${symbolModeTrigger}${symbolModeTrigger}${symbolModeTrigger}`,
    `${symbolModeTrigger}${symbolModeTrigger}`,
  ),
  symbolExpectation(
    `${symbolModeTrigger}${editorModeTrigger}sfsas${symbolModeTrigger}`,
    `${editorModeTrigger}sfsas${symbolModeTrigger}`,
  ),
  symbolExpectation(`${editorModeTrigger}${symbolModeTrigger}`, ''),
  symbolExpectation(`${editorModeTrigger} ${symbolModeTrigger}`, ''),
  symbolExpectation(`${editorModeTrigger}${symbolModeTrigger}  `, `  `),
  symbolExpectation(`${editorModeTrigger}${symbolModeTrigger}foo`, `foo`),
  symbolExpectation(`${editorModeTrigger}${symbolModeTrigger} fooo`, ' fooo'),
  symbolExpectation(`${editorModeTrigger}bar${symbolModeTrigger}`, ''),
  symbolExpectation(`${editorModeTrigger}bar${symbolModeTrigger}  `, '  '),
  symbolExpectation(`${editorModeTrigger}bar ${symbolModeTrigger}$   `, '$   '),
  symbolExpectation(`${editorModeTrigger}bar.+${symbolModeTrigger}*foo`, '*foo'),
  symbolExpectation(
    `${editorModeTrigger}   \\bar  ${symbolModeTrigger} ^[]foo    `,
    ' ^[]foo    ',
  ),
];

export const unicodeInputData = [
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
