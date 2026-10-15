import { EnvironmentInjector, createComponent } from '@angular/core';
import { Recipe } from '../recipe/recipe';
import { RecipePane } from '../recipe/recipe-pane/recipe-pane';

const ELEMENT = 'app-recipe-pane';

export interface Frozen {
  readonly recipe: Recipe;
  readonly pane: string;
}

export function paneMarkup(
  recipes: readonly Recipe[],
  injector: EnvironmentInjector,
): readonly Frozen[] {
  return recipes.map((recipe) => ({ recipe, pane: frozenPane(recipe, injector) }));
}

function frozenPane(recipe: Recipe, injector: EnvironmentInjector): string {
  const host = document.createElement(ELEMENT);
  const pane = createComponent(RecipePane, { environmentInjector: injector, hostElement: host });

  try {
    pane.setInput('frozen', true);
    pane.setInput('recipe', recipe);
    pane.changeDetectorRef.detectChanges();
    for (const choice of host.querySelectorAll('app-segmented input:checked'))
      choice.setAttribute('checked', '');
    return `<${ELEMENT}>${host.innerHTML}</${ELEMENT}>`;
  } finally {
    pane.destroy();
  }
}
