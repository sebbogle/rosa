import { Signal } from '@angular/core';
import { Restored } from './measure';
import { Shape, persisted } from './shelf';

export type Appearance = 'default' | 'e-ink';

const OPENS_ON: Appearance = 'default';

const ATTRIBUTE = 'data-appearance';

const appearanceIn: Shape<Appearance> = (value) =>
  value === 'default' || value === 'e-ink' ? value : undefined;

const worn = persisted<Appearance>({
  key: 'rosa.appearance',
  shape: appearanceIn,
  called: 'which appearance you chose',
  fallback: OPENS_ON,
});

function wear(next: Appearance): void {
  document.documentElement.setAttribute(ATTRIBUTE, next);
}

export interface Chosen extends Restored {
  readonly chosen: Signal<Appearance>;
  choose(appearance: Appearance): void;
}

export const appearance: Chosen = {
  chosen: worn.asReadonly(),

  choose: (next) => {
    worn.set(next);
    wear(next);
  },

  restore: () => wear(worn()),
};
