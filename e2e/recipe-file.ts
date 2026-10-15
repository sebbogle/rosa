import type { Recipe } from '../src/app/recipe/recipe';
import type { FilePayload } from './surfaces/settings';

export function recipeFile(recipe: Recipe): FilePayload {
  return {
    name: `${recipe.id}.json`,
    mimeType: 'application/json',
    buffer: Buffer.from(`${JSON.stringify(recipe, undefined, 2)}\n`),
  };
}
