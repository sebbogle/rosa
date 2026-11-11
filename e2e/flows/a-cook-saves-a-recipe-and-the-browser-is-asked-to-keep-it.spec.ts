import { expect, test } from '../test';

const A_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

test('a cook saves a recipe and the browser is asked to keep it', async ({
  page,
  editor,
  safekeeping,
  sides,
}) => {
  const { tabs, pane, resting } = sides.one;

  await expect(resting.line).toHaveText('No recipes yet.');
  expect(safekeeping.asks, 'rosa should not ask the browser as it opens').toBe(0);

  await resting.addNewRecipe();
  await editor.typeTitle('Focaccia');
  expect(safekeeping.asks, 'rosa should not ask before anything is saved').toBe(0);
  await editor.leaveTitle();
  await expect(tabs).toHaveText(['Focaccia']);
  await expect
    .poll(() => safekeeping.asks, { message: 'the first save should ask the browser' })
    .toBe(1);

  await editor.typeNotes('Better the next day.');
  await editor.done();
  await expect(pane.notes).toHaveText('Better the next day.');
  expect(safekeeping.asks, 'rosa should ask once in a sitting').toBe(1);

  await page.reload();
  await pane.edit();
  await editor.typeNotes('Better the next day, warmed through.');
  await editor.done();
  await expect(pane.notes).toHaveText('Better the next day, warmed through.');
  expect(safekeeping.asks, 'rosa should not ask again so soon after a refusal').toBe(1);

  await page.clock.install();
  await page.clock.fastForward(A_WEEK_MS);
  await page.reload();
  await pane.edit();
  await editor.typeNotes('Best the next day.');
  await editor.done();
  await expect(pane.notes).toHaveText('Best the next day.');
  await expect
    .poll(() => safekeeping.asks, { message: 'a week after a refusal rosa should ask again' })
    .toBe(2);
});

test('a cook saves a recipe in a browser that agrees to keep it', async ({
  page,
  editor,
  safekeeping,
  sides,
}) => {
  const { tabs, pane, resting } = sides.one;
  safekeeping.agree();

  await resting.addNewRecipe();
  await editor.typeTitle('Focaccia');
  await editor.leaveTitle();
  await expect(tabs).toHaveText(['Focaccia']);
  await expect
    .poll(() => safekeeping.asks, { message: 'the first save should ask the browser' })
    .toBe(1);
  await editor.done();

  await page.reload();
  await pane.edit();
  await editor.typeNotes('Better the next day.');
  await editor.done();
  await expect(pane.notes).toHaveText('Better the next day.');
  expect(safekeeping.asks, 'rosa should not ask a browser that already keeps it').toBe(1);
});
