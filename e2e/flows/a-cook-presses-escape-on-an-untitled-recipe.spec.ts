import { expect, test } from '../test';

const NOTES = 'Better the next day, warmed through.';

const NO_RECIPES = 'No recipes yet.';

test('a cook presses Escape on an untitled recipe', async ({ page, editor, sides }) => {
  const { tabs, resting } = sides.one;

  await resting.addNewRecipe();
  await editor.typeNotes(NOTES);
  await editor.dismiss();
  await expect(editor.warning).toBeVisible();
  await editor.discard();

  await expect(tabs).toHaveCount(0);
  await expect(resting.line).toHaveText(NO_RECIPES);

  await page.reload();
  await expect(resting.line).toHaveText(NO_RECIPES);
});
