import { Drag, Resize } from '../grip/grip';
import { remembered } from '../measure';
import { Shape, numberIn } from '../shelf';

export const MIN_SIDE_WIDTH = 360;

export const DEFAULT_DIVIDER_FRACTION = 0.5;

export function clampDividerFraction(fraction: number, width: number): number {
  if (!Number.isFinite(fraction) || !(width >= 2 * MIN_SIDE_WIDTH)) {
    return DEFAULT_DIVIDER_FRACTION;
  }

  const floor = MIN_SIDE_WIDTH / width;
  return Math.min(Math.max(fraction, floor), 1 - floor);
}

const dividerFractionIn: Shape<number> = (value) => {
  const fraction = numberIn(value);
  return fraction !== undefined && fraction > 0 && fraction < 1 ? fraction : undefined;
};

export const dividerFraction = remembered({
  key: 'rosa.divider',
  called: 'where the divider is',
  property: '--divider',
  drawn: String,
  fallback: DEFAULT_DIVIDER_FRACTION,
  shape: dividerFractionIn,
});

export const dividerEdge: Resize = {
  start(within: DOMRect, at: DOMRect): Drag | undefined {
    if (within.width < 2 * MIN_SIDE_WIDTH) return undefined;

    const from = at.left + at.width / 2 - within.left;
    const shared = within.width;
    return (travel) => dividerFraction.set(clampDividerFraction((from + travel) / shared, shared));
  },

  remember: () => dividerFraction.remember(),

  reset: () => dividerFraction.reset(),
};
