import {
  BLANK_QUANTITY,
  IngredientGroup,
  MethodGroup,
  Quantity,
  Recipe,
  RecipeWithoutId,
  Sizing,
  newSizing,
  padded,
} from '../recipe/recipe';

export type Column = 'ingredients' | 'method';

export type Slot = 'quantity' | 'unit' | 'item' | 'text';

export interface Row {
  readonly item: string;
  readonly quantities: readonly Quantity[];
  readonly text: string;
}

export interface Block {
  readonly group: string;
  readonly collapsed: boolean;
  readonly rows: readonly Row[];
}

export type Fields = Omit<Recipe, 'id' | 'ingredients' | 'method'>;

export interface WorkingList {
  readonly fields: Fields;
  readonly ingredients: readonly Block[];
  readonly method: readonly Block[];
  readonly showing: string;
}

export interface Spot {
  readonly block: number;
  readonly row: number;
}

export const BLANK_ROW: Row = { item: '', quantities: [], text: '' };

function blankBlock(rows: readonly Row[]): Block {
  return { group: '', collapsed: false, rows };
}

function laid(blocks: readonly Block[]): readonly Block[] {
  if (blocks.length === 0) return [blankBlock([BLANK_ROW])];
  if (blocks[0].group !== '') return [blankBlock([]), ...blocks];
  return blocks;
}

function filled(row: Row): boolean {
  return (
    row.item !== '' ||
    row.text !== '' ||
    row.quantities.some(({ quantity, unit }) => quantity !== '' || unit !== '')
  );
}

export function quantityAt(row: Row, sizing: number): Quantity {
  return row.quantities[sizing] ?? BLANK_QUANTITY;
}

export function showingAt(list: WorkingList): number {
  return Math.max(
    list.fields.sizings.findIndex((sizing) => sizing.id === list.showing),
    0,
  );
}

export function workingListOf(recipe: RecipeWithoutId): WorkingList {
  const { ingredients, method, ...fields } = recipe;

  return {
    fields,
    ingredients: laid(
      ingredients.map((group) => ({
        group: group.group,
        collapsed: false,
        rows: group.items.map((item) => ({ ...BLANK_ROW, ...item })),
      })),
    ),
    method: laid(
      method.map((group) => ({
        group: group.group,
        collapsed: false,
        rows: group.steps.map((text) => ({ ...BLANK_ROW, text })),
      })),
    ),
    showing: fields.sizings[0]?.id ?? '',
  };
}

export function recipeOf(list: WorkingList): RecipeWithoutId {
  const sizings = list.fields.sizings.length;

  const ingredients: readonly IngredientGroup[] = list.ingredients.map((block) => ({
    group: block.group,
    items: block.rows.map(({ item, quantities }) => ({
      item,
      quantities: padded(quantities, sizings),
    })),
  }));

  const method: readonly MethodGroup[] = list.method.map((block) => ({
    group: block.group,
    steps: block.rows.map((row) => row.text),
  }));

  return { ...list.fields, ingredients, method };
}

export function written(list: WorkingList): boolean {
  const { fields } = list;
  if (fields.title.trim() !== '') return true;
  if (fields.folder.length > 0 || fields.tags.length > 0) return true;
  if (fields.prep !== '' || fields.notes !== '') return true;
  if (fields.source.text !== '' || fields.source.link !== '') return true;
  if (fields.sizings.length > 1) return true;
  if (fields.sizings.some((sizing) => sizing.name !== '')) return true;

  if (list.ingredients.length > 1 || list.method.length > 1) return true;

  return [...list.ingredients, ...list.method].some((block) => block.rows.some(filled));
}

function at(
  blocks: readonly Block[],
  index: number,
  edit: (block: Block) => Block,
): readonly Block[] {
  return blocks.map((block, held) => (held === index ? edit(block) : block));
}

export function addRow(blocks: readonly Block[], block: number): readonly Block[] {
  return at(blocks, block, (held) => ({
    ...held,
    collapsed: false,
    rows: [...held.rows, BLANK_ROW],
  }));
}

export function deleteRow(blocks: readonly Block[], block: number, row: number): readonly Block[] {
  return at(blocks, block, (held) => ({
    ...held,
    rows: held.rows.filter((_, index) => index !== row),
  }));
}

export function retypeRow(
  blocks: readonly Block[],
  block: number,
  row: number,
  slot: Slot,
  value: string,
  sizing: number,
): readonly Block[] {
  return at(blocks, block, (held) => ({
    ...held,
    rows: held.rows.map((current, index) =>
      index === row ? retyped(current, slot, value, sizing) : current,
    ),
  }));
}

function retyped(row: Row, slot: Slot, value: string, sizing: number): Row {
  if (slot === 'item' || slot === 'text') return { ...row, [slot]: value };

  return {
    ...row,
    quantities: padded(row.quantities, sizing + 1).map((held, index) =>
      index === sizing ? { ...held, [slot]: value } : held,
    ),
  };
}

export function renameSizing(
  sizings: readonly Sizing[],
  sizing: number,
  name: string,
): readonly Sizing[] {
  return sizings.map((held, index) => (index === sizing ? { ...held, name } : held));
}

function everyRow(list: WorkingList, edit: (row: Row) => Row): readonly Block[] {
  return list.ingredients.map((block) => ({ ...block, rows: block.rows.map(edit) }));
}

function insertSizing(
  list: WorkingList,
  landing: number,
  pair: (quantities: readonly Quantity[]) => Quantity,
): WorkingList {
  const sizing = newSizing();
  const { sizings } = list.fields;

  return {
    ...list,
    fields: {
      ...list.fields,
      sizings: [...sizings.slice(0, landing), sizing, ...sizings.slice(landing)],
    },
    ingredients: everyRow(list, (row) => {
      const held = padded(row.quantities, sizings.length);
      return {
        ...row,
        quantities: [...held.slice(0, landing), pair(held), ...held.slice(landing)],
      };
    }),
    showing: sizing.id,
  };
}

export function addSizing(list: WorkingList): WorkingList {
  return insertSizing(list, list.fields.sizings.length, () => BLANK_QUANTITY);
}

export function copySizing(list: WorkingList, sizing: number): WorkingList {
  if (sizing < 0 || sizing >= list.fields.sizings.length) return list;
  return insertSizing(list, sizing + 1, (held) => held[sizing]);
}

export function moveSizing(list: WorkingList, sizing: number, delta: 1 | -1): WorkingList {
  const { sizings } = list.fields;
  const to = sizing + delta;
  if (sizing < 0 || to < 0 || to >= sizings.length) return list;

  const swap = <T>(items: readonly T[]): readonly T[] => {
    const swapped = [...items];
    swapped[sizing] = items[to];
    swapped[to] = items[sizing];
    return swapped;
  };

  return {
    ...list,
    fields: { ...list.fields, sizings: swap(sizings) },
    ingredients: everyRow(list, (row) => ({
      ...row,
      quantities: swap(padded(row.quantities, sizings.length)),
    })),
  };
}

export function sizingHolds(list: WorkingList, sizing: number): boolean {
  if ((list.fields.sizings[sizing]?.name.trim() ?? '') !== '') return true;

  return list.ingredients.some((block) =>
    block.rows.some(({ quantities }) => {
      const { quantity, unit } = quantities[sizing] ?? BLANK_QUANTITY;
      return quantity !== '' || unit !== '';
    }),
  );
}

export function deleteSizing(list: WorkingList, sizing: number): WorkingList {
  const { sizings } = list.fields;
  if (sizings.length < 2 || sizing < 0 || sizing >= sizings.length) return list;

  const kept = sizings.filter((_, index) => index !== sizing);

  return {
    ...list,
    fields: { ...list.fields, sizings: kept },
    ingredients: everyRow(list, (row) => ({
      ...row,
      quantities: row.quantities.filter((_, index) => index !== sizing),
    })),
    showing: list.showing === sizings[sizing].id ? kept[0].id : list.showing,
  };
}

export function toggleCollapse(blocks: readonly Block[], block: number): readonly Block[] {
  return at(blocks, block, (held) => ({ ...held, collapsed: !held.collapsed }));
}

export function renameGroup(
  blocks: readonly Block[],
  block: number,
  name: string,
): readonly Block[] {
  return at(blocks, block, (held) => ({ ...held, group: name }));
}

export function insertGroup(blocks: readonly Block[], block: number): readonly Block[] {
  const landing = Math.min(Math.max(block, 1), blocks.length);
  return [...blocks.slice(0, landing), blankBlock([BLANK_ROW]), ...blocks.slice(landing)];
}

export function deleteGroupKeepingRows(blocks: readonly Block[], block: number): readonly Block[] {
  if (block < 1 || block >= blocks.length) return blocks;
  const gone = blocks[block];

  return blocks
    .filter((_, index) => index !== block)
    .map((held, index) =>
      index === block - 1
        ? { ...held, collapsed: false, rows: [...held.rows, ...gone.rows] }
        : held,
    );
}

export function shiftGroup(
  blocks: readonly Block[],
  block: number,
  delta: 1 | -1,
): readonly Block[] {
  const to = block + delta;
  if (block < 1 || to < 1 || to >= blocks.length) return blocks;

  const swapped = [...blocks];
  swapped[block] = blocks[to];
  swapped[to] = blocks[block];
  return swapped;
}

export function moveGroup(blocks: readonly Block[], block: number, to: number): readonly Block[] {
  if (block < 1 || block >= blocks.length) return blocks;

  const moved = blocks[block];
  const rest = blocks.filter((_, index) => index !== block);
  const landing = Math.min(Math.max(to, 1), rest.length);
  return [...rest.slice(0, landing), moved, ...rest.slice(landing)];
}

export function moveRow(blocks: readonly Block[], from: Spot, to: Spot): readonly Block[] {
  const row = blocks[from.block]?.rows[from.row];
  if (!row || !blocks[to.block]) return blocks;

  const lifted = deleteRow(blocks, from.block, from.row);
  const landing = Math.min(Math.max(to.row, 0), lifted[to.block].rows.length);

  return at(lifted, to.block, (held) => ({
    ...held,
    collapsed: false,
    rows: [...held.rows.slice(0, landing), row, ...held.rows.slice(landing)],
  }));
}
