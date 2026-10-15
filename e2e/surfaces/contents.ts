import type { Locator, Page } from '@playwright/test';
import { DRAG_STEPS, bounds, centre, drag } from '../pointer';

type Drawer = 'none' | 'open' | 'shut';

type FolderAction = 'Rename' | 'Remove';

export interface OutlineRow {
  readonly name: string;
  readonly expanded?: boolean;
}

const WIDENING = 96;

export class Contents {
  readonly root: Locator;
  readonly drawerToggle: Locator;
  readonly search: Locator;
  readonly menu: Locator;
  readonly removing: Locator;
  private readonly page: Page;
  private readonly edge: Locator;

  constructor(page: Page) {
    this.page = page;
    this.root = page.getByRole('navigation', { name: 'Contents', exact: true });
    this.drawerToggle = page.getByRole('button', { name: 'Contents', exact: true });
    this.search = this.root.getByRole('searchbox', { name: 'Search recipes', exact: true });
    this.menu = this.root.getByRole('menu');
    this.removing = this.root.getByRole('alertdialog', { name: 'Remove folder', exact: true });
    this.edge = this.root.getByRole('separator', { name: 'Contents edge', exact: true });
  }

  async open(): Promise<void> {
    if ((await this.drawer()) !== 'shut') return;

    await this.drawerToggle.click();
    await this.root.waitFor();
  }

  async close(): Promise<void> {
    if ((await this.drawer()) !== 'open') return;

    await this.root.getByRole('button', { name: 'Close Contents', exact: true }).click();
    await this.root.waitFor({ state: 'hidden' });
  }

  async dismiss(): Promise<void> {
    if ((await this.drawer()) !== 'open') return;

    await this.page.keyboard.press('Escape');
  }

  async pressEscape(): Promise<void> {
    await this.page.keyboard.press('Escape');
  }

  async searchFor(words: string): Promise<void> {
    await this.open();
    await this.search.fill(words);
  }

  async clearSearch(): Promise<void> {
    await this.searchFor('');
  }

  async pick(title: string, folder: readonly string[] = []): Promise<void> {
    await (await this.reveal(title, folder)).click();
    await this.settle();
  }

  async keep(title: string): Promise<void> {
    await (await this.reveal(title, [])).dblclick();
    await this.settle();
  }

  async expand(folder: string): Promise<void> {
    await this.fold(folder, true);
  }

  async collapse(folder: string): Promise<void> {
    await this.fold(folder, false);
  }

  async renameFolder(folder: string, to: string): Promise<void> {
    await this.choose(folder, 'Rename');

    const naming = this.root.getByRole('textbox', { name: `Rename ${folder}`, exact: true });
    await naming.fill(to);
    await naming.press('Enter');
    await naming.waitFor({ state: 'detached' });
    await this.leaveRows();
  }

  async removeFolder(folder: string): Promise<void> {
    await this.choose(folder, 'Remove');
    await this.removing.waitFor();
  }

  async confirmRemoval(): Promise<void> {
    await this.removing.getByRole('button', { name: 'Remove the folder', exact: true }).click();
    await this.removing.waitFor({ state: 'hidden' });
    await this.leaveRows();
  }

  async keepFolder(): Promise<void> {
    await this.removing.getByRole('button', { name: 'Keep it', exact: true }).click();
    await this.removing.waitFor({ state: 'hidden' });
  }

  async openFolderActions(folder: string): Promise<void> {
    await this.open();
    await this.row(folder).hover();
    await this.root
      .getByRole('button', { name: `Folder actions for ${folder}`, exact: true })
      .click();
    await this.menu.waitFor();
  }

  async widen(): Promise<void> {
    const from = centre(await bounds(this.edge));
    await drag(this.page, from, { x: from.x + WIDENING, y: from.y }, DRAG_STEPS);
  }

  async width(): Promise<number> {
    return (await bounds(this.root)).width;
  }

  async addNewRecipe(): Promise<void> {
    await this.open();
    await this.root.getByRole('button', { name: 'Add new recipe', exact: true }).click();
  }

  async outline(): Promise<readonly OutlineRow[]> {
    return this.root.locator('app-folder-tree > .line > .row').evaluateAll((rows) =>
      rows.map((row) => {
        const name = row.querySelector('.label')?.textContent?.trim() ?? '';
        const expanded = row.getAttribute('aria-expanded');
        return expanded === null ? { name } : { name, expanded: expanded === 'true' };
      }),
    );
  }

  row(name: string): Locator {
    return this.root.getByRole('button', { name, exact: true });
  }

  private async reveal(title: string, folder: readonly string[]): Promise<Locator> {
    await this.open();

    for (const name of folder) {
      await this.turn(name, true);
      await this.root.getByRole('button', { name, exact: true, expanded: true }).waitFor();
    }

    return this.row(title);
  }

  private async fold(folder: string, expanded: boolean): Promise<void> {
    await this.open();
    await this.turn(folder, expanded);
    await this.leaveRows();
  }

  private async turn(folder: string, expanded: boolean): Promise<void> {
    const row = this.row(folder);
    if ((await row.getAttribute('aria-expanded')) !== String(expanded)) await row.click();
  }

  private async choose(folder: string, action: FolderAction): Promise<void> {
    await this.openFolderActions(folder);
    await this.menu.getByRole('menuitem', { name: action, exact: true }).click();
    await this.menu.waitFor({ state: 'detached' });
  }

  private async leaveRows(): Promise<void> {
    await this.search.hover();
  }

  private async settle(): Promise<void> {
    if ((await this.drawer()) !== 'none') await this.root.waitFor({ state: 'hidden' });
  }

  private async drawer(): Promise<Drawer> {
    await this.drawerToggle.or(this.root).first().waitFor();
    if (!(await this.drawerToggle.isVisible())) return 'none';
    return (await this.drawerToggle.getAttribute('aria-expanded')) === 'true' ? 'open' : 'shut';
  }
}
