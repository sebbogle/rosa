import type { Locator, Page } from '@playwright/test';
import { chooseSegment } from './segmented';
import { clickBeside } from './sheet';

export interface FilePayload {
  readonly name: string;
  readonly mimeType: string;
  readonly buffer: Buffer;
}

export type Assent = 'Replace' | 'Restore';

export type Appearance = 'Default' | 'E-ink';

export class Settings {
  readonly root: Locator;
  readonly gear: Locator;
  readonly googleDrive: Locator;
  readonly clearing: Locator;
  readonly syncButton: Locator;
  readonly clearButton: Locator;
  readonly importAndExport: Locator;
  readonly report: Locator;
  readonly refusal: Locator;
  readonly disclosure: Locator;
  readonly appearances: Locator;
  private readonly page: Page;
  private readonly dismissButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.root = page.getByRole('dialog', { name: 'Settings', exact: true });
    this.gear = page.getByRole('button', { name: 'Settings', exact: true });
    this.googleDrive = this.root.getByRole('region', { name: 'Google Drive', exact: true });
    this.clearing = this.googleDrive.getByRole('alertdialog', { name: 'Clear Drive', exact: true });
    this.syncButton = this.driveButton('Sync with Drive');
    this.clearButton = this.driveButton('Clear Drive');
    this.importAndExport = this.root.getByRole('region', { name: 'Import & export', exact: true });
    this.report = this.importAndExport.getByRole('status');
    this.refusal = this.importAndExport.getByText(/ refused\.$/);
    this.disclosure = this.importAndExport.getByRole('region', { name: 'Import', exact: true });
    this.dismissButton = this.importAndExport.getByRole('button', { name: 'Dismiss', exact: true });
    this.appearances = this.root
      .getByRole('region', { name: 'Appearance', exact: true })
      .getByRole('radiogroup', { name: 'Appearance', exact: true });
  }

  async open(): Promise<void> {
    await this.gear.click();
    await this.root.waitFor();
  }

  async sync(): Promise<void> {
    await this.syncButton.click();
    await this.syncButton.waitFor({ state: 'detached' });
  }

  async disconnect(): Promise<void> {
    await this.driveButton('Disconnect').click();
    await this.syncButton.waitFor();
  }

  async putThemBack(): Promise<void> {
    const putBack = this.driveButton('Put them back in Drive');
    await putBack.click();
    await putBack.waitFor({ state: 'detached' });
  }

  async clearDrive(): Promise<void> {
    await this.clearButton.click();
    await this.clearing.waitFor();
  }

  async confirmClearDrive(): Promise<void> {
    await this.clearing.getByRole('button', { name: 'Clear Drive', exact: true }).click();
    await this.googleDrive.getByRole('status').waitFor();
  }

  async beginClearDrive(): Promise<void> {
    await this.clearing.getByRole('button', { name: 'Clear Drive', exact: true }).click();
    await this.clearing.waitFor({ state: 'detached' });
  }

  async import(files: readonly FilePayload[]): Promise<void> {
    const chooser = this.page.waitForEvent('filechooser');
    await this.importAndExport.getByRole('button', { name: 'Choose files', exact: true }).click();
    await (await chooser).setFiles(files);

    await this.dismissButton.or(this.disclosure).waitFor();
  }

  async tick(assent: Assent): Promise<void> {
    await this.box(assent).check();
  }

  async untick(assent: Assent): Promise<void> {
    await this.box(assent).uncheck();
  }

  async confirmImport(): Promise<void> {
    await this.disclosure.getByRole('button', { name: /^Import \d+$/ }).click();
    await this.dismissButton.waitFor();
  }

  async appearance(name: Appearance): Promise<void> {
    await chooseSegment(this.appearances, name);
  }

  async clickBeside(): Promise<void> {
    await clickBeside(this.root);
  }

  async pressEscape(): Promise<void> {
    await this.page.keyboard.press('Escape');
  }

  async done(): Promise<void> {
    await this.root.getByRole('button', { name: 'Done', exact: true }).click();
    await this.root.waitFor({ state: 'hidden' });
  }

  private driveButton(name: string): Locator {
    return this.googleDrive.getByRole('button', { name, exact: true });
  }

  private box(assent: Assent): Locator {
    return this.disclosure.getByRole('checkbox', { name: new RegExp(`^${assent} `) });
  }
}
