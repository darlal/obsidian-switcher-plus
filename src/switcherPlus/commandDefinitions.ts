import { App } from 'obsidian';
import { SwitcherPlusSettings } from 'src/settings';
import {
  BookmarksHandler,
  CommandHandler,
  EditorHandler,
  Handler,
  HeadingsHandler,
  RelatedItemsHandler,
  StandardExHandler,
  SymbolHandler,
  VaultHandler,
  WorkspaceHandler,
} from 'src/Handlers';
import { AnySuggestion, Mode, SuggestionType } from 'src/types';
import { getModeTriggers } from 'src/settings/modeTriggers';

/**
 * A type alias for the constructor of a class that implements the {@link Handler} interface.
 * This is used to dynamically instantiate handlers.
 * @param app - The Obsidian App instance.
 * @param settings - The Switcher++ plugin settings.
 */
export type HandlerConstructor = new (
  app: App,
  settings: SwitcherPlusSettings,
) => Handler<AnySuggestion>;

/**
 * Defines how a command can be triggered from the switcher input field.
 */
export interface ParserCommand {
  /**
   * The type of command trigger.
   * - `prefix`: The command is triggered by a string at the start of the input.
   * - `sourced`: The command is triggered by a string and operates on a "source" suggestion
   *   (e.g., showing symbols for a specific file).
   */
  type: 'prefix' | 'sourced' | 'none';

  /**
   * A function that returns the command string (e.g., 'edt ') that triggers this command.
   * This is a function to allow the command string to be dynamically configured from settings.
   */
  getCommandStr: () => string;

  /** All literal triggers, including optional aliases. */
  getCommandStrs?: () => string[];

  /**
   * If true, the command will use the active editor as its source, instead of requiring
   * a source to be selected from the suggestions list.
   * This is only relevant for `sourced` commands.
   */
  useActiveEditorAsSource?: boolean;
}

/**
 * Represents the complete definition of a command that can be executed by the plugin.
 * It ties together the command's metadata, the mode it activates, the handler that processes it,
 * and how it can be invoked.
 */
export interface CommandDefinition {
  /**
   * The unique identifier for the command (e.g., 'switcher-plus:open').
   * This is used to register the command with Obsidian.
   */
  commandId: string;

  /**
   * The human-readable name of the command that appears in the command palette.
   */
  commandName: string;

  /**
   * The ID of the icon to display for this command.
   */
  iconId: string;

  /**
   * The {@link Mode} that this command activates when run.
   */
  mode: Mode;

  /**
   * The constructor for the {@link Handler} class that manages the logic for this command's mode.
   */
  handlerClass: HandlerConstructor;

  /**
   * An optional list of {@link SuggestionType} values that are owned by this command's handler.
   * This is used to map a suggestion back to its parent handler.
   */
  ownSuggestionTypes?: SuggestionType[];

  /**
   * A definition for how this command can be triggered from the switcher input.
   */
  parserCommand: ParserCommand;
}

/**
 * A factory function that creates a list of all command definitions for the plugin.
 * It uses the plugin settings to configure the dynamic parts of the definitions, such as command strings.
 * @param config - The Switcher++ plugin settings.
 * @returns An array of {@link CommandDefinition} objects.
 */
export function getCommandDefinitions(config: SwitcherPlusSettings): CommandDefinition[] {
  return [
    {
      commandId: 'switcher-plus:open',
      commandName: 'Open in Standard Mode',
      mode: Mode.Standard,
      iconId: 'lucide-file-search',
      handlerClass: StandardExHandler,
      ownSuggestionTypes: [SuggestionType.Alias, SuggestionType.File],
      parserCommand: {
        type: 'none',
        getCommandStr: () => '',
      },
    },
    {
      commandId: 'switcher-plus:open-editors',
      commandName: 'Open in Editor Mode',
      mode: Mode.EditorList,
      iconId: 'lucide-file-edit',
      handlerClass: EditorHandler,
      ownSuggestionTypes: [SuggestionType.EditorList],
      parserCommand: {
        type: 'prefix',
        getCommandStr: () => config.editorListCommand,
        getCommandStrs: () => getModeTriggers(config, 'editorListCommand'),
      },
    },
    {
      commandId: 'switcher-plus:open-symbols',
      commandName: 'Open Symbols for selected suggestion or editor',
      mode: Mode.SymbolList,
      iconId: 'lucide-dollar-sign',
      handlerClass: SymbolHandler,
      ownSuggestionTypes: [SuggestionType.SymbolList],
      parserCommand: {
        type: 'sourced',
        getCommandStr: () => config.symbolListCommand,
        getCommandStrs: () => getModeTriggers(config, 'symbolListCommand'),
      },
    },
    {
      commandId: 'switcher-plus:open-symbols-active',
      commandName: 'Open Symbols for the active editor',
      mode: Mode.SymbolList,
      iconId: 'lucide-dollar-sign',
      handlerClass: SymbolHandler,
      parserCommand: {
        type: 'prefix',
        getCommandStr: () => config.symbolListActiveEditorCommand,
        getCommandStrs: () => getModeTriggers(config, 'symbolListActiveEditorCommand'),
        useActiveEditorAsSource: true,
      },
    },
    {
      commandId: 'switcher-plus:open-workspaces',
      commandName: 'Open in Workspaces Mode',
      mode: Mode.WorkspaceList,
      iconId: 'lucide-album',
      handlerClass: WorkspaceHandler,
      ownSuggestionTypes: [SuggestionType.WorkspaceList],
      parserCommand: {
        type: 'prefix',
        getCommandStr: () => config.workspaceListCommand,
        getCommandStrs: () => getModeTriggers(config, 'workspaceListCommand'),
      },
    },
    {
      commandId: 'switcher-plus:open-headings',
      commandName: 'Open in Headings Mode',
      mode: Mode.HeadingsList,
      iconId: 'lucide-file-search',
      handlerClass: HeadingsHandler,
      ownSuggestionTypes: [SuggestionType.HeadingsList],
      parserCommand: {
        type: 'prefix',
        getCommandStr: () => config.headingsListCommand,
        getCommandStrs: () => getModeTriggers(config, 'headingsListCommand'),
      },
    },
    {
      // Note: leaving this id with the old starred plugin name so that user
      // don't have to update their hotkey mappings when they upgrade
      commandId: 'switcher-plus:open-starred',
      commandName: 'Open in Bookmarks Mode',
      mode: Mode.BookmarksList,
      iconId: 'lucide-bookmark',
      handlerClass: BookmarksHandler,
      ownSuggestionTypes: [SuggestionType.Bookmark],
      parserCommand: {
        type: 'prefix',
        getCommandStr: () => config.bookmarksListCommand,
        getCommandStrs: () => getModeTriggers(config, 'bookmarksListCommand'),
      },
    },
    {
      commandId: 'switcher-plus:open-commands',
      commandName: 'Open in Commands Mode',
      mode: Mode.CommandList,
      iconId: 'run-command',
      handlerClass: CommandHandler,
      ownSuggestionTypes: [SuggestionType.CommandList],
      parserCommand: {
        type: 'prefix',
        getCommandStr: () => config.commandListCommand,
        getCommandStrs: () => getModeTriggers(config, 'commandListCommand'),
      },
    },
    {
      commandId: 'switcher-plus:open-related-items',
      commandName: 'Open Related Items for selected suggestion or editor',
      mode: Mode.RelatedItemsList,
      iconId: 'lucide-file-plus-2',
      handlerClass: RelatedItemsHandler,
      ownSuggestionTypes: [SuggestionType.RelatedItemsList],
      parserCommand: {
        type: 'sourced',
        getCommandStr: () => config.relatedItemsListCommand,
        getCommandStrs: () => getModeTriggers(config, 'relatedItemsListCommand'),
      },
    },
    {
      commandId: 'switcher-plus:open-related-items-active',
      commandName: 'Open Related Items for the active editor',
      mode: Mode.RelatedItemsList,
      iconId: 'lucide-file-plus-2',
      handlerClass: RelatedItemsHandler,
      parserCommand: {
        type: 'prefix',
        getCommandStr: () => config.relatedItemsListActiveEditorCommand,
        getCommandStrs: () =>
          getModeTriggers(config, 'relatedItemsListActiveEditorCommand'),
        useActiveEditorAsSource: true,
      },
    },
    {
      commandId: 'switcher-plus:open-vaults',
      commandName: 'Open in Vaults Mode',
      mode: Mode.VaultList,
      iconId: 'vault',
      handlerClass: VaultHandler,
      ownSuggestionTypes: [SuggestionType.VaultList],
      parserCommand: {
        type: 'prefix',
        getCommandStr: () => config.vaultListCommand,
        getCommandStrs: () => getModeTriggers(config, 'vaultListCommand'),
      },
    },
  ];
}
