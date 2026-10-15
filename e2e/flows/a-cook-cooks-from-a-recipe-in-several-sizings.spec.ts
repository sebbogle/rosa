import { ragu, tarkaDal } from '../recipes';
import { expect, test } from '../test';

test('a cook cooks from a recipe in several sizings', async ({
  page,
  cookbook,
  contents,
  sides,
}) => {
  await cookbook.holds(ragu, tarkaDal);
  const { one } = sides;
  const { tabs, pane } = one;

  await contents.pick('Ragù alla bolognese', ['Pasta']);
  await expect(pane.sizings).toMatchAriaSnapshot(`
    - radiogroup "Sizing":
      - radio "One serving" [checked]
      - radio "Sizing 2" [checked=false]
      - radio "Full house" [checked=false]
  `);
  await expect(pane.ingredients.quantities).toHaveText(['125 g', '½ tin', '100 g']);

  await pane.chooseSizing('Full house');
  await expect(pane.sizingShown).toHaveAccessibleName('Full house');
  await expect(pane.ingredients.quantities).toHaveText(['1.2 kg', '3 tins', '1 kg']);
  await expect(pane.ingredients.rows).toHaveText([
    '1.2 kg beef mince',
    '3 tins chopped tomatoes',
    'salt and black pepper, to taste',
    '1 kg tagliatelle',
  ]);

  await page.reload();
  await expect(tabs).toHaveText(['Ragù alla bolognese']);
  await expect(
    pane.sizingShown,
    'a reload should put a preview tab back on its first sizing',
  ).toHaveAccessibleName('One serving');
  await expect(pane.ingredients.quantities).toHaveText(['125 g', '½ tin', '100 g']);

  await pane.chooseSizing('Sizing 2');
  await expect(pane.ingredients.quantities).toHaveText(['500 g', '1 tin', '400 g']);
  await contents.pick('Tarka dal');
  await expect(tabs, 'choosing a sizing should leave the tab a preview').toHaveText(['Tarka dal']);
  await expect(pane.sizing).toHaveText('4 bowls');
  await expect(pane.sizings, 'a lone sizing should offer no choice').toHaveCount(0);

  await contents.pick('Ragù alla bolognese', ['Pasta']);
  await expect(
    pane.sizingShown,
    'a recipe opened afresh should start on its first sizing',
  ).toHaveAccessibleName('One serving');

  await pane.chooseSizing('Full house');
  await one.keep('Ragù alla bolognese');
  await expect(pane.sizingShown, 'keeping a tab should keep its choice').toHaveAccessibleName(
    'Full house',
  );
  await pane.chooseSizing('Sizing 2');
  await contents.pick('Tarka dal');
  await expect(tabs).toHaveText(['Ragù alla bolognese', 'Tarka dal']);
  await contents.pick('Ragù alla bolognese', ['Pasta']);
  await expect(pane.sizingShown, 'a kept tab should hold its choice').toHaveAccessibleName(
    'Sizing 2',
  );
  await expect(pane.ingredients.quantities).toHaveText(['500 g', '1 tin', '400 g']);

  await page.reload();
  await expect(tabs).toHaveText(['Ragù alla bolognese']);
  await expect(
    pane.sizingShown,
    'a kept tab should take its choice into the next session',
  ).toHaveAccessibleName('Sizing 2');
  await expect(pane.ingredients.quantities).toHaveText(['500 g', '1 tin', '400 g']);

  await one.close('Ragù alla bolognese');
  await contents.pick('Ragù alla bolognese', ['Pasta']);
  await expect(pane.sizingShown, 'closing a tab should let its choice go').toHaveAccessibleName(
    'One serving',
  );
});
