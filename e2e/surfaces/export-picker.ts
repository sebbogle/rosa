import { readFile } from 'node:fs/promises';
import type { Locator, Page } from '@playwright/test';
import type { OutlineRow } from './contents';
import { chooseSegment } from './segmented';
import type { FilePayload } from './settings';

export type Format = 'JSON' | 'HTML';

export class ExportPicker {
  readonly root: Locator;
  readonly clearButton: Locator;
  readonly sweepButton: Locator;
  private readonly page: Page;
  private readonly opener: Locator;
  private readonly filterBox: Locator;
  private readonly formats: Locator;

  constructor(page: Page) {
    const section = page
      .getByRole('dialog', { name: 'Settings', exact: true })
      .getByRole('region', { name: 'Import & export', exact: true });

    this.page = page;
    this.opener = section.getByRole('button', { name: 'Export', exact: true });
    this.root = section.getByRole('region', { name: 'Choose recipes', exact: true });
    this.filterBox = this.root.getByRole('searchbox', { name: 'Filter recipes', exact: true });
    this.formats = this.root.getByRole('radiogroup', { name: 'Format', exact: true });
    this.clearButton = this.root.getByRole('button', { name: 'Clear', exact: true });
    this.sweepButton = this.root.getByRole('button', { name: 'Tick all', exact: true });
  }

  async open(): Promise<void> {
    await this.opener.click();
    await this.root.waitFor();
  }

  async filter(words: string): Promise<void> {
    await this.filterBox.fill(words);
  }

  async tick(name: string): Promise<void> {
    await this.root.getByRole('checkbox', { name, exact: true }).check();
  }

  async sweep(): Promise<void> {
    await this.sweepButton.click();
  }

  async clear(): Promise<void> {
    await this.clearButton.click();
  }

  async outline(): Promise<readonly OutlineRow[]> {
    return this.root.locator('.line').evaluateAll((lines) =>
      lines.map((line) => {
        const name = line.querySelector('.name')?.textContent?.trim() ?? '';
        const expanded = line.querySelector('.chevron')?.getAttribute('aria-expanded') ?? null;
        return expanded === null ? { name } : { name, expanded: expanded === 'true' };
      }),
    );
  }

  async format(name: Format): Promise<void> {
    await chooseSegment(this.formats, name);
  }

  async export(): Promise<FilePayload> {
    const download = this.page.waitForEvent('download');
    await this.root.getByRole('button', { name: /^Export \d+$/ }).click();
    const file = await download;

    const name = file.suggestedFilename();
    const buffer = await readFile(await file.path());

    await this.root.waitFor({ state: 'detached' });
    return { name, mimeType: 'application/octet-stream', buffer };
  }
}
