import { isMainPanelLeaf, activateLeaf, getOpenLeaves, openFileInLeaf } from 'src/utils';
import { TFile, View, Workspace, WorkspaceLeaf, WorkspaceSplit } from 'obsidian';
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

  describe('openFileInLeaf', () => {
    it('should log a message to the console if falsy values are passed in', () => {
      let logWasCalled = false;
      const consoleLogSpy = jest
        .spyOn(console, 'log')
        .mockImplementation((message: string) => {
          if (message.startsWith('Switcher++: error opening file. ')) {
            logWasCalled = true;
          }
        });

      openFileInLeaf(null, null, false);

      expect(logWasCalled).toBe(true);

      consoleLogSpy.mockRestore();
    });

    it('should load a file in a leaf', () => {
      const mockLeaf = makeLeaf();
      const mockFile = new TFile();
      const shouldCreateNewLeaf = false;
      const openState = { active: true };

      mockLeaf.openFile.mockResolvedValueOnce();
      mockWorkspace.getLeaf.mockReturnValueOnce(mockLeaf);

      openFileInLeaf(
        mockWorkspace,
        mockFile,
        shouldCreateNewLeaf,
        openState,
        'panelUtils unit test.',
      );

      expect(mockWorkspace.getLeaf).toHaveBeenCalledWith(shouldCreateNewLeaf);
      expect(mockLeaf.openFile).toHaveBeenCalledWith(mockFile, openState);
    });

    it('should log a message to the console if openFile fails', () => {
      const mockLeaf = makeLeaf();
      const mockFile = new TFile();
      const openState = { active: true };

      // Promise used to trigger the error condition
      const openFilePromise = Promise.resolve();

      mockWorkspace.getLeaf.mockReturnValueOnce(mockLeaf);

      mockLeaf.openFile.mockImplementationOnce((_file, _openState) => {
        // throw to simulate openFile() failing
        return openFilePromise.then(() => {
          throw new Error('openFile() unit test mock error');
        });
      });

      // Promise used to track the call to console.log
      let consoleLogPromiseResolveFn: (value: void | PromiseLike<void>) => void;
      const consoleLogPromise = new Promise<void>((resolve, _reject) => {
        consoleLogPromiseResolveFn = resolve;
      });

      const consoleLogSpy = jest
        .spyOn(console, 'log')
        .mockImplementation((message: string) => {
          if (message.startsWith('Switcher++: error opening file. ')) {
            // resolve the consoleLogPromise. This allows allPromises to resolve itself
            consoleLogPromiseResolveFn();
          }
        });

      // wait for the other promises to resolve before this promise can resolve
      const allPromises = Promise.all([openFilePromise, consoleLogPromise]);

      openFileInLeaf(mockWorkspace, mockFile, false, openState);

      // when all the promises are resolved check expectations and clean up
      return allPromises.finally(() => {
        expect(mockLeaf.openFile).toHaveBeenCalledWith(mockFile, openState);
        expect(consoleLogSpy).toHaveBeenCalled();

        consoleLogSpy.mockRestore();
      });
    });
  });
});
