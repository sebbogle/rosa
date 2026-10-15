import { Shape, persisted } from './shelf';

export interface Restored {
  restore(): void;
}

export interface Remembered extends Restored {
  set(value: number): void;
  reset(): void;
  remember(): void;
}

interface Declaration {
  readonly key: string;
  readonly called: string;
  readonly property: string;
  readonly drawn: (value: number) => string;
  readonly fallback: number;
  readonly shape: Shape<number>;
}

export function remembered({
  key,
  called,
  property,
  drawn,
  fallback,
  shape,
}: Declaration): Remembered {
  const kept = persisted<number>({ key, shape, called, fallback });
  let shown = kept();

  const apply = (next: number): void => {
    shown = next;
    document.documentElement.style.setProperty(property, drawn(next));
  };

  const place = (next: number): void => {
    if (next !== shown) apply(next);
  };

  return {
    set: place,

    reset: () => {
      place(fallback);
      kept.set(fallback);
    },

    remember: () => {
      kept.set(shown);
    },

    restore: () => apply(kept()),
  };
}

export function restoreMeasures(...measures: readonly Restored[]): void {
  for (const measure of measures) measure.restore();
}
