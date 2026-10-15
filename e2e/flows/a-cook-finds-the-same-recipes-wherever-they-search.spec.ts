import { focaccia, lemonTart, shakshuka, sodaBread, tarkaDal, turkishEggs } from '../recipes';
import { expect, test } from '../test';

const QUICK = [
  { name: 'Baking', expanded: true },
  { name: 'Bread', expanded: true },
  { name: 'Soda bread' },
  { name: 'Brunch', expanded: true },
  { name: 'Turkish eggs' },
];

test('a cook finds the same recipes wherever they search', async ({
  cookbook,
  contents,
  exportPicker,
  settings,
  standalonePages,
}) => {
  await cookbook.holds(shakshuka, turkishEggs, focaccia, sodaBread, lemonTart, tarkaDal);

  await contents.searchFor('quick');
  await expect
    .poll(() => contents.outline(), 'the Contents should open every folder holding a match')
    .toEqual(QUICK);
  await contents.searchFor('saffron');
  await expect.poll(() => contents.outline(), 'the Contents should show no rows').toEqual([]);
  await contents.clearSearch();
  await contents.close();

  await settings.open();
  await exportPicker.open();
  await exportPicker.clear();
  await exportPicker.filter('quick');
  await expect
    .poll(() => exportPicker.outline(), 'the export picker should search like the Contents')
    .toEqual(QUICK);
  await exportPicker.filter('saffron');
  await expect
    .poll(() => exportPicker.outline(), 'the export picker should show no rows')
    .toEqual([]);

  await exportPicker.filter('');
  await exportPicker.sweep();
  await exportPicker.format('HTML');
  const file = await exportPicker.export();
  await settings.done();

  const standalone = await standalonePages.open(file);
  await standalone.contents.searchFor('quick');
  await expect
    .poll(() => standalone.contents.outline(), 'a standalone page should search like the Contents')
    .toEqual(QUICK);
  await standalone.contents.searchFor('saffron');
  await expect
    .poll(() => standalone.contents.outline(), 'a standalone page should show no rows')
    .toEqual([]);
});
