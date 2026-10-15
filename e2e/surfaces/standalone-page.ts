import type { Locator, Page } from '@playwright/test';
import { Contents } from './contents';
import { RecipePane } from './sides';

export class StandalonePage {
  readonly root: Locator;
  readonly contents: Contents;
  readonly pane: RecipePane;
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
    this.root = page.locator(':root');
    this.contents = new Contents(page);
    this.pane = new RecipePane(page.getByRole('main').getByRole('article'));
  }

  async reload(): Promise<void> {
    await this.page.reload();
  }
}
