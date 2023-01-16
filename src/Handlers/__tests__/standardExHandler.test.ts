import { MatchType } from 'src/types';
import { InputInfo } from 'src/switcherPlus';
import { SwitcherPlusSettings } from 'src/settings';
import { Handler, StandardExHandler } from 'src/Handlers';
import { mock, MockProxy } from 'jest-mock-extended';
import { App, TFile } from 'obsidian';
import { makeAliasSuggestion, makeFileSuggestion } from '@fixtures';
import { Chance } from 'chance';

const chance = new Chance();

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
    expect(() => sut.validateCommand(null, 0, '', null, null)).toThrow(
      'Method not implemented.',
    );
  });

  test('getSuggestions should throw', () => {
    expect(() => sut.getSuggestions(null)).toThrow('Method not implemented.');
  });

  describe('renderSuggestion', () => {
    it('should not throw an error with a null suggestion', () => {
      expect(() => sut.renderSuggestion(null, null)).not.toThrow();
    });

    it('should render a suggestion with match offsets', () => {
      const mockFile = new TFile();
      const sugg = makeFileSuggestion(mockFile);
      const mockParentEl = mock<HTMLElement>();
      const renderAsFileInfoPanelSpy = jest
        .spyOn(Handler.prototype, 'renderAsFileInfoPanel')
        .mockReturnValueOnce(null);

      sut.renderSuggestion(sugg, mockParentEl);

      expect(renderAsFileInfoPanelSpy).toHaveBeenCalledWith(
        mockParentEl,
        ['qsp-suggestion-file'],
        null,
        sugg.file,
        sugg.matchType,
        sugg.match,
      );

      renderAsFileInfoPanelSpy.mockRestore();
    });

    it('should add a class for downranked suggestions', () => {
      const mockFile = new TFile();
      const alias = chance.word();
      const sugg = makeAliasSuggestion(mockFile, alias);
      sugg.downranked = true;

      const mockParentEl = mock<HTMLElement>();
      const renderAsFileInfoPanelSpy = jest
        .spyOn(Handler.prototype, 'renderAsFileInfoPanel')
        .mockReturnValueOnce(null);

      sut.renderSuggestion(sugg, mockParentEl);

      expect(mockParentEl.addClass).toHaveBeenCalledWith('mod-downranked');
      expect(renderAsFileInfoPanelSpy).toHaveBeenCalledWith(
        mockParentEl,
        ['qsp-suggestion-alias'],
        alias,
        sugg.file,
        sugg.matchType,
        sugg.match,
        false,
      );

      renderAsFileInfoPanelSpy.mockRestore();
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

  describe('addPropertiesToStandardSuggestions', () => {
    const mockFile = new TFile();
    const inputInfo = new InputInfo();
    inputInfo.currentWorkspaceEnvList.openWorkspaceFiles = new Set([mockFile]);
    inputInfo.currentWorkspaceEnvList.starredFiles = new Set([mockFile]);
    inputInfo.currentWorkspaceEnvList.mostRecentFiles = new Set([mockFile]);

    it('should set extra properties on alias suggestions', () => {
      const sugg = makeAliasSuggestion(mockFile);

      sut.addPropertiesToStandardSuggestions(inputInfo, sugg);

      expect(sugg).toMatchObject({
        ...sugg,
        matchType: MatchType.Primary,
        matchText: sugg.alias,
        isOpenInEditor: true,
        isRecentOpen: true,
        isStarred: true,
      });
    });

    it('should set extra properties on file suggestions', () => {
      const sugg = makeFileSuggestion(mockFile);

      sut.addPropertiesToStandardSuggestions(inputInfo, sugg);

      expect(sugg).toMatchObject({
        ...sugg,
        matchType: MatchType.Path,
        matchText: mockFile.path,
        isOpenInEditor: true,
        isRecentOpen: true,
        isStarred: true,
      });
    });
  });
});
