/* eslint-disable @typescript-eslint/no-explicit-any */
import { mock } from 'jest-mock-extended';
import { TextComponent } from 'obsidian';

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

  addText(cb: (component: TextComponent) => any): this {
    cb(new MockTextComponent(this.containerEl));
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
