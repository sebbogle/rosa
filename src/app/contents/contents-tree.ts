import { Recipe } from '../recipe/recipe';

export function folderKey(segments: readonly string[]): string {
  return JSON.stringify(segments);
}

export function ancestorsOf(folder: readonly string[]): readonly string[] {
  return folder.map((_, at) => folderKey(folder.slice(0, at + 1)));
}

export interface FolderNode {
  readonly kind: 'folder';
  readonly segments: readonly string[];
  readonly name: string;
  readonly children: readonly ContentsNode[];
}

export interface RecipeNode {
  readonly kind: 'recipe';
  readonly recipe: Recipe;
}

export type ContentsNode = FolderNode | RecipeNode;

export interface FolderRow {
  readonly kind: 'folder';
  readonly key: string;
  readonly segments: readonly string[];
  readonly guides: readonly number[];
  readonly name: string;
  readonly expanded: boolean;
}

export interface RecipeRow {
  readonly kind: 'recipe';
  readonly key: string;
  readonly id: string;
  readonly guides: readonly number[];
  readonly title: string;
}

export type ContentsRow = FolderRow | RecipeRow;

interface Level {
  readonly folders: Map<string, Level>;
  readonly recipes: Recipe[];
}

function emptyLevel(): Level {
  return { folders: new Map<string, Level>(), recipes: [] };
}

export function contentsTree(recipes: readonly Recipe[]): readonly ContentsNode[] {
  const root = emptyLevel();

  for (const recipe of recipes) {
    let level = root;
    for (const name of recipe.folder) {
      let child = level.folders.get(name);
      if (child === undefined) {
        child = emptyLevel();
        level.folders.set(name, child);
      }
      level = child;
    }
    level.recipes.push(recipe);
  }

  return nodesOf(root, []);
}

function nodesOf(level: Level, above: readonly string[]): readonly ContentsNode[] {
  const folders = [...level.folders]
    .map(([name, child]): FolderNode => {
      const segments = [...above, name];
      return { kind: 'folder', segments, name, children: nodesOf(child, segments) };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const recipes = level.recipes
    .map((recipe): RecipeNode => ({ kind: 'recipe', recipe }))
    .sort((a, b) => a.recipe.title.localeCompare(b.recipe.title));

  return [...folders, ...recipes];
}

export function contentsRows(
  nodes: readonly ContentsNode[],
  isExpanded: (key: string) => boolean,
): readonly ContentsRow[] {
  const rows: ContentsRow[] = [];
  collect(nodes, 1, [], isExpanded, rows);
  return rows;
}

function collect(
  nodes: readonly ContentsNode[],
  level: number,
  guides: readonly number[],
  isExpanded: (key: string) => boolean,
  rows: ContentsRow[],
): void {
  for (const node of nodes) {
    if (node.kind === 'recipe') {
      rows.push({
        kind: 'recipe',
        key: node.recipe.id,
        id: node.recipe.id,
        guides,
        title: node.recipe.title,
      });
      continue;
    }

    const key = folderKey(node.segments);
    const expanded = isExpanded(key);
    rows.push({
      kind: 'folder',
      key,
      segments: node.segments,
      guides,
      name: node.name,
      expanded,
    });
    if (expanded) collect(node.children, level + 1, [...guides, level], isExpanded, rows);
  }
}
