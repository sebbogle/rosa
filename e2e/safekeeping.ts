import type { BrowserContext } from '@playwright/test';

interface Asking {
  rosaIsKept(): Promise<boolean>;
  rosaAsksToBeKept(): Promise<boolean>;
}

export class Safekeeping {
  private willing = false;
  private kept = false;
  private count = 0;

  get asks(): number {
    return this.count;
  }

  agree(): void {
    this.willing = true;
  }

  async answer(context: BrowserContext): Promise<void> {
    await context.exposeFunction('rosaIsKept', () => this.kept);

    await context.exposeFunction('rosaAsksToBeKept', () => {
      this.count += 1;
      this.kept = this.willing;
      return this.kept;
    });

    await context.addInitScript(() => {
      const storage = navigator.storage as StorageManager | undefined;
      if (storage === undefined) return;

      const asking = window as unknown as Asking;

      Object.defineProperty(storage, 'persisted', {
        configurable: true,
        value: () => asking.rosaIsKept(),
      });

      Object.defineProperty(storage, 'persist', {
        configurable: true,
        value: () => asking.rosaAsksToBeKept(),
      });
    });
  }
}
