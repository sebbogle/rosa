import type { BrowserContext } from '@playwright/test';

interface Asking {
  rosaAsksToBeKept(): Promise<boolean>;
}

export class Safekeeping {
  private count = 0;

  get asks(): number {
    return this.count;
  }

  async answer(context: BrowserContext): Promise<void> {
    await context.exposeFunction('rosaAsksToBeKept', () => {
      this.count += 1;
      return false;
    });

    await context.addInitScript(() => {
      const storage = navigator.storage as StorageManager | undefined;
      if (storage === undefined) return;

      const asking = window as unknown as Asking;

      Object.defineProperty(storage, 'persisted', {
        configurable: true,
        value: () => Promise.resolve(false),
      });

      Object.defineProperty(storage, 'persist', {
        configurable: true,
        value: () => asking.rosaAsksToBeKept(),
      });
    });
  }
}
