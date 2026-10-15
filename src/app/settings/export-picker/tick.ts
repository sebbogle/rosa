import { Placement, beneathAt } from '../../recipe/folders';
import { Recipe } from '../../recipe/recipe';

export type Tick = 'all' | 'some' | 'none';

export function tickOf(
  cookbook: readonly Recipe[],
  at: Placement,
  ticked: ReadonlySet<string>,
): Tick {
  const held = beneathAt(cookbook, at);
  if (held.length === 0) return 'none';

  const count = held.filter((recipe) => ticked.has(recipe.id)).length;
  if (count === 0) return 'none';

  return count === held.length ? 'all' : 'some';
}
