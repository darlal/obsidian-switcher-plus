import { EventRef, Plugin, Workspace, WorkspaceLeaf } from 'obsidian';
import { leafHasLoadedViewOfType } from 'src/utils';

interface EmptyTabLauncherConfig {
  isEnabled: boolean;
  buttonLabel: string;
  onclickListener: () => void;
}

/**
 * Adds a custom launcher button to the empty tab view.
 * @param  {HTMLElement} containerEl The container element of the empty tab view.
 * @param  {string} buttonLabel The text label for the button.
 * @param  {()=>void} onclickListener The event handler for the button click.
 * @returns HTMLElement The created button element, or null if the button list element was not found.
 */
function addLauncherButton(
  containerEl: HTMLElement,
  buttonLabel: string,
  onclickListener: () => void,
): HTMLElement {
  let qspButton: HTMLElement = null;

  // Find the button list container element
  // June 2025: The empty tab page contains a div with empty-state-action-list class
  // that wraps the individual button divs.
  const buttonListEl = containerEl.querySelector('.empty-state-action-list');

  if (buttonListEl) {
    qspButton = buttonListEl.createDiv({
      // June 2025: these classes match the classes listed on the ootb buttons
      cls: ['empty-state-action', 'tappable', 'qsp-empty-state-action-launch'],
      text: buttonLabel,
    });

    qspButton.addEventListener('click', onclickListener);

    // Move the launcher button to display after the "Create new note" button,
    // which is the first button displayed June 2025
    if (buttonListEl.firstElementChild !== qspButton) {
      buttonListEl.insertAfter(qspButton, buttonListEl.firstElementChild);
    }
  }

  return qspButton;
}

export class EmptyTabMonitor {
  static readonly emptyLeaves = new Map<WorkspaceLeaf, HTMLElement>();
  private static layoutChangeEventRef: EventRef;

  static installEmptyTabMonitor(plugin: Plugin, config: EmptyTabLauncherConfig): void {
    if (!config?.isEnabled) {
      return;
    }

    const { workspace } = plugin.app;
    EmptyTabMonitor.layoutChangeEventRef = workspace.on('layout-change', () => {
      EmptyTabMonitor.updateEmptyTabs(workspace, config);
    });

    plugin.registerEvent(EmptyTabMonitor.layoutChangeEventRef);

    // Initial check when monitoring starts
    workspace.onLayoutReady(() => {
      EmptyTabMonitor.updateEmptyTabs(workspace, config);
    });
  }

  static removeEmptyTabButtons(workspace: Workspace): void {
    workspace.offref(EmptyTabMonitor.layoutChangeEventRef);
    EmptyTabMonitor.layoutChangeEventRef = null;

    const { emptyLeaves } = EmptyTabMonitor;
    for (const key of emptyLeaves.keys()) {
      emptyLeaves.get(key)?.detach();
      emptyLeaves.delete(key);
    }
  }

  /**
   * Iterates through all workspace leaves and adds a custom launcher button to any
   * empty leaves that do not already have one.
   * @param  {Workspace} workspace
   * @param  {EmptyTabLauncherConfig} config
   */
  static updateEmptyTabs(workspace: Workspace, config: EmptyTabLauncherConfig): void {
    if (!config.isEnabled) {
      return;
    }
    const { buttonLabel, onclickListener } = config;

    workspace.iterateAllLeaves((leaf: WorkspaceLeaf) => {
      const { emptyLeaves } = EmptyTabMonitor;

      if (leafHasLoadedViewOfType(leaf, 'empty') && !emptyLeaves.has(leaf)) {
        const { containerEl } = leaf.view;
        const qspButton = addLauncherButton(containerEl, buttonLabel, onclickListener);

        if (qspButton) {
          emptyLeaves.set(leaf, qspButton);
        }
      }
    });
  }
}
