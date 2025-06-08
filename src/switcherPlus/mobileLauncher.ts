import { App, Platform, setIcon } from 'obsidian';
import { SwitcherPlusSettings } from 'src/settings';
import { MobileLauncherConfig } from 'src/types';

/**
 * Creates a custom launcher button element by cloning then modifying coreLauncherButtonEl
 * @param  {Element} coreLauncherButtonEl the ootb system launcher button element
 * @param  {MobileLauncherConfig} launcherConfig
 * @param  {()=>void} onclickListener event handler to attach to the new custom button
 * @returns HTMLElement the new custom button element that was created
 */
function createQSPLauncherButton(
  coreLauncherButtonEl: Element,
  launcherConfig: MobileLauncherConfig,
  onclickListener: () => void,
): HTMLElement {
  let qspLauncherButtonEl: HTMLElement = null;

  if (coreLauncherButtonEl) {
    // April 2024: cloneNode(true) should perform a deep copy, but does not copy
    // any event handlers that were attached using addEventListener(), which
    // corePlusButtonEl does use, so it can be safely cloned.
    // Additionally, cloneNode() will copy element ID/Name as well which could result
    // in duplicates, but corePlusButtonEl does not contain ID/Name so it's also safe
    qspLauncherButtonEl = coreLauncherButtonEl.cloneNode(true) as HTMLElement;

    if (qspLauncherButtonEl) {
      const { iconName, coreLauncherButtonIconSelector } = launcherConfig;

      qspLauncherButtonEl.addClass('qsp-mobile-launcher-button');
      qspLauncherButtonEl.addEventListener('click', onclickListener);

      if (iconName?.length) {
        // Override the core icon, if a custom icon file name is provided
        const iconEl = qspLauncherButtonEl.querySelector(coreLauncherButtonIconSelector);

        if (iconEl) {
          setIcon(iconEl as HTMLElement, iconName);
        }
      }
    }
  }

  return qspLauncherButtonEl;
}
/**
 * Remove coreButtonEl from DOM and replaces it with qspButtonEl
 * @param  {Element} coreButtonEl
 * @param  {HTMLElement} qspButtonEl
 * @returns boolean True if succeeded
 */
function replaceCoreLauncherButtonWithQSPButton(
  coreButtonEl: Element,
  qspButtonEl: HTMLElement,
): boolean {
  let isSuccessful = false;

  if (coreButtonEl && qspButtonEl) {
    // Hide the button before adding to DOM
    const initialDisplay = qspButtonEl.style.display;
    qspButtonEl.style.display = 'none';

    if (coreButtonEl.insertAdjacentElement('beforebegin', qspButtonEl)) {
      coreButtonEl.remove();
      isSuccessful = true;
    }

    qspButtonEl.style.display = initialDisplay;
  }

  return isSuccessful;
}
/**
 * Finds the "🔍" button element using the default selector.
 * If that fails, retries using the selector stored in settings
 * @param  {App} app
 * @param  {MobileLauncherConfig} launcherConfig
 * @returns Element The button Element
 */
function getCoreLauncherButtonElement(
  app: App,
  launcherConfig: MobileLauncherConfig,
): Element {
  let coreLauncherButtonEl: Element = null;
  const containerEl = app?.mobileNavbar?.containerEl;

  if (containerEl) {
    coreLauncherButtonEl = containerEl.querySelector(
      SwitcherPlusSettings.defaults.mobileLauncher.coreLauncherButtonSelector,
    );

    if (!coreLauncherButtonEl) {
      // Element wasn't found using the default selector, try using the custom selector
      coreLauncherButtonEl = containerEl.querySelector(
        launcherConfig.coreLauncherButtonSelector,
      );
    }
  }

  return coreLauncherButtonEl;
}

export class MobileLauncher {
  // Reference to the system switcher launcher button on mobile platforms,
  // the magnifying glass (🔍) button in the NavBar.
  static coreMobileLauncherButtonEl: HTMLElement | null;

  // Reference to the custom launcher button that was created
  static qspMobileLauncherButtonEl: HTMLElement | null;

  /**
   * Overrides the default functionality of the "🔍" button on mobile platforms
   * to launch Switcher++ instead of the default system switcher.
   * @param  {App} app
   * @param  {MobileLauncherConfig} launcherConfig
   * @param  {()=>void} onclickListener event handler to attach to the new custom button
   * @returns HTMLElement the new launcher button element if created
   */
  static installMobileLauncherOverride(
    app: App,
    launcherConfig: MobileLauncherConfig,
    onclickListener: () => void,
  ): HTMLElement {
    let qspLauncherButtonEl: HTMLElement = null;
    const shouldInstall =
      Platform.isMobile &&
      launcherConfig.isEnabled &&
      launcherConfig.isMobileButtonEnabled;

    // If it's not a mobile platform, or the override feature is disabled, or the
    // core launcher has already been overridden then do nothing.
    if (!shouldInstall || MobileLauncher.coreMobileLauncherButtonEl) {
      return null;
    }

    const coreLauncherButtonEl = getCoreLauncherButtonElement(app, launcherConfig);
    if (coreLauncherButtonEl) {
      const qspButtonEl = createQSPLauncherButton(
        coreLauncherButtonEl,
        launcherConfig,
        onclickListener,
      );

      if (replaceCoreLauncherButtonWithQSPButton(coreLauncherButtonEl, qspButtonEl)) {
        MobileLauncher.coreMobileLauncherButtonEl = coreLauncherButtonEl as HTMLElement;
        MobileLauncher.qspMobileLauncherButtonEl = qspButtonEl;
        qspLauncherButtonEl = qspButtonEl;
      }
    }

    return qspLauncherButtonEl;
  }
  /**
   * Restores the default functionality of the "🔍" button on mobile platforms and
   * removes the custom launcher button.
   * @returns boolean true if successful
   */
  static removeMobileLauncherOverride(): boolean {
    let isSuccessful = false;

    if (!MobileLauncher.coreMobileLauncherButtonEl) {
      return isSuccessful;
    }

    if (MobileLauncher.qspMobileLauncherButtonEl?.parentElement) {
      const qspButtonEl = MobileLauncher.qspMobileLauncherButtonEl;
      const coreButtonEl = MobileLauncher.coreMobileLauncherButtonEl;

      const initialDisplay = coreButtonEl.style.display;
      coreButtonEl.style.display = 'none';

      if (qspButtonEl.insertAdjacentElement('beforebegin', coreButtonEl)) {
        qspButtonEl.remove();

        MobileLauncher.qspMobileLauncherButtonEl = null;
        MobileLauncher.coreMobileLauncherButtonEl = null;
        isSuccessful = true;
      }

      coreButtonEl.style.display = initialDisplay;
    }

    return isSuccessful;
  }
}
