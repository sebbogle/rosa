import { Recipe } from './recipe';

export type Placement = readonly string[];

export function folderNameOf(typed: string): string {
  const trimmed = typed.trim();
  return trimmed === '' ? '' : trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

export function childrenOf(recipes: readonly Recipe[], at: Placement): readonly string[] {
  const names = new Set<string>();

  for (const recipe of recipes) {
    if (recipe.folder.length <= at.length) continue;
    if (!at.every((segment, index) => recipe.folder[index] === segment)) continue;
    names.add(recipe.folder[at.length]);
  }

  return [...names].sort((a, b) => a.localeCompare(b));
}

export interface Resolution {
  readonly name: string;
  readonly existing: boolean;
}

export function resolveFolderName(
  children: readonly string[],
  typed: string,
): Resolution | undefined {
  const name = folderNameOf(typed);
  if (name === '') return undefined;

  const held = children.find((child) => child.toLowerCase() === name.toLowerCase());
  return held === undefined ? { name, existing: false } : { name: held, existing: true };
}

export function drawnPath(folder: Placement): string {
  return folder.join(' › ');
}

export function beneath(folder: Placement, at: Placement): boolean {
  return folder.length >= at.length && at.every((segment, index) => folder[index] === segment);
}

export function beneathAt(recipes: readonly Recipe[], at: Placement): readonly Recipe[] {
  return recipes.filter((recipe) => beneath(recipe.folder, at));
}

export function renamedUnder(folder: Placement, at: Placement, to: string): readonly string[] {
  if (!beneath(folder, at)) return [...folder];
  return [...folder.slice(0, at.length - 1), to, ...folder.slice(at.length)];
}

export function liftedFrom(folder: Placement, at: Placement): readonly string[] {
  if (!beneath(folder, at)) return [...folder];
  return [...folder.slice(0, at.length - 1), ...folder.slice(at.length)];
}

export interface Lift {
  readonly recipes: number;
  readonly folders: number;
  readonly to: Placement;
}

export function liftOf(recipes: readonly Recipe[], at: Placement): Lift {
  return {
    recipes: beneathAt(recipes, at).length,
    folders: childrenOf(recipes, at).length,
    to: at.slice(0, -1),
  };
}
