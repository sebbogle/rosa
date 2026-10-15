import type { Locator } from '@playwright/test';

export async function chooseSegment(radiogroup: Locator, label: string): Promise<void> {
  await radiogroup.getByText(label, { exact: true }).click();
}
