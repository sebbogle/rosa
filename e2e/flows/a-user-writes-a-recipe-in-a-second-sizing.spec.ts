import { tarkaDal } from '../recipes';
import { expect, test } from '../test';

const FOUR_BOWLS = [
  '250 g red lentils, rinsed',
  '1 tsp ground turmeric',
  '1 l water',
  '2 tbsp ghee',
  '1 tsp cumin seeds',
  '3 cloves garlic, sliced',
  '2 dried red chillies',
];

const SIX_BOWLS = ['375 g red lentils, rinsed', ...FOUR_BOWLS.slice(1)];

test('a user writes a recipe in a second sizing', async ({ cookbook, contents, editor, sides }) => {
  await cookbook.holds(tarkaDal);
  const { pane } = sides.one;

  await contents.pick('Tarka dal');
  await pane.edit();
  await expect(editor.sizings, 'a lone sizing should offer no choice').toHaveCount(0);
  await expect(editor.sizingName).toHaveValue('4 bowls');
  await editor.openSizingActions('4 bowls');
  await expect(
    editor.menus.getByRole('menuitem', { name: 'Delete sizing', exact: true }),
    'a lone sizing should not be deleted',
  ).toBeDisabled();
  await editor.pressEscape();
  await expect(editor.menus).toBeHidden();
  await expect(editor.open, 'Escape should close only the menu').toBeVisible();

  await editor.addSizing();
  await expect(editor.sizings).toMatchAriaSnapshot(`
    - radiogroup "Sizing":
      - radio "4 bowls" [checked=false]
      - radio "Sizing 2" [checked]
  `);
  await expect(
    editor.sizingName,
    'adding a sizing should put the cursor in its name',
  ).toBeFocused();
  await expect(editor.sizingName).toHaveValue('');
  await expect(editor.sizingName).toHaveAttribute('placeholder', 'Sizing 2');
  await expect
    .poll(() => editor.ingredients(), 'a sizing should be added blank in every row')
    .toEqual([
      'red lentils, rinsed',
      'ground turmeric',
      'water',
      'ghee',
      'cumin seeds',
      'garlic, sliced',
      'dried red chillies',
    ]);

  await editor.typeSizingName('2 bowls');
  await editor.writeQuantity({ group: '', row: 1 }, { quantity: '125', unit: 'g' });
  await editor.writeQuantity({ group: '', row: 2 }, { quantity: '½', unit: 'tsp' });
  await editor.writeQuantity({ group: '', row: 3 }, { quantity: '500', unit: 'ml' });
  await editor.writeQuantity({ group: 'For the tarka', row: 1 }, { quantity: '1', unit: 'tbsp' });
  await editor.writeQuantity({ group: 'For the tarka', row: 2 }, { quantity: '½', unit: 'tsp' });
  await editor.writeQuantity({ group: 'For the tarka', row: 3 }, { quantity: '2', unit: 'cloves' });
  await editor.writeQuantity({ group: 'For the tarka', row: 4 }, { quantity: '1', unit: '' });
  await expect(editor.sizingShown).toHaveAccessibleName('2 bowls');

  await editor.chooseSizing('4 bowls');
  await expect(editor.sizingName).toHaveValue('4 bowls');
  await expect
    .poll(() => editor.ingredients(), 'switching back should find the first sizing untouched')
    .toEqual(FOUR_BOWLS);
  await editor.done();

  await expect(pane.sizings).toMatchAriaSnapshot(`
    - radiogroup "Sizing":
      - radio "4 bowls" [checked]
      - radio "2 bowls" [checked=false]
  `);
  await expect(pane.ingredients.rows).toHaveText(FOUR_BOWLS);
  await pane.chooseSizing('2 bowls');
  await expect(pane.ingredients.rows).toHaveText([
    '125 g red lentils, rinsed',
    '½ tsp ground turmeric',
    '500 ml water',
    '1 tbsp ghee',
    '½ tsp cumin seeds',
    '2 cloves garlic, sliced',
    '1 dried red chillies',
  ]);

  await pane.edit();
  await expect(
    editor.sizingShown,
    'the Editor should open on the first sizing, whichever the pane shows',
  ).toHaveAccessibleName('4 bowls');
  await editor.addSizing();
  await expect(editor.sizingShown).toHaveAccessibleName('Sizing 3');
  await editor.deleteSizing('Sizing 3');
  await expect(editor.sizings, 'a sizing left blank should go at once').toMatchAriaSnapshot(`
    - radiogroup "Sizing":
      - radio "4 bowls" [checked]
      - radio "2 bowls" [checked=false]
  `);
  await expect(editor.deletingSizing).toBeHidden();
  await editor.done();
  await expect(pane.sizingShown, 'Done should leave the pane where it was').toHaveAccessibleName(
    '2 bowls',
  );

  await pane.edit();
  await editor.chooseSizing('2 bowls');
  await editor.deleteSizing('2 bowls');
  await expect(editor.deletingSizing, 'a sizing holding something should be asked about')
    .toMatchAriaSnapshot(`
    - alertdialog "Delete sizing":
      - paragraph: Delete 2 bowls?
      - paragraph: Its name and every quantity and unit typed for it go. The ingredients and the other sizings stay.
      - button "Cancel"
      - button "Delete"
  `);
  await editor.pressEscape();
  await expect(editor.deletingSizing).toBeHidden();
  await expect(
    editor.sizingShown,
    'Escape should cancel only the confirmation',
  ).toHaveAccessibleName('2 bowls');

  await editor.deleteSizing('2 bowls');
  await editor.confirmDeleteSizing();
  await expect(editor.sizings, 'one sizing left should offer no choice').toHaveCount(0);
  await expect(editor.sizingName).toHaveValue('4 bowls');
  await expect.poll(() => editor.ingredients()).toEqual(FOUR_BOWLS);
  await editor.done();

  await expect(pane.sizings).toHaveCount(0);
  await expect(pane.sizing).toHaveText('4 bowls');
  await expect(
    pane.ingredients.rows,
    'a tab on a deleted sizing should fall back to the first',
  ).toHaveText(FOUR_BOWLS);

  await pane.edit();
  await editor.copySizing('4 bowls');
  await expect(editor.sizings, 'a copy should land right after its sizing, unnamed')
    .toMatchAriaSnapshot(`
    - radiogroup "Sizing":
      - radio "4 bowls" [checked=false]
      - radio "Sizing 2" [checked]
  `);
  await expect(
    editor.sizingName,
    'copying a sizing should put the cursor in its name',
  ).toBeFocused();
  await expect(editor.sizingName).toHaveValue('');
  await expect
    .poll(() => editor.ingredients(), 'a copy should carry every quantity and unit as it stands')
    .toEqual(FOUR_BOWLS);

  await editor.typeSizingName('6 bowls');
  await editor.writeQuantity({ group: '', row: 1 }, { quantity: '375', unit: 'g' });
  await editor.moveSizing('6 bowls', 'left');
  await expect(editor.sizings, 'the Editor should follow the moved sizing').toMatchAriaSnapshot(`
    - radiogroup "Sizing":
      - radio "6 bowls" [checked]
      - radio "4 bowls" [checked=false]
  `);
  await expect
    .poll(() => editor.ingredients(), 'a moved sizing should take its amounts with it')
    .toEqual(SIX_BOWLS);
  await editor.done();

  await expect(pane.sizings, 'the pane should offer the new order').toMatchAriaSnapshot(`
    - radiogroup "Sizing":
      - radio "6 bowls"
      - radio "4 bowls"
  `);
  await pane.chooseSizing('6 bowls');
  await expect(pane.ingredients.rows, 'each name should read its own amounts').toHaveText(
    SIX_BOWLS,
  );
  await pane.chooseSizing('4 bowls');
  await expect(pane.ingredients.rows).toHaveText(FOUR_BOWLS);
});
