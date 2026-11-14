import { shakshuka } from '../recipes';
import { expect, test } from '../test';

test(
  'a user rearranges a recipe on a phone',
  { tag: '@narrow' },
  async ({ contents, cookbook, editor, sides }) => {
    await cookbook.holds(shakshuka);
    const { pane } = sides.one;

    await contents.pick('Shakshuka');
    await pane.edit();

    await editor.dragRow('Ingredients', { group: '', row: 1 }, { group: '', row: 3 }, 'swipe');
    await editor.dragRow(
      'Ingredients',
      { group: '', row: 7 },
      { group: 'To serve', row: 1 },
      'long press',
    );
    await expect(
      pane.ingredients.rows,
      'a swipe on a grip should leave its row, and a long press should move one',
    ).toHaveText([
      '2 tbsp olive oil',
      '1 onion, sliced',
      '1 red pepper, sliced',
      '2 cloves garlic, sliced',
      '400 g chopped tomatoes',
      '4 eggs',
      'crusty bread',
      '50 g feta',
      'parsley, chopped',
    ]);
    await expect(pane.ingredients.group('To serve')).toHaveText([
      'crusty bread',
      '50 g feta',
      'parsley, chopped',
    ]);

    await editor.dragRow(
      'Ingredients',
      { group: 'To serve', row: 1 },
      { group: 'To serve', row: 3 },
      'long press',
    );
    await expect(pane.ingredients.group('To serve')).toHaveText([
      '50 g feta',
      'parsley, chopped',
      'crusty bread',
    ]);

    await editor.dragRow(
      'Ingredients',
      { group: 'To serve', row: 2 },
      { group: '', row: 1 },
      'long press',
    );
    await expect(pane.ingredients.rows.first()).toHaveText('parsley, chopped');

    await editor.addGroup('Ingredients', 'Garnish');
    await editor.writeIngredient(
      { group: 'Garnish', row: 1 },
      { item: 'chilli flakes', quantities: [{ quantity: 'a pinch', unit: '' }] },
    );
    await expect(pane.ingredients.groups).toHaveText(['To serve', 'Garnish']);

    await editor.openGroupActions('Ingredients', 'To serve');
    await editor.dragGroup('Ingredients', 'Garnish', 'To serve', 'long press');
    await expect(pane.ingredients.groups).toHaveText(['Garnish', 'To serve']);
    await expect(editor.menus, 'a drag should close an open menu').toHaveCount(0);
    await editor.done();

    await expect(pane.ingredients.group('Garnish')).toHaveText(['a pinch chilli flakes']);
  },
);
