import { mock, MockProxy, mockFn, mockClear } from 'jest-mock-extended';
import { App, Plugin, View, Workspace, WorkspaceLeaf } from 'obsidian';
import { EmptyTabMonitor } from 'src/switcherPlus/emptyTabMonitor';
import { leafHasLoadedViewOfType } from 'src/utils';

jest.mock('src/utils', () => {
  return {
    __esModule: true,
    ...jest.requireActual<typeof import('src/utils')>('src/utils'),
    leafHasLoadedViewOfType: jest.fn(),
  };
});

describe('EmptyTabMonitor', () => {
  let mockPlugin: MockProxy<Plugin>;
  let mockApp: MockProxy<App>;
  let mockWorkspace: MockProxy<Workspace>;
  let mockConfig: {
    isEnabled: boolean;
    buttonLabel: string;
    onclickListener: jest.Mock;
  };

  const mockLeafHasLoadedViewOfType = jest.mocked<typeof leafHasLoadedViewOfType>(
    leafHasLoadedViewOfType,
  );

  beforeAll(() => {
    mockWorkspace = mock<Workspace>();
    mockApp = mock<App>({ workspace: mockWorkspace });
    mockPlugin = mock<Plugin>({ app: mockApp });

    mockConfig = {
      isEnabled: true,
      buttonLabel: 'Test Button',
      onclickListener: jest.fn(),
    };
  });

  afterEach(() => {
    EmptyTabMonitor.emptyLeaves.clear();
    mockClear(mockPlugin);
    mockClear(mockWorkspace);
    mockClear(mockConfig.onclickListener);

    mockConfig.isEnabled = true;
    mockLeafHasLoadedViewOfType.mockClear();
  });

  it('should detach and remove all buttons from emptyLeaves map', () => {
    const mockButton1 = mock<HTMLElement>();
    const mockButton2 = mock<HTMLElement>();
    const mockLeaf1 = mock<WorkspaceLeaf>();
    const mockLeaf2 = mock<WorkspaceLeaf>();

    EmptyTabMonitor.emptyLeaves.set(mockLeaf1, mockButton1);
    EmptyTabMonitor.emptyLeaves.set(mockLeaf2, mockButton2);

    EmptyTabMonitor.removeEmptyTabButtons(mockWorkspace);

    expect(mockButton1.detach).toHaveBeenCalledTimes(1);
    expect(mockButton2.detach).toHaveBeenCalledTimes(1);
    expect(EmptyTabMonitor.emptyLeaves.size).toBe(0);
  });

  describe('installEmptyTabMonitor', () => {
    it('should not register events if config.isEnabled is false', () => {
      mockConfig.isEnabled = false;
      EmptyTabMonitor.installEmptyTabMonitor(mockPlugin, mockConfig);

      expect(mockPlugin.registerEvent).not.toHaveBeenCalled();
      expect(mockWorkspace.on).not.toHaveBeenCalled();
      expect(mockWorkspace.onLayoutReady).not.toHaveBeenCalled();
    });

    it('should register layout-change and onLayoutReady events if enabled', () => {
      EmptyTabMonitor.installEmptyTabMonitor(mockPlugin, mockConfig);

      expect(mockPlugin.registerEvent).toHaveBeenCalledTimes(1);
      expect(mockWorkspace.onLayoutReady).toHaveBeenCalledWith(expect.any(Function));
      expect(mockWorkspace.on).toHaveBeenCalledWith(
        'layout-change',
        expect.any(Function),
      );
    });

    it('should call updateEmptyTabs when layout-change event fires', () => {
      const updateEmptyTabsSpy = jest.spyOn(EmptyTabMonitor, 'updateEmptyTabs');
      let layoutChangeCallback: () => void;

      mockWorkspace.on.mockImplementationOnce((event, callback) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (event === ('layout-change' as any)) {
          layoutChangeCallback = callback as () => void;
        }
        return null;
      });

      EmptyTabMonitor.installEmptyTabMonitor(mockPlugin, mockConfig);
      layoutChangeCallback();

      expect(updateEmptyTabsSpy).toHaveBeenCalledWith(mockWorkspace, mockConfig);

      updateEmptyTabsSpy.mockRestore();
    });

    it('should call updateEmptyTabs when onLayoutReady fires', () => {
      const updateEmptyTabsSpy = jest.spyOn(EmptyTabMonitor, 'updateEmptyTabs');
      let layoutReadyCallback: () => void;
      mockWorkspace.onLayoutReady.mockImplementationOnce((callback) => {
        layoutReadyCallback = callback;
      });

      EmptyTabMonitor.installEmptyTabMonitor(mockPlugin, mockConfig);
      layoutReadyCallback();

      expect(updateEmptyTabsSpy).toHaveBeenCalledWith(mockWorkspace, mockConfig);

      updateEmptyTabsSpy.mockRestore();
    });
  });

  describe('updateEmptyTabs', () => {
    let mockLeaf: MockProxy<WorkspaceLeaf>;
    let mockViewContainerEl: MockProxy<HTMLElement>;
    let mockButtonListEl: MockProxy<HTMLElement>;
    let mockFirstChildEl: MockProxy<Element>;
    let mockButtonEl: MockProxy<HTMLDivElement>;

    beforeEach(() => {
      mockButtonEl = mock<HTMLDivElement>();
      mockFirstChildEl = mock<Element>();
      mockButtonListEl = mock<HTMLElement>({
        firstElementChild: mockFirstChildEl,
        createDiv: mockFn().mockReturnValue(mockButtonEl),
      });

      mockViewContainerEl = mock<HTMLElement>();
      mockViewContainerEl.querySelector
        .calledWith('.empty-state-action-list')
        .mockReturnValue(mockButtonListEl);

      mockLeaf = mock<WorkspaceLeaf>({
        view: mock<View>({
          containerEl: mockViewContainerEl,
        }),
      });

      mockWorkspace.iterateAllLeaves.mockImplementation((callback) => {
        callback(mockLeaf);
      });
    });

    it('should not look for empty tabs if config.isEnabled is false', () => {
      mockConfig.isEnabled = false;
      EmptyTabMonitor.updateEmptyTabs(mockWorkspace, mockConfig);

      expect(mockWorkspace.iterateAllLeaves).not.toHaveBeenCalled();
    });

    it('should add a button to an empty leaf that does not have one', () => {
      mockLeafHasLoadedViewOfType.mockReturnValue(true);

      EmptyTabMonitor.updateEmptyTabs(mockWorkspace, mockConfig);

      expect(EmptyTabMonitor.emptyLeaves.has(mockLeaf)).toBe(true);
      expect(mockButtonEl.addEventListener).toHaveBeenCalledWith(
        'click',
        mockConfig.onclickListener,
      );
    });

    it('should insert the launcher button after the first button (the "Create new note" button)', () => {
      mockLeafHasLoadedViewOfType.mockReturnValue(true);

      EmptyTabMonitor.updateEmptyTabs(mockWorkspace, mockConfig);

      expect(mockButtonListEl.insertAfter).toHaveBeenCalledWith(
        mockButtonEl,
        mockFirstChildEl,
      );
      expect(EmptyTabMonitor.emptyLeaves.has(mockLeaf)).toBe(true);
    });

    it('should not add a button if leaf is not empty', () => {
      mockLeafHasLoadedViewOfType.mockReturnValue(false);
      EmptyTabMonitor.updateEmptyTabs(mockWorkspace, mockConfig);

      expect(EmptyTabMonitor.emptyLeaves.has(mockLeaf)).toBe(false);
    });

    it('should not add a button if a button already exists for the leaf', () => {
      mockLeafHasLoadedViewOfType.mockReturnValue(true);
      const existingButton = mock<HTMLElement>();
      EmptyTabMonitor.emptyLeaves.set(mockLeaf, existingButton);

      EmptyTabMonitor.updateEmptyTabs(mockWorkspace, mockConfig);

      expect(EmptyTabMonitor.emptyLeaves.get(mockLeaf)).toBe(existingButton);
      expect(mockButtonListEl.createDiv).not.toHaveBeenCalled();
    });

    it('should not add button if buttonListEl is not found', () => {
      mockLeafHasLoadedViewOfType.mockReturnValue(true);
      mockViewContainerEl.querySelector
        .calledWith('.empty-state-action-list')
        .mockReturnValue(null);

      EmptyTabMonitor.updateEmptyTabs(mockWorkspace, mockConfig);

      expect(EmptyTabMonitor.emptyLeaves.has(mockLeaf)).toBe(false);
    });
  });
});
