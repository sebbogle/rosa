import { isOpen, matches, searchTerms } from '../../contents/contents-rules';
import { ancestorsOf, contentsRows, folderKey, folderTree } from '../../contents/contents-tree';
import { Placement } from '../../recipe/folders';

export interface FolderPick {
  readonly kind: 'folder';
  readonly key: string;
  readonly segments: Placement;
  readonly name: string;
  readonly depth: number;
  readonly branches: boolean;
  readonly expanded: boolean;
  readonly chosen: boolean;
}

export interface NoFolderPick {
  readonly kind: 'none';
  readonly key: string;
  readonly chosen: boolean;
}

export interface AdderPick {
  readonly kind: 'adder';
  readonly key: string;
  readonly at: Placement;
  readonly depth: number;
}

export type FolderPickRow = FolderPick | NoFolderPick | AdderPick;

export interface FolderView {
  readonly chosen: Placement;
  readonly expanded: ReadonlySet<string>;
  readonly typed: string;
  readonly addingAt: Placement | undefined;
}

export function folderRows(
  folders: readonly Placement[],
  { chosen, expanded, typed, addingAt }: FolderView,
): readonly FolderPickRow[] {
  const terms = searchTerms(typed);
  const searching = terms.length > 0;

  const every = everyLevelOf(folders);
  const hits = searching
    ? every.filter((folder) => matches(folder[folder.length - 1].toLowerCase(), terms))
    : every;
  const matchedIn = new Set(hits.flatMap((hit) => ancestorsOf(hit.slice(0, -1))));
  const open = { expanded, searching, matchedIn };

  const chosenKey = folderKey(chosen);
  const addingKey = addingAt === undefined ? undefined : folderKey(addingAt);
  const rows: FolderPickRow[] = [];

  if (!searching) rows.push({ kind: 'none', key: 'none', chosen: chosen.length === 0 });
  if (addingAt?.length === 0) rows.push(adderAt([], 0));

  for (const row of contentsRows(folderTree(hits), (key) => isOpen(key, open))) {
    if (row.kind !== 'folder') continue;

    const depth = row.guides.length;
    rows.push({
      kind: 'folder',
      key: row.key,
      segments: row.segments,
      name: row.name,
      depth,
      branches: row.branches,
      expanded: row.expanded,
      chosen: row.key === chosenKey,
    });

    if (row.key === addingKey) rows.push(adderAt(row.segments, depth + 1));
  }

  return rows;
}

function adderAt(at: Placement, depth: number): AdderPick {
  return { kind: 'adder', key: `adder:${folderKey(at)}`, at, depth };
}

function everyLevelOf(folders: readonly Placement[]): readonly Placement[] {
  const levels = new Map<string, Placement>();
  for (const folder of folders) {
    for (let at = 1; at <= folder.length; at++) {
      const level = folder.slice(0, at);
      levels.set(folderKey(level), level);
    }
  }
  return [...levels.values()];
}
