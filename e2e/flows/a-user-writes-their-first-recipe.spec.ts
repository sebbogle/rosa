import { focaccia } from '../recipes';
import { expect, test } from '../test';

test('a user writes their first recipe', async ({ page, contents, editor, sides }) => {
  const { tabs, pane, resting } = sides.one;

  await expect(resting.line).toHaveText('No recipes yet.');
  await expect(resting.control).toHaveText('Add new recipe');
  await resting.addNewRecipe();
  await expect(editor.root).toBeVisible();

  await editor.typeTitle('Focaccia');
  await expect(tabs).toHaveCount(0);
  await expect(page).toHaveURL(/\/$/);
  await editor.leaveTitle();
  await expect(tabs).toHaveText(['Focaccia']);
  await expect(page).toHaveURL(/\/recipe\/focaccia-[0-9a-f]{12}$/);
  await expect(pane.ingredients.heading).toBeVisible();
  await expect(pane.method.heading).toHaveCount(0);

  await editor.write(focaccia);
  await editor.done();

  await expect(pane.title).toHaveText('Focaccia');
  await expect(pane.folder).toHaveText('Baking › Bread');
  await expect(pane.tags).toHaveText(['bread', 'weekend']);
  await expect(pane.meta).toHaveText('Prep 30 min, plus rising');
  await expect(pane.notes).toHaveText('Better the next day, warmed through.');
  await expect(pane.source).toHaveAccessibleName('cooking.nytimes.com');
  await expect(pane.source).toHaveAttribute('href', focaccia.source.link);

  await expect(pane.sizing).toHaveText('8 squares');
  await expect(pane.ingredients.rows).toHaveText([
    '500 g strong white flour',
    '7 g fast-action yeast',
    '400 ml warm water',
    '4 tbsp olive oil',
    '2 sprigs rosemary',
    'flaky salt',
  ]);
  await expect(pane.ingredients.groups).toHaveText(['For the top']);
  await expect(pane.ingredients.group('For the top')).toHaveText([
    '4 tbsp olive oil',
    '2 sprigs rosemary',
    'flaky salt',
  ]);
  await expect(pane.ingredients.quantities).toHaveText([
    '500 g',
    '7 g',
    '400 ml',
    '4 tbsp',
    '2 sprigs',
  ]);

  await expect(pane.method.rows).toHaveText([
    'Stir the flour, yeast and water into a wet dough, then leave it covered for an hour.',
    'Tip it into an oiled tray and stretch it to the corners.',
    'Dimple the dough, pour over the oil and scatter the rosemary and salt.',
    'Bake at 220°C for 25 minutes.',
  ]);
  await expect(pane.method.groups).toHaveText(['To finish']);
  await expect(pane.method.group('To finish')).toHaveText([
    'Dimple the dough, pour over the oil and scatter the rosemary and salt.',
    'Bake at 220°C for 25 minutes.',
  ]);

  await contents.open();
  await expect(contents.root).toMatchAriaSnapshot(`
    - button "Baking" [expanded]
    - button "Bread" [expanded]
    - button "Focaccia"
  `);

  await page.reload();
  await expect(tabs).toHaveText(['Focaccia']);
  await expect(pane.title).toHaveText('Focaccia');

  await contents.addNewRecipe();
  await editor.typeTag('bre');
  await expect(editor.suggestions).toHaveText(['bread']);
  await editor.pickTag('bread');

  await editor.dismiss();
  await expect(editor.warning).toBeVisible();
  await editor.discard();

  await expect(tabs).toHaveText(['Focaccia']);
  await contents.open();
  await expect(contents.root).toMatchAriaSnapshot(`
    - button "Baking" [expanded]
    - button "Bread" [expanded]
    - button "Focaccia"
  `);

  await page.goto('/');
  await expect(tabs).toHaveText(['Focaccia']);
});
