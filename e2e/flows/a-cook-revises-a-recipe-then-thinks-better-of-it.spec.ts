import { shakshuka, turkishEggs } from '../recipes';
import { expect, test } from '../test';

test('a cook revises a recipe, then thinks better of it', async ({
  page,
  cookbook,
  contents,
  editor,
  sides,
}) => {
  await cookbook.holds(shakshuka, turkishEggs);
  const { tabs, pane } = sides.one;

  await contents.pick('Shakshuka');
  await expect(tabs).toHaveText(['Shakshuka']);
  await expect(page).toHaveURL(`/recipe/${shakshuka.id}`);
  await pane.edit();
  await expect(editor.root).toBeVisible();

  await sides.closeActiveTab();
  await editor.pressShiftTab();
  await expect(
    editor.behind.locator(':focus'),
    'Shift+Tab should not reach anything behind the Sheet',
  ).toHaveCount(0);
  await editor.pressTab();
  await expect(editor.title, 'Tab should come back into the Sheet').toBeFocused();
  await expect(tabs, 'Alt+W should leave the tab behind the Sheet open').toHaveText(['Shakshuka']);
  expect(
    await sides.pressIn(editor.title, 'Alt+ArrowLeft'),
    'Alt+ArrowLeft should be left to a field in the Sheet',
  ).toBe('left alone');

  await editor.typeTitle('Eggs in purgatory');
  await editor.leaveTitle();
  await expect(pane.title).toHaveText('Eggs in purgatory');
  await expect(page).toHaveURL(`/recipe/${shakshuka.id}`);

  await editor.typeTitle('');
  await editor.leaveTitle();
  await editor.done();

  await expect(pane.title).toHaveText('Eggs in purgatory');
  await expect(tabs).toHaveText(['Eggs in purgatory']);
  await contents.open();
  await expect(contents.root).toMatchAriaSnapshot(`
    - button "Brunch"
    - button "Eggs in purgatory"
  `);
  await contents.close();

  await pane.edit();
  await editor.putIn(['Brunch']);
  await expect(pane.folder).toHaveText('Brunch');

  await editor.removeTag('spicy');
  await editor.addTag('weekend');
  await expect(pane.tags).toHaveText(['eggs', 'weekend']);

  await editor.deleteRow('Ingredients', { group: '', row: 3 });
  await editor.writeIngredient(
    { group: '', row: 7 },
    { item: 'ground cumin', quantities: [{ quantity: '1', unit: 'tsp' }] },
  );
  await expect(pane.ingredients.rows).toHaveText([
    '2 tbsp olive oil',
    '1 onion, sliced',
    '2 cloves garlic, sliced',
    '400 g chopped tomatoes',
    '4 eggs',
    'crusty bread',
    '1 tsp ground cumin',
    '50 g feta',
    'parsley, chopped',
  ]);

  await editor.dragRow('Ingredients', { group: '', row: 6 }, { group: 'To serve', row: 3 });
  await expect(pane.ingredients.group('To serve')).toHaveText([
    '50 g feta',
    'parsley, chopped',
    'crusty bread',
  ]);

  await editor.dragRow('Ingredients', { group: 'To serve', row: 3 }, { group: 'To serve', row: 1 });
  await expect(pane.ingredients.group('To serve')).toHaveText([
    'crusty bread',
    '50 g feta',
    'parsley, chopped',
  ]);

  await editor.dragRow('Ingredients', { group: 'To serve', row: 1 }, { group: 'To serve', row: 3 });
  await expect(pane.ingredients.group('To serve')).toHaveText([
    '50 g feta',
    'parsley, chopped',
    'crusty bread',
  ]);

  await editor.writeStep({ group: '', row: 4 }, 'Scatter over the feta and parsley.');
  await expect(pane.method.rows).toHaveText([
    'Soften the onion and pepper in the oil, then add the garlic.',
    'Tip in the tomatoes and simmer until thick.',
    'Make four wells, crack in the eggs, cover and cook until just set.',
    'Scatter over the feta and parsley.',
  ]);

  await editor.addGroup('Ingredients', 'Garnish');
  await editor.writeIngredient(
    { group: 'Garnish', row: 1 },
    { item: 'chilli flakes', quantities: [{ quantity: 'a pinch', unit: '' }] },
  );
  await expect(pane.ingredients.groups).toHaveText(['To serve', 'Garnish']);

  await editor.renameGroup('Ingredients', 'Garnish', 'To finish');
  await expect(pane.ingredients.groups).toHaveText(['To serve', 'To finish']);

  await editor.moveGroupUp('Ingredients', 'To finish');
  await expect(pane.ingredients.groups).toHaveText(['To finish', 'To serve']);

  await editor.dragGroup('Ingredients', 'To finish', 'To serve');
  await expect(pane.ingredients.groups).toHaveText(['To serve', 'To finish']);

  await editor.dragGroup('Ingredients', 'To finish', 'To serve');
  await expect(pane.ingredients.groups).toHaveText(['To finish', 'To serve']);

  await editor.deleteGroupKeepingRows('Ingredients', 'To serve');
  await expect(pane.ingredients.groups).toHaveText(['To finish']);
  await expect(pane.ingredients.group('To finish')).toHaveText([
    'a pinch chilli flakes',
    '50 g feta',
    'parsley, chopped',
    'crusty bread',
  ]);
  await editor.done();

  await contents.open();
  await expect(contents.root).toMatchAriaSnapshot(`
    - button "Brunch" [expanded]
    - button "Eggs in purgatory"
    - button "Turkish eggs"
  `);
  await contents.close();

  await pane.edit();
  await editor.typeTitle('Menemen');
  await editor.leaveTitle();
  await editor.removeTag('eggs');
  await editor.deleteRow('Method', { group: '', row: 1 });
  await editor.putIn([]);
  await expect(pane.title).toHaveText('Menemen');
  await expect(pane.tags).toHaveText(['weekend']);
  await expect(pane.method.rows).toHaveCount(3);
  await expect(pane.folder).toBeHidden();

  await editor.revert();
  await expect(editor.reverting).toBeVisible();
  await editor.confirmRevert();
  await editor.done();

  await expect(pane.title).toHaveText('Eggs in purgatory');
  await expect(pane.folder).toHaveText('Brunch');
  await expect(pane.tags).toHaveText(['eggs', 'weekend']);
  await expect(pane.method.rows).toHaveText([
    'Soften the onion and pepper in the oil, then add the garlic.',
    'Tip in the tomatoes and simmer until thick.',
    'Make four wells, crack in the eggs, cover and cook until just set.',
    'Scatter over the feta and parsley.',
  ]);
  await expect(pane.ingredients.groups).toHaveText(['To finish']);
  await expect(tabs).toHaveText(['Eggs in purgatory']);
  await contents.open();
  await expect(contents.root).toMatchAriaSnapshot(`
    - button "Brunch" [expanded]
    - button "Eggs in purgatory"
    - button "Turkish eggs"
  `);
});
