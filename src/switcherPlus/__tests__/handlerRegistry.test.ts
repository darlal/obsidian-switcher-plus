import { App } from 'obsidian';
import { CommandDefinition } from '../commandDefinitions';
import { Handler } from 'src/Handlers/handler';
import { HandlerRegistry } from '../handlerRegistry';
import { SwitcherPlusSettings } from 'src/settings';
import { mock, MockProxy } from 'jest-mock-extended';
import { AnySuggestion, Mode, SuggestionType } from 'src/types';
import {
  headingsTrigger,
  symbolTrigger,
  makeHeadingSuggestion,
  makeHeading,
} from '@fixtures';

class MockHandler extends Handler<AnySuggestion> {
  renderSuggestion = jest.fn();
  getCommandString = jest.fn();
  validateCommand = jest.fn();
  reset = jest.fn();
  validate = jest.fn();
  getSuggestions = jest.fn();
  onChooseSuggestion = jest.fn();
}

class MockSourcedHandler extends MockHandler {}

describe('HandlerRegistry', () => {
  let mockApp: MockProxy<App>;
  let mockConfig: MockProxy<SwitcherPlusSettings>;
  let mockCommandDefinitions: MockProxy<CommandDefinition>[];

  beforeAll(() => {
    mockApp = mock<App>();
    mockConfig = mock<SwitcherPlusSettings>();

    mockCommandDefinitions = [
      mock<CommandDefinition>({
        mode: Mode.HeadingsList,
        handlerClass: MockHandler,
        ownSuggestionTypes: [SuggestionType.HeadingsList],
        parserCommand: {
          getCommandStr: () => headingsTrigger,
          type: 'prefix',
        },
      }),
      mock<CommandDefinition>({
        mode: Mode.SymbolList,
        handlerClass: MockSourcedHandler,
        ownSuggestionTypes: [SuggestionType.SymbolList],
        parserCommand: {
          getCommandStr: () => symbolTrigger,
          type: 'sourced',
        },
      }),
    ];
  });

  beforeEach(() => {
    // Reset the singleton instance before each test
    HandlerRegistry.reset();
  });

  describe('Initialization', () => {
    it('should return null if getInstance is called before initialization', () => {
      expect(HandlerRegistry.getInstance()).toBeNull();
    });

    it('should initialize the singleton instance', () => {
      HandlerRegistry.initialize(mockApp, mockConfig, mockCommandDefinitions);
      const instance = HandlerRegistry.getInstance();

      expect(instance).toBeInstanceOf(HandlerRegistry);
    });

    it('should not re-initialize if already initialized', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      HandlerRegistry.initialize(mockApp, mockConfig, mockCommandDefinitions);
      const instance1 = HandlerRegistry.getInstance();

      HandlerRegistry.initialize(mockApp, mockConfig, mockCommandDefinitions);
      const instance2 = HandlerRegistry.getInstance();

      expect(instance1).toBe(instance2);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Switcher++: HandlerRegistry already initialized.',
      );

      consoleWarnSpy.mockRestore();
    });

    it('should allow re-initialization after reset', () => {
      HandlerRegistry.initialize(mockApp, mockConfig, mockCommandDefinitions);
      const instance1 = HandlerRegistry.getInstance();

      HandlerRegistry.reset();

      expect(HandlerRegistry.getInstance()).toBeNull();

      HandlerRegistry.initialize(mockApp, mockConfig, mockCommandDefinitions);
      const instance2 = HandlerRegistry.getInstance();

      expect(instance1).not.toBe(instance2);
    });
  });

  describe('getHandler', () => {
    beforeEach(() => {
      HandlerRegistry.initialize(mockApp, mockConfig, mockCommandDefinitions);
    });

    it('should get a handler by Mode', () => {
      const handler = HandlerRegistry.getInstance().getHandler(Mode.HeadingsList);

      expect(handler).toBeInstanceOf(MockHandler);
    });

    it('should get a handler by SuggestionType', () => {
      const suggestion = makeHeadingSuggestion(makeHeading('heading', 1));
      const handler = HandlerRegistry.getInstance().getHandler(suggestion);

      expect(handler).toBeInstanceOf(MockHandler);
    });

    it('should get a handler by command string', () => {
      const handler = HandlerRegistry.getInstance().getHandler(headingsTrigger);

      expect(handler).toBeInstanceOf(MockHandler);
    });

    it('should return null for an unknown identifier', () => {
      const handler = HandlerRegistry.getInstance().getHandler('unknown');

      expect(handler).toBeNull();
    });

    it('should cache handler instances', () => {
      const instance = HandlerRegistry.getInstance();
      const handler1 = instance.getHandler(Mode.HeadingsList);
      const handler2 = instance.getHandler(Mode.HeadingsList);

      expect(handler1).toBe(handler2);
    });
  });

  describe('resetSourcedHandlers', () => {
    beforeEach(() => {
      HandlerRegistry.initialize(mockApp, mockConfig, mockCommandDefinitions);
    });

    it('should reset all sourced handlers', () => {
      const instance = HandlerRegistry.getInstance();
      const sourcedHandler = instance.getHandler(Mode.SymbolList) as MockSourcedHandler;
      const handler = instance.getHandler(Mode.HeadingsList) as MockHandler;

      instance.resetSourcedHandlers();

      expect(sourcedHandler.reset).toHaveBeenCalled();
      expect(handler.reset).not.toHaveBeenCalled();
    });

    it('should exclude specified handlers from being reset', () => {
      const instance = HandlerRegistry.getInstance();
      const sourcedHandler = instance.getHandler(Mode.SymbolList) as MockSourcedHandler;
      const handler = instance.getHandler(Mode.HeadingsList) as MockHandler;

      instance.resetSourcedHandlers([sourcedHandler]);

      expect(sourcedHandler.reset).not.toHaveBeenCalled();
      expect(handler.reset).not.toHaveBeenCalled();
    });
  });
});
