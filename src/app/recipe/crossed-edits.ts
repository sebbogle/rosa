import { RxConflictHandler, WithDeleted, deepEqual, defaultConflictHandler } from 'rxdb';
import { Recipe } from './recipe';
import { recipeStateOf } from './recipe-schema';

type RecipeState = WithDeleted<Recipe>;

type Field = Exclude<keyof Recipe, 'id'>;

type Part = readonly Field[];

const PART_OF: Readonly<Record<Field, string>> = {
  title: 'title',
  tags: 'tags',
  folder: 'folder',
  source: 'source',
  notes: 'notes',
  prep: 'prep',
  method: 'method',
  sizings: 'ingredients',
  ingredients: 'ingredients',
};

const FIELDS = Object.keys(PART_OF) as readonly Field[];

const PARTS: readonly Part[] = [...new Set(Object.values(PART_OF))].map((part) =>
  FIELDS.filter((field) => PART_OF[field] === part),
);

export const crossedEdits: RxConflictHandler<Recipe> = {
  ...defaultConflictHandler,
  resolve: async ({ newDocumentState, realMasterState, assumedMasterState }) =>
    resolved(
      newDocumentState,
      recipeStateOf(realMasterState),
      assumedMasterState && recipeStateOf(assumedMasterState),
    ),
};

function resolved(
  here: RecipeState,
  there: RecipeState,
  agreed: RecipeState | undefined,
): RecipeState {
  if (agreed === undefined) return here;
  if (here._deleted && there._deleted) return here;
  if (here._deleted) return changed(there, agreed) ? there : here;
  if (there._deleted) return changed(here, agreed) ? here : there;

  return PARTS.filter(
    (part) => !touched(here, agreed, part) && touched(there, agreed, part),
  ).reduce((recipe, part) => ({ ...recipe, ...pick(there, part) }), here);
}

function changed(state: RecipeState, agreed: RecipeState): boolean {
  return state._deleted !== agreed._deleted || PARTS.some((part) => touched(state, agreed, part));
}

function touched(state: RecipeState, agreed: RecipeState, part: Part): boolean {
  return part.some((field) => !deepEqual(state[field], agreed[field]));
}

function pick(state: RecipeState, part: Part): Partial<Recipe> {
  return Object.fromEntries(part.map((field) => [field, state[field]]));
}
