import { focaccia, lemonTart, shakshuka, sodaBread, tarkaDal, turkishEggs } from '../recipes';
import { expect, test } from '../test';
import { today } from '../today';

test('a user exports part of the cookbook and reads it as a standalone page', async ({
  page,
  cookbook,
  contents,
  exportPicker,
  settings,
  sides,
  standalonePages,
  window,
}) => {
  await cookbook.holds(shakshuka, turkishEggs, focaccia, sodaBread, lemonTart, tarkaDal);
  const { one } = sides;
  const { pane } = one;

  await contents.pick('Soda bread', ['Baking', 'Bread']);
  await pane.chooseSizing('Two loaves');
  await one.keep('Soda bread');

  await expect(window.root).toHaveAttribute('data-appearance', 'default');
  await settings.open();
  await settings.appearance('E-ink');
  await expect(window.root).toHaveAttribute('data-appearance', 'e-ink');
  await settings.done();
  await expect(settings.gear, 'closing Settings should hand focus back to the gear').toBeFocused();

  await page.reload();
  await expect(window.root, 'E-ink should survive a reload').toHaveAttribute(
    'data-appearance',
    'e-ink',
  );
  await expect(
    pane.sizingShown,
    'the user should be reading Soda bread in its second sizing as they export',
  ).toHaveAccessibleName('Two loaves');

  await settings.open();
  await expect(settings.appearances).toMatchAriaSnapshot(`
    - radiogroup "Appearance":
      - radio "Default" [checked=false]
      - radio "E-ink" [checked]
  `);

  await exportPicker.open();
  await expect(exportPicker.root, 'with everything ticked, Tick all should have nothing left to do')
    .toMatchAriaSnapshot(`
    - region "Choose recipes":
      - searchbox "Filter recipes"
      - button "Clear"
      - button "Tick all" [disabled]
      - checkbox "Baking" [checked]
      - button "Export 6"
  `);
  await expect(exportPicker.root, 'the panel should not count in words').not.toContainText(
    'to export',
  );

  await exportPicker.clear();
  await expect(exportPicker.clearButton, 'Clear should go once nothing is ticked').toBeHidden();
  await expect(exportPicker.sweepButton, 'Clear should hand focus to Tick all').toBeFocused();
  await expect(exportPicker.sweepButton).toBeEnabled();
  await expect(exportPicker.root).toMatchAriaSnapshot(`
    - region "Choose recipes":
      - searchbox "Filter recipes"
      - button "Tick all"
      - checkbox "Baking" [checked=false]
      - checkbox "Brunch" [checked=false]
      - checkbox "Shakshuka" [checked=false]
      - checkbox "Tarka dal" [checked=false]
      - button "Export" [disabled]
  `);

  await exportPicker.filter('lemon');
  await exportPicker.sweep();
  await expect(exportPicker.root, 'Tick all should reach only what the filter matches')
    .toMatchAriaSnapshot(`
    - region "Choose recipes":
      - searchbox "Filter recipes": lemon
      - button "Clear"
      - button "Tick all" [disabled]
      - checkbox "Baking" [checked=mixed]
      - checkbox "Tarts" [checked]
      - checkbox "Lemon tart" [checked]
      - button "Export 1"
  `);

  await exportPicker.tick('Baking');
  await expect(
    exportPicker.root,
    'a folder’s box should mean the whole folder, whatever the filter is showing',
  ).toMatchAriaSnapshot(`
    - region "Choose recipes":
      - button "Clear"
      - button "Tick all" [disabled]
      - checkbox "Baking" [checked]
      - checkbox "Bread" [checked]
      - checkbox "Tarts" [checked]
      - checkbox "Lemon tart" [checked]
      - radiogroup "Format"
      - status: 2 ticked outside the filter
      - button "Cancel"
      - button "Export 3"
  `);

  await exportPicker.clear();
  await expect(exportPicker.root, 'Clear should reach what is outside the filter too')
    .toMatchAriaSnapshot(`
    - region "Choose recipes":
      - searchbox "Filter recipes": lemon
      - button "Tick all"
      - checkbox "Baking" [checked=false]
      - checkbox "Tarts" [checked=false]
      - checkbox "Lemon tart" [checked=false]
      - button "Export" [disabled]
  `);
  await expect(exportPicker.clearButton).toBeHidden();

  await exportPicker.tick('Lemon tart');
  await expect(exportPicker.root).toMatchAriaSnapshot(`
    - region "Choose recipes":
      - checkbox "Baking" [checked=mixed]
      - checkbox "Lemon tart" [checked]
      - button "Export 1"
  `);

  await exportPicker.tick('Baking');
  await exportPicker.format('HTML');
  await expect(exportPicker.root).toMatchAriaSnapshot(`
    - region "Choose recipes":
      - button "Tick all" [disabled]
      - checkbox "Baking" [checked]
      - checkbox "Lemon tart" [checked]
      - radiogroup "Format":
        - radio "JSON" [checked=false]
        - radio "HTML" [checked]
      - status: 2 ticked outside the filter
      - button "Cancel"
      - button "Export 3"
  `);

  const file = await exportPicker.export();
  expect(file.name, 'the file should be named after the folder').toBe(
    `rosa-baking-${today()}.html`,
  );
  await expect(settings.importAndExport).toMatchAriaSnapshot(`
    - region "Import & export":
      - heading "Export" [level=3]
      - paragraph: 3 recipes to export → ${file.name}
      - button "Export"
  `);
  await settings.done();

  await settings.open();
  await expect(
    settings.importAndExport,
    'reopening Settings should put the whole cookbook back to export',
  ).toMatchAriaSnapshot(`
    - region "Import & export":
      - /children: equal
      - heading "Import & export" [level=2]
      - heading "Import" [level=3]
      - button "Choose files"
      - heading "Export" [level=3]
      - button "Export"
  `);
  await exportPicker.open();
  await expect(exportPicker.root).toMatchAriaSnapshot(`
    - region "Choose recipes":
      - button "Tick all" [disabled]
      - checkbox "Baking" [checked]
      - checkbox "Brunch" [checked]
      - checkbox "Shakshuka" [checked]
      - checkbox "Tarka dal" [checked]
      - button "Export 6"
  `);
  await settings.done();

  await contents.pick('Lemon tart', ['Baking', 'Tarts']);
  await expect(pane.root).toMatchAriaSnapshot(lemonTartReads({ frozen: false }));
  await expect(pane.editButton).toBeVisible();

  const standalone = await standalonePages.open(file);
  await expect(standalone.root, 'a standalone page should be exported in Default').toHaveAttribute(
    'data-appearance',
    'default',
  );
  await expect(window.root, 'rosa should stay in E-ink').toHaveAttribute(
    'data-appearance',
    'e-ink',
  );
  await expect(standalone.pane.title).toHaveText('Focaccia');
  await expect(standalone.pane.editButton, 'a standalone page should open frozen').toHaveCount(0);

  await standalone.contents.pick('Lemon tart', ['Baking', 'Tarts']);
  await expect(standalone.pane.root).toMatchAriaSnapshot(lemonTartReads({ frozen: true }));
  await standalone.pane.chooseSizing('12 slices');
  await expect(standalone.pane.ingredients.quantities).toHaveText(TWELVE_SLICES);

  await standalone.contents.pick('Soda bread', ['Baking', 'Bread']);
  await expect(
    standalone.pane.sizingShown,
    'a standalone page should open on the first sizing, whichever the user was reading',
  ).toHaveAccessibleName('One loaf');
  await expect(standalone.pane.ingredients.quantities).toHaveText(ONE_LOAF);
  await standalone.pane.chooseSizing('Two loaves');
  await expect(standalone.pane.ingredients.quantities).toHaveText(TWO_LOAVES);

  await standalone.contents.pick('Lemon tart', ['Baking', 'Tarts']);
  await expect(
    standalone.pane.sizingShown,
    'each recipe on the page should keep its own choice',
  ).toHaveAccessibleName('12 slices');
  await expect(standalone.pane.ingredients.quantities).toHaveText(TWELVE_SLICES);

  await standalone.contents.pick('Soda bread', ['Baking', 'Bread']);
  await expect(standalone.pane.sizingShown).toHaveAccessibleName('Two loaves');

  await standalone.reload();
  await expect(standalone.pane.title).toHaveText('Soda bread');
  await expect(
    standalone.pane.sizingShown,
    'a reload should put every recipe back on its first sizing',
  ).toHaveAccessibleName('One loaf');
  await expect(standalone.pane.ingredients.quantities).toHaveText(ONE_LOAF);
  await standalone.contents.pick('Lemon tart', ['Baking', 'Tarts']);
  await expect(standalone.pane.root).toMatchAriaSnapshot(lemonTartReads({ frozen: true }));

  await standalone.contents.pick('Focaccia', ['Baking', 'Bread']);
  await expect(standalone.pane.title).toHaveText('Focaccia');
});

const TWELVE_SLICES = ['250 g', '150 g', '35 g', '2', '6', '7', '225 g', '225 ml'];

const ONE_LOAF = ['500 g', '1 tsp', '1 tsp', '400 ml'];

const TWO_LOAVES = ['1 kg', '2 tsp', '2 tsp', '800 ml'];

function lemonTartReads({ frozen }: { readonly frozen: boolean }): string {
  const editControl = frozen ? '' : '\n    - button "Edit recipe": ✎';

  return `
    - /children: deep-equal
    - heading "Lemon tart" [level=1]
    - paragraph: Baking › Tarts
    - paragraph: citrus weekend
    - paragraph: Prep 1 hr, plus chilling
    - paragraph: Take it out while the middle still wobbles.
    - text: The River Cafe Cook Book${editControl}
    - heading "Ingredients" [level=2]
    - radiogroup "Sizing":
      - radio "8 slices" [checked]
      - text: 8 slices
      - radio "12 slices" [checked=false]
      - text: 12 slices
    - list:
      - listitem: 175 g plain flour
      - listitem: 100 g cold butter, diced
      - listitem: 25 g icing sugar
      - listitem: 1 egg yolk
    - heading "For the filling" [level=3]
    - list:
      - listitem: 4 lemons, zested and juiced
      - listitem: 5 eggs
      - listitem: 150 g caster sugar
      - listitem: 150 ml double cream
    - heading "Method" [level=2]
    - list:
      - listitem: Rub the butter into the flour and sugar, bind it with the yolk and chill it for 30 minutes.
      - listitem: Line the tin with the pastry and bake it blind at 180°C for 20 minutes.
      - listitem: Whisk the filling together, pour it into the case and bake at 140°C for 30 minutes.
  `;
}
