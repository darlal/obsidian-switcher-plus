import { Chance } from 'chance';
import { MockProxy, mock, mockFn, mockClear } from 'jest-mock-extended';
import { App, Platform, setIcon } from 'obsidian';
import { MobileLauncherConfig } from 'src/types';
import { MobileLauncher } from 'src/switcherPlus';
import { SwitcherPlusSettings } from 'src/settings';

const chance = new Chance();

describe('MobileLauncher', () => {
  let mockApp: MockProxy<App>;
  let mockPlatform: MockProxy<typeof Platform>;
  let mockNavbarContainerEl: MockProxy<HTMLElement>;
  const sut = MobileLauncher;

  beforeAll(() => {
    mockNavbarContainerEl = mock<HTMLElement>();
    mockApp = mock<App>({
      mobileNavbar: {
        containerEl: mockNavbarContainerEl,
      },
    });
    mockPlatform = jest.mocked<typeof Platform>(Platform);
  });

  describe('removeMobileLauncherOverride', () => {
    let mockCoreButtonEl: MockProxy<HTMLElement>;
    let mockQspButtonEl: MockProxy<HTMLElement>;

    beforeAll(() => {
      mockQspButtonEl = mock<HTMLElement>();
      mockCoreButtonEl = mock<HTMLElement>();
    });

    afterEach(() => {
      mockClear(mockCoreButtonEl);
      mockClear(mockQspButtonEl);

      sut.coreMobileLauncherButtonEl = null;
      sut.qspMobileLauncherButtonEl = null;
    });

    it('should remove the custom launcher from the DOM and add the core launcher so only one is visible at a time', () => {
      sut.coreMobileLauncherButtonEl = mockCoreButtonEl;
      sut.qspMobileLauncherButtonEl = mockQspButtonEl;

      mockQspButtonEl.insertAdjacentElement.mockReturnValueOnce(mockCoreButtonEl);

      const result = sut.removeMobileLauncherOverride();

      expect(result).toBe(true);
      expect(sut.coreMobileLauncherButtonEl).toBeNull();
      expect(sut.qspMobileLauncherButtonEl).toBeNull();
      expect(mockQspButtonEl.remove).toHaveBeenCalled();
      expect(mockQspButtonEl.insertAdjacentElement).toHaveBeenCalledWith(
        'beforebegin',
        mockCoreButtonEl,
      );

      mockQspButtonEl.insertAdjacentElement.mockReset();
    });

    it("should fail if a reference to the core launcher doesn't exist", () => {
      sut.coreMobileLauncherButtonEl = null;

      const result = sut.removeMobileLauncherOverride();

      expect(result).toBe(false);
    });
  });

  describe('installMobileLauncherOverride', () => {
    let launcherConfig: MockProxy<MobileLauncherConfig>;
    let mockCoreButtonEl: MockProxy<Element>;
    let mockQspButtonEl: MockProxy<HTMLElement>;

    beforeAll(() => {
      launcherConfig = mock<MobileLauncherConfig>({ isEnabled: true });
      mockQspButtonEl = mock<HTMLElement>();
      mockCoreButtonEl = mock<Element>();

      // .cloneNode is how the qsp button is created
      mockCoreButtonEl.cloneNode.mockReturnValue(mockQspButtonEl);

      // .insertAdjacentElement is how the qsp button is inserted into the DOM
      mockCoreButtonEl.insertAdjacentElement.mockReturnValue(mockQspButtonEl);

      // Used for finding the core button in DOM
      launcherConfig.coreLauncherButtonSelector = chance.word();
      mockNavbarContainerEl.querySelector
        .calledWith(launcherConfig.coreLauncherButtonSelector)
        .mockReturnValue(mockCoreButtonEl);
    });

    afterEach(() => {
      mockClear(mockNavbarContainerEl);
      mockClear(mockCoreButtonEl);
      mockClear(mockQspButtonEl);

      sut.coreMobileLauncherButtonEl = null;
      sut.qspMobileLauncherButtonEl = null;
    });

    it('should not install if the Platform is not mobile', () => {
      mockPlatform.isMobile = false;

      const results = sut.installMobileLauncherOverride(mockApp, null, null);

      expect(results).toBeNull();
      expect(mockNavbarContainerEl.querySelector).not.toHaveBeenCalled();

      mockPlatform.isMobile = true;
    });

    it('should not install if the launcher is disabled', () => {
      launcherConfig.isEnabled = false;

      const results = sut.installMobileLauncherOverride(mockApp, launcherConfig, null);

      expect(results).toBeNull();
      expect(mockNavbarContainerEl.querySelector).not.toHaveBeenCalled();

      launcherConfig.isEnabled = true;
    });

    it('should not install if the core button is already overridden', () => {
      sut.coreMobileLauncherButtonEl = mock<HTMLElement>();

      const results = sut.installMobileLauncherOverride(mockApp, launcherConfig, null);

      expect(results).toBeNull();
      expect(mockNavbarContainerEl.querySelector).not.toHaveBeenCalled();

      sut.coreMobileLauncherButtonEl = null;
    });

    it('should create a a custom launcher button by cloning the core launcher button', () => {
      const clickHandler = mockFn();

      const result = sut.installMobileLauncherOverride(
        mockApp,
        launcherConfig,
        clickHandler,
      );

      expect(result).toBe(mockQspButtonEl);
      expect(mockQspButtonEl.addClass).toHaveBeenCalledWith('qsp-mobile-launcher-button');
      expect(mockQspButtonEl.addEventListener).toHaveBeenCalledWith(
        'click',
        clickHandler,
      );
    });

    test('custom launcher button should use a custom icon when iconName is provided', () => {
      const mockIconEl = mock<Element>();
      const mockSetIcon = jest.mocked<typeof setIcon>(setIcon);
      launcherConfig.iconName = chance.word();
      launcherConfig.coreLauncherButtonIconSelector = chance.word();

      mockQspButtonEl.querySelector
        .calledWith(launcherConfig.coreLauncherButtonIconSelector)
        .mockReturnValueOnce(mockIconEl);

      const result = sut.installMobileLauncherOverride(mockApp, launcherConfig, null);

      expect(result).toBe(mockQspButtonEl);
      expect(mockSetIcon).toHaveBeenCalledWith(mockIconEl, launcherConfig.iconName);

      mockQspButtonEl.querySelector.mockReset();
      launcherConfig.iconName = '';
      launcherConfig.coreLauncherButtonIconSelector = '';
    });

    it('should insert the custom launcher into the DOM and remove the core launcher so only one is visible at a time', () => {
      mockClear(mockCoreButtonEl);
      mockClear(mockQspButtonEl);

      sut.installMobileLauncherOverride(mockApp, launcherConfig, null);

      expect(sut.coreMobileLauncherButtonEl).toBe(mockCoreButtonEl);
      expect(sut.qspMobileLauncherButtonEl).toBe(mockQspButtonEl);
      expect(mockCoreButtonEl.remove).toHaveBeenCalled();
      expect(mockCoreButtonEl.insertAdjacentElement).toHaveBeenCalledWith(
        'beforebegin',
        mockQspButtonEl,
      );
    });

    test('when the core launcher button is not found using the default selector, it should try using the selector stored in settings', () => {
      const mockContainerEl = mock<HTMLElement>();
      const defaultSelector =
        SwitcherPlusSettings.defaults.mobileLauncher.coreLauncherButtonSelector;

      const localApp = mock<App>({
        mobileNavbar: {
          containerEl: mockContainerEl,
        },
      });

      // return null when called using default selector
      mockContainerEl.querySelector.calledWith(defaultSelector).mockReturnValue(null);

      // return expected value when called using stored selector
      mockContainerEl.querySelector
        .calledWith(launcherConfig.coreLauncherButtonSelector)
        .mockReturnValue(mockCoreButtonEl);

      const result = sut.installMobileLauncherOverride(localApp, launcherConfig, null);

      expect(result).toBe(mockQspButtonEl);
      expect(mockContainerEl.querySelector).toHaveBeenCalledWith(defaultSelector);
      expect(mockContainerEl.querySelector).toHaveBeenCalledWith(
        launcherConfig.coreLauncherButtonSelector,
      );
    });
  });
});
