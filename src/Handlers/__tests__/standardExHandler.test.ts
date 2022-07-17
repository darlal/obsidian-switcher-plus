import { SwitcherPlusSettings } from 'src/settings';
import { Handler, StandardExHandler } from 'src/Handlers';
import { mock, MockProxy } from 'jest-mock-extended';
import { App, TFile } from 'obsidian';
import { makeFileSuggestion } from '@fixtures';
import { MatchType } from 'src/types';

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

  describe('renderSuggestion', () => {
    it('should not throw an error with a null suggestion', () => {
      expect(() => sut.renderSuggestion(null, null)).not.toThrow();
    });

    it('should render a suggestion with match offsets', () => {
      const mockFile = new TFile();
      const renderContentSpy = jest.spyOn(Handler.prototype, 'renderContent');
      const mockContentEl = mock<HTMLDivElement>();
      const mockParentEl = mock<HTMLElement>();
      mockParentEl.createDiv.mockReturnValue(mockContentEl);

      const renderPathSpy = jest
        .spyOn(Handler.prototype, 'renderPath')
        .mockReturnValueOnce();

      const sugg = makeFileSuggestion(mockFile);

      sut.renderSuggestion(sugg, mockParentEl);

      expect(renderContentSpy).toBeCalledWith(
        mockParentEl,
        mockFile.basename,
        sugg.match,
      );
      expect(mockParentEl.addClasses).toHaveBeenCalledWith(
        expect.arrayContaining(['mod-complex', 'qsp-suggestion-file']),
      );
      expect(renderPathSpy).toHaveBeenCalledWith(
        mockContentEl,
        sugg.file,
        true,
        null,
        false,
      );

      renderContentSpy.mockRestore();
      renderPathSpy.mockRestore();
    });

    it('should render a suggestion with parent path match', () => {
      const mockFile = new TFile();
      const renderContentSpy = jest.spyOn(Handler.prototype, 'renderContent');
      const mockContentEl = mock<HTMLDivElement>();
      const mockParentEl = mock<HTMLElement>();
      mockParentEl.createDiv.mockReturnValue(mockContentEl);

      const renderPathSpy = jest
        .spyOn(Handler.prototype, 'renderPath')
        .mockReturnValueOnce();

      const sugg = makeFileSuggestion(mockFile, null, null, MatchType.ParentPath);

      sut.renderSuggestion(sugg, mockParentEl);

      expect(renderContentSpy).toBeCalledWith(mockParentEl, mockFile.basename, null);
      expect(mockParentEl.addClasses).toHaveBeenCalledWith(
        expect.arrayContaining(['mod-complex', 'qsp-suggestion-file']),
      );
      expect(renderPathSpy).toHaveBeenCalledWith(
        mockContentEl,
        sugg.file,
        true,
        sugg.match,
        true,
      );

      renderContentSpy.mockRestore();
      renderPathSpy.mockRestore();
    });
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
