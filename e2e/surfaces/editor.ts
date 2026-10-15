import type { Locator, Page } from '@playwright/test';
import type { Ingredient, Quantity, Recipe } from '../../src/app/recipe/recipe';
import {
  DRAG_STEPS,
  type Point,
  bottom,
  bounds,
  centre,
  drag,
  longPress,
  swipe,
  waitForDrop,
} from '../pointer';
import { chooseSegment } from './segmented';
import { BESIDE, clickBeside } from './sheet';

export type Column = 'Ingredients' | 'Method';

export type Gesture = 'mouse' | 'long press' | 'swipe';

export interface Place {
  readonly group: string;
  readonly row: number;
}

const GESTURES: Record<
  Gesture,
  (page: Page, from: Point, to: Point, steps: number) => Promise<void>
> = { mouse: drag, 'long press': longPress, swipe };

const STRIDE = 8;

const INSIDE = 8;

const ROWS: Record<Column, { readonly row: string; readonly add: string; readonly lose: string }> =
  {
    Ingredients: { row: 'Ingredient', add: '+ Item', lose: 'Delete row' },
    Method: { row: 'Step', add: '+ Step', lose: 'Delete step' },
  };

export class Editor {
  readonly root: Locator;
  readonly open: Locator;
  readonly behind: Locator;
  readonly title: Locator;
  readonly doneButton: Locator;
  readonly driveControls: Locator;
  readonly suggestions: Locator;
  readonly warning: Locator;
  readonly reverting: Locator;
  readonly deleting: Locator;
  readonly deletingSizing: Locator;
  readonly sizings: Locator;
  readonly sizingShown: Locator;
  readonly sizingName: Locator;
  readonly folderPicker: Locator;
  readonly crumb: Locator;
  readonly menus: Locator;
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
    this.root = page.getByRole('dialog', { name: 'Edit recipe', exact: true });
    this.open = this.root.and(page.locator('[open]'));
    this.behind = page.locator('app-sidebar, .reading');
    this.title = textbox(this.root, 'Title');
    this.folderPicker = this.root.locator('app-folder-picker');
    this.crumb = this.folderPicker.getByRole('navigation', {
      name: 'Where this recipe goes',
      exact: true,
    });
    this.doneButton = this.button('Done');
    this.driveControls = this.root.getByRole('button', { name: /Drive/ });
    this.suggestions = this.root.locator('app-tag-input').getByRole('listitem');
    this.warning = this.root.getByRole('alertdialog', {
      name: 'This recipe has no title',
      exact: true,
    });
    this.reverting = this.root.getByRole('alertdialog', { name: 'Revert recipe', exact: true });
    this.deleting = this.root.getByRole('alertdialog', { name: 'Delete recipe', exact: true });
    this.deletingSizing = this.root.getByRole('alertdialog', {
      name: 'Delete sizing',
      exact: true,
    });
    this.sizings = this.root.getByRole('radiogroup', { name: 'Sizing', exact: true });
    this.sizingShown = this.sizings.getByRole('radio', { checked: true });
    this.sizingName = textbox(this.root, 'Sizing name');
    this.menus = this.root.getByRole('menu');
  }

  async typeTitle(title: string): Promise<void> {
    await this.title.fill(title);
  }

  async leaveTitle(): Promise<void> {
    await this.title.blur();
  }

  async pressTab(): Promise<void> {
    await this.page.keyboard.press('Tab');
  }

  async pressShiftTab(): Promise<void> {
    await this.page.keyboard.press('Shift+Tab');
  }

  async pressEscape(): Promise<void> {
    await this.page.keyboard.press('Escape');
  }

  async typeSizingName(name: string): Promise<void> {
    await this.sizingName.fill(name);
  }

  async addSizing(): Promise<void> {
    const count = await this.sizings.getByRole('radio').count();
    await this.button('+ Sizing').click();
    await this.sizings.getByRole('radio').nth(Math.max(count, 1)).waitFor();
  }

  async chooseSizing(name: string): Promise<void> {
    await chooseSegment(this.sizings, name);
  }

  async openSizingActions(name: string): Promise<void> {
    await this.button(`Actions for ${name}`).click();
    await this.menus.waitFor();
  }

  async copySizing(name: string): Promise<void> {
    const count = await this.sizings.getByRole('radio').count();
    await this.chooseSizingAction(name, 'Copy as a new sizing');
    await this.sizings.getByRole('radio').nth(Math.max(count, 1)).waitFor();
  }

  async moveSizing(name: string, way: 'left' | 'right'): Promise<void> {
    await this.chooseSizingAction(name, way === 'left' ? 'Move left' : 'Move right');
  }

  async deleteSizing(name: string): Promise<void> {
    await this.chooseSizingAction(name, 'Delete sizing');
  }

  async confirmDeleteSizing(): Promise<void> {
    await this.deletingSizing.getByRole('button', { name: 'Delete', exact: true }).click();
    await this.deletingSizing.waitFor({ state: 'hidden' });
  }

  async ingredients(): Promise<readonly string[]> {
    return group(this.root, 'Ingredients')
      .getByRole('group', { name: new RegExp(`^${ROWS.Ingredients.row} \\d+$`) })
      .evaluateAll((rows) =>
        rows.map((row) =>
          [...row.querySelectorAll('input')]
            .map((cell) => cell.value)
            .filter(Boolean)
            .join(' '),
        ),
      );
  }

  async write(recipe: Recipe): Promise<void> {
    await write(this.title, recipe.title);
    if (recipe.folder.length > 0) await this.putIn(recipe.folder);
    for (const tag of recipe.tags) await this.addTag(tag);
    await write(this.sizingName, recipe.sizings[0].name);

    for (const [at, { group, items }] of recipe.ingredients.entries()) {
      if (at > 0 || group !== '') await this.addGroup('Ingredients', group);
      for (const [row, ingredient] of items.entries()) {
        await this.writeIngredient({ group, row: row + 1 }, ingredient);
      }
    }

    for (const [at, { group, steps }] of recipe.method.entries()) {
      if (at > 0 || group !== '') await this.addGroup('Method', group);
      for (const [row, step] of steps.entries()) {
        await this.writeStep({ group, row: row + 1 }, step);
      }
    }

    await write(textbox(this.root, 'Notes'), recipe.notes);
    await write(textbox(this.root, 'Prep'), recipe.prep);
    await write(textbox(this.root, 'Source'), recipe.source.text);
    await write(textbox(this.root, 'Link'), recipe.source.link);
  }

  async openFolderPicker(): Promise<void> {
    await this.folderPicker.getByRole('button', { name: /^Folder / }).click();
    await this.crumb.waitFor();
  }

  async walkUpTo(folder: string): Promise<void> {
    await this.crumb.getByRole('button', { name: folder, exact: true }).click();
    await this.standingIn(folder);
  }

  async putIn(folder: readonly string[]): Promise<void> {
    await this.openFolderPicker();

    const naming = textbox(this.folderPicker, 'Name the new folder');
    const pressed = (name: string): Locator =>
      this.folderPicker.getByRole('button', { name, exact: true });

    const standing = (await this.crumb.getByRole('button').allInnerTexts())
      .slice(1)
      .map((name) => name.trim());
    let shared = 0;
    while (shared < standing.length && standing[shared] === folder[shared]) shared++;

    if (shared < standing.length) {
      await this.walkUpTo(shared === 0 ? 'No folder' : folder[shared - 1]);
    }

    for (const level of folder.slice(shared)) {
      if (await this.child(level).isVisible()) {
        await this.walkInto(level);
        continue;
      }

      if (!(await naming.isVisible())) await pressed('New folder in here').click();
      await naming.fill(level);
      await pressed('Go into it').click();
      await this.standingIn(level);
    }

    await pressed('Put it in here').click();
    await pressed(`Folder ${folder.join(' › ') || 'No folder'}`).waitFor();
  }

  async addTag(tag: string): Promise<void> {
    await this.typeTag(tag);
    await textbox(this.root, 'Add a tag').press('Enter');
    await this.button(`Remove tag ${tag}`).waitFor();
  }

  async typeTag(typed: string): Promise<void> {
    await textbox(this.root, 'Add a tag').fill(typed);
  }

  async pickTag(tag: string): Promise<void> {
    await this.suggestions.getByRole('button', { name: tag, exact: true }).click();
    await this.button(`Remove tag ${tag}`).waitFor();
  }

  async removeTag(tag: string): Promise<void> {
    await this.button(`Remove tag ${tag}`).click();
    await this.button(`Remove tag ${tag}`).waitFor({ state: 'detached' });
  }

  async writeIngredient(place: Place, ingredient: Ingredient): Promise<void> {
    const row = await this.rowToWrite('Ingredients', place);
    await writeQuantity(row, ingredient.quantities[0]);
    await write(textbox(row, 'Item'), ingredient.item);
  }

  async writeQuantity(place: Place, quantity: Quantity): Promise<void> {
    await writeQuantity(this.row('Ingredients', place), quantity);
  }

  async writeStep(place: Place, step: string): Promise<void> {
    await write(await this.stepToWrite(place), step);
  }

  async typeStep(place: Place, step: string): Promise<void> {
    await (await this.stepToWrite(place)).fill(step);
  }

  async typeNotes(notes: string): Promise<void> {
    await textbox(this.root, 'Notes').fill(notes);
  }

  async deleteRow(column: Column, place: Place): Promise<void> {
    const rows = this.rows(column, place.group);
    const last = rows.nth((await rows.count()) - 1);

    await this.row(column, place)
      .getByRole('button', { name: ROWS[column].lose, exact: true })
      .click();
    await last.waitFor({ state: 'detached' });
  }

  async dragRow(column: Column, from: Place, into: Place, by: Gesture = 'mouse'): Promise<void> {
    const grip = this.row(column, from).getByTitle('Drag to move this row', { exact: true });
    const same = from.group === into.group;
    const rows = this.rows(column, into.group);
    const staying = (await rows.count()) - (same ? 1 : 0);
    const stayer = (at: number): Locator => rows.nth(same && at >= from.row - 1 ? at + 1 : at);
    const landing = into.row - 1;

    await this.block(column, into.group).evaluate((block) =>
      block.scrollIntoView({ block: 'center' }),
    );
    const start = centre(await bounds(grip));
    const down = same
      ? into.row > from.row
      : (await bounds(this.block(column, into.group))).y > start.y;

    let y: number;
    if (down && landing > 0) y = centre(await bounds(stayer(landing - 1))).y;
    else if (down) y = (await bounds(stayer(0))).y - 2;
    else if (landing < staying) y = centre(await bounds(stayer(landing))).y;
    else y = bottom(await bounds(stayer(staying - 1))) + 2;

    await this.gesture(by, start, { x: start.x, y });
  }

  async dragGroup(
    column: Column,
    name: string,
    past: string,
    by: Gesture = 'mouse',
  ): Promise<void> {
    const grip = this.block(column, name).getByTitle('Drag to reorder this group', { exact: true });
    const target = this.block(column, past);

    await target.evaluate((block) => block.scrollIntoView({ block: 'center' }));
    const start = centre(await bounds(grip));
    const end = await bounds(target);
    const y = end.y > start.y ? end.y + INSIDE : bottom(end) - INSIDE;

    await this.gesture(by, start, { x: start.x, y });
  }

  async addGroup(column: Column, name: string): Promise<void> {
    await group(this.root, column)
      .getByRole('button', { name: '+ Group here', exact: true })
      .last()
      .click();
    await this.nameGroup(column, 'Unnamed group', name);
  }

  async renameGroup(column: Column, from: string, to: string): Promise<void> {
    await this.choose(column, from, 'Rename');
    await this.nameGroup(column, from, to);
  }

  async openGroupActions(column: Column, name: string): Promise<void> {
    const block = this.block(column, name);
    await block.getByRole('button', { name: `Actions for ${name}`, exact: true }).click();
    await block.getByRole('menu').waitFor();
  }

  async moveGroupUp(column: Column, name: string): Promise<void> {
    await this.choose(column, name, 'Move up');
  }

  async deleteGroupKeepingRows(column: Column, name: string): Promise<void> {
    await this.choose(column, name, 'Delete group, keep rows');
    await this.block(column, name).waitFor({ state: 'detached' });
  }

  async revert(): Promise<void> {
    await this.button('Revert').click();
    await this.reverting.waitFor();
  }

  async confirmRevert(): Promise<void> {
    await this.reverting.getByRole('button', { name: 'Revert', exact: true }).click();
    await this.reverting.waitFor({ state: 'hidden' });
  }

  async delete(): Promise<void> {
    await this.button('Delete').click();
    await this.deleting.waitFor();
  }

  async confirmDelete(): Promise<void> {
    await this.deleting.getByRole('button', { name: 'Delete', exact: true }).click();
    await this.root.waitFor({ state: 'hidden' });
  }

  async done(): Promise<void> {
    await this.doneButton.click();
    await this.root.waitFor({ state: 'hidden' });
  }

  async dismiss(): Promise<void> {
    await this.page.keyboard.press('Escape');
    await this.root
      .filter({ hasNot: this.page.getByRole('alertdialog') })
      .waitFor({ state: 'hidden' });
  }

  async clickBeside(button: 'left' | 'right' = 'left'): Promise<void> {
    await clickBeside(this.root, button);
  }

  async selectTitlePastTheSheet(): Promise<void> {
    await drag(this.page, centre(await bounds(this.title)), BESIDE, DRAG_STEPS);
  }

  async pressBesideAndLetGoOnTitle(): Promise<void> {
    await drag(this.page, BESIDE, centre(await bounds(this.title)), DRAG_STEPS);
  }

  async dragRowPastTheSheet(column: Column, from: Place): Promise<void> {
    const grip = this.row(column, from).getByTitle('Drag to move this row', { exact: true });
    await drag(this.page, centre(await bounds(grip)), BESIDE, DRAG_STEPS);
  }

  async discard(): Promise<void> {
    await this.warning.getByRole('button', { name: 'Discard it', exact: true }).click();
    await this.root.waitFor({ state: 'hidden' });
  }

  private async gesture(by: Gesture, from: Point, to: Point): Promise<void> {
    const steps = Math.max(DRAG_STEPS, Math.ceil(Math.abs(to.y - from.y) / STRIDE));
    await GESTURES[by](this.page, from, to, steps);
    await waitForDrop(this.page);
  }

  private async chooseSizingAction(name: string, item: string): Promise<void> {
    await this.openSizingActions(name);
    await this.menus.getByRole('menuitem', { name: item, exact: true }).click();
    await this.menus.waitFor({ state: 'detached' });
  }

  private async walkInto(folder: string): Promise<void> {
    await this.child(folder).click();
    await this.standingIn(folder);
  }

  private child(folder: string): Locator {
    return this.folderPicker
      .getByRole('listitem')
      .getByRole('button', { name: folder, exact: true });
  }

  private async standingIn(folder: string): Promise<void> {
    await this.crumb.getByRole('button', { name: folder, exact: true, disabled: true }).waitFor();
  }

  private async nameGroup(column: Column, from: string, to: string): Promise<void> {
    await textbox(this.block(column, from), 'Group name').fill(to);
    await textbox(this.block(column, to), 'Group name').blur();
  }

  private async choose(column: Column, name: string, item: string): Promise<void> {
    const menu = this.block(column, name).getByRole('menu');
    await this.openGroupActions(column, name);
    await menu.getByRole('menuitem', { name: item, exact: true }).click();
    await menu.waitFor({ state: 'detached' });
  }

  private block(column: Column, name: string): Locator {
    return group(group(this.root, column), name || 'No group');
  }

  private rows(column: Column, name: string): Locator {
    return this.block(column, name).getByRole('group', {
      name: new RegExp(`^${ROWS[column].row} \\d+$`),
    });
  }

  private row(column: Column, { group: name, row }: Place): Locator {
    return group(this.block(column, name), `${ROWS[column].row} ${row}`);
  }

  private async rowToWrite(column: Column, place: Place): Promise<Locator> {
    const row = this.row(column, place);
    if (!(await row.isVisible())) {
      await this.block(column, place.group)
        .getByRole('button', { name: ROWS[column].add, exact: true })
        .click();
    }
    return row;
  }

  private async stepToWrite(place: Place): Promise<Locator> {
    return (await this.rowToWrite('Method', place)).getByRole('textbox');
  }

  private button(name: string): Locator {
    return this.root.getByRole('button', { name, exact: true });
  }
}

function group(within: Locator, name: string): Locator {
  return within.getByRole('group', { name, exact: true });
}

function textbox(within: Locator, name: string): Locator {
  return within.getByRole('textbox', { name, exact: true });
}

async function writeQuantity(row: Locator, { quantity, unit }: Quantity): Promise<void> {
  await write(textbox(row, 'Quantity'), quantity);
  await write(textbox(row, 'Unit'), unit);
}

async function write(field: Locator, value: string): Promise<void> {
  if ((await field.inputValue()) === value) return;
  await field.fill(value);
  await field.blur();
}
