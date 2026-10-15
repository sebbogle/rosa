import type { Locator } from '@playwright/test';
import type { Point } from '../pointer';

export const BESIDE: Point = { x: 8, y: 8 };

export async function clickBeside(
  sheet: Locator,
  button: 'left' | 'right' = 'left',
): Promise<void> {
  await sheet.click({ position: BESIDE, button });
}
