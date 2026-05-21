import { CommandDefinition, HandlerConstructor } from './commandDefinitions';
import { Handler } from 'src/Handlers';
import { AnySuggestion, Mode, SuggestionType } from 'src/types';
import { App } from 'obsidian';
import { SwitcherPlusSettings } from 'src/settings';
import { isOfType, logWarn } from 'src/utils';

/**
 * A singleton registry for managing and providing access to various {@link Handler} instances.
 * It is responsible for mapping modes, suggestion types, and command strings to their
 * corresponding handlers, and it lazily instantiates them to save resources.
 */
export class HandlerRegistry {
  private static instance: HandlerRegistry;

  /**
   * Caches handler instances after they are created to avoid re-instantiation.
   */
  private readonly instanceCache: Map<Mode, Handler<AnySuggestion>> = new Map();

  /**
   * Maps a {@link Mode} to the constructor of the handler that manages it.
   * This is the primary map used to create new handler instances.
   */
  private readonly modeToHandlerClass: Map<Mode, HandlerConstructor> = new Map();
  private readonly suggestionTypeToMode: Map<SuggestionType, Mode> = new Map();
  private readonly cmdStrToMode: Map<string, Mode> = new Map();

  /**
   * A set of modes that are associated with "sourced" commands.
   * Sourced handlers have state that may need to be reset between operations.
   */
  private readonly sourcedHandlerModes: Set<Mode> = new Set();

  /**
   * The constructor is private to enforce the singleton pattern.
   * Use HandlerRegistry.initialize() and HandlerRegistry.getInstance().
   */
  private constructor(
    public readonly app: App,
    public readonly config: SwitcherPlusSettings,
    commandDefinitions: CommandDefinition[],
  ) {
    for (const def of commandDefinitions) {
      if (def.handlerClass) {
        this.modeToHandlerClass.set(def.mode, def.handlerClass);
        this.mapSuggestionTypesToMode(def);
        this.mapCommandStrToMode(def);
        this.registerSourcedHandler(def);
      }
    }
  }

  /**
   * Initializes the singleton instance of the HandlerRegistry.
   * This should only be called once at plugin startup.
   * @param app - The Obsidian App instance.
   * @param config - The Switcher++ plugin settings.
   * @param commandDefinitions - The list of all command definitions.
   */
  static initialize(
    app: App,
    config: SwitcherPlusSettings,
    commandDefinitions: CommandDefinition[],
  ): void {
    if (this.instance) {
      logWarn('HandlerRegistry already initialized.');
      return;
    }

    this.instance = new HandlerRegistry(app, config, commandDefinitions);
  }

  static reset(): void {
    this.instance = null;
  }

  /**
   * Returns the singleton instance of the HandlerRegistry.
   * @returns The singleton instance if initialized. Otherwise null.
   */
  static getInstance(): HandlerRegistry | null {
    return this.instance ?? null;
  }

  /**
   * Gets a handler instance based on an identifier.
   * This method implements lazy instantiation: a handler is only created the first time it is requested.
   * Subsequent requests will return the cached instance.
   * @param identifier - The identifier for the handler. This can be a {@link Mode},
   * a suggestion object ({@link AnySuggestion}), or a command trigger string.
   * @returns The requested {@link Handler} instance, or null if no handler is found for the identifier.
   */
  getHandler(identifier: Mode | AnySuggestion | string): Handler<AnySuggestion> | null {
    let handler: Handler<AnySuggestion> | null = null;
    const mode = this.resolveMode(identifier);

    if (mode) {
      if (this.instanceCache.has(mode)) {
        handler = this.instanceCache.get(mode) ?? null;
      } else {
        // Lazily instantiate the handler if it's not in the cache.
        const HandlerClass = this.modeToHandlerClass.get(mode);
        if (HandlerClass) {
          const handlerInstance = new HandlerClass(this.app, this.config);
          this.instanceCache.set(mode, handlerInstance);
          handler = handlerInstance;
        }
      }
    }

    return handler;
  }

  /**
   * Resets all sourced handlers, except for any specified in the exclude list.
   * This is used to clear the state of any inactive sourced command handlers when parsing new user input,
   * ensuring that old data does not persist across commands.
   * @param excludeHandlers - A list of handlers to exempt from being reset. This is useful
   * for preserving the state of the currently active handler.
   */
  resetSourcedHandlers(excludeHandlers?: Handler<AnySuggestion>[]): void {
    const excludes = new Set(excludeHandlers);

    for (const mode of this.sourcedHandlerModes) {
      const handler = this.instanceCache.get(mode);

      if (handler && !excludes.has(handler)) {
        handler.reset();
      }
    }
  }

  /**
   * Populates the `suggestionTypeToMode` map for a given command definition.
   * @param def - The command definition to process.
   */
  private mapSuggestionTypesToMode(def: CommandDefinition): void {
    def.ownSuggestionTypes?.forEach((type) => {
      this.suggestionTypeToMode.set(type, def.mode);
    });
  }

  /**
   * Populates the `cmdStrToMode` map for a given command definition.
   * @param def - The command definition to process.
   */
  private mapCommandStrToMode(def: CommandDefinition): void {
    const cmdStr = def.parserCommand?.getCommandStr();
    if (cmdStr?.length) {
      this.cmdStrToMode.set(cmdStr, def.mode);
    }
  }

  /**
   * Registers a handler as a "sourced" handler if its command type is 'sourced'.
   * @param def - The command definition to process.
   */
  private registerSourcedHandler(def: CommandDefinition): void {
    if (def.parserCommand?.type === 'sourced') {
      this.sourcedHandlerModes.add(def.mode);
    }
  }

  /**
   * Resolves an identifier of various types to a specific {@link Mode}.
   * This allows the `getHandler` method to be flexible in how it's called.
   * @param identifier - The identifier to resolve, which can be a Mode, a suggestion, or a string.
   * @returns The resolved {@link Mode}, or undefined if it cannot be resolved.
   */
  private resolveMode(identifier: Mode | AnySuggestion | string): Mode | undefined {
    let mode: Mode | undefined;

    // The order of these checks is important. A numeric Mode is the most direct lookup.
    if (typeof identifier === 'number' && Object.values(Mode).includes(identifier)) {
      mode = identifier;
    } else if (isOfType<AnySuggestion>(identifier, 'type')) {
      // If the identifier is a suggestion object, we use its type to find the mode.
      mode = this.suggestionTypeToMode.get(identifier.type);
    } else if (typeof identifier === 'string') {
      // If it's a string, we assume it's a command and look it up.
      mode = this.cmdStrToMode.get(identifier);
    }

    return mode;
  }
}
