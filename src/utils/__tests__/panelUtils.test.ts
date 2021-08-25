import { isMainPanelLeaf, activateLeaf, getOpenLeaves } from 'src/utils';
import { App, Workspace, WorkspaceLeaf } from 'obsidian';

describe('panelUtils', () => {
  let app: App;
  let workspace: Workspace;
  let leaf: WorkspaceLeaf;
  let getRootSpy: jest.SpyInstance;

  beforeAll(() => {
    app = new App();
    ({ workspace } = app);
  });

  describe('isMainPanelLeaf', () => {
    beforeAll(() => {
      leaf = new WorkspaceLeaf();
      getRootSpy = jest.spyOn(leaf, 'getRoot');
    });

    it('should return true for main panel leaf', () => {
      getRootSpy.mockReturnValue(workspace.rootSplit);

      const result = isMainPanelLeaf(workspace, leaf);

      expect(result).toBe(true);
      expect(getRootSpy).toHaveBeenCalled();

      getRootSpy.mockRestore();
    });

    it('should return false for side panel leaf', () => {
      getRootSpy.mockReturnValue(workspace.leftSplit);

      const result = isMainPanelLeaf(workspace, leaf);

      expect(result).toBe(false);
      expect(getRootSpy).toHaveBeenCalled();

      getRootSpy.mockRestore();
    });
  });

  describe('activateLeaf', () => {
    let setActiveLeafSpy: jest.SpyInstance;
    let setEphemeralStateSpy: jest.SpyInstance;

    beforeAll(() => {
      leaf = new WorkspaceLeaf();
      getRootSpy = jest.spyOn(leaf, 'getRoot');
      setActiveLeafSpy = jest.spyOn(workspace, 'setActiveLeaf');
      setEphemeralStateSpy = jest.spyOn(leaf.view, 'setEphemeralState');
    });

    it('should activate main panel leaf', () => {
      getRootSpy.mockReturnValue(workspace.rootSplit);

      activateLeaf(workspace, leaf, true);

      expect(getRootSpy).toHaveBeenCalled();
      expect(setActiveLeafSpy).toHaveBeenCalledWith(leaf, true);
      expect(setEphemeralStateSpy).toHaveBeenCalled();

      getRootSpy.mockRestore();
    });

    it('should activate side panel leaf', () => {
      const revealLeafSpy = jest.spyOn(workspace, 'revealLeaf');
      getRootSpy.mockReturnValue(workspace.rightSplit);

      activateLeaf(workspace, leaf, true);

      expect(getRootSpy).toHaveBeenCalled();
      expect(setActiveLeafSpy).toHaveBeenCalledWith(leaf, true);
      expect(setEphemeralStateSpy).toHaveBeenCalled();
      expect(revealLeafSpy).toHaveBeenCalledWith(leaf);

      getRootSpy.mockRestore();
      revealLeafSpy.mockRestore();
    });
  });

  describe('getOpenLeaves', () => {
    it('should return all leaves', () => {
      const excludeMainViewTypes = ['exclude'];
      const includeSideViewTypes = ['include'];
      const l1 = new WorkspaceLeaf();
      jest.spyOn(l1, 'getRoot').mockReturnValue(workspace.rootSplit);

      const l2 = new WorkspaceLeaf();
      jest.spyOn(l2, 'getRoot').mockReturnValue(workspace.rootSplit);
      jest.spyOn(l2.view, 'getViewType').mockReturnValue(excludeMainViewTypes[0]);

      const l3 = new WorkspaceLeaf();
      jest.spyOn(l3, 'getRoot').mockReturnValue(workspace.rightSplit);
      jest.spyOn(l3.view, 'getViewType').mockReturnValue(includeSideViewTypes[0]);

      const iterateAllLeavesSpy = jest
        .spyOn(workspace, 'iterateAllLeaves')
        .mockImplementation((callback) => {
          const leaves = [l1, l2, l3];
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return
          leaves.forEach((l) => callback(l));
        });

      const results = getOpenLeaves(
        workspace,
        excludeMainViewTypes,
        includeSideViewTypes,
      );

      expect(results).toHaveLength(2);
      expect(results).toContain(l1);
      expect(results).toContain(l3);
      expect(iterateAllLeavesSpy).toHaveBeenCalled();
    });
  });
});
