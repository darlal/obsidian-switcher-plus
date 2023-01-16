import { Mode, WorkspaceSuggestion, SuggestionType } from 'src/types';
import { InputInfo } from 'src/switcherPlus';
import { Handler, WorkspaceHandler, WORKSPACE_PLUGIN_ID } from 'src/Handlers';
import { SwitcherPlusSettings } from 'src/settings/switcherPlusSettings';
import {
  App,
  fuzzySearch,
  InstalledPlugin,
  InternalPlugins,
  PreparedQuery,
  prepareQuery,
  WorkspacesPluginInstance,
} from 'obsidian';
import {
  makePreparedQuery,
  makeFuzzyMatch,
  workspaceTrigger,
  makeWorkspaceSuggestion,
} from '@fixtures';
import { mock, MockProxy } from 'jest-mock-extended';

function makeWorkspacesPluginInstall(): MockProxy<InstalledPlugin> {
  const mockInstance = mock<WorkspacesPluginInstance>({
    id: WORKSPACE_PLUGIN_ID,
    workspaces: {
      'first workspace': {},
      'second workspace': {},
    },
  });

  return mock<InstalledPlugin>({
    enabled: true,
    instance: mockInstance,
  });
}

function makeInternalPluginList(
  workspacePlugin: MockProxy<InstalledPlugin>,
): MockProxy<InternalPlugins> {
  const mockPlugins = mock<Record<string, InstalledPlugin>>({
    workspaces: workspacePlugin,
  });

  const mockInternalPlugins = mock<InternalPlugins>({ plugins: mockPlugins });

  mockInternalPlugins.getPluginById.mockImplementation((id) => mockPlugins[id]);

  return mockInternalPlugins;
}

describe('workspaceHandler', () => {
  let settings: SwitcherPlusSettings;
  let mockApp: MockProxy<App>;
  let mockInternalPlugins: MockProxy<InternalPlugins>;
  let mockWsPluginInstance: MockProxy<WorkspacesPluginInstance>;
  let sut: WorkspaceHandler;
  let expectedWorkspaceIds: string[];
  let suggestionInstance: WorkspaceSuggestion;

  beforeAll(() => {
    const workspacePluginInstall = makeWorkspacesPluginInstall();
    mockWsPluginInstance =
      workspacePluginInstall.instance as MockProxy<WorkspacesPluginInstance>;

    mockInternalPlugins = makeInternalPluginList(workspacePluginInstall);
    mockApp = mock<App>({
      internalPlugins: mockInternalPlugins,
    });

    settings = new SwitcherPlusSettings(null);
    jest.spyOn(settings, 'workspaceListCommand', 'get').mockReturnValue(workspaceTrigger);

    expectedWorkspaceIds = Object.keys(mockWsPluginInstance.workspaces);
    suggestionInstance = makeWorkspaceSuggestion(expectedWorkspaceIds[0]);

    sut = new WorkspaceHandler(mockApp, settings);
  });

  describe('commandString', () => {
    it('should return workspaceListCommand trigger', () => {
      expect(sut.commandString).toBe(workspaceTrigger);
    });
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
      const inputInfo = new InputInfo(inputText);

      sut.validateCommand(inputInfo, startIndex, filterText, null, null);
      expect(inputInfo.mode).toBe(Mode.WorkspaceList);

      const workspaceCmd = inputInfo.parsedCommand();
      expect(workspaceCmd.parsedInput).toBe(filterText);
      expect(workspaceCmd.isValidated).toBe(true);
      expect(mockApp.internalPlugins.getPluginById).toHaveBeenCalledWith(
        WORKSPACE_PLUGIN_ID,
      );
    });

    it('should not validate parsed input with workspace plugin disabled', () => {
      mockInternalPlugins.getPluginById.mockReturnValueOnce({
        enabled: false,
        instance: null,
      });

      const inputInfo = new InputInfo(inputText);

      sut.validateCommand(inputInfo, startIndex, filterText, null, null);
      expect(inputInfo.mode).toBe(Mode.Standard);

      const workspaceCmd = inputInfo.parsedCommand();
      expect(workspaceCmd.parsedInput).toBe(null);
      expect(workspaceCmd.isValidated).toBe(false);
      expect(mockInternalPlugins.getPluginById).toHaveBeenCalledWith(WORKSPACE_PLUGIN_ID);
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
      expect(results.every((sugg) => sugg.type === SuggestionType.WorkspaceList)).toBe(
        true,
      );
      expect(mockInternalPlugins.getPluginById).toHaveBeenCalledWith(WORKSPACE_PLUGIN_ID);
    });

    test('with filter search term, it should return only matching suggestions for workspace mode', () => {
      const filterText = 'first';
      const mockPrepareQuery = jest.mocked<typeof prepareQuery>(prepareQuery);
      mockPrepareQuery.mockReturnValueOnce(makePreparedQuery(filterText));

      const mockFuzzySearch = jest.mocked<typeof fuzzySearch>(fuzzySearch);
      mockFuzzySearch.mockImplementation((_q: PreparedQuery, text: string) => {
        const match = makeFuzzyMatch();
        return text.startsWith(filterText) ? match : null;
      });

      const inputInfo = new InputInfo(`${workspaceTrigger}${filterText}`);
      const results = sut.getSuggestions(inputInfo);

      expect(results).not.toBeNull();
      expect(results).toBeInstanceOf(Array);
      expect(results).toHaveLength(1);

      const onlyResult = results[0];
      expect(onlyResult).toHaveProperty('type', SuggestionType.WorkspaceList);
      expect(onlyResult.item.id).toBe(expectedWorkspaceIds[0]);

      expect(mockFuzzySearch).toHaveBeenCalled();
      expect(mockPrepareQuery).toHaveBeenCalled();
      expect(mockInternalPlugins.getPluginById).toHaveBeenCalled();

      mockFuzzySearch.mockReset();
    });
  });

  describe('renderSuggestion', () => {
    it('should not throw an error with a null suggestion', () => {
      expect(() => sut.renderSuggestion(null, null)).not.toThrow();
    });

    it('should render a suggestion with match offsets', () => {
      const renderContentSpy = jest.spyOn(Handler.prototype, 'renderContent');
      const mockParentEl = mock<HTMLElement>();
      mockParentEl.createDiv.mockReturnValue(mock<HTMLDivElement>());

      sut.renderSuggestion(suggestionInstance, mockParentEl);

      const {
        item: { id },
        match,
      } = suggestionInstance;

      expect(renderContentSpy).toHaveBeenCalledWith(mockParentEl, id, match);
      expect(mockParentEl.addClasses).toHaveBeenCalledWith(
        expect.arrayContaining(['mod-complex', 'qsp-suggestion-workspace']),
      );

      renderContentSpy.mockRestore();
    });
  });

  describe('onChooseSuggestion', () => {
    it('should not throw an error with a null suggestion', () => {
      expect(() => sut.onChooseSuggestion(null, null)).not.toThrow();
    });

    it('should tell the workspaces plugin to load the workspace with the chosen ID', () => {
      sut.onChooseSuggestion(suggestionInstance, null);

      expect(mockInternalPlugins.getPluginById).toHaveBeenCalled();
      expect(mockWsPluginInstance.loadWorkspace).toHaveBeenCalledWith(
        suggestionInstance.item.id,
      );
    });
  });
});
