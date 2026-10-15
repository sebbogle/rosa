import { Injectable, Signal, computed, inject, signal } from '@angular/core';
import { Recipe } from '../recipe/recipe';
import { RecipeStore } from '../recipe/recipe-store';
import { matches, searchTerms } from './contents-rules';
import { ancestorsOf } from './contents-tree';

export function haystackOf(recipe: Recipe): string {
  return [...recipe.folder, recipe.title, ...recipe.tags].join(' ').toLowerCase();
}

export function filterContents(
  recipes: readonly Recipe[],
  terms: readonly string[],
): readonly Recipe[] {
  if (terms.length === 0) return recipes;

  return recipes.filter((recipe) => matches(haystackOf(recipe), terms));
}

export interface ContentsSearch {
  readonly searching: Signal<boolean>;
  readonly matched: Signal<readonly Recipe[]>;
  readonly nothingMatches: Signal<boolean>;
  readonly matchedIn: Signal<ReadonlySet<string>>;
}

export function contentsSearch(
  recipes: Signal<readonly Recipe[]>,
  typed: Signal<string>,
): ContentsSearch {
  const terms = computed(() => searchTerms(typed()));
  const searching = computed(() => terms().length > 0);
  const matched = computed(() => filterContents(recipes(), terms()));

  return {
    searching,
    matched,
    nothingMatches: computed(() => searching() && matched().length === 0),
    matchedIn: computed(() => new Set(matched().flatMap((recipe) => ancestorsOf(recipe.folder)))),
  };
}

@Injectable({ providedIn: 'root' })
export class ContentsFilter {
  private readonly typed = signal('');

  readonly query = this.typed.asReadonly();

  private readonly found = contentsSearch(inject(RecipeStore).recipes, this.typed);

  readonly searching = this.found.searching;

  readonly matched = this.found.matched;

  readonly nothingMatches = this.found.nothingMatches;

  readonly matchedIn = this.found.matchedIn;

  search(query: string): void {
    this.typed.set(query);
  }
}
