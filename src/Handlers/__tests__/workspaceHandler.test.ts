import { Mode, WorkspaceSuggestion } from 'src/types';
import { InputInfo } from 'src/switcherPlus';
import { WorkspaceHandler, WORKSPACE_PLUGIN_ID } from 'src/Handlers';
import { SwitcherPlusSettings } from 'src/settings/switcherPlusSettings';
import {
  App,
  fuzzySearch,
  PreparedQuery,
  prepareQuery,
  renderResults,
  WorkspacesPluginInstance,
} from 'obsidian';
import { makePreparedQuery, makeFuzzyMatch, workspaceTrigger } from '@fixtures';

describe('workspaceHandler', () => {
  let settings: SwitcherPlusSettings;
  let app: App;
  let getPluginByIdSpy: jest.SpyInstance;
  let workspacesPluginInstance: WorkspacesPluginInstance;
  let sut: WorkspaceHandler;
  let expectedWorkspaceIds: string[];
  let suggestionInstance: WorkspaceSuggestion;

  beforeAll(() => {
    app = new App();
    const { internalPlugins } = app;
    settings = new SwitcherPlusSettings(null);

    getPluginByIdSpy = jest.spyOn(internalPlugins, 'getPluginById');
    workspacesPluginInstance = internalPlugins.plugins[WORKSPACE_PLUGIN_ID]
      .instance as WorkspacesPluginInstance;

    expectedWorkspaceIds = Object.keys(workspacesPluginInstance.workspaces);
    suggestionInstance = {
      type: 'workspace',
      item: { type: 'workspaceInfo', id: expectedWorkspaceIds[0] },
      match: makeFuzzyMatch([[0, 5]], -0.0115),
    };

    sut = new WorkspaceHandler(app, settings);
  });

  describe('validateCommand', () => {
    let inputText: string;
    let startIndex: number;
    const filterText = 'foo';

    beforeAll(() => {
      inputText = `${workspaceTrigger}${filterText}`;
      startIndex = workspaceTrigger.length;
    });

    it('should validate parsed input with workspace plugin enabled', () => {
      getPluginByIdSpy.mockReturnValueOnce({ enabled: true });
      const inputInfo = new InputInfo(inputText);

      sut.validateCommand(inputInfo, startIndex, filterText);
      expect(inputInfo.mode).toBe(Mode.WorkspaceList);

      const workspaceCmd = inputInfo.parsedCommand();
      expect(workspaceCmd.parsedInput).toBe(filterText);
      expect(workspaceCmd.isValidated).toBe(true);
      expect(getPluginByIdSpy).toHaveBeenCalledWith(WORKSPACE_PLUGIN_ID);
    });

    it('should not validate parsed input with workspace plugin disabled', () => {
      getPluginByIdSpy.mockReturnValueOnce({ enabled: false });
      const inputInfo = new InputInfo(inputText);

      sut.validateCommand(inputInfo, startIndex, filterText);
      expect(inputInfo.mode).toBe(Mode.Standard);

      const workspaceCmd = inputInfo.parsedCommand();
      expect(workspaceCmd.parsedInput).toBe(null);
      expect(workspaceCmd.isValidated).toBe(false);
      expect(getPluginByIdSpy).toHaveBeenCalledWith(WORKSPACE_PLUGIN_ID);
    });
  });

  describe('getSuggestions', () => {
    test('with falsy input, it should return an empty array', () => {
      const results = sut.getSuggestions(null);

      expect(results).not.toBeNull();
      expect(results).toBeInstanceOf(Array);
      expect(results).toHaveLength(0);
    });

    test('with default settings, it should return suggestions for workspace mode', () => {
      const inputInfo = new InputInfo(workspaceTrigger);
      const results = sut.getSuggestions(inputInfo);

      expect(results).not.toBeNull();
      expect(results).toBeInstanceOf(Array);

      const resultWorkspaceIds = new Set(results.map((sugg) => sugg.item.id));

      expect(results).toHaveLength(expectedWorkspaceIds.length);
      expect(expectedWorkspaceIds.every((id) => resultWorkspaceIds.has(id))).toBe(true);
      expect(results.every((sugg) => sugg.type === 'workspace')).toBe(true);
      expect(getPluginByIdSpy).toHaveBeenCalledWith(WORKSPACE_PLUGIN_ID);
    });

    test('with filter search term, it should return only matching suggestions for workspace mode', () => {
      const filterText = 'first';
      const mockPrepareQuery = prepareQuery as jest.MockedFunction<typeof prepareQuery>;
      mockPrepareQuery.mockReturnValue(makePreparedQuery(filterText));

      const mockFuzzySearch = fuzzySearch as jest.MockedFunction<typeof fuzzySearch>;
      mockFuzzySearch.mockImplementation((_q: PreparedQuery, text: string) => {
        const match = makeFuzzyMatch([[0, 5]], -0.0115);
        return text.startsWith(filterText) ? match : null;
      });

      const inputInfo = new InputInfo(`${workspaceTrigger}${filterText}`);
      const results = sut.getSuggestions(inputInfo);

      expect(results).not.toBeNull();
      expect(results).toBeInstanceOf(Array);
      expect(results).toHaveLength(1);

      const onlyResult = results[0];
      expect(onlyResult).toHaveProperty('type', 'workspace');
      expect(onlyResult.item.id).toBe(expectedWorkspaceIds[0]);

      expect(mockFuzzySearch).toHaveBeenCalled();
      expect(mockPrepareQuery).toHaveBeenCalled();
      expect(getPluginByIdSpy).toHaveBeenCalled();

      mockFuzzySearch.mockRestore();
      mockPrepareQuery.mockRestore();
    });
  });

  describe('renderSuggestion', () => {
    it('should not throw an error with a null suggestion', () => {
      expect(() => sut.renderSuggestion(null, null)).not.toThrow();
    });

    it('should render a suggestion with match offsets', () => {
      const mockRenderResults = renderResults as jest.MockedFunction<
        typeof renderResults
      >;

      sut.renderSuggestion(suggestionInstance, null);

      const {
        item: { id },
        match,
      } = suggestionInstance;
      expect(mockRenderResults).toHaveBeenCalledWith(null, id, match);

      mockRenderResults.mockRestore();
    });
  });

  describe('onChooseSuggestion', () => {
    it('should not throw an error with a null suggestion', () => {
      expect(() => sut.onChooseSuggestion(null)).not.toThrow();
    });

    it('should tell the workspaces plugin to load the workspace with the chosen ID', () => {
      const loadWorkspaceSpy = jest.spyOn(workspacesPluginInstance, 'loadWorkspace');

      sut.onChooseSuggestion(suggestionInstance);

      expect(getPluginByIdSpy).toHaveBeenCalled();
      expect(loadWorkspaceSpy).toHaveBeenCalledWith(suggestionInstance.item.id);

      loadWorkspaceSpy.mockRestore();
    });
  });
});
