import { Placement, beneathAt } from '../recipe/folders';
import { Recipe, slugOf } from '../recipe/recipe';

export function selectionOf(taken: readonly Recipe[], cookbook: readonly Recipe[]): string {
  if (taken.length === cookbook.length) return 'cookbook';
  if (taken.length === 1) return slugOf(taken[0].title);

  const at = sharedFolder(taken);
  if (at.length > 0 && beneathAt(cookbook, at).length === taken.length) return slugOf(at.join(' '));

  return `${taken.length}-recipes`;
}

function sharedFolder(taken: readonly Recipe[]): Placement {
  let shared: readonly string[] = taken[0]?.folder ?? [];

  for (const recipe of taken) {
    let same = 0;
    while (same < shared.length && recipe.folder[same] === shared[same]) same += 1;
    shared = shared.slice(0, same);
  }

  return shared;
}
