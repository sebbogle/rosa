export interface Quantity {
  readonly quantity: string;
  readonly unit: string;
}

export interface Ingredient {
  readonly item: string;
  readonly quantities: readonly Quantity[];
}

export interface IngredientGroup {
  readonly group: string;
  readonly items: readonly Ingredient[];
}

export interface MethodGroup {
  readonly group: string;
  readonly steps: readonly string[];
}

export interface Source {
  readonly text: string;
  readonly link: string;
}

export interface Sizing {
  readonly id: string;
  readonly name: string;
}

export interface Recipe {
  readonly id: string;
  readonly title: string;
  readonly folder: readonly string[];
  readonly tags: readonly string[];
  readonly prep: string;
  readonly notes: string;
  readonly source: Source;
  readonly sizings: readonly Sizing[];
  readonly ingredients: readonly IngredientGroup[];
  readonly method: readonly MethodGroup[];
}

export type RecipeWithoutId = Omit<Recipe, 'id'>;

export const BLANK_QUANTITY: Quantity = { quantity: '', unit: '' };

export function emptyRecipe(): RecipeWithoutId {
  return {
    title: '',
    folder: [],
    tags: [],
    prep: '',
    notes: '',
    source: { text: '', link: '' },
    sizings: [newSizing()],
    ingredients: [],
    method: [],
  };
}

export const RECIPE_ID_MAX_LENGTH = 73;

const SLUG_CAP = 60;

const SUFFIX_BYTES = 6;

export function slugOf(title: string): string {
  const slug = title
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return capped(slug) || 'recipe';
}

function capped(slug: string): string {
  if (slug.length <= SLUG_CAP) return slug;

  const cut = slug.slice(0, SLUG_CAP);
  const boundary = cut.lastIndexOf('-');
  return (boundary === -1 ? cut : cut.slice(0, boundary)).replace(/-+$/, '');
}

function suffix(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(SUFFIX_BYTES));
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function newRecipeId(title: string): string {
  return `${slugOf(title)}-${suffix()}`;
}

export function newSizingId(): string {
  return suffix();
}

export function newSizing(): Sizing {
  return { id: newSizingId(), name: '' };
}

export function shownName(sizing: Sizing, at: number): string {
  return sizing.name.trim() === '' ? `Sizing ${at + 1}` : sizing.name;
}

export function padded(quantities: readonly Quantity[], count: number): readonly Quantity[] {
  if (quantities.length >= count) return quantities;
  return [
    ...quantities,
    ...Array.from({ length: count - quantities.length }, () => BLANK_QUANTITY),
  ];
}

export function sameRecipe(one: Recipe, other: Recipe): boolean {
  return (
    one.id === other.id &&
    one.title === other.title &&
    sameText(one.folder, other.folder) &&
    sameText(one.tags, other.tags) &&
    one.prep === other.prep &&
    one.notes === other.notes &&
    one.source.text === other.source.text &&
    one.source.link === other.source.link &&
    sameEach(one.sizings, other.sizings, (sizing, against) => sizing.name === against.name) &&
    sameEach(one.ingredients, other.ingredients, sameIngredientGroup) &&
    sameEach(one.method, other.method, sameMethodGroup)
  );
}

function sameIngredientGroup(one: IngredientGroup, other: IngredientGroup): boolean {
  return (
    one.group === other.group &&
    sameEach(
      one.items,
      other.items,
      (item, against) =>
        item.item === against.item &&
        sameEach(
          item.quantities,
          against.quantities,
          (held, typed) => held.quantity === typed.quantity && held.unit === typed.unit,
        ),
    )
  );
}

function sameMethodGroup(one: MethodGroup, other: MethodGroup): boolean {
  return one.group === other.group && sameText(one.steps, other.steps);
}

function sameText(one: readonly string[], other: readonly string[]): boolean {
  return sameEach(one, other, (value, against) => value === against);
}

function sameEach<T>(
  one: readonly T[],
  other: readonly T[],
  same: (value: T, against: T) => boolean,
): boolean {
  return one.length === other.length && one.every((value, at) => same(value, other[at]));
}
