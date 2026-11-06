import { focaccia, lemonTart, shakshuka, sodaBread, turkishEggs } from '../recipes';
import { expect, test } from '../test';

test('a cook files a recipe in a folder', async ({ cookbook, contents, editor, sides, page }) => {
  await cookbook.holds(shakshuka, turkishEggs, focaccia, sodaBread, lemonTart);
  const { pane } = sides.one;

  await contents.pick('Turkish eggs', ['Brunch']);
  await pane.edit();
  await editor.openFolderPicker();
  await editor.chooseFolder('No folder');
  await expect(editor.folderField).toHaveAccessibleName('Folder No folder');
  await expect(editor.folderField).toContainText('No folder');
  await editor.done();
  await contents.searchFor('turkish');
  await expect
    .poll(() => contents.outline(), 'No folder should put the recipe outside every folder')
    .toEqual([{ name: 'Turkish eggs' }]);
  await contents.clearSearch();
  await contents.close();

  await contents.pick('Shakshuka');
  await pane.edit();
  await editor.openFolderPicker();
  await editor.expandFolder('Baking');
  await editor.chooseFolder('Bread');
  await expect(editor.folderField).toHaveAccessibleName('Folder Baking › Bread');
  await expect(editor.folderDropdown).toBeHidden();
  await expect(editor.folderField, 'choosing should hand focus back to the field').toBeFocused();

  await editor.openFolderPicker();
  await expect(
    editor.folderRow('Bread'),
    'the dropdown should open on the folder the recipe is in',
  ).toHaveAttribute('aria-current', 'true');

  await editor.findFolder('tar');
  await expect(editor.folderDropdown).toMatchAriaSnapshot(`
    - dialog "Choose a folder":
      - /children: equal
      - searchbox "Find a folder": tar
      - button "New folder"
      - button "Collapse Baking" [expanded]
      - button "Baking"
      - button "New folder in Baking"
      - button "Tarts"
      - button "New folder in Tarts"
  `);

  await editor.findFolder('zzz');
  await expect(editor.folderDropdown).toMatchAriaSnapshot(`
    - dialog "Choose a folder":
      - /children: equal
      - searchbox "Find a folder": zzz
      - button "New folder"
      - paragraph: No folder called “zzz”.
      - button "Create “Zzz”"
  `);
  await editor.folderRow('Create “Zzz”').click();
  await editor.waitForFolder(['Zzz']);

  await editor.openFolderPicker();
  await editor.startNewFolder('Baking');
  await expect(editor.folderDropdown).toMatchAriaSnapshot(`
    - dialog "Choose a folder":
      - button "Collapse Baking" [expanded]
      - button "Baking"
      - button "New folder in Baking"
      - textbox "Folder name"
      - button "Add" [disabled]
      - button "Bread"
      - button "New folder in Bread"
      - button "Tarts"
  `);

  await editor.startNewFolder();
  await expect(editor.folderName, 'another + should take the name field with it').toBeFocused();
  await page.keyboard.type('x');
  await expect(editor.folderName).toHaveValue('x');

  await editor.startNewFolder('Baking');
  await editor.folderName.fill('bread');
  await expect(editor.addButton, 'a name should make Add ready').toBeEnabled();
  await editor.addFolder();
  await editor.waitForFolder(['Baking', 'Bread']);
  await editor.openFolderPicker();
  await expect(
    editor.folderRow('Bread'),
    'a name already under Baking should pick that folder, not make another',
  ).toHaveCount(1);

  await editor.startNewFolder('Baking');
  await editor.collapseFolder('Baking');
  await expect(
    editor.folderName,
    'folding Baking away should put its name field away',
  ).toBeHidden();
  await editor.pressEscape();
  await expect(editor.folderDropdown, 'one Escape should then close the picker').toBeHidden();

  await editor.openFolderPicker();
  await editor.startNewFolder('Baking');
  await editor.folderName.fill('pastry');
  await editor.folderName.press('Enter');
  await editor.waitForFolder(['Baking', 'Pastry']);
  await expect(editor.folderDropdown).toBeHidden();
  await editor.done();

  await expect(pane.folder).toHaveText('Baking › Pastry');
  await contents.searchFor('pastry');
  await expect
    .poll(() => contents.outline(), 'the Contents should hold the new folder under Baking')
    .toEqual([
      { name: 'Baking', expanded: true },
      { name: 'Pastry', expanded: true },
      { name: 'Shakshuka' },
    ]);
});

test(
  "a cook sees a folder's new-folder button without hovering",
  { tag: '@narrow' },
  async ({ cookbook, contents, editor, sides }) => {
    await cookbook.holds(shakshuka, focaccia);

    await contents.pick('Shakshuka');
    await sides.one.pane.edit();
    await editor.openFolderPicker();

    await expect(editor.newFolderButton('Baking')).toHaveCSS('opacity', '1');
  },
);
