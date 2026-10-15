import { Shape, shelved, textIn } from '../shell/shelf';

export interface ShelvedTab {
  readonly id: string;
  readonly sizing?: string;
}

export interface ShelvedSide {
  readonly kept: readonly ShelvedTab[];
  readonly active?: string;
}

export interface TabShelf {
  readonly sides: readonly ShelvedSide[];
  readonly focused: number;
}

function tabIn(value: unknown): ShelvedTab | undefined {
  if (typeof value === 'string') return { id: value };
  if (typeof value !== 'object' || value === null) return undefined;

  const { id, sizing } = value as { id?: unknown; sizing?: unknown };
  if (typeof id !== 'string') return undefined;

  const held = textIn(sizing);
  return held === undefined ? { id } : { id, sizing: held };
}

function tabsIn(value: unknown): readonly ShelvedTab[] {
  return Array.isArray(value)
    ? value.map(tabIn).filter((tab): tab is ShelvedTab => tab !== undefined)
    : [];
}

function sideIn(value: unknown): ShelvedSide {
  const { kept, active } = (typeof value === 'object' && value !== null ? value : {}) as {
    kept?: unknown;
    active?: unknown;
  };

  return typeof active === 'string' ? { kept: tabsIn(kept), active } : { kept: tabsIn(kept) };
}

const tabShelfIn: Shape<TabShelf> = (value) => {
  if (typeof value !== 'object' || value === null) return undefined;

  const { sides, focused } = value as { sides?: unknown; focused?: unknown };
  if (!Array.isArray(sides)) return undefined;

  return {
    sides: sides.slice(0, 2).map(sideIn),
    focused: typeof focused === 'number' ? focused : 0,
  };
};

const sides = shelved<TabShelf>({
  key: 'rosa.sides',
  shape: tabShelfIn,
  called: 'which tabs are open',
});

export function readTabShelf(): TabShelf {
  return sides.read() ?? { sides: [{ kept: [] }], focused: 0 };
}

export function rememberTabShelf(shelf: TabShelf): void {
  sides.remember(shelf);
}

export function sameTabShelf(a: TabShelf, b: TabShelf): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
