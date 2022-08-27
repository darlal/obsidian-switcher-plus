/* eslint-disable @typescript-eslint/no-explicit-any */
import { mock } from 'jest-mock-extended';
import {
  App,
  DropdownComponent,
  PluginSettingTab,
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

  setName(_: string): this {
    return this;
  }

  setDesc(_: string): this {
    return this;
  }

  setHeading(): this {
    return this;
  }

  setClass(_: string): this {
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

  setPlaceholder(_placeholder: string): this {
    return this;
  }

  onChange(callback: (value: string) => any): this {
    this.onChangeCB = callback;
    return this;
  }

  setDisabled(_disabled: boolean): this {
    throw new Error('Method not implemented.');
  }
  onChanged(): void {
    throw new Error('Method not implemented.');
  }
  registerOptionListener(
    _listeners: Record<string, (value?: string) => string>,
    _key: string,
  ): this {
    throw new Error('Method not implemented.');
  }
  then(_cb: (component: this) => any): this {
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

  setDisabled(_disabled: boolean): this {
    throw new Error('Method not implemented.');
  }
  setTooltip(_tooltip: string): this {
    throw new Error('Method not implemented.');
  }
  onClick(): void {
    throw new Error('Method not implemented.');
  }
  registerOptionListener(
    _listeners: Record<string, (value?: boolean) => boolean>,
    _key: string,
  ): this {
    throw new Error('Method not implemented.');
  }
  disabled: boolean;
  then(_cb: (component: this) => any): this {
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

  setPlaceholder(_placeholder: string): this {
    return this;
  }

  onChange(callback: (value: string) => any): this {
    this.onChangeCB = callback;
    return this;
  }

  setDisabled(_disabled: boolean): this {
    throw new Error('Method not implemented.');
  }
  onChanged(): void {
    throw new Error('Method not implemented.');
  }
  registerOptionListener(
    _listeners: Record<string, (value?: string) => string>,
    _key: string,
  ): this {
    throw new Error('Method not implemented.');
  }
  disabled: boolean;
  then(_cb: (component: this) => any): this {
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

  setDisabled(_disabled: boolean): this {
    throw new Error('Method not implemented.');
  }
  addOption(_value: string, _display: string): this {
    throw new Error('Method not implemented.');
  }
  registerOptionListener(
    _listeners: Record<string, (value?: string) => string>,
    _key: string,
  ): this {
    throw new Error('Method not implemented.');
  }
  disabled: boolean;
  then(_cb: (component: this) => any): this {
    throw new Error('Method not implemented.');
  }
}
