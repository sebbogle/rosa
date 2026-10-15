import type { BrowserContext, Page } from '@playwright/test';
import type { Watch } from './watch';

const DISCONNECTED = 'net::ERR_INTERNET_DISCONNECTED';

export class Device {
  private readonly context: BrowserContext;
  private readonly page: Page;
  private readonly watch: Watch;
  private cut = false;

  constructor(context: BrowserContext, page: Page, watch: Watch) {
    this.context = context;
    this.page = page;
    this.watch = watch;
  }

  get offline(): boolean {
    return this.cut;
  }

  async goOffline(): Promise<void> {
    this.watch.letThroughFromGoogle(DISCONNECTED);
    this.cut = true;
    await this.context.setOffline(true);
  }

  async comeOnline(): Promise<void> {
    this.cut = false;
    await this.context.setOffline(false);
  }

  async leaveRosa(): Promise<void> {
    await this.page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
      Object.defineProperty(document, 'hidden', { configurable: true, value: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
  }

  async returnToRosa(): Promise<void> {
    await this.page.evaluate(() => {
      Reflect.deleteProperty(document, 'visibilityState');
      Reflect.deleteProperty(document, 'hidden');
      document.dispatchEvent(new Event('visibilitychange'));
    });
  }
}
