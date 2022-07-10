import { SwitcherPlusSettings } from 'src/settings';
import { Handler, StandardExHandler } from 'src/Handlers';
import { mock, MockProxy } from 'jest-mock-extended';
import { App } from 'obsidian';
import { makeFileSuggestion } from '@fixtures';

describe('standardExHandler', () => {
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
      const mockEvt = mock<KeyboardEvent>();
      const navigateToLeafOrOpenFileSpy = jest
        .spyOn(Handler.prototype, 'navigateToLeafOrOpenFile')
        .mockImplementation();

      const sugg = makeFileSuggestion();

      sut.onChooseSuggestion(sugg, mockEvt);

      expect(navigateToLeafOrOpenFileSpy).toHaveBeenCalledWith(
        mockEvt,
        sugg.file,
        expect.any(String),
      );

      navigateToLeafOrOpenFileSpy.mockRestore();
    });
  });
});
