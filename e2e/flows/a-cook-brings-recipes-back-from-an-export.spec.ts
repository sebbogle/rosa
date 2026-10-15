import { focaccia, shakshuka, tarkaDal, turkishEggs } from '../recipes';
import { expect, test } from '../test';
import { today } from '../today';

test('a cook brings recipes back from an export', async ({
  page,
  cookbook,
  contents,
  editor,
  exportPicker,
  settings,
  sides,
}) => {
  await cookbook.holds(shakshuka, turkishEggs, tarkaDal, focaccia);
  const { one } = sides;
  const { tabs, pane, resting } = one;

  await settings.open();
  await exportPicker.open();
  await expect(exportPicker.root, 'the whole cookbook should be to export').toMatchAriaSnapshot(`
    - region "Choose recipes":
      - button "Untick these"
      - text: 4 recipes to export
      - checkbox "Baking" [checked]
      - checkbox "Brunch" [checked]
      - checkbox "Shakshuka" [checked]
      - checkbox "Tarka dal" [checked]
      - radiogroup "Format":
        - radio "JSON" [checked]
      - button "Export 4"
  `);
  const archive = await exportPicker.export();
  expect(archive.name).toBe(`rosa-cookbook-${today()}.zip`);
  await settings.done();

  await contents.pick('Tarka dal');
  await one.keep('Tarka dal');
  await contents.pick('Shakshuka');
  await expect(tabs).toHaveText(['Tarka dal', 'Shakshuka']);
  await expect(page).toHaveURL(`/recipe/${shakshuka.id}`);

  await pane.edit();
  await editor.delete();
  await expect(editor.deleting).toMatchAriaSnapshot(`
    - alertdialog "Delete recipe":
      - paragraph: Delete Shakshuka?
      - paragraph: It leaves rosa on every device you use, and there is no undo.
      - button "Cancel"
      - button "Delete"
  `);
  await editor.confirmDelete();
  await expect(tabs, 'the deleted recipe’s tab should close').toHaveText(['Tarka dal']);
  await expect(pane.title).toHaveText('Tarka dal');
  await expect(page, 'the address should move on to the next tab').toHaveURL(
    `/recipe/${tarkaDal.id}`,
  );

  await page.goBack();
  await expect(resting.line).toHaveText('That recipe is no longer in your cookbook.');
  await expect(page, 'the address should be corrected to /').toHaveURL('/');

  await contents.pick('Tarka dal');
  await pane.edit();
  await editor.typeTitle('Dal tadka');
  await editor.leaveTitle();
  await editor.done();
  await expect(pane.title).toHaveText('Dal tadka');

  await settings.open();
  await settings.import([
    archive,
    {
      name: 'pancakes.json',
      mimeType: 'application/json',
      buffer: Buffer.from(
        JSON.stringify({
          title: 'Pancakes',
          tags: 'breakfast',
          ingredients: [
            {
              group: '',
              items: [
                {
                  item: 'plain flour',
                  quantities: [
                    { quantity: '125', unit: 'g' },
                    { quantity: '1', unit: 'cup' },
                  ],
                },
              ],
            },
          ],
        }),
      ),
    },
  ]);
  await expect(settings.disclosure, 'a Restore should never be the default').toMatchAriaSnapshot(`
    - region "Import":
      - paragraph: 1 recipe will be replaced, and 1 recipe you deleted will be restored.
      - paragraph: 1 file was refused.
      - checkbox "Replace this recipe" [checked]
      - list:
        - listitem: Dal tadka → Tarka dal
      - checkbox "Restore this recipe" [checked=false]
      - list:
        - listitem: Shakshuka
      - button "Cancel"
      - button "Import 1"
  `);

  await settings.tick('Restore');
  await settings.untick('Replace');
  await settings.confirmImport();
  await expect(settings.importAndExport).toMatchAriaSnapshot(`
    - region "Import & export":
      - status: 1 restored · 2 already here
      - paragraph: 1 left in place
      - paragraph: 1 file was refused.
      - list:
        - listitem: "pancakes.json tags must be a list of tags; ingredients[0].items[0].quantities holds 2, and the recipe has 1 sizing"
  `);
  await settings.done();

  await expect(tabs, 'a Replace left unticked should leave the new title').toHaveText([
    'Dal tadka',
  ]);
  await contents.open();
  await expect(contents.root).toMatchAriaSnapshot(`
    - button "Baking"
    - button "Brunch"
    - button "Dal tadka"
    - button "Shakshuka"
  `);
  await contents.pick('Shakshuka');
  await expect(pane.title).toHaveText('Shakshuka');
  await expect(page, 'a restored recipe should come back under its own id').toHaveURL(
    `/recipe/${shakshuka.id}`,
  );
});
