import { mock, MockProxy, mockClear } from 'jest-mock-extended';
import { App, setIcon, setTooltip, View, Workspace, WorkspaceLeaf } from 'obsidian';
import { EmptyTabMonitor, SwitcherPlusModal } from 'src/switcherPlus';
import * as Utils from 'src/utils/utils';
import { Mode } from 'src/types';
import SwitcherPlusPlugin from 'src/main';
import { Chance } from 'chance';

const chance = new Chance();

describe('EmptyTabMonitor', () => {
  let mockPlugin: MockProxy<SwitcherPlusPlugin>;
  let mockApp: MockProxy<App>;
  let mockWorkspace: MockProxy<Workspace>;
  let createAndOpenSpy: jest.SpyInstance;
  let mockConfig: {
    isEnabled: boolean;
    buttonLabel: string;
    mode: Mode;
    iconName: string;
  };
  let leafHasLoadedViewOfTypeSpy: jest.SpyInstance;

  beforeAll(() => {
    mockWorkspace = mock<Workspace>();
    mockApp = mock<App>({ workspace: mockWorkspace });
    mockPlugin = mock<SwitcherPlusPlugin>({ app: mockApp });

    mockConfig = {
      isEnabled: true,
      buttonLabel: 'Test Button',
      mode: Mode.HeadingsList,
      iconName: '',
    };

    createAndOpenSpy = jest
      .spyOn(SwitcherPlusModal, 'createAndOpen')
      .mockReturnValue(true);
  });

  afterAll(() => {
    createAndOpenSpy.mockRestore();
  });

  beforeEach(() => {
    leafHasLoadedViewOfTypeSpy = jest
      .spyOn(Utils, 'leafHasLoadedViewOfType')
      .mockReturnValue(undefined);
  });

  beforeEach(() => {
    leafHasLoadedViewOfTypeSpy = jest
      .spyOn(Utils, 'leafHasLoadedViewOfType')
      .mockReturnValue(undefined);
  });

  afterEach(() => {
    EmptyTabMonitor.emptyLeaves.clear();
    mockClear(mockPlugin);
    mockClear(mockWorkspace);
    createAndOpenSpy.mockClear();

    mockConfig.isEnabled = true;
    leafHasLoadedViewOfTypeSpy.mockRestore();
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
        if (event === ('layout-change' as any)) {
          layoutChangeCallback = callback as () => void;
        }
        return null;
      });

      EmptyTabMonitor.installEmptyTabMonitor(mockPlugin, mockConfig);
      layoutChangeCallback();

      expect(updateEmptyTabsSpy).toHaveBeenCalledWith(
        mockWorkspace,
        mockPlugin,
        mockConfig,
      );

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

      expect(updateEmptyTabsSpy).toHaveBeenCalledWith(
        mockWorkspace,
        mockPlugin,
        mockConfig,
      );

      updateEmptyTabsSpy.mockRestore();
    });
  });

  describe('updateEmptyTabs', () => {
    const mockSetIcon = jest.mocked<typeof setIcon>(setIcon);
    const mockSetTooltip = jest.mocked<typeof setTooltip>(setTooltip);
    let mockLeaf: MockProxy<WorkspaceLeaf>;
    let mockViewContainerEl: MockProxy<HTMLElement>;
    let mockButtonListEl: MockProxy<HTMLElement>;
    let mockTemplateEl: MockProxy<HTMLElement>;
    let mockButtonEl: MockProxy<HTMLElement>;
    let mockHotkeyEl: MockProxy<HTMLElement>;
    let mockIconEl: MockProxy<HTMLElement>;
    let mockLabelEl: MockProxy<HTMLElement>;

    const getButtonListener = (type: string) =>
      mockButtonEl.addEventListener.mock.calls.find((call) => call[0] === type)?.[1] as
        ((evt?: unknown) => void) | undefined;

    beforeEach(() => {
      mockHotkeyEl = mock<HTMLElement>();
      mockIconEl = mock<HTMLElement>();
      mockLabelEl = mock<HTMLElement>();

      mockButtonEl = mock<HTMLElement>();
      mockButtonEl.find.calledWith('.empty-state-hotkey').mockReturnValue(mockHotkeyEl);
      mockButtonEl.find.calledWith('.text-button-icon').mockReturnValue(mockIconEl);
      mockButtonEl.find.calledWith('.text-button-label').mockReturnValue(mockLabelEl);

      mockTemplateEl = mock<HTMLElement>();
      mockTemplateEl.cloneNode.mockReturnValue(mockButtonEl);

      mockButtonListEl = mock<HTMLElement>();
      mockButtonListEl.find
        .calledWith('.empty-state-action')
        .mockReturnValue(mockTemplateEl);

      mockViewContainerEl = mock<HTMLElement>();
      mockViewContainerEl.find
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

      leafHasLoadedViewOfTypeSpy.mockReturnValue(true);
    });

    afterEach(() => {
      mockSetIcon.mockClear();
      mockSetTooltip.mockClear();
      mockConfig.iconName = '';
    });

    it('should not look for empty tabs when config.isEnabled is false', () => {
      mockConfig.isEnabled = false;

      EmptyTabMonitor.updateEmptyTabs(mockWorkspace, mockPlugin, mockConfig);

      expect(mockWorkspace.iterateAllLeaves).not.toHaveBeenCalled();
    });

    it('should create the launcher button by deep cloning a native action button', () => {
      EmptyTabMonitor.updateEmptyTabs(mockWorkspace, mockPlugin, mockConfig);

      expect(mockTemplateEl.cloneNode).toHaveBeenCalledWith(true);
      expect(mockButtonEl.addClass).toHaveBeenCalledWith('qsp-empty-state-action-launch');
      expect(EmptyTabMonitor.emptyLeaves.get(mockLeaf)).toBe(mockButtonEl);
    });

    it('should append the launcher button after the native action buttons', () => {
      EmptyTabMonitor.updateEmptyTabs(mockWorkspace, mockPlugin, mockConfig);

      expect(mockButtonListEl.appendChild).toHaveBeenCalledWith(mockButtonEl);
    });

    it('should remove the hotkey badge copied from the native button', () => {
      EmptyTabMonitor.updateEmptyTabs(mockWorkspace, mockPlugin, mockConfig);

      expect(mockHotkeyEl.detach).toHaveBeenCalledTimes(1);
    });

    it('should set the configured icon when iconName is provided', () => {
      const iconName = `lucide-${chance.word()}`;
      mockConfig.iconName = iconName;

      EmptyTabMonitor.updateEmptyTabs(mockWorkspace, mockPlugin, mockConfig);

      expect(mockSetIcon).toHaveBeenCalledWith(mockIconEl, iconName);
    });

    it('should set the core switcher icon when iconName is empty', () => {
      mockConfig.iconName = '';

      EmptyTabMonitor.updateEmptyTabs(mockWorkspace, mockPlugin, mockConfig);

      expect(mockSetIcon).toHaveBeenCalledWith(mockIconEl, 'lucide-search');
    });

    it('should set the button label on the label element', () => {
      EmptyTabMonitor.updateEmptyTabs(mockWorkspace, mockPlugin, mockConfig);

      expect(mockLabelEl.setText).toHaveBeenCalledWith(mockConfig.buttonLabel);
      expect(mockButtonEl.setText).not.toHaveBeenCalled();
    });

    it('should set the accessible name to the button label', () => {
      EmptyTabMonitor.updateEmptyTabs(mockWorkspace, mockPlugin, mockConfig);

      expect(mockSetTooltip).toHaveBeenCalledWith(mockButtonEl, mockConfig.buttonLabel);
    });

    it('should open SwitcherPlusModal when the button is clicked', () => {
      EmptyTabMonitor.updateEmptyTabs(mockWorkspace, mockPlugin, mockConfig);
      const clickListener = getButtonListener('click');

      clickListener?.();

      expect(createAndOpenSpy).toHaveBeenCalledWith(
        mockApp,
        mockPlugin,
        Mode.HeadingsList,
      );
    });

    it.each(['Enter', ' '])(
      'should open SwitcherPlusModal when the "%s" key is pressed',
      (key) => {
        const evt = mock<KeyboardEvent>({ key, isComposing: false });
        EmptyTabMonitor.updateEmptyTabs(mockWorkspace, mockPlugin, mockConfig);
        const keydownListener = getButtonListener('keydown');

        keydownListener?.(evt);

        expect(evt.preventDefault).toHaveBeenCalledTimes(1);
        expect(createAndOpenSpy).toHaveBeenCalledWith(
          mockApp,
          mockPlugin,
          Mode.HeadingsList,
        );
      },
    );

    it('should not open SwitcherPlusModal when a non-activation key is pressed', () => {
      const evt = mock<KeyboardEvent>({ key: 'a', isComposing: false });
      EmptyTabMonitor.updateEmptyTabs(mockWorkspace, mockPlugin, mockConfig);
      const keydownListener = getButtonListener('keydown');

      keydownListener?.(evt);

      expect(evt.preventDefault).not.toHaveBeenCalled();
      expect(createAndOpenSpy).not.toHaveBeenCalled();
    });

    it('should not open SwitcherPlusModal when Enter is pressed during IME composition', () => {
      const evt = mock<KeyboardEvent>({ key: 'Enter', isComposing: true });
      EmptyTabMonitor.updateEmptyTabs(mockWorkspace, mockPlugin, mockConfig);
      const keydownListener = getButtonListener('keydown');

      keydownListener?.(evt);

      expect(evt.preventDefault).not.toHaveBeenCalled();
      expect(createAndOpenSpy).not.toHaveBeenCalled();
    });

    it('should not add a button when the leaf is not empty', () => {
      leafHasLoadedViewOfTypeSpy.mockReturnValue(false);

      EmptyTabMonitor.updateEmptyTabs(mockWorkspace, mockPlugin, mockConfig);

      expect(EmptyTabMonitor.emptyLeaves.has(mockLeaf)).toBe(false);
    });

    it('should not add a button when a button already exists for the leaf', () => {
      const existingButton = mock<HTMLElement>();
      EmptyTabMonitor.emptyLeaves.set(mockLeaf, existingButton);

      EmptyTabMonitor.updateEmptyTabs(mockWorkspace, mockPlugin, mockConfig);

      expect(EmptyTabMonitor.emptyLeaves.get(mockLeaf)).toBe(existingButton);
      expect(mockTemplateEl.cloneNode).not.toHaveBeenCalled();
    });

    it('should not set an icon when the cloned button has no icon element', () => {
      mockButtonEl.find.calledWith('.text-button-icon').mockReturnValue(null);

      EmptyTabMonitor.updateEmptyTabs(mockWorkspace, mockPlugin, mockConfig);

      expect(mockSetIcon).not.toHaveBeenCalled();
    });

    it('should set the button label on the button itself when the cloned button has no label element', () => {
      mockButtonEl.find.calledWith('.text-button-label').mockReturnValue(null);

      EmptyTabMonitor.updateEmptyTabs(mockWorkspace, mockPlugin, mockConfig);

      expect(mockButtonEl.setText).toHaveBeenCalledWith(mockConfig.buttonLabel);
    });

    it('should not add a button when the action list is not found', () => {
      mockViewContainerEl.find
        .calledWith('.empty-state-action-list')
        .mockReturnValue(null);

      EmptyTabMonitor.updateEmptyTabs(mockWorkspace, mockPlugin, mockConfig);

      expect(EmptyTabMonitor.emptyLeaves.has(mockLeaf)).toBe(false);
    });

    it('should not add a button when no native action button is found', () => {
      mockButtonListEl.find.calledWith('.empty-state-action').mockReturnValue(null);

      EmptyTabMonitor.updateEmptyTabs(mockWorkspace, mockPlugin, mockConfig);

      expect(EmptyTabMonitor.emptyLeaves.has(mockLeaf)).toBe(false);
    });
  });
});
