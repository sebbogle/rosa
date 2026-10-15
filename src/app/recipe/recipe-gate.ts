import { plural } from '../shell/formatting';
import { folderNameOf } from './folders';
import {
  BLANK_QUANTITY,
  Ingredient,
  IngredientGroup,
  MethodGroup,
  Quantity,
  RECIPE_ID_MAX_LENGTH,
  Recipe,
  Sizing,
  Source,
  newRecipeId,
  padded,
} from './recipe';

const MINTABLE = /^[a-z0-9-]+$/;

export interface Refusal {
  readonly name: string;
  readonly faults: readonly string[];
}

export type Verdict =
  | { readonly kind: 'admitted'; readonly name: string; readonly recipe: Recipe }
  | ({ readonly kind: 'refused' } & Refusal);

interface Rules {
  readonly segment: (segment: string, path: string, faults: string[]) => string | undefined;
  readonly tags: (tags: readonly string[]) => readonly string[];
}

const AS_WRITTEN: Rules = {
  segment: (segment) => segment,
  tags: (tags) => tags,
};

const ON_IMPORT: Rules = {
  segment: (segment, path, faults) => {
    const name = folderNameOf(segment);
    if (name !== '') return name;

    faults.push(`${path} is empty, and would draw a nameless folder`);
    return undefined;
  },
  tags: (tags) => [...new Set(tags.map((tag) => tag.trim()).filter((tag) => tag !== ''))],
};

export function recipeFrom(value: unknown): Recipe {
  return recipeOf(isObject(value) ? value : {}, [], AS_WRITTEN);
}

export function admitRecipeFile(text: string, name: string): Verdict {
  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch {
    return terminal(name, 'not JSON');
  }

  return admitRecipe(parsed, name);
}

export function admitRecipe(value: unknown, name: string): Verdict {
  if (Array.isArray(value)) return terminal(name, 'a list of recipes, and a recipe file holds one');
  if (!isObject(value)) return terminal(name, 'not a recipe');

  if (value['_deleted'] === true) {
    return terminal(name, 'a deleted recipe, carrying _deleted: true');
  }

  const faults: string[] = [];
  const recipe = recipeOf(value, faults, ON_IMPORT);

  if (faults.length > 0) return { kind: 'refused', name, faults };
  return { kind: 'admitted', name, recipe };
}

function recipeOf(value: Record<string, unknown>, faults: string[], rules: Rules): Recipe {
  const title = titleOf(value, faults);
  const id = idOf(value, title, faults);
  const folder = folderOf(value, faults, rules);
  const tags = rules.tags(tagsOf(value, faults));
  const prep = textOf(value['prep'], 'prep', faults);
  const notes = textOf(value['notes'], 'notes', faults);
  const source = sourceOf(value, faults);
  const sizings = sizingsOf(value, faults);
  const ingredients = ingredientsOf(value, sizings?.length, faults);
  const method = methodOf(value, faults);

  return {
    id,
    title,
    folder,
    tags,
    prep,
    notes,
    source,
    sizings: sizings ?? [sizingAt(0)],
    ingredients,
    method,
  };
}

function titleOf(value: Record<string, unknown>, faults: string[]): string {
  const title = value['title'];

  if (title === undefined) {
    faults.push('no title, and a recipe must have one');
    return '';
  }

  if (typeof title !== 'string') {
    faults.push('title must be text');
    return '';
  }

  if (title.trim() === '') faults.push('title is empty, and a recipe must have one');
  return title;
}

function idOf(value: Record<string, unknown>, title: string, faults: string[]): string {
  const id = value['id'];
  if (id === undefined) return newRecipeId(title);

  if (typeof id !== 'string') {
    faults.push('id must be text');
    return newRecipeId(title);
  }

  if (!MINTABLE.test(id)) {
    faults.push('id must be lowercase letters, digits and hyphens');
  } else if (id.length > RECIPE_ID_MAX_LENGTH) {
    faults.push(`id is longer than ${RECIPE_ID_MAX_LENGTH} characters`);
  }

  return id;
}

function folderOf(
  value: Record<string, unknown>,
  faults: string[],
  rules: Rules,
): readonly string[] {
  const folder = value['folder'];
  if (folder === undefined) return [];

  if (!Array.isArray(folder)) {
    faults.push('folder must be a list of names');
    return [];
  }

  return folder.flatMap((segment: unknown, at: number): string[] => {
    const path = `folder[${at}]`;

    if (typeof segment !== 'string') {
      faults.push(`${path} must be text`);
      return [];
    }

    const name = rules.segment(segment, path, faults);
    return name === undefined ? [] : [name];
  });
}

function tagsOf(value: Record<string, unknown>, faults: string[]): readonly string[] {
  const tags = value['tags'];
  if (tags === undefined) return [];

  if (!Array.isArray(tags)) {
    faults.push('tags must be a list of tags');
    return [];
  }

  return tags.flatMap((tag: unknown, at: number): string[] => {
    if (typeof tag !== 'string') {
      faults.push(`tags[${at}] must be text`);
      return [];
    }

    return [tag];
  });
}

function sourceOf(value: Record<string, unknown>, faults: string[]): Source {
  const source = value['source'];
  if (source === undefined) return { text: '', link: '' };

  if (!isObject(source)) {
    faults.push('source must carry a text and a link');
    return { text: '', link: '' };
  }

  return {
    text: textOf(source['text'], 'source.text', faults),
    link: textOf(source['link'], 'source.link', faults),
  };
}

function sizingsOf(
  value: Record<string, unknown>,
  faults: string[],
): readonly Sizing[] | undefined {
  const sizings = value['sizings'];
  if (sizings === undefined) return [sizingAt(0)];

  if (!Array.isArray(sizings)) {
    faults.push('sizings must be a list of sizings');
    return undefined;
  }

  if (sizings.length === 0) return [sizingAt(0)];

  const firsts = new Map<string, number>();

  return sizings.map((sizing: unknown, at: number): Sizing => {
    const path = `sizings[${at}]`;

    if (!isObject(sizing)) {
      faults.push(`${path} must be a sizing`);
      return sizingAt(at);
    }

    const id = sizingIdOf(sizing['id'], at, `${path}.id`, faults);
    const name = textOf(sizing['name'], `${path}.name`, faults);

    if (id !== '') {
      const first = firsts.get(id);
      if (first === undefined) firsts.set(id, at);
      else faults.push(`${path}.id is the same as sizings[${first}].id`);
    }

    return { id: id || sizingIdAt(at), name };
  });
}

function sizingIdOf(id: unknown, at: number, path: string, faults: string[]): string {
  if (id === undefined) return sizingIdAt(at);

  if (typeof id !== 'string') {
    faults.push(`${path} must be text`);
    return '';
  }

  if (id === '') faults.push(`${path} is empty`);
  return id;
}

function sizingAt(at: number): Sizing {
  return { id: sizingIdAt(at), name: '' };
}

function sizingIdAt(at: number): string {
  return `sizing-${at + 1}`;
}

function ingredientsOf(
  value: Record<string, unknown>,
  sizingCount: number | undefined,
  faults: string[],
): readonly IngredientGroup[] {
  const ingredients = value['ingredients'];
  if (ingredients === undefined) return [];

  if (!Array.isArray(ingredients)) {
    faults.push('ingredients must be a list of groups');
    return [];
  }

  return ingredients.flatMap((group: unknown, at: number): IngredientGroup[] => {
    const path = `ingredients[${at}]`;

    if (!isObject(group)) {
      faults.push(`${path} must be a group carrying items`);
      return [];
    }

    const heading = textOf(group['group'], `${path}.group`, faults);

    if (group['items'] === undefined) {
      faults.push(`${path} must be a group carrying items`);
      return [{ group: heading, items: [] }];
    }

    return [
      { group: heading, items: itemsOf(group['items'], `${path}.items`, sizingCount, faults) },
    ];
  });
}

function itemsOf(
  value: unknown,
  path: string,
  sizingCount: number | undefined,
  faults: string[],
): readonly Ingredient[] {
  if (!Array.isArray(value)) {
    faults.push(`${path} must be a list of ingredients`);
    return [];
  }

  return value.flatMap((item: unknown, at: number): Ingredient[] => {
    const where = `${path}[${at}]`;

    if (!isObject(item)) {
      faults.push(`${where} must be an ingredient`);
      return [];
    }

    return [
      {
        item: textOf(item['item'], `${where}.item`, faults),
        quantities: quantitiesOf(item['quantities'], `${where}.quantities`, sizingCount, faults),
      },
    ];
  });
}

function quantitiesOf(
  value: unknown,
  path: string,
  sizingCount: number | undefined,
  faults: string[],
): readonly Quantity[] {
  const shown = sizingCount ?? 1;
  if (value === undefined) return padded([], shown);

  if (!Array.isArray(value)) {
    faults.push(`${path} must be a list of quantities`);
    return padded([], shown);
  }

  if (sizingCount !== undefined && value.length > sizingCount) {
    const noun = plural(sizingCount, 'sizing');
    faults.push(`${path} holds ${value.length}, and the recipe has ${sizingCount} ${noun}`);
  }

  const quantities = value.map((held: unknown, at: number): Quantity => {
    const where = `${path}[${at}]`;

    if (!isObject(held)) {
      faults.push(`${where} must be a quantity`);
      return BLANK_QUANTITY;
    }

    return {
      quantity: textOf(held['quantity'], `${where}.quantity`, faults),
      unit: textOf(held['unit'], `${where}.unit`, faults),
    };
  });

  return padded(quantities, shown);
}

function methodOf(value: Record<string, unknown>, faults: string[]): readonly MethodGroup[] {
  const method = value['method'];
  if (method === undefined) return [];

  if (!Array.isArray(method)) {
    faults.push('method must be a list of groups');
    return [];
  }

  return method.flatMap((group: unknown, at: number): MethodGroup[] => {
    const path = `method[${at}]`;

    if (!isObject(group)) {
      faults.push(`${path} must be a group carrying steps`);
      return [];
    }

    const heading = textOf(group['group'], `${path}.group`, faults);

    if (group['steps'] === undefined) {
      faults.push(`${path} must be a group carrying steps`);
      return [{ group: heading, steps: [] }];
    }

    return [{ group: heading, steps: stepsOf(group['steps'], `${path}.steps`, faults) }];
  });
}

function stepsOf(value: unknown, path: string, faults: string[]): readonly string[] {
  if (!Array.isArray(value)) {
    faults.push(`${path} must be a list of steps`);
    return [];
  }

  return value.flatMap((step: unknown, at: number): string[] => {
    if (typeof step !== 'string') {
      faults.push(`${path}[${at}] must be text`);
      return [];
    }

    return [step];
  });
}

function textOf(value: unknown, path: string, faults: string[]): string {
  if (value === undefined) return '';

  if (typeof value !== 'string') {
    faults.push(`${path} must be text`);
    return '';
  }

  return value;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function terminal(name: string, fault: string): Verdict {
  return { kind: 'refused', name, faults: [fault] };
}
