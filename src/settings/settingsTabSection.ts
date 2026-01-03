import { SwitcherPlusSettings } from './switcherPlusSettings';
import { SwitcherPlusSettingTab } from './switcherPlusSettingTab';
import { App, Setting, SettingGroup, SliderComponent } from 'obsidian';
import { WritableKeysWithValueOfType } from 'src/types';
import { WritableKeys } from 'ts-essentials';

type StringTypedConfigKey = WritableKeysWithValueOfType<SwitcherPlusSettings, string>;
type NumberTypedConfigKey = WritableKeysWithValueOfType<SwitcherPlusSettings, number>;
type BooleanTypedConfigKey = WritableKeysWithValueOfType<SwitcherPlusSettings, boolean>;
type ListTypedConfigKey = WritableKeysWithValueOfType<
  SwitcherPlusSettings,
  Array<string>
>;

export abstract class SettingsTabSection {
  constructor(
    protected app: App,
    protected mainSettingsTab: SwitcherPlusSettingTab,
    protected config: SwitcherPlusSettings,
  ) {}

  abstract display(containerEl: HTMLElement): void;

  /**
   * Creates a new Setting with the given name and description.
   * Supports both HTMLElement and SettingGroup containers.
   * @param  {HTMLElement | SettingGroup} containerEl
   * @param  {string} name
   * @param  {string} desc
   * @returns Setting
   */
  createSetting(
    containerEl: HTMLElement | SettingGroup,
    name?: string,
    desc?: string,
  ): Setting {
    let setting: Setting;

    if (containerEl instanceof SettingGroup) {
      containerEl.addSetting((s) => {
        setting = s;
        s.setName(name);
        s.setDesc(desc);
      });
    } else {
      setting = new Setting(containerEl);
      setting.setName(name);
      setting.setDesc(desc);
    }

    return setting;
  }

  /**
   * Helper method to create a setting and configure it with a component.
   * Handles the instanceof check to support both HTMLElement and SettingGroup containers.
   * @param  {HTMLElement | SettingGroup} containerEl
   * @param  {string} name
   * @param  {string} desc
   * @param  {(setting: Setting) => void} setupComponent Callback to configure the setting's component
   * @returns Setting
   */
  private withSetting(
    containerEl: HTMLElement | SettingGroup,
    name: string,
    desc: string,
    setupComponent: (setting: Setting) => void,
  ): Setting {
    let setting: Setting;

    if (containerEl instanceof SettingGroup) {
      containerEl.addSetting((s) => {
        setting = s;
        s.setName(name).setDesc(desc);
        setupComponent(s);
      });
    } else {
      // Use createSetting so it can be mocked in tests
      setting = this.createSetting(containerEl, name, desc);
      setupComponent(setting);
    }

    return setting;
  }

  /**
   * Creates an onChange handler that either calls a custom callback or saves to config.
   * @param  {K | null} configStorageKey The SwitcherPlusSettings key where the value should be stored. Can be null if onChange is provided.
   * @param  {(value: T, config: SwitcherPlusSettings) => void} onChange? Optional custom callback
   * @returns {(value: T) => void} The onChange handler function
   */
  private createOnChangeHandler<T, K extends WritableKeys<SwitcherPlusSettings>>(
    configStorageKey: K | null,
    onChange?: (value: T, config: SwitcherPlusSettings) => void,
  ): (value: T) => void {
    return (value: T) => {
      if (onChange) {
        onChange(value, this.config);
      } else if (configStorageKey) {
        this.saveChangesToConfig(configStorageKey, value as SwitcherPlusSettings[K]);
      }
    };
  }
  /**
   * Create section title elements and divider.
   * @param  {HTMLElement} containerEl
   * @param  {string} title
   * @param  {string} desc?
   * @returns Setting
   */
  addSectionTitle(containerEl: HTMLElement, title: string, desc = ''): Setting {
    const setting = this.createSetting(containerEl, title, desc);
    setting.setHeading();

    return setting;
  }

  /**
   * Creates a HTMLInput element setting.
   * Supports both HTMLElement and SettingGroup containers.
   * @param  {HTMLElement | SettingGroup} containerEl The element to attach the setting to.
   * @param  {string} name
   * @param  {string} desc
   * @param  {string} initialValue
   * @param  {StringTypedConfigKey} configStorageKey The SwitcherPlusSettings key where the value for this setting should be stored.
   * @param  {string} placeholderText?
   * @returns Setting
   */
  addTextSetting(
    containerEl: HTMLElement | SettingGroup,
    name: string,
    desc: string,
    initialValue: string,
    configStorageKey: StringTypedConfigKey,
    placeholderText?: string,
  ): Setting {
    return this.withSetting(containerEl, name, desc, (setting) => {
      setting.addText((comp) => {
        comp.setPlaceholder(placeholderText);
        comp.setValue(initialValue);

        comp.onChange((rawValue) => {
          const value = rawValue.length ? rawValue : initialValue;
          this.saveChangesToConfig(configStorageKey, value);
        });
      });
    });
  }

  /**
   * Create a Checkbox element setting.
   * Supports both HTMLElement and SettingGroup containers.
   * @param  {HTMLElement | SettingGroup} containerEl The element to attach the setting to.
   * @param  {string} name
   * @param  {string} desc
   * @param  {boolean} initialValue
   * @param  {BooleanTypedConfigKey} configStorageKey The SwitcherPlusSettings key where the value for this setting should be stored. This can safely be set to null if the onChange handler is provided.
   * @param  {(value:string,config:SwitcherPlusSettings)=>void} onChange? optional callback to invoke instead of using configStorageKey
   * @returns Setting
   */
  addToggleSetting(
    containerEl: HTMLElement | SettingGroup,
    name: string,
    desc: string,
    initialValue: boolean,
    configStorageKey: BooleanTypedConfigKey,
    onChange?: (value: boolean, config: SwitcherPlusSettings) => void,
  ): Setting {
    return this.withSetting(containerEl, name, desc, (setting) => {
      setting.addToggle((comp) => {
        comp.setValue(initialValue);
        comp.onChange(this.createOnChangeHandler(configStorageKey, onChange));
      });
    });
  }

  /**
   * Create a TextArea element setting.
   * Supports both HTMLElement and SettingGroup containers.
   * @param  {HTMLElement | SettingGroup} containerEl The element to attach the setting to.
   * @param  {string} name
   * @param  {string} desc
   * @param  {string} initialValue
   * @param  {ListTypedConfigKey|StringTypedConfigKey} configStorageKey The SwitcherPlusSettings key where the value for this setting should be stored.
   * @param  {string} placeholderText?
   * @returns Setting
   */
  addTextAreaSetting(
    containerEl: HTMLElement | SettingGroup,
    name: string,
    desc: string,
    initialValue: string,
    configStorageKey: ListTypedConfigKey | StringTypedConfigKey,
    placeholderText?: string,
  ): Setting {
    return this.withSetting(containerEl, name, desc, (setting) => {
      setting.addTextArea((comp) => {
        comp.setPlaceholder(placeholderText);
        comp.setValue(initialValue);

        comp.onChange((rawValue) => {
          const value = rawValue.length ? rawValue : initialValue;
          const isArray = Array.isArray(this.config[configStorageKey]);
          this.saveChangesToConfig(configStorageKey, isArray ? value.split('\n') : value);
        });
      });
    });
  }

  /**
   * Add a dropdown list setting
   * Supports both HTMLElement and SettingGroup containers.
   * @param  {HTMLElement | SettingGroup} containerEl
   * @param  {string} name
   * @param  {string} desc
   * @param  {string} initialValue option value that is initially selected
   * @param  {Record<string, string>} options
   * @param  {StringTypedConfigKey} configStorageKey The SwitcherPlusSettings key where the value for this setting should be stored. This can safely be set to null if the onChange handler is provided.
   * @param  {(rawValue:string,config:SwitcherPlusSettings)=>void} onChange? optional callback to invoke instead of using configStorageKey
   * @returns Setting
   */
  addDropdownSetting(
    containerEl: HTMLElement | SettingGroup,
    name: string,
    desc: string,
    initialValue: string,
    options: Record<string, string>,
    configStorageKey: StringTypedConfigKey,
    onChange?: (rawValue: string, config: SwitcherPlusSettings) => void,
  ): Setting {
    return this.withSetting(containerEl, name, desc, (setting) => {
      setting.addDropdown((comp) => {
        comp.addOptions(options);
        comp.setValue(initialValue);
        comp.onChange(this.createOnChangeHandler(configStorageKey, onChange));
      });
    });
  }

  /**
   * Add a slider setting with reset button.
   * Supports both HTMLElement and SettingGroup containers.
   * @param  {HTMLElement | SettingGroup} containerEl
   * @param  {string} name
   * @param  {string} desc
   * @param  {number} initialValue
   * @param  {[min: number, max: number, step: number, initial: number]} limits
   * @param  {NumberTypedConfigKey} configStorageKey The SwitcherPlusSettings key where the value for this setting should be stored. This can safely be set to null if the onChange handler is provided.
   * @param  {(value:number,config:SwitcherPlusSettings)=>void} onChange? optional callback to invoke instead of using configStorageKey
   * @returns Setting
   */
  addSliderSetting(
    containerEl: HTMLElement | SettingGroup,
    name: string,
    desc: string,
    initialValue: number,
    limits: [min: number, max: number, step: number, initial: number],
    configStorageKey: NumberTypedConfigKey,
    onChange?: (value: number, config: SwitcherPlusSettings) => void,
  ): Setting {
    return this.withSetting(containerEl, name, desc, (setting) => {
      // display a button to reset the slider value
      setting.addExtraButton((comp) => {
        comp.setIcon('lucide-rotate-ccw');
        comp.setTooltip('Restore default');
        comp.onClick(() =>
          (setting.components[1] as SliderComponent).setValue(limits[3]),
        );
        return comp;
      });

      setting.addSlider((comp) => {
        comp.setLimits(limits[0], limits[1], limits[2]);
        comp.setValue(initialValue);
        comp.setDynamicTooltip();
        comp.onChange(this.createOnChangeHandler(configStorageKey, onChange));
      });
    });
  }

  /**
   * Updates the internal SwitcherPlusSettings configStorageKey with value, and writes it to disk.
   * @param  {K} configStorageKey The SwitcherPlusSettings key where the value for this setting should be stored.
   * @param  {SwitcherPlusSettings[K]} value
   * @returns void
   */
  saveChangesToConfig<K extends WritableKeys<SwitcherPlusSettings>>(
    configStorageKey: K,
    value: SwitcherPlusSettings[K],
  ): void {
    if (configStorageKey) {
      const { config } = this;
      config[configStorageKey] = value;
      config.save();
    }
  }
}
