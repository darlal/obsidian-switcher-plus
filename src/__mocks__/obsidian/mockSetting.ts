/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { mock } from 'jest-mock-extended';
import {
  App,
  DropdownComponent,
  ExtraButtonComponent,
  PluginSettingTab,
  SliderComponent,
  TextAreaComponent,
  TextComponent,
  ToggleComponent,
} from 'obsidian';

export class MockPluginSettingTab implements PluginSettingTab {
  app: App;
  containerEl: HTMLElement;

  constructor(app: App) {
    this.containerEl = mock<HTMLElement>();
    this.app = app;
  }

  hide() {
    throw new Error('Method not implemented.');
  }
  display() {
    throw new Error('Method not implemented.');
  }
}

export class MockSetting {
  private containerEl;

  constructor(containerEl: HTMLElement) {
    this.containerEl = containerEl;
  }

  setName(name: string): this {
    return this;
  }

  setDesc(desc: string): this {
    return this;
  }

  setHeading(): this {
    return this;
  }

  setClass(name: string): this {
    return this;
  }

  addText(cb: (component: TextComponent) => any): this {
    cb(new MockTextComponent(this.containerEl));
    return this;
  }

  addToggle(cb: (component: ToggleComponent) => any): this {
    cb(new MockToggleComponent(this.containerEl));
    return this;
  }

  addTextArea(cb: (component: TextAreaComponent) => any): this {
    cb(new MockTextAreaComponent(this.containerEl));
    return this;
  }

  addDropdown(cb: (component: DropdownComponent) => any): this {
    cb(new MockDropdownComponent(this.containerEl));
    return this;
  }

  addExtraButton(cb: (component: ExtraButtonComponent) => any): this {
    cb(new MockExtraButtonComponent(this.containerEl));
    return this;
  }

  addSlider(cb: (component: SliderComponent) => any): this {
    cb(new MockSliderComponent(this.containerEl));
    return this;
  }
}

export class MockTextComponent implements TextComponent {
  inputEl: HTMLInputElement;
  disabled: boolean;
  onChangeCB: (value: string) => any;

  constructor(public containerEl: HTMLElement) {
    this.inputEl = mock<HTMLInputElement>();
  }

  getValue(): string {
    return this.inputEl.value;
  }

  setValue(value: string): this {
    this.inputEl.value = value;

    if (this.onChangeCB) {
      this.onChangeCB(value);
    }

    return this;
  }

  setPlaceholder(placeholder: string): this {
    return this;
  }

  onChange(callback: (value: string) => any): this {
    this.onChangeCB = callback;
    return this;
  }

  setDisabled(disabled: boolean): this {
    throw new Error('Method not implemented.');
  }
  onChanged(): void {
    throw new Error('Method not implemented.');
  }
  registerOptionListener(
    listeners: Record<string, (value?: string) => string>,
    key: string,
  ): this {
    throw new Error('Method not implemented.');
  }
  then(cb: (component: this) => any): this {
    throw new Error('Method not implemented.');
  }
}

export class MockToggleComponent implements ToggleComponent {
  toggleEl: HTMLElement;
  value: boolean;
  onChangeCB: (value: boolean) => any;

  constructor(public containerEl: HTMLElement) {
    this.toggleEl = mock<HTMLElement>();
  }

  getValue(): boolean {
    return this.value;
  }

  setValue(on: boolean): this {
    this.value = on;

    if (this.onChangeCB) {
      this.onChangeCB(on);
    }

    return this;
  }

  onChange(callback: (value: boolean) => any): this {
    this.onChangeCB = callback;
    return this;
  }

  setDisabled(disabled: boolean): this {
    throw new Error('Method not implemented.');
  }
  setTooltip(tooltip: string): this {
    throw new Error('Method not implemented.');
  }
  onClick(): void {
    throw new Error('Method not implemented.');
  }
  registerOptionListener(
    listeners: Record<string, (value?: boolean) => boolean>,
    key: string,
  ): this {
    throw new Error('Method not implemented.');
  }
  disabled: boolean;
  then(cb: (component: this) => any): this {
    throw new Error('Method not implemented.');
  }
}

export class MockTextAreaComponent implements TextAreaComponent {
  inputEl: HTMLTextAreaElement;
  onChangeCB: (value: string) => any;

  constructor(public containerEl: HTMLElement) {
    this.inputEl = mock<HTMLTextAreaElement>();
  }

  getValue(): string {
    return this.inputEl.value;
  }

  setValue(value: string): this {
    this.inputEl.value = value;

    if (this.onChangeCB) {
      this.onChangeCB(value);
    }

    return this;
  }

  setPlaceholder(placeholder: string): this {
    return this;
  }

  onChange(callback: (value: string) => any): this {
    this.onChangeCB = callback;
    return this;
  }

  setDisabled(disabled: boolean): this {
    throw new Error('Method not implemented.');
  }
  onChanged(): void {
    throw new Error('Method not implemented.');
  }
  registerOptionListener(
    listeners: Record<string, (value?: string) => string>,
    key: string,
  ): this {
    throw new Error('Method not implemented.');
  }
  disabled: boolean;
  then(cb: (component: this) => any): this {
    throw new Error('Method not implemented.');
  }
}

export class MockDropdownComponent implements DropdownComponent {
  selectEl: HTMLSelectElement;
  onChangeCB: (value: string) => any;
  options: Record<string, string>;

  constructor(public containerEl: HTMLElement) {
    this.selectEl = mock<HTMLSelectElement>();
  }

  getValue(): string {
    return this.selectEl.value;
  }

  setValue(value: string): this {
    this.selectEl.value = value;

    if (this.onChangeCB) {
      this.onChangeCB(value);
    }

    return this;
  }

  addOptions(options: Record<string, string>): this {
    this.options = options;
    return this;
  }

  onChange(callback: (value: string) => any): this {
    this.onChangeCB = callback;
    return this;
  }

  setDisabled(disabled: boolean): this {
    throw new Error('Method not implemented.');
  }
  addOption(value: string, display: string): this {
    throw new Error('Method not implemented.');
  }
  registerOptionListener(
    listeners: Record<string, (value?: string) => string>,
    key: string,
  ): this {
    throw new Error('Method not implemented.');
  }
  disabled: boolean;
  then(cb: (component: this) => any): this {
    throw new Error('Method not implemented.');
  }
}

export class MockExtraButtonComponent implements ExtraButtonComponent {
  extraSettingsEl: HTMLElement;

  constructor(public containerEl: HTMLElement) {
    this.extraSettingsEl = mock<HTMLElement>();
  }

  setDisabled(disabled: boolean): this {
    throw new Error('Method not implemented.');
  }
  setTooltip(tooltip: string): this {
    throw new Error('Method not implemented.');
  }
  setIcon(icon: string): this {
    throw new Error('Method not implemented.');
  }
  onClick(callback: () => any): this {
    throw new Error('Method not implemented.');
  }
  disabled: boolean;
  then(cb: (component: this) => any): this {
    throw new Error('Method not implemented.');
  }
}

export class MockSliderComponent implements SliderComponent {
  sliderEl: HTMLInputElement;
  onChangeCB: (value: number) => any;

  constructor(public containerEl: HTMLElement) {
    this.sliderEl = mock<HTMLInputElement>();
  }

  getValue(): number {
    return Number(this.sliderEl.value);
  }

  setValue(value: number): this {
    this.sliderEl.value = value.toString();

    if (this.onChangeCB) {
      this.onChangeCB(value);
    }

    return this;
  }

  onChange(callback: (value: number) => any): this {
    this.onChangeCB = callback;
    return this;
  }

  setDisabled(disabled: boolean): this {
    throw new Error('Method not implemented.');
  }
  setLimits(min: number, max: number, step: number | 'any'): this {
    throw new Error('Method not implemented.');
  }
  getValuePretty(): string {
    throw new Error('Method not implemented.');
  }
  setDynamicTooltip(): this {
    throw new Error('Method not implemented.');
  }
  showTooltip(): void {
    throw new Error('Method not implemented.');
  }
  registerOptionListener(
    listeners: Record<string, (value?: number) => number>,
    key: string,
  ): this {
    throw new Error('Method not implemented.');
  }
  disabled: boolean;
  then(cb: (component: this) => any): this {
    throw new Error('Method not implemented.');
  }
}
