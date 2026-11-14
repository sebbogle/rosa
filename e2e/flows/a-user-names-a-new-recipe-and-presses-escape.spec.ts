import { expect, test } from '../test';

const TITLE = 'Focaccia';

test('a user names a new recipe and presses Escape', async ({ page, contents, editor, sides }) => {
  const { tabs, pane, resting } = sides.one;

  await resting.addNewRecipe();
  await editor.typeTitle(TITLE);
  await editor.dismiss();
  await expect(editor.warning, 'a recipe with a title should not be warned about').toBeHidden();
  await expect(editor.root).toBeHidden();

  await expect(tabs).toHaveText([TITLE]);
  await expect(pane.title).toHaveText(TITLE);
  await contents.open();
  await expect(contents.root).toMatchAriaSnapshot(`
    - button "${TITLE}"
  `);

  await page.reload();
  await expect(tabs).toHaveText([TITLE]);
});
