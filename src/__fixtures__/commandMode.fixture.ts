import { Command } from 'obsidian';
import { Chance } from 'chance';

const chance = new Chance();

export function makeCommandItem(options?: { id?: string; name?: string }): Command {
  return {
    id: options?.id ?? chance.word(),
    name: options?.name ?? chance.word(),
  };
}
