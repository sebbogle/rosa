import type { Locator, Page } from '@playwright/test';

export class BesideTheGear {
  readonly root: Locator;
  readonly controls: Locator;
  readonly syncButton: Locator;
  private readonly googleDriveButton: Locator;

  constructor(page: Page) {
    this.root = page
      .getByRole('button', { name: 'Settings', exact: true })
      .locator('xpath=preceding-sibling::*[1]');
    this.controls = this.root.getByRole('button');
    this.syncButton = this.root.getByRole('button', { name: 'Sync with Drive', exact: true });
    this.googleDriveButton = this.root.getByRole('button', { name: 'Google Drive', exact: true });
  }

  async syncWithDrive(): Promise<void> {
    await this.syncButton.click();
  }

  async tryToSyncWithDrive(): Promise<void> {
    await this.syncButton.click({ force: true });
  }

  async openGoogleDrive(): Promise<void> {
    await this.googleDriveButton.click();
  }
}
