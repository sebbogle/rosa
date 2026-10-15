import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { Recipe, RecipeWithoutId, emptyRecipe } from '../recipe/recipe';
import { RecipeStore } from '../recipe/recipe-store';
import { Tabs } from '../recipe/tabs';
import {
  Block,
  Column,
  Fields,
  Slot,
  Spot,
  WorkingList,
  addRow,
  addSizing,
  copySizing,
  deleteGroupKeepingRows,
  deleteRow,
  deleteSizing,
  insertGroup,
  moveGroup,
  moveRow,
  moveSizing,
  recipeOf,
  renameGroup,
  renameSizing,
  retypeRow,
  shiftGroup,
  showingAt,
  sizingHolds,
  toggleCollapse,
  workingListOf,
  written,
} from './working-list';

const COALESCE = 300;

export type WriteTarget = keyof RecipeWithoutId;

export type SourceSlot = 'text' | 'link';

export interface Editing extends WorkingList {
  readonly id: string | undefined;
  readonly snapshot: RecipeWithoutId | undefined;
  readonly storedTitle: string;
}

export interface GroupMenu {
  readonly column: Column;
  readonly block: number;
}

export type OpenMenu = GroupMenu | 'sizing';

export interface DeletingSizing {
  readonly sizing: string;
}

export type Prompt = 'discard' | 'revert' | 'delete' | DeletingSizing;

interface Unwritten {
  readonly editing: Editing;
  readonly fields: ReadonlySet<WriteTarget>;
}

interface Adoption {
  title: string;
  unwritten: Unwritten | undefined;
}

@Injectable({ providedIn: 'root' })
export class EditorSession {
  private readonly recipes = inject(RecipeStore);
  private readonly tabs = inject(Tabs);

  private readonly session = signal<Editing | undefined>(undefined);

  readonly editing = this.session.asReadonly();

  private readonly openMenu = signal<OpenMenu | undefined>(undefined);

  readonly menu = this.openMenu.asReadonly();

  readonly deletable = computed(() => this.session()?.id !== undefined);

  readonly revertable = computed(() => this.session()?.snapshot !== undefined);

  private readonly adopting = signal<Adoption | undefined>(undefined);

  readonly discardable = computed(() => {
    const editing = this.session();
    return (
      editing !== undefined &&
      editing.id === undefined &&
      editing.fields.title.trim() === '' &&
      this.adopting() === undefined &&
      written(editing)
    );
  });

  readonly title = computed(() => this.session()?.fields.title.trim() ?? '');

  readonly sizings = computed(() => this.session()?.fields.sizings ?? []);

  readonly showing = computed(() => {
    const editing = this.session();
    return editing ? showingAt(editing) : 0;
  });

  private readonly asked = signal<Prompt | undefined>(undefined);

  readonly prompt = this.asked.asReadonly();

  private readonly pending = new Set<WriteTarget>();

  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    effect(() => {
      const known = this.recipes.recipes();
      const id = untracked(this.session)?.id;
      if (id !== undefined && !known.some((recipe) => recipe.id === id)) this.close();
    });
  }

  edit(recipe: Recipe): void {
    const { id, ...draft } = recipe;
    this.open(id, draft, draft);
  }

  create(): void {
    this.open(undefined, undefined, emptyRecipe());
  }

  blocks(column: Column): readonly Block[] {
    const editing = this.session();
    if (!editing) return [];
    return column === 'ingredients' ? editing.ingredients : editing.method;
  }

  type<K extends keyof Fields>(field: K, value: Fields[K]): void {
    this.change((editing) => ({ ...editing, fields: { ...editing.fields, [field]: value } }));
  }

  typeSource(slot: SourceSlot, value: string): void {
    this.change((editing) => ({
      ...editing,
      fields: { ...editing.fields, source: { ...editing.fields.source, [slot]: value } },
    }));
  }

  settle(field: WriteTarget): void {
    this.schedule(field);
  }

  settleTitle(): void {
    const editing = this.session();
    if (editing?.id === undefined) {
      void this.adopt();
    } else if (editing.fields.title.trim() === '') {
      this.type('title', editing.storedTitle);
    } else {
      this.change((current) => ({ ...current, storedTitle: editing.fields.title }));
      this.schedule('title');
    }
  }

  renameSizing(name: string): void {
    this.change((editing) => ({
      ...editing,
      fields: {
        ...editing.fields,
        sizings: renameSizing(editing.fields.sizings, showingAt(editing), name),
      },
    }));
  }

  chooseSizing(id: string): void {
    this.change((editing) => ({ ...editing, showing: id }));
  }

  addSizing(): void {
    this.change((editing) => ({ ...editing, ...addSizing(editing) }));
    this.schedule('sizings', 'ingredients');
  }

  copySizing(): void {
    this.change((editing) => ({ ...editing, ...copySizing(editing, showingAt(editing)) }));
    this.schedule('sizings', 'ingredients');
  }

  moveSizing(delta: 1 | -1): void {
    this.change((editing) => ({ ...editing, ...moveSizing(editing, showingAt(editing), delta) }));
    this.schedule('sizings', 'ingredients');
  }

  requestDeleteSizing(): void {
    const editing = this.session();
    if (!editing || editing.fields.sizings.length < 2) return;

    const at = showingAt(editing);
    if (sizingHolds(editing, at)) this.ask({ sizing: editing.fields.sizings[at].id });
    else this.deleteSizing(at);
  }

  ask(prompt: Prompt): void {
    this.asked.set(prompt);
  }

  withdraw(): void {
    this.asked.set(undefined);
  }

  answer(): void {
    const prompt = this.asked();
    this.asked.set(undefined);

    if (prompt === 'discard') this.close();
    else if (prompt === 'revert') this.revert();
    else if (prompt === 'delete') void this.delete();
    else if (prompt) this.deleteSizingWithId(prompt.sizing);
  }

  chooseFolder(folder: readonly string[]): void {
    this.change((editing) => ({ ...editing, fields: { ...editing.fields, folder } }));
    this.schedule('folder');
  }

  setTags(tags: readonly string[]): void {
    this.change((editing) => ({ ...editing, fields: { ...editing.fields, tags } }));
    this.schedule('tags');
  }

  addRow(column: Column, block: number): void {
    this.apply(column, (blocks) => addRow(blocks, block));
  }

  deleteRow(column: Column, block: number, row: number): void {
    this.apply(column, (blocks) => deleteRow(blocks, block, row));
  }

  retype(column: Column, block: number, row: number, slot: Slot, value: string): void {
    this.change((editing) =>
      this.edited(editing, column, (blocks) =>
        retypeRow(blocks, block, row, slot, value, showingAt(editing)),
      ),
    );
  }

  toggleCollapse(column: Column, block: number): void {
    this.change((editing) =>
      this.edited(editing, column, (blocks) => toggleCollapse(blocks, block)),
    );
  }

  renameGroup(column: Column, block: number, name: string): void {
    this.change((editing) =>
      this.edited(editing, column, (blocks) => renameGroup(blocks, block, name)),
    );
  }

  insertGroup(column: Column, block: number): void {
    this.apply(column, (blocks) => insertGroup(blocks, block));
  }

  deleteGroup(column: Column, block: number): void {
    this.apply(column, (blocks) => deleteGroupKeepingRows(blocks, block));
  }

  shiftGroup(column: Column, block: number, delta: 1 | -1): void {
    this.apply(column, (blocks) => shiftGroup(blocks, block, delta));
  }

  moveGroup(column: Column, block: number, to: number): void {
    this.apply(column, (blocks) => moveGroup(blocks, block, to));
  }

  moveRow(column: Column, from: Spot, to: Spot): void {
    this.apply(column, (blocks) => moveRow(blocks, from, to));
  }

  showMenu(menu: OpenMenu | undefined): void {
    this.openMenu.set(menu);
  }

  revert(): void {
    const editing = this.session();
    if (!editing?.snapshot || editing.id === undefined) return;

    const reverted = workingListOf(editing.snapshot);
    const kept = reverted.fields.sizings.some((sizing) => sizing.id === editing.showing);

    this.drop();
    this.session.set({
      ...editing,
      storedTitle: editing.snapshot.title,
      ...reverted,
      showing: kept ? editing.showing : reverted.showing,
    });
    void this.recipes.patch(editing.id, editing.snapshot);
  }

  async delete(): Promise<void> {
    const editing = this.session();
    if (editing?.id === undefined) return;

    const id = editing.id;
    this.drop();
    this.close();
    this.tabs.close(id);
    await this.recipes.remove(id);
  }

  flush(): void {
    clearTimeout(this.timer);
    this.timer = undefined;
    void this.write();
  }

  close(): void {
    this.endSitting();
    this.session.set(undefined);
    this.openMenu.set(undefined);
    this.asked.set(undefined);
  }

  private open(
    id: string | undefined,
    snapshot: RecipeWithoutId | undefined,
    on: RecipeWithoutId,
  ): void {
    this.endSitting();
    this.session.set({ id, snapshot, storedTitle: on.title, ...workingListOf(on) });
    this.openMenu.set(undefined);
    this.asked.set(undefined);
  }

  private async adopt(): Promise<void> {
    const editing = this.session();
    if (!editing || editing.id !== undefined) return;

    const underway = this.adopting();
    if (underway) {
      this.retitle(underway, editing.fields.title);
      return;
    }

    if (editing.fields.title.trim() === '') return;

    this.drop();
    const adoption: Adoption = { title: editing.fields.title, unwritten: undefined };
    this.adopting.set(adoption);

    try {
      const id = await this.recipes.create(recipeOf(editing));
      this.tabs.keep(id);

      const { unwritten } = adoption;
      if (unwritten) {
        if (unwritten.fields.size > 0) void this.patch(id, unwritten.editing, unwritten.fields);
        return;
      }

      this.session.update((current) => current && { ...current, id, storedTitle: adoption.title });
    } finally {
      if (untracked(this.adopting) === adoption) this.adopting.set(undefined);
    }

    if (this.pending.size > 0) this.schedule();
  }

  private retitle(adoption: Adoption, title: string): void {
    if (title.trim() === '') {
      this.type('title', adoption.title);
      return;
    }

    adoption.title = title;
    this.pending.add('title');
  }

  private endSitting(): void {
    const adoption = untracked(this.adopting);
    const editing = untracked(this.session);

    if (adoption && editing) {
      adoption.unwritten = {
        editing: { ...editing, storedTitle: adoption.title },
        fields: new Set(this.pending),
      };
      this.adopting.set(undefined);
    }

    this.drop();
  }

  private schedule(...fields: readonly WriteTarget[]): void {
    if (this.session() === undefined) return;

    for (const field of fields) this.pending.add(field);
    if (this.pending.size === 0) return;

    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = undefined;
      void this.write();
    }, COALESCE);
  }

  private async write(): Promise<void> {
    const editing = this.session();
    if (!editing || editing.id === undefined || this.pending.size === 0) return;

    const fields = new Set(this.pending);
    this.pending.clear();

    await this.patch(editing.id, editing, fields);
  }

  private async patch(
    id: string,
    editing: Editing,
    fields: ReadonlySet<WriteTarget>,
  ): Promise<void> {
    const recipe = { ...recipeOf(editing), title: editing.storedTitle };
    const changes: Partial<RecipeWithoutId> = {};
    for (const field of fields) Object.assign(changes, { [field]: recipe[field] });

    await this.recipes.patch(id, changes);
  }

  private drop(): void {
    clearTimeout(this.timer);
    this.timer = undefined;
    this.pending.clear();
  }

  private deleteSizingWithId(id: string): void {
    const at = this.sizings().findIndex((sizing) => sizing.id === id);
    if (at !== -1) this.deleteSizing(at);
  }

  private deleteSizing(at: number): void {
    this.change((editing) => ({ ...editing, ...deleteSizing(editing, at) }));
    this.schedule('sizings', 'ingredients');
  }

  private apply(column: Column, edit: (blocks: readonly Block[]) => readonly Block[]): void {
    this.change((editing) => this.edited(editing, column, edit));
    this.schedule(column);
  }

  private edited(
    editing: Editing,
    column: Column,
    edit: (blocks: readonly Block[]) => readonly Block[],
  ): Editing {
    return column === 'ingredients'
      ? { ...editing, ingredients: edit(editing.ingredients) }
      : { ...editing, method: edit(editing.method) };
  }

  private change(edit: (editing: Editing) => Editing): void {
    this.session.update((editing) => editing && edit(editing));
  }
}
