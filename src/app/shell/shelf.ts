import { WritableSignal, signal, untracked } from '@angular/core';

export type Shape<T> = (value: unknown) => T | undefined;

interface Shelved<T> {
  read(): T | undefined;
  remember(value: T): void;
  forget(): void;
}

interface Declaration<T> {
  readonly key: string;
  readonly shape: Shape<T>;
  readonly called: string;
}

export function shelved<T>({ key, shape, called }: Declaration<T>): Shelved<T> {
  return {
    read: () => {
      let stored: string | null;

      try {
        stored = localStorage.getItem(key);
      } catch {
        return undefined;
      }

      return stored === null ? undefined : shape(heldIn(stored));
    },

    remember: (value: T) => {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (error) {
        console.warn(`rosa could not remember ${called}.`, error);
      }
    },

    forget: () => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.warn(`rosa could not forget ${called}.`, error);
      }
    },
  };
}

interface Persisting<T> extends Declaration<T> {
  readonly acrossTabs?: boolean;
}

interface Kept<T> extends Persisting<T> {
  readonly fallback: T;
}

export function persisted<T>(declaration: Kept<T>): WritableSignal<T>;
export function persisted<T>(declaration: Persisting<T>): WritableSignal<T | undefined>;
export function persisted<T>(
  declaration: Persisting<T> & { readonly fallback?: T },
): WritableSignal<T | undefined> {
  const shelf = shelved(declaration);
  const { key, fallback, acrossTabs = false } = declaration;
  const held = signal(shelf.read() ?? fallback);
  const hold = held.set.bind(held);

  if (acrossTabs) {
    window.addEventListener('storage', (event) => {
      if (event.key === key || event.key === null) hold(shelf.read() ?? fallback);
    });
  }

  const set = (next: T | undefined): void => {
    hold(next);
    if (next === fallback || next === undefined) shelf.forget();
    else shelf.remember(next);
  };

  return Object.assign(held, {
    set,
    update: (change: (value: T | undefined) => T | undefined) => set(change(untracked(held))),
  });
}

export const numberIn: Shape<number> = (value) =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

export const textIn: Shape<string> = (value) =>
  typeof value === 'string' && value !== '' ? value : undefined;

export const presence: Shape<true> = () => true;

function heldIn(stored: string): unknown {
  try {
    return JSON.parse(stored);
  } catch {
    return stored;
  }
}
