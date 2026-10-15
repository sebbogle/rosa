import type { Locator, Page } from '@playwright/test';

const ROUND = ['Tab', 'Tab', 'Tab', 'Shift+Tab', 'Shift+Tab', 'Shift+Tab', 'Shift+Tab'];

export async function tabsOutOf(page: Page, layer: Locator): Promise<readonly string[]> {
  const reached: string[] = [];

  for (const keys of ROUND) {
    await page.keyboard.press(keys);
    const behind = await layer.evaluate((within) => {
      const at = document.activeElement;
      if (at === null || at === document.body || within.contains(at)) return undefined;
      return at.getAttribute('aria-label') ?? at.textContent?.trim() ?? at.tagName;
    });
    if (behind !== undefined) reached.push(behind);
  }

  return reached;
}
