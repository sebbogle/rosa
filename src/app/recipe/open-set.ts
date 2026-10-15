import { ShelvedTab, TabShelf } from './tab-shelf';

export type Edge = 'left' | 'right';

export interface Side {
  readonly key: number;
  readonly kept: readonly string[];
  readonly preview: string | undefined;
  readonly active: string | undefined;
  readonly missing: boolean;
}

export interface OpenSet {
  readonly sides: readonly Side[];
  readonly focused: number;
  readonly sizings: ReadonlyMap<string, string>;
}

export type Keys = () => number;

export interface Restoration {
  readonly open: OpenSet;
  readonly refocused: boolean;
}

export interface Pruning {
  readonly open: OpenSet;
  readonly lostFocused: boolean;
}

export interface Named {
  readonly id: string;
  readonly known: boolean;
}

export function idsOf(side: Side): readonly string[] {
  return side.preview === undefined ? side.kept : [...side.kept, side.preview];
}

export function whichSide(set: OpenSet, id: string): number {
  return set.sides.findIndex((side) => idsOf(side).includes(id));
}

export function openedIdOf(set: OpenSet): string | undefined {
  return set.sides[set.focused]?.active;
}

export function splittable(set: OpenSet): boolean {
  return set.sides.length === 1 && idsOf(set.sides[0]).length > 1;
}

export function showTheSame(a: OpenSet, b: OpenSet): boolean {
  return (
    a.sides.length === b.sides.length &&
    a.sides.every((side, at) => side.key === b.sides[at].key && side.active === b.sides[at].active)
  );
}

export function shelfOf(set: OpenSet): TabShelf {
  return {
    sides: set.sides.map((side, at) => {
      const kept = side.kept.map((id) => shelvedTab(id, set.sizings.get(id)));
      const active = at === set.focused ? undefined : keptActive(side);
      return active === undefined ? { kept } : { kept, active };
    }),
    focused: set.focused,
  };
}

function shelvedTab(id: string, sizing: string | undefined): ShelvedTab {
  return sizing === undefined ? { id } : { id, sizing };
}

function same(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((id, at) => id === b[at]);
}

function keptActive(side: {
  readonly kept: readonly string[];
  readonly active?: string;
}): string | undefined {
  return side.active !== undefined && side.kept.includes(side.active) ? side.active : undefined;
}

function newSide(key: number, kept: readonly string[]): Side {
  return { key, kept, preview: undefined, active: undefined, missing: false };
}

function without(side: Side, id: string): Side {
  const ids = idsOf(side);
  const at = ids.indexOf(id);
  const leaving = side.active === id;

  return {
    ...side,
    kept: side.kept.filter((other) => other !== id),
    preview: side.preview === id ? undefined : side.preview,
    active: leaving ? (ids[at + 1] ?? ids[at - 1]) : side.active,
    missing: leaving ? false : side.missing,
  };
}

function change(set: OpenSet, at: number, edit: (side: Side) => Side): OpenSet {
  const side = set.sides[at];
  if (!side) return set;

  const next = edit(side);
  if (next === side) return set;

  return { ...set, sides: set.sides.map((other, index) => (index === at ? next : other)) };
}

export function settled(set: OpenSet): OpenSet {
  if (set.sizings.size === 0) return set;

  const open = new Set(set.sides.flatMap(idsOf));
  const kept = [...set.sizings].filter(([id]) => open.has(id));

  return kept.length === set.sizings.size ? set : { ...set, sizings: new Map(kept) };
}

function focusing(set: OpenSet, at: number): OpenSet {
  return at === set.focused ? set : { ...set, focused: at };
}

export function focusedOn(set: OpenSet, at: number): OpenSet {
  return at >= 0 && at < set.sides.length ? focusing(set, at) : set;
}

export function opened(set: OpenSet, id: string): OpenSet {
  const holder = whichSide(set, id);
  if (holder !== -1) return shown(set, holder, id);

  return change(set, set.focused, (side) => ({ ...side, preview: id, active: id, missing: false }));
}

export function chosen(set: OpenSet, id: string, sizing: string): OpenSet {
  if (whichSide(set, id) === -1 || set.sizings.get(id) === sizing) return set;

  return { ...set, sizings: new Map(set.sizings).set(id, sizing) };
}

export function keptOpen(set: OpenSet, id: string): OpenSet {
  const holder = whichSide(set, id);
  const at = holder === -1 ? set.focused : holder;

  const next = change(set, at, (side) => ({
    ...side,
    kept: side.kept.includes(id) ? side.kept : [...side.kept, id],
    preview: side.preview === id ? undefined : side.preview,
    active: id,
    missing: false,
  }));

  return focusing(next, at);
}

export function shown(set: OpenSet, at: number, id: string): OpenSet {
  const side = set.sides[at];
  if (!side || !idsOf(side).includes(id)) return set;

  return focusing(
    change(set, at, (current) => ({ ...current, active: id, missing: false })),
    at,
  );
}

export function moved(
  set: OpenSet,
  at: number,
  id: string,
  to = Number.POSITIVE_INFINITY,
): OpenSet {
  const from = whichSide(set, id);
  if (from === -1 || !set.sides[at]) return set;

  const sides = set.sides.map((side, index) => {
    if (index !== at) return index === from ? without(side, id) : side;

    const others = side.kept.filter((other) => other !== id);
    return {
      ...side,
      kept: [...others.slice(0, to), id, ...others.slice(to)],
      preview: side.preview === id ? undefined : side.preview,
      active: id,
      missing: false,
    };
  });

  const emptied = from !== at && idsOf(sides[from]).length === 0;

  return {
    ...set,
    sides: emptied ? sides.filter((_, index) => index !== from) : sides,
    focused: emptied && from < at ? at - 1 : at,
  };
}

export function sideMade(set: OpenSet, id: string, edge: Edge, keys: Keys): OpenSet {
  if (!splittable(set)) return set;

  const [side] = set.sides;
  if (!idsOf(side).includes(id)) return set;

  const rest = without(side, id);
  const made = { ...newSide(keys(), [id]), active: id };

  return {
    ...set,
    sides: edge === 'left' ? [made, rest] : [rest, made],
    focused: edge === 'left' ? 0 : 1,
  };
}

export function closed(set: OpenSet, id: string): OpenSet {
  const at = whichSide(set, id);
  if (at === -1) return set;

  const rest = without(set.sides[at], id);

  if (set.sides.length === 2 && idsOf(rest).length === 0) {
    return { ...set, sides: set.sides.filter((_, other) => other !== at), focused: 0 };
  }

  return change(set, at, () => rest);
}

export function stepped(set: OpenSet, by: number): OpenSet {
  const at = set.focused;
  const side = set.sides[at];
  const ids = side ? idsOf(side) : [];
  if (ids.length === 0) return set;

  const from = side.active === undefined ? -1 : ids.indexOf(side.active);
  const start = from === -1 ? (by > 0 ? -1 : ids.length) : from;

  return shown(set, at, ids[Math.min(Math.max(start + by, 0), ids.length - 1)]);
}

export function activatedAt(set: OpenSet, index: number): OpenSet {
  const side = set.sides[set.focused];
  const id = side ? idsOf(side)[index] : undefined;

  return id === undefined ? set : shown(set, set.focused, id);
}

export function restored(shelf: TabShelf, keys: Keys): Restoration {
  const seen = new Set<string>();
  const sizings = new Map<string, string>();
  const unseen = ({ id, sizing }: ShelvedTab): boolean => {
    if (seen.has(id)) return false;
    seen.add(id);
    if (sizing !== undefined) sizings.set(id, sizing);
    return true;
  };
  const shelved = shelf.sides.map((side) => ({
    ...side,
    kept: side.kept.filter(unseen).map(({ id }) => id),
  }));

  const returning = shelved.filter((side) => side.kept.length > 0);
  const focusedBack = returning.findIndex((side) => side === shelved[shelf.focused]);

  const sides = returning.map((side, at) => ({
    ...newSide(keys(), side.kept),
    active: at === focusedBack ? undefined : (keptActive(side) ?? side.kept[0]),
  }));

  return {
    open: {
      sides: sides.length > 0 ? sides : [newSide(keys(), [])],
      focused: Math.max(focusedBack, 0),
      sizings,
    },
    refocused: focusedBack === -1,
  };
}

export function pruned(set: OpenSet, known: ReadonlySet<string> | undefined): Pruning {
  if (known === undefined) return { open: set, lostFocused: false };

  let lostFocused = false;

  const sides = set.sides.map((side, at) => {
    const kept = side.kept.filter((id) => known.has(id));
    const preview =
      side.preview !== undefined && known.has(side.preview) ? side.preview : undefined;
    const lost = side.active !== undefined && !known.has(side.active);
    if (!lost && preview === side.preview && same(kept, side.kept)) return side;

    const emptied = set.sides.length === 2 && kept.length === 0 && preview === undefined;

    if (lost && at === set.focused) lostFocused = true;
    return {
      ...side,
      kept,
      preview,
      active: lost ? undefined : side.active,
      missing: lost || emptied || side.missing,
    };
  });

  return {
    open: sides.some((side, at) => side !== set.sides[at]) ? { ...set, sides } : set,
    lostFocused,
  };
}

function lost(set: OpenSet): OpenSet {
  return change(set, set.focused, (side) => ({ ...side, active: undefined, missing: true }));
}

export function followed(set: OpenSet, named: Named | undefined): OpenSet {
  if (named === undefined) {
    return change(set, set.focused, (side) => ({
      ...side,
      active: undefined,
      missing: side.missing && idsOf(side).length === 0,
    }));
  }

  return named.known ? opened(set, named.id) : lost(set);
}

export function arrived(set: OpenSet, named: Named | undefined, refocused: boolean): OpenSet {
  if (refocused && named === undefined) return set;

  const next = followed(set, named);
  if (next.focused === set.focused) return next;

  return change(next, set.focused, (side) => ({ ...side, active: idsOf(side)[0] }));
}
