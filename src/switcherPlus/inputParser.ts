import { CommandDefinition } from './commandDefinitions';
import { HandlerRegistry } from './handlerRegistry';
import { InputInfo } from './inputInfo';
import { SwitcherPlusSettings } from 'src/settings';
import { Mode, AnySuggestion } from 'src/types';
import { WorkspaceLeaf } from 'obsidian';

/**
 * Represents a potential command match found by the parser.
 * It contains all information needed for a handler to validate it.
 */
export interface ResolvedCommand {
  cmdDef: CommandDefinition;
  cmdStr: string;
  /** The filter text relative to this specific command. */
  filterText: string;
  /** The index of where the command appeared in the clean input string. */
  indexInCleanInput: number;
}

/**
 * The final result from the single-pass parser.
 */
export interface ParsedResult {
  /** The fully cleaned input string, with all escape characters removed. */
  cleanInput: string;
  /** A list of resolved commands, sorted by precedence and ready for validation. */
  resolvedCommands: ResolvedCommand[];
}

/**
 * IME punctuation that NFKC will not map back to the ASCII trigger.
 * Fullwidth forms such as ＞/＠/！ are handled by the NFKC fallback.
 */
const IME_PUNCTUATION_FOLD: Readonly<Record<string, string>> = {
  '》': '>',
  '《': '<',
  '￥': '$',
};

type MappedCommand = {
  cmdDef: CommandDefinition;
  cmdStr: string;
  foldedCmdStr: string;
};

type FoundCommand = MappedCommand & {
  indexInCleanInput: number;
};

/**
 * Parses user input to identify commands and determine the operational mode for the switcher.
 * It processes the input string, handles escaped characters, and resolves command precedence.
 */
export class InputParser {
  private readonly commandMap: Map<string, MappedCommand[]> = new Map();
  private readonly foldedEscapeCmdChar: string;
  private readonly handlerRegistry: HandlerRegistry;

  /**
   * @param handlerRegistry - The registry of all available handlers.
   * @param config - The plugin settings.
   * @param commandDefinitions - A list of all available command definitions.
   */
  constructor(
    handlerRegistry: HandlerRegistry,
    config: SwitcherPlusSettings,
    commandDefinitions: CommandDefinition[],
  ) {
    this.handlerRegistry = handlerRegistry;
    this.foldedEscapeCmdChar = InputParser.foldString(config.escapeCmdChar);
    this.commandMap = this.buildCommandMap(commandDefinitions);
  }

  /**
   * Maps a single UTF-16 code unit to its ASCII trigger equivalent when possible.
   * Checks the IME table first, then NFKC, and only accepts a single code unit so
   * downstream index calculations stay aligned with the raw input.
   */
  private static foldChar(ch: string): string {
    const mapped = IME_PUNCTUATION_FOLD[ch];
    if (mapped !== undefined) {
      return mapped;
    }

    const normalized = ch.normalize('NFKC');
    return normalized.length === 1 ? normalized : ch;
  }

  /**
   * Folds every UTF-16 code unit independently so the result stays the same length
   * as the original string.
   */
  private static foldString(value: string): string {
    let folded = '';

    for (let i = 0; i < value.length; i += 1) {
      folded += InputParser.foldChar(value[i]);
    }

    return folded;
  }

  /**
   * Parses the user input to determine the current operational mode. It extracts commands,
   * validates them, and updates the inputInfo state. If no valid command is found,
   * it defaults to Standard mode.
   * @param inputInfo - The current state of the input.
   * @param activeSugg - The currently selected suggestion, if any.
   * @param activeLeaf - The currently active workspace leaf.
   */
  parseInputForMode(
    inputInfo: InputInfo,
    activeSugg: AnySuggestion,
    activeLeaf: WorkspaceLeaf,
  ): void {
    const { cleanInput, resolvedCommands } = this.parse(inputInfo.inputText);
    inputInfo.cleanInput = cleanInput;

    const wasCommandValidated = this.findFirstValidCommand(
      resolvedCommands,
      inputInfo,
      activeSugg,
      activeLeaf,
    );

    // If no command was validated, reset to the default mode and clear any sourced handlers.
    if (!wasCommandValidated) {
      this.handlerRegistry.resetSourcedHandlers();
      inputInfo.mode = Mode.Standard;
    }
  }

  /**
   * Performs a single pass over the input text to identify all commands.
   * It builds a "clean" version of the input string by removing escape characters
   * that are not part of a valid command.
   * @param inputText - The raw text from the switcher input field.
   * @returns A ParsedResult containing the clean input and a list of resolved commands.
   */
  parse(inputText: string): ParsedResult {
    let cleanInput = '';
    const foundCommands: FoundCommand[] = [];
    const foldedInput = InputParser.foldString(inputText);
    const escapeLen = this.foldedEscapeCmdChar.length;

    let i = 0;
    while (i < inputText.length) {
      // Case 1: Check for an escaped command. An escaped command is a valid command
      // string preceded by the escape character. For example, `!@` for the `@` command.
      // These should be treated as literal text rather than triggering a command.
      // Matching uses the folded copy so IME variants of the escape char also work.
      if (foldedInput.startsWith(this.foldedEscapeCmdChar, i)) {
        const match = this.findCommandMatch(foldedInput, i + escapeLen);

        if (match) {
          // Strip the escape char (existing behavior) but keep the raw command
          // characters the user typed, not the folded or configured trigger.
          const cmdLen = match.cmdStr.length;
          cleanInput += inputText.slice(i + escapeLen, i + escapeLen + cmdLen);
          i += escapeLen + cmdLen;
          continue;
        }
      }

      // Case 2: Check for a regular, unescaped command.
      const match = this.findCommandMatch(foldedInput, i);
      if (match) {
        // A command was found. Add it to our list of found commands and
        // advance the pointer. Append the raw typed characters so filter text
        // keeps IME punctuation instead of rewriting it to the ASCII trigger.
        const cmdLen = match.cmdStr.length;
        foundCommands.push({ ...match, indexInCleanInput: cleanInput.length });
        cleanInput += inputText.slice(i, i + cmdLen);
        i += cmdLen;
        continue;
      }

      // Case 3: If it's not an escaped command or a regular command, it's a literal character.
      // Add it to the clean input and advance the pointer.
      cleanInput += inputText[i];
      i += 1;
    }

    const resolvedCommands = this.resolveCommandPrecedence(foundCommands, cleanInput);

    return {
      cleanInput,
      resolvedCommands,
    };
  }

  /**
   * Builds a lookup map for efficient command matching. The map keys are the first
   * character of a command, and the values are an array of all commands starting
   * with that character.
   *
   * The commands within each array are sorted by length in descending order. This is
   * crucial for correctly matching overlapping commands. For example, if both `::` and`:`
   * are commands, this ensures `::` is matched first when the input is `::`.
   *
   * @param commandDefinitions - A list of all available command definitions.
   * @returns A map optimized for quick command lookups.
   */
  private buildCommandMap(
    commandDefinitions: CommandDefinition[],
  ): Map<string, MappedCommand[]> {
    const commandMap = new Map<string, MappedCommand[]>();

    // First pass: group all valid commands by their starting character.
    for (const cmdDef of commandDefinitions) {
      const cmdStr = cmdDef.parserCommand.getCommandStr() ?? '';

      if (cmdStr.length > 0) {
        const foldedCmdStr = InputParser.foldString(cmdStr);
        const firstChar = foldedCmdStr[0];

        if (!commandMap.has(firstChar)) {
          commandMap.set(firstChar, []);
        }

        commandMap.get(firstChar)?.push({ cmdDef, cmdStr, foldedCmdStr });
      }
    }

    // Second pass: sort the commands within each group by length, longest first.
    // This is critical for correctly matching overlapping commands (e.g., '::' vs ':').
    for (const commands of commandMap.values()) {
      commands.sort((a, b) => b.foldedCmdStr.length - a.foldedCmdStr.length);
    }

    return commandMap;
  }

  /**
   * Attempts to find a command match at a given index in the input text.
   * It uses the pre-built commandMap for efficient lookup.
   * @param foldedInput - The folded copy of the user input.
   * @param index - The index at which to check for a command.
   * @returns The matched command, or null if no match is found.
   */
  private findCommandMatch(foldedInput: string, index: number): MappedCommand | null {
    // Narrow down potential matches by looking at the folded first character.
    const potentialCommands = this.commandMap.get(foldedInput[index]);
    if (!potentialCommands) {
      return null;
    }

    // Because commands are sorted by length, the first match found is guaranteed
    // to be the longest possible match.
    for (const mappedCmd of potentialCommands) {
      if (foldedInput.startsWith(mappedCmd.foldedCmdStr, index)) {
        return mappedCmd;
      }
    }

    return null;
  }

  /**
   * Resolves the precedence of all commands found in the input string.
   * It categorizes commands into 'prefix' and 'sourced' types and determines their
   * effective filter text.
   *
   * @param foundCommands - The list of commands detected in the input.
   * @param cleanInput - The input string with escape characters processed.
   * @returns A list of ResolvedCommand objects, sorted by validation precedence.
   */
  private resolveCommandPrecedence(
    foundCommands: FoundCommand[],
    cleanInput: string,
  ): ResolvedCommand[] {
    const sourced: ResolvedCommand[] = [];
    let prefix: ResolvedCommand | undefined;

    // In a single pass, categorize each found command as either 'prefix' or 'sourced'
    // and calculate its filter text.
    for (const cmd of foundCommands) {
      const startIndex = cmd.indexInCleanInput + cmd.cmdStr.length;
      const filterText = cleanInput.substring(startIndex);

      const resolvedCommand: ResolvedCommand = {
        cmdDef: cmd.cmdDef,
        cmdStr: cmd.cmdStr,
        indexInCleanInput: cmd.indexInCleanInput,
        filterText,
      };

      const commandType = cmd.cmdDef.parserCommand.type;
      // A prefix command is only valid if it's at the start of the input.
      // Only the first valid prefix command is considered.
      if (commandType === 'prefix' && cmd.indexInCleanInput === 0 && !prefix) {
        prefix = resolvedCommand;
      } else if (commandType === 'sourced') {
        sourced.push(resolvedCommand);
      }
    }

    // Sourced commands are checked first, sorted by their appearance in the input.
    // The prefix command, if it exists, is always checked last.
    sourced.sort((a, b) => a.indexInCleanInput - b.indexInCleanInput);
    return prefix ? [...sourced, prefix] : sourced;
  }

  /**
   * Iterates through resolved commands and validates them against their handlers.
   * The first command that is successfully validated will set the mode and stop the process.
   * @param resolvedCommands - A list of commands sorted by precedence.
   * @param inputInfo - The current state of the input.
   * @param activeSugg - The currently selected suggestion, if any.
   * @param activeLeaf - The currently active workspace leaf.
   * @returns True if a command was successfully validated, otherwise false.
   */
  private findFirstValidCommand(
    resolvedCommands: ResolvedCommand[],
    inputInfo: InputInfo,
    activeSugg: AnySuggestion,
    activeLeaf: WorkspaceLeaf,
  ): boolean {
    for (const resolvedCommand of resolvedCommands) {
      const handler = this.handlerRegistry.getHandler(resolvedCommand.cmdDef.mode);
      if (!handler) {
        continue;
      }

      // Before validation, set session-specific options on the input info.
      // This allows command definitions to temporarily override global settings.
      inputInfo.sessionOpts.useActiveEditorAsSource =
        resolvedCommand.cmdDef.parserCommand.useActiveEditorAsSource;

      const parsedCmd = handler.validateCommand(
        inputInfo,
        resolvedCommand.indexInCleanInput,
        resolvedCommand.filterText,
        activeSugg,
        activeLeaf,
      );

      if (parsedCmd.isValidated) {
        // If the validated command was a 'sourced' type, it establishes a new
        // data source for the switcher. All other sourced handlers must be reset
        // to ensure their data doesn't leak into the new context.
        const isSourcedCommand = resolvedCommand.cmdDef.parserCommand.type === 'sourced';
        const excludeFromReset = isSourcedCommand ? [handler] : [];
        this.handlerRegistry.resetSourcedHandlers(excludeFromReset);

        return true;
      }
    }

    return false;
  }
}
