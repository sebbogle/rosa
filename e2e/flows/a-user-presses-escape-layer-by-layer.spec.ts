import { shakshuka, turkishEggs } from '../recipes';
import { tabsOutOf } from '../surfaces/layer';
import { expect, test } from '../test';

const NOTES = 'Better the next day, warmed through.';

test('a user presses Escape layer by layer', async ({
  page,
  cookbook,
  contents,
  editor,
  sides,
}) => {
  await cookbook.holds(shakshuka, turkishEggs);
  const { pane } = sides.one;

  await contents.pick('Shakshuka');
  await pane.edit();

  await editor.openGroupActions('Ingredients', 'To serve');
  await editor.pressEscape();
  await expect(editor.menus).toBeHidden();
  await expect(editor.open, 'Escape should close only the menu').toBeVisible();

  await editor.openFolderPicker();
  await editor.startNewFolder();
  await editor.pressEscape();
  await expect(editor.folderName).toBeHidden();
  await expect(
    editor.folderDropdown,
    'Escape should close only the new folder field',
  ).toBeVisible();
  await editor.pressEscape();
  await expect(editor.folderDropdown).toBeHidden();
  await expect(editor.open, 'Escape should close only the folder picker').toBeVisible();
  await expect(editor.folderField, 'closing the picker should hand focus back to it').toBeFocused();

  await editor.typeTag('qu');
  await expect(editor.suggestions).toHaveText(['quick']);
  await editor.pressEscape();
  await expect(editor.suggestions).toBeHidden();
  await expect(editor.open, 'Escape should close only the suggestions').toBeVisible();

  await editor.revert();
  expect(
    await tabsOutOf(page, editor.reverting),
    'Tab should reach nothing behind the confirmation',
  ).toEqual([]);
  await editor.pressEscape();
  await expect(editor.reverting).toBeHidden();
  await expect(editor.open, 'Escape should cancel only the confirmation').toBeVisible();

  await editor.dismiss();
  await expect(editor.root).toBeHidden();
  await expect(pane.editButton, 'closing the editor should hand focus back to Edit').toBeFocused();

  await contents.addNewRecipe();
  await editor.typeNotes(NOTES);
  await editor.dismiss();
  await expect(editor.warning).toBeVisible();
  await editor.pressEscape();
  await expect(editor.warning).toBeHidden();
  await expect(
    editor.open,
    'a second Escape straight away should go back to the recipe, not let it go',
  ).toBeVisible();

  await editor.dismiss();
  await editor.discard();
});
