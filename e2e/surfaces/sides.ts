import type { Locator, Page } from '@playwright/test';
import { DRAG_STEPS, bounds, centre, drag, waitForDrop } from '../pointer';
import { chooseSegment } from './segmented';

export class RestingState {
  readonly root: Locator;
  readonly line: Locator;
  readonly control: Locator;
  readonly syncButton: Locator;

  constructor(side: Locator) {
    this.root = side.locator('app-resting-state');
    this.line = this.root.locator('.line');
    this.control = this.root.getByRole('button');
    this.syncButton = this.root.getByRole('button', { name: 'Sync with Drive', exact: true });
  }

  async addNewRecipe(): Promise<void> {
    await this.root.getByRole('button', { name: 'Add new recipe', exact: true }).click();
  }

  async syncWithDrive(): Promise<void> {
    await this.syncButton.click();
  }

  async tryToSyncWithDrive(): Promise<void> {
    await this.syncButton.click({ force: true });
  }

  async openContents(): Promise<void> {
    await this.root.getByRole('button', { name: 'Open Contents', exact: true }).click();
  }
}

export class List {
  readonly heading: Locator;
  readonly rows: Locator;
  readonly quantities: Locator;
  readonly groups: Locator;
  private readonly column: Locator;

  constructor(pane: Locator, name: string) {
    this.heading = pane.getByRole('heading', { level: 2, name, exact: true });
    this.column = pane.locator('section').filter({ has: heading(pane.page(), 2, name) });
    this.rows = this.column.getByRole('listitem');
    this.quantities = this.rows.locator('b');
    this.groups = this.column.getByRole('heading', { level: 3 });
  }

  group(name: string): Locator {
    return this.column
      .locator('.group-card')
      .filter({ has: heading(this.column.page(), 3, name) })
      .getByRole('listitem');
  }
}

export class RecipePane {
  readonly root: Locator;
  readonly title: Locator;
  readonly folder: Locator;
  readonly tags: Locator;
  readonly meta: Locator;
  readonly notes: Locator;
  readonly source: Locator;
  readonly sizing: Locator;
  readonly sizings: Locator;
  readonly sizingShown: Locator;
  readonly ingredients: List;
  readonly method: List;
  readonly editButton: Locator;

  constructor(side: Locator) {
    const pane = side.locator('app-recipe-pane');
    this.root = pane;
    this.title = pane.getByRole('heading', { level: 1 });
    this.folder = pane.locator('.folder');
    this.tags = pane.locator('.tag');
    this.meta = pane.locator('.meta');
    this.notes = pane.locator('.notes');
    this.source = pane.getByRole('link');
    this.sizing = pane.locator('.ingredients-head .sizing-name');
    this.sizings = pane.getByRole('radiogroup', { name: 'Sizing', exact: true });
    this.sizingShown = this.sizings.getByRole('radio', { checked: true });
    this.ingredients = new List(pane, 'Ingredients');
    this.method = new List(pane, 'Method');
    this.editButton = pane.getByRole('button', { name: 'Edit recipe', exact: true });
  }

  async edit(): Promise<void> {
    await this.editButton.click();
  }

  async chooseSizing(name: string): Promise<void> {
    await chooseSegment(this.sizings, name);
  }
}

export type Edge = 'left' | 'right';

type Outcome = 'left alone' | 'taken' | 'unheard';

declare global {
  interface Window {
    rosaKeydown?: Outcome;
  }
}

const TOWARD: Record<Edge, number> = { left: -1, right: 1 };

export class Side {
  readonly root: Locator;
  readonly strip: Locator;
  readonly tabs: Locator;
  readonly pane: RecipePane;
  readonly resting: RestingState;

  constructor(side: Locator, strip: Locator) {
    this.root = side;
    this.strip = strip;
    this.tabs = strip.getByRole('button', { name: /^(?!Close )/ });
    this.pane = new RecipePane(side);
    this.resting = new RestingState(side);
  }

  tab(title: string): Locator {
    return this.strip.getByRole('button', { name: title, exact: true });
  }

  async focus(): Promise<void> {
    await this.root.click();
  }

  async keep(title: string): Promise<void> {
    await this.tab(title).dblclick();
  }

  async close(title: string): Promise<void> {
    await this.strip.getByRole('button', { name: `Close ${title}`, exact: true }).click();
    await this.tab(title).waitFor({ state: 'detached' });
  }

  async dragAlong(title: string, onto: string): Promise<void> {
    await this.tab(title).dragTo(this.tab(onto), { steps: DRAG_STEPS });
    await waitForDrop(this.root.page());
  }
}

export class Sides {
  readonly one: Side;
  readonly left: Side;
  readonly right: Side;
  private readonly page: Page;
  private readonly main: Locator;
  private readonly divider: Locator;

  constructor(page: Page) {
    this.page = page;
    this.main = page.getByRole('main');
    this.divider = page.getByRole('separator', { name: 'Divider', exact: true });
    this.one = new Side(this.main, page.getByRole('group', { name: 'Open recipes', exact: true }));
    this.left = new Side(
      page.getByRole('region', { name: 'Left side', exact: true }),
      page.getByRole('group', { name: 'Open recipes on the left', exact: true }),
    );
    this.right = new Side(
      page.getByRole('region', { name: 'Right side', exact: true }),
      page.getByRole('group', { name: 'Open recipes on the right', exact: true }),
    );
  }

  async dragToEdge(title: string, edge: Edge): Promise<void> {
    const shared = await bounds(this.main);
    const middle = centre(shared);
    const into = { x: middle.x + (TOWARD[edge] * shared.width) / 3, y: middle.y };

    await drag(this.page, centre(await bounds(this.one.tab(title))), into, DRAG_STEPS);
    await waitForDrop(this.page);
  }

  async dragAcross(title: string): Promise<void> {
    const [from, into] =
      (await this.left.tab(title).count()) > 0 ? [this.left, this.right] : [this.right, this.left];

    await drag(
      this.page,
      centre(await bounds(from.tab(title))),
      centre(await bounds(into.root)),
      DRAG_STEPS,
    );
    await waitForDrop(this.page);
  }

  async dragDivider(toward: Edge): Promise<void> {
    const shared = await bounds(this.main);
    const from = centre(await bounds(this.divider));
    const to = { x: from.x + (TOWARD[toward] * shared.width) / 8, y: from.y };

    await drag(this.page, from, to, DRAG_STEPS);
  }

  async resetDivider(): Promise<void> {
    await this.divider.dblclick();
  }

  async dividerSits(): Promise<'left of centre' | 'centre' | 'right of centre'> {
    const off = centre(await bounds(this.divider)).x - centre(await bounds(this.main)).x;
    if (Math.abs(off) < 1) return 'centre';
    return off < 0 ? 'left of centre' : 'right of centre';
  }

  async rowsOfStrips(): Promise<number> {
    const tops = await Promise.all(
      [this.left, this.right].map(async ({ strip }) => Math.round((await bounds(strip)).y)),
    );
    return new Set(tops).size;
  }

  async showTab(position: number): Promise<void> {
    await this.page.keyboard.press(`Alt+Digit${position}`);
  }

  async showPreviousTab(): Promise<void> {
    await this.page.keyboard.press('Alt+ArrowLeft');
  }

  async showNextTab(): Promise<void> {
    await this.page.keyboard.press('Alt+ArrowRight');
  }

  async closeActiveTab(): Promise<void> {
    await this.page.keyboard.press('Alt+KeyW');
  }

  async pressIn(field: Locator, keys: string): Promise<Outcome> {
    await field.focus();
    await this.page.evaluate((code) => {
      window.rosaKeydown = 'unheard';
      const listen = (event: KeyboardEvent): void => {
        if (event.code !== code) return;
        window.removeEventListener('keydown', listen);
        window.rosaKeydown = event.defaultPrevented ? 'taken' : 'left alone';
      };
      window.addEventListener('keydown', listen);
    }, keys.split('+').at(-1));
    await this.page.keyboard.press(keys);
    return this.page.evaluate(() => {
      const outcome = window.rosaKeydown ?? 'unheard';
      delete window.rosaKeydown;
      return outcome;
    });
  }
}

function heading(page: Page, level: number, name: string): Locator {
  return page.getByRole('heading', { level, name, exact: true });
}
