import { Injectable, Signal, computed, untracked } from '@angular/core';
import { filter, firstValueFrom } from 'rxjs';
import { cookbook } from './cookbook';
import {
  Placement,
  beneath,
  childrenOf,
  liftedFrom,
  renamedUnder,
  resolveFolderName,
} from './folders';
import { Recipe, RecipeWithoutId, newRecipeId } from './recipe';
import { RecipeDocument } from './recipe-schema';

@Injectable({ providedIn: 'root' })
export class RecipeStore {
  private readonly collection = cookbook().recipes;

  private readonly query = this.collection.find();

  private readonly documents = this.query.$$ as Signal<readonly RecipeDocument[] | undefined>;

  private readonly held = new WeakMap<RecipeDocument, Recipe>();

  readonly ready: Promise<void> = firstValueFrom(this.query.$).then(() => undefined);

  readonly recipes: Signal<readonly Recipe[]> = computed(() =>
    (this.documents() ?? [])
      .map((document) => this.recipeOf(document))
      .sort((a, b) => a.title.localeCompare(b.title)),
  );

  readonly vocabulary = computed(() =>
    [...new Set(this.recipes().flatMap((recipe) => recipe.tags))].sort((a, b) =>
      a.localeCompare(b),
    ),
  );

  recipeAt(id: string): Recipe | undefined {
    return this.recipes().find((recipe) => recipe.id === id);
  }

  async create(recipe: RecipeWithoutId): Promise<string> {
    const id = newRecipeId(recipe.title);
    await this.collection.insert({ ...recipe, id });
    await this.settled([id]);
    return id;
  }

  async patch(id: string, changes: Partial<RecipeWithoutId>): Promise<void> {
    const document = this.documentAt(id);
    if (document === undefined) return;

    await document.incrementalModify((current) => ({ ...current, ...changes }));
  }

  async remove(id: string): Promise<void> {
    await this.documentAt(id)?.remove();
  }

  async tombstoned(ids: readonly string[]): Promise<ReadonlySet<string>> {
    if (ids.length === 0) return new Set();

    const rows = await this.collection.storageInstance.findDocumentsById([...ids], true);
    return new Set(rows.filter((row) => row._deleted).map((row) => row.id));
  }

  async land(recipes: readonly Recipe[]): Promise<ReadonlySet<string>> {
    if (recipes.length === 0) return new Set();

    const { error } = await this.collection.bulkUpsert([...recipes]);
    return new Set(error.map((failure) => failure.documentId));
  }

  async renameFolder(at: Placement, typed: string): Promise<void> {
    if (at.length === 0) return;

    const here = at[at.length - 1];
    const siblings = childrenOf(untracked(this.recipes), at.slice(0, -1)).filter(
      (name) => name !== here,
    );

    const resolution = resolveFolderName(siblings, typed);
    if (resolution === undefined || resolution.name === here) return;

    await this.rewriteFolders(at, (folder) => renamedUnder(folder, at, resolution.name));
  }

  async removeFolder(at: Placement): Promise<void> {
    if (at.length === 0) return;

    await this.rewriteFolders(at, (folder) => liftedFrom(folder, at));
  }

  private async rewriteFolders(
    at: Placement,
    to: (folder: Placement) => readonly string[],
  ): Promise<void> {
    const moved = untracked(this.recipes)
      .filter((recipe) => beneath(recipe.folder, at))
      .map((recipe) => ({ ...recipe, folder: to(recipe.folder) }));

    if (moved.length === 0) return;

    await this.collection.bulkUpsert(moved);
  }

  private recipeOf(document: RecipeDocument): Recipe {
    const known = this.held.get(document);
    if (known !== undefined) return known;

    const recipe = document.toJSON() as Recipe;
    this.held.set(document, recipe);
    return recipe;
  }

  private documentAt(id: string): RecipeDocument | undefined {
    return untracked(this.documents)?.find((document) => document.id === id);
  }

  private async settled(ids: readonly string[]): Promise<void> {
    const wanted = new Set(ids);
    await firstValueFrom(
      this.query.$.pipe(filter((documents) => documents.some((held) => wanted.has(held.id)))),
    );
  }
}
