import { expect, test } from '../test';

const TITLE = 'Focaccia';

const NOTES = 'Better the next day, warmed through.';

test('a user presses Escape as a new recipe enters the cookbook', async ({
  page,
  editor,
  sides,
}) => {
  const { tabs, pane, resting } = sides.one;

  await resting.addNewRecipe();
  await editor.typeTitle(TITLE);
  await editor.typeNotes(NOTES);
  await editor.dismiss();
  await expect(editor.warning, 'a recipe with a title should not be warned about').toBeHidden();
  await expect(editor.root).toBeHidden();

  await expect(tabs).toHaveText([TITLE]);
  await expect(
    pane.notes,
    'a field left as the recipe enters the cookbook should be written',
  ).toHaveText(NOTES);

  await page.reload();
  await expect(pane.notes).toHaveText(NOTES);
});
