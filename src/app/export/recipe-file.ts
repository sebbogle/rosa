import { Recipe } from '../recipe/recipe';

const INDENT = 2;

const JSON_TYPE = 'application/json';

export function recipeFile(recipe: Recipe): string {
  return `${JSON.stringify(recipe, undefined, INDENT)}\n`;
}

export function recipeFileName(recipe: Recipe): string {
  return `${recipe.id}.json`;
}

export function recipeBlob(recipe: Recipe): Blob {
  return new Blob([recipeFile(recipe)], { type: JSON_TYPE });
}
