import { isMainPanelLeaf, activateLeaf, getOpenLeaves } from 'src/utils';
import { View, Workspace, WorkspaceLeaf, WorkspaceSplit } from 'obsidian';
import { mock, MockProxy } from 'jest-mock-extended';

function makeLeaf(): MockProxy<WorkspaceLeaf> {
  return mock<WorkspaceLeaf>({ view: mock<View>() });
}

describe('panelUtils', () => {
  let mockWorkspace: MockProxy<Workspace>;

  beforeAll(() => {
    mockWorkspace = mock<Workspace>({
      rootSplit: mock<WorkspaceSplit>(),
      leftSplit: mock<WorkspaceSplit>(),
      rightSplit: mock<WorkspaceSplit>(),
    });
  });

  describe('isMainPanelLeaf', () => {
    const mockLeaf = makeLeaf();

    it('should return true for main panel leaf', () => {
      mockLeaf.getRoot.mockReturnValueOnce(mockWorkspace.rootSplit);

      const result = isMainPanelLeaf(mockWorkspace, mockLeaf);

      expect(result).toBe(true);
      expect(mockLeaf.getRoot).toHaveBeenCalled();
    });

    it('should return false for side panel leaf', () => {
      mockLeaf.getRoot.mockReturnValueOnce(mockWorkspace.leftSplit);

      const result = isMainPanelLeaf(mockWorkspace, mockLeaf);

      expect(result).toBe(false);
      expect(mockLeaf.getRoot).toHaveBeenCalled();
    });
  });

  describe('activateLeaf', () => {
    const mockLeaf = makeLeaf();
    const mockView = mockLeaf.view as MockProxy<View>;

    it('should activate main panel leaf', () => {
      mockLeaf.getRoot.mockReturnValueOnce(mockWorkspace.rootSplit);

      activateLeaf(mockWorkspace, mockLeaf, true);

      expect(mockLeaf.getRoot).toHaveBeenCalled();
      expect(mockWorkspace.setActiveLeaf).toHaveBeenCalledWith(mockLeaf, true);
      expect(mockView.setEphemeralState).toHaveBeenCalled();
    });

    it('should activate side panel leaf', () => {
      mockLeaf.getRoot.mockReturnValueOnce(mockWorkspace.rightSplit);

      activateLeaf(mockWorkspace, mockLeaf, true);

      expect(mockLeaf.getRoot).toHaveBeenCalled();
      expect(mockWorkspace.setActiveLeaf).toHaveBeenCalledWith(mockLeaf, true);
      expect(mockView.setEphemeralState).toHaveBeenCalled();
      expect(mockWorkspace.revealLeaf).toHaveBeenCalledWith(mockLeaf);
    });
  });

  describe('getOpenLeaves', () => {
    it('should return all leaves', () => {
      const excludeMainViewTypes = ['exclude'];
      const includeSideViewTypes = ['include'];

      const l1 = makeLeaf();
      l1.getRoot.mockReturnValue(mockWorkspace.rootSplit);

      const l2 = makeLeaf();
      l2.getRoot.mockReturnValue(mockWorkspace.rootSplit);
      (l2.view as MockProxy<View>).getViewType.mockReturnValue(excludeMainViewTypes[0]);

      const l3 = makeLeaf();
      l3.getRoot.mockReturnValue(mockWorkspace.rightSplit);
      (l3.view as MockProxy<View>).getViewType.mockReturnValue(includeSideViewTypes[0]);

      mockWorkspace.iterateAllLeaves.mockImplementation((callback) => {
        const leaves = [l1, l2, l3];
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        leaves.forEach((l) => callback(l));
      });

      const results = getOpenLeaves(
        mockWorkspace,
        excludeMainViewTypes,
        includeSideViewTypes,
      );

      expect(results).toHaveLength(2);
      expect(results).toContain(l1);
      expect(results).not.toContain(l2);
      expect(results).toContain(l3);
      expect(mockWorkspace.iterateAllLeaves).toHaveBeenCalled();
    });
  });
});
