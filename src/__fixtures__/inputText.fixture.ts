import { Mode } from 'src/types';
import {
  editorTrigger,
  symbolTrigger,
  workspaceTrigger,
  headingsTrigger,
  commandTrigger,
  relatedItemsTrigger,
  bookmarksTrigger,
  escapeCmdCharTrigger,
  vaultTrigger,
} from './modeTrigger.fixture';

interface InputExpectation {
  input: string;
  expected: {
    mode: Mode;
    isValidated: boolean;
    parsedInput: string;
  };
}

const triggerMap = new Map<Mode, string>([
  [Mode.CommandList, commandTrigger],
  [Mode.EditorList, editorTrigger],
  [Mode.HeadingsList, headingsTrigger],
  [Mode.RelatedItemsList, relatedItemsTrigger],
  [Mode.BookmarksList, bookmarksTrigger],
  [Mode.SymbolList, symbolTrigger],
  [Mode.WorkspaceList, workspaceTrigger],
  [Mode.VaultList, vaultTrigger],
]);

export function makeInputExpectation(
  input: string,
  mode: Mode,
  expectedParsedInput?: string,
  isValidated = true,
): InputExpectation {
  return {
    input,
    expected: {
      mode,
      isValidated,
      parsedInput: expectedParsedInput,
    },
  };
}

function standardExpectation(input: string): InputExpectation {
  return makeInputExpectation(input, Mode.Standard, input, false);
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
  standardExpectation(`test${bookmarksTrigger}string`),
  standardExpectation(`test${bookmarksTrigger}$string`),
  standardExpectation(`^${bookmarksTrigger}string`),
  standardExpectation(` ${bookmarksTrigger}test string`),
  standardExpectation(`test string ${bookmarksTrigger}`),
  standardExpectation(`     ${bookmarksTrigger}test string ${bookmarksTrigger}`),
  standardExpectation(`test${relatedItemsTrigger}string`),
  standardExpectation(`test${relatedItemsTrigger}$string`),
  standardExpectation(`^${relatedItemsTrigger}string`),
  standardExpectation(` ${relatedItemsTrigger}test string`),
  standardExpectation(`test string ${relatedItemsTrigger}`),
  standardExpectation(`     ${relatedItemsTrigger}test string ${relatedItemsTrigger}`),
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

// Used for tests with active leaf only (no suggestions)
export function makePrefixOnlyInputFixture(triggerMode: Mode): InputExpectation[] {
  const trigger = triggerMap.get(triggerMode);

  return [
    makeInputExpectation(`${trigger}`, triggerMode, ''),
    makeInputExpectation(`${trigger}test string`, triggerMode, 'test string'),
    makeInputExpectation(`${trigger}${symbolTrigger}`, triggerMode, `${symbolTrigger}`),
    makeInputExpectation(`${trigger} ${symbolTrigger}`, triggerMode, ` ${symbolTrigger}`),
    makeInputExpectation(
      `${trigger}${symbolTrigger}  `,
      triggerMode,
      `${symbolTrigger}  `,
    ),
    makeInputExpectation(
      `${trigger}${symbolTrigger}foo`,
      triggerMode,
      `${symbolTrigger}foo`,
    ),
    makeInputExpectation(
      `${trigger}bar${symbolTrigger}`,
      triggerMode,
      `bar${symbolTrigger}`,
    ),
    makeInputExpectation(
      `${trigger}bar$${symbolTrigger}  `,
      triggerMode,
      `bar$${symbolTrigger}  `,
    ),
    makeInputExpectation(
      `${trigger}bar ${symbolTrigger}`,
      triggerMode,
      `bar ${symbolTrigger}`,
    ),
    makeInputExpectation(
      `${trigger}bar ${symbolTrigger}   `,
      triggerMode,
      `bar ${symbolTrigger}   `,
    ),
    makeInputExpectation(
      `${trigger}bar${symbolTrigger}foo`,
      triggerMode,
      `bar${symbolTrigger}foo`,
    ),
    makeInputExpectation(
      `${trigger}bar${symbolTrigger} foo`,
      triggerMode,
      `bar${symbolTrigger} foo`,
    ),
    makeInputExpectation(
      `${trigger}bar ${symbolTrigger}foo  `,
      triggerMode,
      `bar ${symbolTrigger}foo  `,
    ),
    makeInputExpectation(
      `${trigger}bar ${symbolTrigger} foo`,
      triggerMode,
      `bar ${symbolTrigger} foo`,
    ),
    makeInputExpectation(
      `${trigger}bar ${symbolTrigger}foo`,
      triggerMode,
      `bar ${symbolTrigger}foo`,
    ),
    makeInputExpectation(
      `${trigger}${symbolTrigger}${symbolTrigger}`,
      triggerMode,
      `${symbolTrigger}${symbolTrigger}`,
    ),
  ];
}

// Used for tests with different types of suggestions (File, Editor)
export function makeSourcedCmdEmbeddedInputFixture(
  triggerMode: Mode,
): InputExpectation[] {
  const trigger = triggerMap.get(triggerMode);

  const ret = makePrefixOnlyInputFixture(triggerMode);

  return ret.concat([
    makeInputExpectation(`${trigger} `, triggerMode, ' '),
    makeInputExpectation(` ${trigger}`, triggerMode, ''),
    makeInputExpectation(`/${trigger}`, triggerMode, ''),
    makeInputExpectation(`${trigger}foo`, triggerMode, 'foo'),
    makeInputExpectation(`${trigger} foo`, triggerMode, ' foo'),
    makeInputExpectation(` ${trigger}foo`, triggerMode, 'foo'),
    makeInputExpectation(` ${trigger} foo`, triggerMode, ' foo'),
    makeInputExpectation(`bar${trigger}`, triggerMode, ''),
    makeInputExpectation(`bar ${trigger}`, triggerMode, ''),
    makeInputExpectation(`bar!${trigger}foo`, triggerMode, 'foo'),
    makeInputExpectation(`bar${trigger}foo`, triggerMode, 'foo'),
    makeInputExpectation(`bar${trigger} foo`, triggerMode, ' foo'),
    makeInputExpectation(`bar ${trigger}foo`, triggerMode, 'foo'),
    makeInputExpectation(`bar ${trigger} foo`, triggerMode, ' foo'),
    makeInputExpectation(`${editorTrigger}${trigger}`, triggerMode, ''),
    makeInputExpectation(`${editorTrigger} ${trigger}`, triggerMode, ''),
    makeInputExpectation(`${editorTrigger}${trigger}  `, triggerMode, `  `),
    makeInputExpectation(`${editorTrigger}${trigger}foo`, triggerMode, `foo`),
    makeInputExpectation(`${editorTrigger}${trigger} fooo`, triggerMode, ' fooo'),
    makeInputExpectation(`${editorTrigger}bar${trigger}`, triggerMode, ''),
    makeInputExpectation(`${editorTrigger}bar${trigger}  `, triggerMode, '  '),
    makeInputExpectation(`${editorTrigger}bar ${trigger}$   `, triggerMode, '$   '),
    makeInputExpectation(`${editorTrigger}bar.+${trigger}*foo`, triggerMode, '*foo'),
    makeInputExpectation(
      `bar/${trigger}foo${symbolTrigger}`,
      triggerMode,
      `foo${symbolTrigger}`,
    ),
    makeInputExpectation(
      `bar${trigger}${symbolTrigger}foo${symbolTrigger}`,
      triggerMode,
      `${symbolTrigger}foo${symbolTrigger}`,
    ),
    makeInputExpectation(
      `bar//${trigger}foo${symbolTrigger}`,
      triggerMode,
      `foo${symbolTrigger}`,
    ),
    makeInputExpectation(
      `${trigger}bar ${symbolTrigger} foo`,
      triggerMode,
      `bar ${symbolTrigger} foo`,
    ),
    makeInputExpectation(
      `${trigger}${editorTrigger}sfsas${symbolTrigger}`,
      triggerMode,
      `${editorTrigger}sfsas${symbolTrigger}`,
    ),
    makeInputExpectation(
      `${editorTrigger}   \\bar  ${trigger} ^[]foo    `,
      triggerMode,
      ' ^[]foo    ',
    ),
  ]);
}

/**
 * Creates an array of standard mode expectations with command escape characters
 * @returns InputExpectation[]
 */
export function makeEscapedStandardModeInputFixture(): InputExpectation[] {
  return [
    makeInputExpectation(
      `${escapeCmdCharTrigger}${editorTrigger}foo`,
      Mode.Standard,
      `${editorTrigger}foo`,
      false,
    ),
    makeInputExpectation(
      `${escapeCmdCharTrigger}${commandTrigger}foo${escapeCmdCharTrigger}${symbolTrigger}bar`,
      Mode.Standard,
      `${commandTrigger}foo${symbolTrigger}bar`,
      false,
    ),
    makeInputExpectation(
      `1깍2💩3👨‍👩‍👧‍👦4${escapeCmdCharTrigger}${symbolTrigger}bar`,
      Mode.Standard,
      `1깍2💩3👨‍👩‍👧‍👦4${symbolTrigger}bar`,
      false,
    ),
    makeInputExpectation(
      `${escapeCmdCharTrigger}${headingsTrigger} ${escapeCmdCharTrigger}${symbolTrigger}bar${escapeCmdCharTrigger}${symbolTrigger}`,
      Mode.Standard,
      `${headingsTrigger} ${symbolTrigger}bar${symbolTrigger}`,
      false,
    ),
  ];
}

/**
 * Creates an array of sourced command expectations with command escape characters
 * @returns InputExpectation[]
 */
export function makeEscapedSourcedCommandInputFixture(): InputExpectation[] {
  return [
    makeInputExpectation(
      `${escapeCmdCharTrigger}${bookmarksTrigger}foo ${relatedItemsTrigger} bar`,
      Mode.RelatedItemsList,
      ` bar`,
      true,
    ),
    makeInputExpectation(
      `${headingsTrigger}1깍${escapeCmdCharTrigger}${relatedItemsTrigger}💩${symbolTrigger}3👨‍👩‍👧‍👦4`,
      Mode.SymbolList,
      `3👨‍👩‍👧‍👦4`,
      false,
    ),
    makeInputExpectation(
      `${relatedItemsTrigger}foo ${escapeCmdCharTrigger}${symbolTrigger} bar`,
      Mode.RelatedItemsList,
      `foo ${escapeCmdCharTrigger}${symbolTrigger} bar`,
      true,
    ),
    makeInputExpectation(
      `${escapeCmdCharTrigger}${headingsTrigger}${editorTrigger} foo ${symbolTrigger}${escapeCmdCharTrigger}bar`,
      Mode.SymbolList,
      `${escapeCmdCharTrigger}bar`,
      true,
    ),
    makeInputExpectation(
      `${escapeCmdCharTrigger}${symbolTrigger}${symbolTrigger} bar`,
      Mode.SymbolList,
      ` bar`,
      true,
    ),
    makeInputExpectation(
      `${escapeCmdCharTrigger}${symbolTrigger}foo${relatedItemsTrigger} ${escapeCmdCharTrigger}${escapeCmdCharTrigger}bar`,
      Mode.RelatedItemsList,
      ` ${escapeCmdCharTrigger}${escapeCmdCharTrigger}bar`,
      true,
    ),
  ];
}

/**
 * Creates an array of prefix command expectations with command escape characters
 * @returns InputExpectation[]
 */
export function makeEscapedPrefixCommandInputFixture(): InputExpectation[] {
  return [
    makeInputExpectation(
      `${editorTrigger}foo${escapeCmdCharTrigger}${relatedItemsTrigger}`,
      Mode.EditorList,
      `foo${relatedItemsTrigger}`,
      true,
    ),
    makeInputExpectation(
      `${headingsTrigger}깍2💩${escapeCmdCharTrigger}${symbolTrigger}3👨‍👩‍👧‍👦`,
      Mode.HeadingsList,
      `깍2💩${symbolTrigger}3👨‍👩‍👧‍👦`,
      false,
    ),
    makeInputExpectation(
      `${headingsTrigger}${escapeCmdCharTrigger}${relatedItemsTrigger}${escapeCmdCharTrigger}${symbolTrigger}`,
      Mode.HeadingsList,
      `${relatedItemsTrigger}${symbolTrigger}`,
      true,
    ),
  ];
}
