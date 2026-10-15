import type { Locator, Page } from '@playwright/test';

export const DRAG_STEPS = 10;

const HOLD = 500;

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface Box extends Point {
  readonly width: number;
  readonly height: number;
}

export async function bounds(of: Locator): Promise<Box> {
  const drawn = await of.boundingBox();
  if (!drawn) throw new Error(`${of} is not drawn`);
  return drawn;
}

export function centre({ x, y, width, height }: Box): Point {
  return { x: x + width / 2, y: y + height / 2 };
}

export function bottom({ y, height }: Box): number {
  return y + height;
}

export async function drag(page: Page, from: Point, to: Point, steps: number): Promise<void> {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps });
  await page.mouse.up();
}

export async function longPress(page: Page, from: Point, to: Point, steps: number): Promise<void> {
  await touchDrag(page, from, to, steps, HOLD);
}

export async function swipe(page: Page, from: Point, to: Point, steps: number): Promise<void> {
  await touchDrag(page, from, to, steps, 0);
}

export async function waitForDrop(page: Page): Promise<void> {
  await page.locator('.cdk-drag-preview').waitFor({ state: 'detached' });
}

async function touchDrag(
  page: Page,
  from: Point,
  to: Point,
  steps: number,
  hold: number,
): Promise<void> {
  const session = await page.context().newCDPSession(page);
  const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', at?: Point) =>
    session.send('Input.dispatchTouchEvent', { type, touchPoints: at ? [at] : [] });

  await touch('touchStart', from);
  if (hold > 0) await page.waitForTimeout(hold);
  for (let step = 1; step <= steps; step++) {
    await touch('touchMove', {
      x: from.x + ((to.x - from.x) * step) / steps,
      y: from.y + ((to.y - from.y) * step) / steps,
    });
  }
  await touch('touchEnd');
  await session.detach();
}
