import { Drag, Resize } from '../shell/grip/grip';
import { remembered } from '../shell/measure';
import { Shape, numberIn } from '../shell/shelf';

export const MIN_SIDEBAR_WIDTH = 200;

export const MAX_SIDEBAR_WIDTH = 420;

export const DEFAULT_SIDEBAR_WIDTH = 264;

export function clampSidebarWidth(width: number): number {
  if (!Number.isFinite(width)) return DEFAULT_SIDEBAR_WIDTH;
  return Math.round(Math.min(Math.max(width, MIN_SIDEBAR_WIDTH), MAX_SIDEBAR_WIDTH));
}

const sidebarWidthIn: Shape<number> = (value) => {
  const width = numberIn(value);
  return width === undefined ? undefined : clampSidebarWidth(width);
};

export const sidebarWidth = remembered({
  key: 'rosa.sidebar-width',
  called: 'how wide the Contents is',
  property: '--sidebar-preferred',
  drawn: (width) => `${width}px`,
  fallback: DEFAULT_SIDEBAR_WIDTH,
  shape: sidebarWidthIn,
});

export const contentsEdge: Resize = {
  start(within: DOMRect): Drag {
    const from = within.width;
    return (travel) => sidebarWidth.set(clampSidebarWidth(from + travel));
  },

  remember: () => sidebarWidth.remember(),

  reset: () => sidebarWidth.reset(),
};
