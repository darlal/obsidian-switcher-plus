/* eslint-disable @typescript-eslint/no-explicit-any */
import { Mode, WorkspaceSuggestion } from 'src/types';
import { InputInfo } from 'src/switcherPlus';
import { WorkspaceHandler, WORKSPACE_PLUGIN_ID } from 'src/Handlers';
import { SwitcherPlusSettings } from 'src/settings/switcherPlusSettings';
import { workspaceTrigger } from 'src/__fixtures__/modeTrigger.fixture';
import { App, fuzzySearch, PreparedQuery, prepareQuery, renderResults } from 'obsidian';
import { makePreparedQuery, makeFuzzyMatch } from 'src/__fixtures__/fixtureUtils';

describe('workspaceHandler', () => {
  let settings: SwitcherPlusSettings;
  let app: App;
  let getPluginByIdSpy: jest.SpyInstance;
  let sut: WorkspaceHandler;

  const suggestionWorkspaceId = 'first workspace';
  const suggestionInstance: WorkspaceSuggestion = {
    type: 'workspace',
    item: { type: 'workspaceInfo', id: suggestionWorkspaceId },
    match: makeFuzzyMatch([[0, 5]], -0.0115),
  };

  beforeAll(() => {
    app = new App();
    settings = new SwitcherPlusSettings(null);

    getPluginByIdSpy = jest.spyOn((app as any).internalPlugins, 'getPluginById');
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

      const { workspaceCmd } = inputInfo;
      expect(workspaceCmd.parsedInput).toBe(filterText);
      expect(workspaceCmd.isValidated).toBe(true);
      expect(getPluginByIdSpy).toHaveBeenCalledWith(WORKSPACE_PLUGIN_ID);
    });

    it('should not validate parsed input with workspace plugin disabled', () => {
      getPluginByIdSpy.mockReturnValueOnce({ enabled: false });
      const inputInfo = new InputInfo(inputText);

      sut.validateCommand(inputInfo, startIndex, filterText);
      expect(inputInfo.mode).toBe(Mode.Standard);

      const { workspaceCmd } = inputInfo;
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
      const workspaceIds = Object.keys(
        (app as any).internalPlugins.plugins.workspaces.instance.workspaces,
      );

      expect(results).toHaveLength(workspaceIds.length);
      expect(workspaceIds.every((id) => resultWorkspaceIds.has(id))).toBe(true);
      expect(results.every((sugg) => sugg.type === 'workspace')).toBe(true);
      expect(getPluginByIdSpy).toHaveBeenCalledWith(WORKSPACE_PLUGIN_ID);
    });

    test('with filter search term, it should return only matching suggestions for workspace mode', () => {
      const expectedWorkspaces = { 'first workspace': {}, 'second workspace': {} };
      const getPluginByIdSpy = jest
        .spyOn((app as any).internalPlugins, 'getPluginById')
        .mockReturnValueOnce({ instance: { workspaces: expectedWorkspaces } });

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
      expect(Object.keys(expectedWorkspaces)).toContain(onlyResult.item.id);

      expect(mockFuzzySearch).toHaveBeenCalled();
      expect(mockPrepareQuery).toHaveBeenCalled();
      expect(getPluginByIdSpy).toHaveBeenCalled();

      mockFuzzySearch.mockRestore();
      mockPrepareQuery.mockRestore();
      getPluginByIdSpy.mockRestore();
    });
  });

  describe('renderSuggestion', () => {
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
    it('should tell the workspaces plugin to load the workspace with the chosen ID', () => {
      const internalPlugins = (app as any).internalPlugins;
      const workspacesPlugin = internalPlugins.plugins[WORKSPACE_PLUGIN_ID];
      const getPluginByIdSpy = jest.spyOn(internalPlugins, 'getPluginById');
      const loadWorkspaceSpy = jest.spyOn(workspacesPlugin.instance, 'loadWorkspace');

      sut.onChooseSuggestion(suggestionInstance);

      expect(getPluginByIdSpy).toHaveBeenCalled();
      expect(loadWorkspaceSpy).toHaveBeenCalledWith(suggestionWorkspaceId);

      getPluginByIdSpy.mockRestore();
      loadWorkspaceSpy.mockRestore();
    });
  });
});
