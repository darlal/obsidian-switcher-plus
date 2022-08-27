import { SettingsTabSection, SwitcherPlusSettings } from 'src/settings';
import { Chance } from 'chance';
import { mock, MockProxy, mockReset } from 'jest-mock-extended';
import {
  App,
  DropdownComponent,
  PluginSettingTab,
  Setting,
  TextAreaComponent,
  TextComponent,
  ToggleComponent,
} from 'obsidian';

const chance = new Chance();

class SUT extends SettingsTabSection {
  public display(_containerEl: HTMLElement): void {
    throw new Error('Method not implemented.');
  }
}

describe('settingsTabSection', () => {
  let mockApp: MockProxy<App>;
  let mockPluginSettingTab: MockProxy<PluginSettingTab>;
  let mockConfig: MockProxy<SwitcherPlusSettings>;
  let mockContainerEl: MockProxy<HTMLElement>;
  let sut: SUT;

  beforeAll(() => {
    mockApp = mock<App>();
    mockContainerEl = mock<HTMLElement>();
    mockPluginSettingTab = mock<PluginSettingTab>({ containerEl: mockContainerEl });
    mockConfig = mock<SwitcherPlusSettings>();

    sut = sut = new SUT(mockApp, mockPluginSettingTab, mockConfig);
  });

  describe('createSetting', () => {
    it('should create a Setting with name and description', () => {
      const setNameSpy = jest.spyOn(Setting.prototype, 'setName');
      const setDescSpy = jest.spyOn(Setting.prototype, 'setDesc');
      const name = chance.word();
      const desc = chance.word();

      const setting = sut.createSetting(mock<HTMLElement>(), name, desc);

      expect(setting).not.toBeFalsy();
      expect(setNameSpy).toHaveBeenCalledWith(name);
      expect(setDescSpy).toHaveBeenCalledWith(desc);

      setNameSpy.mockRestore();
      setDescSpy.mockRestore();
    });
  });

  describe('addSectionTitle', () => {
    it('should display a header and divider for the section', () => {
      const title = chance.sentence();
      const desc = chance.sentence();
      const mockSetting = mock<Setting>();
      const createSettingSpy = jest.spyOn(SettingsTabSection.prototype, 'createSetting');
      createSettingSpy.mockReturnValue(mockSetting);

      sut.addSectionTitle(mockContainerEl, title, desc);

      expect(createSettingSpy).toHaveBeenCalledWith(mockContainerEl, title, desc);
      expect(mockSetting.setHeading).toHaveBeenCalled();

      createSettingSpy.mockRestore();
    });
  });

  describe('addTextSetting', () => {
    let mockSetting: MockProxy<Setting>;
    let mockTextComp: MockProxy<TextComponent>;
    let createSettingSpy: jest.SpyInstance;

    beforeAll(() => {
      mockSetting = mock<Setting>();
      mockTextComp = mock<TextComponent>();

      mockSetting.addText.mockImplementation((cb) => {
        cb(mockTextComp);
        return mockSetting;
      });

      createSettingSpy = jest.spyOn(SettingsTabSection.prototype, 'createSetting');
      createSettingSpy.mockReturnValue(mockSetting);
    });

    afterAll(() => {
      createSettingSpy.mockRestore();
    });

    it('should show the setting with the initial value', () => {
      const name = chance.sentence();
      const desc = chance.sentence();
      const initValue = 'init value';
      const placeholderValue = 'placeholder text';

      const result = sut.addTextSetting(
        mockContainerEl,
        name,
        desc,
        initValue,
        'editorListCommand',
        placeholderValue,
      );

      expect(result).not.toBeNull();
      expect(createSettingSpy).toHaveBeenCalledWith(mockContainerEl, name, desc);
      expect(mockTextComp.setValue).toHaveBeenCalledWith(initValue);
      expect(mockTextComp.setPlaceholder).toHaveBeenCalledWith(placeholderValue);
    });

    it('should save the modified setting', () => {
      mockConfig.editorListCommand = 'editor command';
      const finalValue = 'final value';

      let onChangeFn: (v: string) => void;
      mockTextComp.onChange.mockImplementationOnce((cb) => {
        onChangeFn = cb;
        return mockTextComp;
      });

      sut.addTextSetting(
        mockContainerEl,
        chance.word(),
        chance.sentence(),
        mockConfig.editorListCommand,
        'editorListCommand',
      );

      // trigger the value change here
      onChangeFn(finalValue);

      expect(mockTextComp.onChange).toHaveBeenCalled();
      expect(mockConfig.save).toHaveBeenCalled();
      expect(mockConfig.editorListCommand).toBe(finalValue);

      mockReset(mockConfig);
    });

    it('should fallback to the initial value when an empty string is set for the value', () => {
      const initValue = 'editor command';
      mockConfig.editorListCommand = initValue;

      let onChangeFn: (v: string) => void;
      mockTextComp.onChange.mockImplementationOnce((cb) => {
        onChangeFn = cb;
        return mockTextComp;
      });

      sut.addTextSetting(
        mockContainerEl,
        chance.word(),
        chance.sentence(),
        mockConfig.editorListCommand,
        'editorListCommand',
      );

      // trigger the value change here
      onChangeFn('');

      expect(mockTextComp.onChange).toHaveBeenCalled();
      expect(mockConfig.save).toHaveBeenCalled();
      expect(mockConfig.editorListCommand).toBe(initValue);

      mockReset(mockConfig);
    });
  });

  describe('addToggleSetting', () => {
    let mockSetting: MockProxy<Setting>;
    let mockToggleComp: MockProxy<ToggleComponent>;
    let createSettingSpy: jest.SpyInstance;

    beforeAll(() => {
      mockSetting = mock<Setting>();
      mockToggleComp = mock<ToggleComponent>();

      mockSetting.addToggle.mockImplementation((cb) => {
        cb(mockToggleComp);
        return mockSetting;
      });

      createSettingSpy = jest.spyOn(SettingsTabSection.prototype, 'createSetting');
      createSettingSpy.mockReturnValue(mockSetting);
    });

    afterAll(() => {
      createSettingSpy.mockRestore();
    });

    it('should show the setting with the initial value', () => {
      const name = chance.sentence();
      const desc = chance.sentence();
      const initValue = true;

      const result = sut.addToggleSetting(
        mockContainerEl,
        name,
        desc,
        initValue,
        'alwaysNewPaneForSymbols',
      );

      expect(result).not.toBeNull();
      expect(createSettingSpy).toHaveBeenCalledWith(mockContainerEl, name, desc);
      expect(mockToggleComp.setValue).toHaveBeenCalledWith(initValue);
    });

    it('should save the modified setting', () => {
      mockConfig.alwaysNewPaneForSymbols = false;
      const finalValue = true;

      let onChangeFn: (v: boolean) => void;
      mockToggleComp.onChange.mockImplementationOnce((cb) => {
        onChangeFn = cb;
        return mockToggleComp;
      });

      sut.addToggleSetting(
        mockContainerEl,
        chance.word(),
        chance.sentence(),
        mockConfig.alwaysNewPaneForSymbols,
        'alwaysNewPaneForSymbols',
      );

      // trigger the value change here
      onChangeFn(finalValue);

      expect(mockToggleComp.onChange).toHaveBeenCalled();
      expect(mockConfig.save).toHaveBeenCalled();
      expect(mockConfig.alwaysNewPaneForSymbols).toBe(finalValue);

      mockReset(mockConfig);
    });

    it('should execute the onChange callback if supplied', () => {
      const expectedValue = chance.bool();
      const cb = jest.fn();

      let onChangeFn: (v: boolean) => void;
      mockToggleComp.onChange.mockImplementationOnce((cb) => {
        onChangeFn = cb;
        return mockToggleComp;
      });

      sut.addToggleSetting(
        mockContainerEl,
        chance.word(),
        chance.sentence(),
        mockConfig.alwaysNewPaneForSymbols,
        null,
        cb,
      );

      // trigger the value change here
      onChangeFn(expectedValue);

      expect(mockToggleComp.onChange).toHaveBeenCalled();
      expect(cb).toHaveBeenCalledWith(expectedValue, mockConfig);

      mockReset(mockConfig);
    });
  });

  describe('addTextAreaSetting', () => {
    let mockSetting: MockProxy<Setting>;
    let mockTextComp: MockProxy<TextAreaComponent>;
    let createSettingSpy: jest.SpyInstance;

    beforeAll(() => {
      mockSetting = mock<Setting>();
      mockTextComp = mock<TextAreaComponent>();

      mockSetting.addTextArea.mockImplementation((cb) => {
        cb(mockTextComp);
        return mockSetting;
      });

      createSettingSpy = jest.spyOn(SettingsTabSection.prototype, 'createSetting');
      createSettingSpy.mockReturnValue(mockSetting);
    });

    afterAll(() => {
      createSettingSpy.mockRestore();
    });

    it('should show the setting with the initial value', () => {
      const name = chance.sentence();
      const desc = chance.sentence();
      const initValue = 'init value';
      const placeholderValue = 'placeholder text';

      const result = sut.addTextAreaSetting(
        mockContainerEl,
        name,
        desc,
        initValue,
        'editorListCommand',
        placeholderValue,
      );

      expect(result).not.toBeNull();
      expect(createSettingSpy).toHaveBeenCalledWith(mockContainerEl, name, desc);
      expect(mockTextComp.setValue).toHaveBeenCalledWith(initValue);
      expect(mockTextComp.setPlaceholder).toHaveBeenCalledWith(placeholderValue);
    });

    it('should save the modified setting as string', () => {
      mockConfig.editorListCommand = 'editor command';
      const finalValue = 'final value';

      let onChangeFn: (v: string) => void;
      mockTextComp.onChange.mockImplementationOnce((cb) => {
        onChangeFn = cb;
        return mockTextComp;
      });

      sut.addTextAreaSetting(
        mockContainerEl,
        chance.word(),
        chance.sentence(),
        mockConfig.editorListCommand,
        'editorListCommand',
      );

      // trigger the value change here
      onChangeFn(finalValue);

      expect(mockTextComp.onChange).toHaveBeenCalled();
      expect(mockConfig.save).toHaveBeenCalled();
      expect(mockConfig.editorListCommand).toBe(finalValue);

      mockReset(mockConfig);
    });

    it('should save the modified setting as list', () => {
      mockConfig.includeSidePanelViewTypes = [chance.word()];
      const finalValue = [chance.word(), chance.word(), chance.word()];

      let onChangeFn: (v: string) => void;
      mockTextComp.onChange.mockImplementationOnce((cb) => {
        onChangeFn = cb;
        return mockTextComp;
      });

      sut.addTextAreaSetting(
        mockContainerEl,
        chance.word(),
        chance.sentence(),
        mockConfig.includeSidePanelViewTypes.join('\n'),
        'includeSidePanelViewTypes',
      );

      // trigger the value change here
      // Note: the onChange function takes a string and converts it to a list
      // by splitting on the newline '\n\
      onChangeFn(finalValue.join('\n'));

      expect(mockTextComp.onChange).toHaveBeenCalled();
      expect(mockConfig.save).toHaveBeenCalled();
      expect(mockConfig.includeSidePanelViewTypes).toEqual(finalValue);

      mockReset(mockConfig);
    });

    it('should fallback to the initial value when an empty string is set for the value', () => {
      const initValue = [chance.word()];
      mockConfig.includeSidePanelViewTypes = initValue;

      let onChangeFn: (v: string) => void;
      mockTextComp.onChange.mockImplementationOnce((cb) => {
        onChangeFn = cb;
        return mockTextComp;
      });

      sut.addTextAreaSetting(
        mockContainerEl,
        chance.word(),
        chance.sentence(),
        mockConfig.includeSidePanelViewTypes.join('\n'),
        'includeSidePanelViewTypes',
      );

      // trigger the value change here
      onChangeFn('');

      expect(mockTextComp.onChange).toHaveBeenCalled();
      expect(mockConfig.save).toHaveBeenCalled();
      expect(mockConfig.includeSidePanelViewTypes).toEqual(initValue);

      mockReset(mockConfig);
    });
  });

  describe('addDropdown', () => {
    let mockSetting: MockProxy<Setting>;
    let mockDropdownComp: MockProxy<DropdownComponent>;
    let createSettingSpy: jest.SpyInstance;
    const options: Record<string, string> = {
      first: 'One',
      second: 'Two',
      third: 'Three',
    };
    const initValue = options.first;

    beforeAll(() => {
      mockSetting = mock<Setting>();
      mockDropdownComp = mock<DropdownComponent>();

      mockSetting.addDropdown.mockImplementation((cb) => {
        cb(mockDropdownComp);
        return mockSetting;
      });

      createSettingSpy = jest.spyOn(SettingsTabSection.prototype, 'createSetting');
      createSettingSpy.mockReturnValue(mockSetting);
    });

    afterAll(() => {
      createSettingSpy.mockRestore();
    });

    it('should show the setting with the initial value', () => {
      const name = chance.sentence();
      const desc = chance.sentence();

      const result = sut.addDropdownSetting(
        mockContainerEl,
        name,
        desc,
        initValue,
        options,
        'editorListCommand',
      );

      expect(result).not.toBeNull();
      expect(createSettingSpy).toHaveBeenCalledWith(mockContainerEl, name, desc);
      expect(mockDropdownComp.addOptions).toHaveBeenCalledWith(options);
      expect(mockDropdownComp.setValue).toHaveBeenCalledWith(initValue);
    });

    it('should save the modified setting', () => {
      mockConfig.editorListCommand = 'editor command';
      const finalValue = 'final value';

      let onChangeFn: (v: string) => void;
      mockDropdownComp.onChange.mockImplementationOnce((cb) => {
        onChangeFn = cb;
        return mockDropdownComp;
      });

      sut.addDropdownSetting(
        mockContainerEl,
        chance.word(),
        chance.sentence(),
        initValue,
        options,
        'editorListCommand',
      );

      // trigger the value change here
      onChangeFn(finalValue);

      expect(mockDropdownComp.onChange).toHaveBeenCalled();
      expect(mockConfig.save).toHaveBeenCalled();
      expect(mockConfig.editorListCommand).toBe(finalValue);

      mockReset(mockConfig);
    });

    it('should execute the onChange callback if supplied', () => {
      const expectedValue = 'final value';
      const cb = jest.fn();

      let onChangeFn: (v: string) => void;
      mockDropdownComp.onChange.mockImplementationOnce((cb) => {
        onChangeFn = cb;
        return mockDropdownComp;
      });

      sut.addDropdownSetting(
        mockContainerEl,
        chance.word(),
        chance.sentence(),
        chance.word(),
        options,
        null,
        cb,
      );

      // trigger the value change here
      onChangeFn(expectedValue);

      expect(mockDropdownComp.onChange).toHaveBeenCalled();
      expect(cb).toHaveBeenCalledWith(expectedValue, mockConfig);

      mockReset(mockConfig);
    });
  });
});
