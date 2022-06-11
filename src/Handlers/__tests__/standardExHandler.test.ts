import { SwitcherPlusSettings } from 'src/settings';
import { Handler, StandardExHandler } from 'src/Handlers';
import { mock, MockProxy } from 'jest-mock-extended';
import { App, Keymap } from 'obsidian';
import { makeFileSuggestion } from '@fixtures';

describe('standardExHandler', () => {
  const mockKeymap = jest.mocked<typeof Keymap>(Keymap);
  let settings: SwitcherPlusSettings;
  let mockApp: MockProxy<App>;
  let sut: StandardExHandler;

  beforeAll(() => {
    mockApp = mock<App>();
    settings = new SwitcherPlusSettings(null);
    sut = new StandardExHandler(mockApp, settings);
  });

  test('validateCommand should throw', () => {
    expect(() => sut.validateCommand(null, 0, '', null, null)).toThrowError(
      'Method not implemented.',
    );
  });

  test('getSuggestions should throw', () => {
    expect(() => sut.getSuggestions(null)).toThrowError('Method not implemented.');
  });

  test('renderSuggestion should throw', () => {
    expect(() => sut.renderSuggestion(null, null)).toThrowError(
      'Method not implemented.',
    );
  });

  describe('onChooseSuggestion', () => {
    it('should not throw an error with a null suggestion', () => {
      expect(() => sut.onChooseSuggestion(null, null)).not.toThrow();
    });

    it('should navigate to the target file', () => {
      const isModDown = false;
      const navigateToLeafOrOpenFileSpy = jest
        .spyOn(Handler.prototype, 'navigateToLeafOrOpenFile')
        .mockImplementation();

      mockKeymap.isModEvent.mockReturnValueOnce(isModDown);
      const sugg = makeFileSuggestion();

      sut.onChooseSuggestion(sugg, null);

      expect(mockKeymap.isModEvent).toHaveBeenCalled();
      expect(navigateToLeafOrOpenFileSpy).toHaveBeenCalledWith(
        isModDown,
        sugg.file,
        expect.any(String),
      );

      navigateToLeafOrOpenFileSpy.mockRestore();
    });
  });
});
