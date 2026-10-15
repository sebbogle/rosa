import { RxCollection, RxDatabase, RxDocument, RxJsonSchema, WithDeleted } from 'rxdb';
import { AngularSignalReactivityLambda } from 'rxdb/plugins/reactivity-angular';
import { RECIPE_ID_MAX_LENGTH, Recipe } from './recipe';
import { recipeFrom } from './recipe-gate';

export const RECIPE_SCHEMA: RxJsonSchema<Recipe> = {
  title: 'recipe',
  description: 'One dish, held whole: a title, where it sits, and its ingredients and method.',
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: RECIPE_ID_MAX_LENGTH },
    title: { type: 'string' },
    folder: { type: 'array', items: { type: 'string' } },
    tags: { type: 'array', items: { type: 'string' } },
    prep: { type: 'string' },
    notes: { type: 'string' },
    source: {
      type: 'object',
      properties: { text: { type: 'string' }, link: { type: 'string' } },
      required: ['text', 'link'],
    },
    sizings: {
      type: 'array',
      items: {
        type: 'object',
        properties: { id: { type: 'string' }, name: { type: 'string' } },
        required: ['id', 'name'],
      },
    },
    ingredients: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          group: { type: 'string' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                item: { type: 'string' },
                quantities: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: { quantity: { type: 'string' }, unit: { type: 'string' } },
                    required: ['quantity', 'unit'],
                  },
                },
              },
              required: ['item', 'quantities'],
            },
          },
        },
        required: ['group', 'items'],
      },
    },
    method: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          group: { type: 'string' },
          steps: { type: 'array', items: { type: 'string' } },
        },
        required: ['group', 'steps'],
      },
    },
  },
  required: [
    'id',
    'title',
    'folder',
    'tags',
    'prep',
    'notes',
    'source',
    'sizings',
    'ingredients',
    'method',
  ],
};

export function recipeStateOf(state: { readonly _deleted: boolean }): WithDeleted<Recipe> {
  return { ...recipeFrom(state), _deleted: state._deleted === true };
}

export type RecipeDocument = RxDocument<Recipe, object, AngularSignalReactivityLambda>;

export type RecipeCollection = RxCollection<
  Recipe,
  object,
  object,
  object,
  AngularSignalReactivityLambda
>;

export interface CookbookCollections {
  readonly recipes: RecipeCollection;
}

export type Cookbook = RxDatabase<
  CookbookCollections,
  unknown,
  unknown,
  AngularSignalReactivityLambda
>;
