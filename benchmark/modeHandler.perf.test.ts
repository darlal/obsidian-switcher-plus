import { mock } from 'jest-mock-extended';
import { SwitcherPlusSettings } from 'src/settings';
import { Chance } from 'chance';
import { ModeHandler } from 'src/switcherPlus';
import { App, Workspace, Vault, InternalPlugins, ViewRegistry } from 'obsidian';
import {
  editorTrigger,
  symbolTrigger,
  workspaceTrigger,
  headingsTrigger,
  commandTrigger,
  relatedItemsTrigger,
  vaultTrigger,
  bookmarksTrigger,
  escapeCmdCharTrigger,
  makeLeaf,
  symbolActiveTrigger,
  relatedItemsActiveTrigger,
  makeFileSuggestion,
} from '@fixtures';
import { BOOKMARKS_PLUGIN_ID } from 'src/Handlers';
import { performance } from 'perf_hooks';
import * as fs from 'fs';
import * as path from 'path';

const chance = new Chance();
const BASELINE_FILE_PATH = path.join(__dirname, 'modeHandler.perf.baseline.json');
const TEST_INPUT_COUNT = 10000;
const PERFORMANCE_THRESHOLD_PERCENTAGE = 15;
const RANDOM_TEXT_LENGTH = 20;
const MIN_PREFIX_LENGTH = 1;
const MAX_PREFIX_LENGTH = 15;

interface PerformanceRecord {
  date: string;
  duration: number;
}

interface InputCategory {
  triggers: string[];
  isSourced: boolean;
  isEscaped: boolean;
}

/**
 * Reads and parses the performance baseline file.
 * This is used to retrieve historical performance data for comparison.
 * @param filePath The path to the baseline file.
 * @returns An array of performance records, or null if the file doesn't exist.
 */
function readPerformanceData(filePath: string): PerformanceRecord[] | null {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    const baselineData = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(baselineData) as PerformanceRecord[];
  } catch (error) {
    console.error('Error reading or parsing baseline file:', error);
    return null;
  }
}

/**
 * Writes performance data to the baseline file.
 * This is used to update the baseline with new performance data.
 * @param filePath The path to the baseline file.
 * @param data The performance data to write.
 */
function writePerformanceData(filePath: string, data: PerformanceRecord[]): void {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error writing baseline file:', error);
  }
}

/**
 * Overwrites the existing baseline with a new performance record.
 * This is used to explicitly decides to set a new performance baseline.
 * @param duration The new performance duration to set as the baseline.
 */
function updateSavedBaselineAndReset(duration: number): void {
  const newRecord = { date: new Date().toISOString(), duration };
  writePerformanceData(BASELINE_FILE_PATH, [newRecord]);
  console.log(`New performance baseline established: ${duration.toFixed(2)}ms`);
}

/**
 * Compares the current performance against the baseline and updates the baseline file.
 * This is used to detect performance regressions.
 * @param duration The current performance duration.
 * @param performanceData The historical performance data.
 * @returns The percentage increase in performance compared to the baseline.
 */
function compareAgainstBaseline(
  duration: number,
  performanceData: PerformanceRecord[],
): number {
  const goldenBaseline = performanceData[0].duration;
  const percentageIncrease = ((duration - goldenBaseline) / goldenBaseline) * 100;

  console.log(
    `This run execution time: ${duration.toFixed(2)}ms\n` +
      `        Golden baseline: ${goldenBaseline.toFixed(2)}ms\n` +
      ` % change from baseline: ${percentageIncrease.toFixed(2)}%`,
  );

  performanceData.push({ date: new Date().toISOString(), duration });
  writePerformanceData(BASELINE_FILE_PATH, performanceData);

  return percentageIncrease;
}

/**
 * Generates a random string of a given length.
 * This is used to create realistic-looking search text for the performance test.
 * @param length The length of the string to generate.
 * @returns A random string.
 */
function generateRandomString(length: number): string {
  return chance.string({ length, pool: 'abcdefghijklmnopqrstuvwxyz0123456789' });
}

/**
 * Creates a single test input string based on the given parameters.
 * This is used to generate a variety of test cases for the performance test.
 * @param trigger The command trigger to use (e.g., '>', '#').
 * @param isSourced Whether the command is a sourced command (e.g., symbol, heading).
 * @param isEscaped Whether the command is escaped.
 * @returns A test input string.
 */
function createInputString(
  trigger: string,
  isSourced: boolean,
  isEscaped: boolean,
): string {
  const text = generateRandomString(RANDOM_TEXT_LENGTH);
  const escapeChar = isEscaped ? escapeCmdCharTrigger : '';

  if (isSourced) {
    const prefixText = generateRandomString(
      chance.integer({ min: MIN_PREFIX_LENGTH, max: MAX_PREFIX_LENGTH }),
    );
    return `${prefixText}${escapeChar}${trigger}${text}`;
  }

  return `${escapeChar}${trigger}${text}`;
}

/**
 * Generates a large number of test input strings for the performance test.
 * This is used to simulate a realistic workload and get meaningful performance measurements.
 * @param count The number of input strings to generate.
 * @param categories The categories of input strings to generate.
 * @returns An array of test input strings.
 */
function generateInputStrings(count: number, categories: InputCategory[]): string[] {
  const inputs: string[] = [];
  const numPerCategory = Math.floor(count / categories.length);

  for (const category of categories) {
    for (let i = 0; i < numPerCategory; i++) {
      const trigger = chance.pickone(category.triggers);
      inputs.push(createInputString(trigger, category.isSourced, category.isEscaped));
    }
  }

  // Fill any remainder from rounding by cycling through categories
  const remainder = count - inputs.length;
  for (let i = 0; i < remainder; i++) {
    const category = categories[i % categories.length];
    const trigger = chance.pickone(category.triggers);
    inputs.push(createInputString(trigger, category.isSourced, category.isEscaped));
  }

  return chance.shuffle(inputs);
}

describe('ModeHandler Performance', () => {
  let mockApp: App;
  let mockSettings: SwitcherPlusSettings;
  let mockWorkspace: Workspace;
  let mockVault: Vault;
  let modeHandler: ModeHandler;

  const sourcedTriggers = [symbolTrigger, relatedItemsTrigger];
  const prefixOnlyTriggers = [
    editorTrigger,
    headingsTrigger,
    workspaceTrigger,
    commandTrigger,
    vaultTrigger,
    bookmarksTrigger,
    symbolActiveTrigger,
    relatedItemsActiveTrigger,
  ];

  const inputCategories: InputCategory[] = [
    { triggers: prefixOnlyTriggers, isSourced: false, isEscaped: false },
    { triggers: prefixOnlyTriggers, isSourced: false, isEscaped: true },
    { triggers: sourcedTriggers, isSourced: true, isEscaped: false },
    { triggers: sourcedTriggers, isSourced: true, isEscaped: true },
  ];

  beforeAll(() => {
    const mockInternalPlugins = mock<InternalPlugins>();
    mockInternalPlugins.getEnabledPluginById.mockReturnValue({ id: BOOKMARKS_PLUGIN_ID });

    mockApp = mock<App>({
      internalPlugins: mockInternalPlugins,
      viewRegistry: mock<ViewRegistry>({ typeByExtension: {} }),
    });

    mockSettings = mock<SwitcherPlusSettings>({
      editorListCommand: editorTrigger,
      symbolListCommand: symbolTrigger,
      symbolListActiveEditorCommand: symbolActiveTrigger,
      workspaceListCommand: workspaceTrigger,
      headingsListCommand: headingsTrigger,
      bookmarksListCommand: bookmarksTrigger,
      commandListCommand: commandTrigger,
      vaultListCommand: vaultTrigger,
      relatedItemsListCommand: relatedItemsTrigger,
      relatedItemsListActiveEditorCommand: relatedItemsActiveTrigger,
      escapeCmdChar: escapeCmdCharTrigger,
      excludeViewTypes: [],
      overrideStandardModeBehaviors: false,
      preserveCommandPaletteLastInput: false,
      preserveQuickSwitcherLastInput: false,
      fileExtAllowList: [],
      ...mock<SwitcherPlusSettings>(),
    });

    mockWorkspace = mock<Workspace>();
    mockVault = mock<Vault>();
    mockApp.workspace = mockWorkspace;
    mockApp.vault = mockVault;

    modeHandler = new ModeHandler(mockApp, mockSettings, null);
  });

  /**
   * Measures the performance of the determineRunMode function.
   * This is the core of the performance test, running the function with a large number of inputs.
   * @param inputs The test input strings to run the function with.
   * @returns The total time taken to run the function with all inputs.
   */
  const measurePerformance = (inputs: string[]): number => {
    const mockLeaf = makeLeaf();
    const mockSugg = makeFileSuggestion();

    const startTime = performance.now();
    for (const input of inputs) {
      modeHandler.determineRunMode(input, mockSugg, mockLeaf);
    }
    const duration = performance.now() - startTime;

    return duration;
  };

  test('determineRunMode performance test', () => {
    const testInputs = generateInputStrings(TEST_INPUT_COUNT, inputCategories);
    const duration = measurePerformance(testInputs);
    const updateBaseline = process.env.UPDATE_PERF_BASELINE === 'true';

    if (updateBaseline) {
      updateSavedBaselineAndReset(duration);
      return;
    }

    const performanceData = readPerformanceData(BASELINE_FILE_PATH);
    if (!performanceData) {
      throw new Error(
        `Performance baseline file not found. Please run the test with "UPDATE_PERF_BASELINE=true" to create it.`,
      );
    }

    const percentageIncrease = compareAgainstBaseline(duration, performanceData);
    expect(percentageIncrease).toBeLessThan(PERFORMANCE_THRESHOLD_PERCENTAGE);
  });
});
