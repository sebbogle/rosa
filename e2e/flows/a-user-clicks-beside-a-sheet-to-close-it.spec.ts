import { recipeFile } from '../recipe-file';
import { lemonTart, shakshuka, turkishEggs } from '../recipes';
import { expect, test } from '../test';

test(
  'a user clicks beside a sheet to close it',
  { tag: '@wide' },
  async ({ cookbook, contents, editor, settings, sides }) => {
    await cookbook.holds(shakshuka, turkishEggs);
    const { pane } = sides.one;

    await contents.pick('Shakshuka');
    await pane.edit();
    await editor.typeSizingName('For four');
    await editor.clickBeside();
    await expect(editor.root).toBeHidden();
    await expect(pane.sizing, 'a field still being typed in should be written').toHaveText(
      'For four',
    );
    await expect(pane.meta).toHaveText('Prep 25 min');

    await pane.edit();
    await editor.openGroupActions('Ingredients', 'To serve');
    await editor.clickBeside();
    await expect(editor.menus).toBeHidden();
    await expect(
      editor.open,
      'a click beside an open menu should close only the menu',
    ).toBeVisible();

    await editor.openFolderPicker();
    await editor.clickBeside();
    await expect(editor.folderDropdown).toBeHidden();
    await expect(
      editor.open,
      'a click beside the folder picker should close only it',
    ).toBeVisible();

    await editor.typeTag('qu');
    await expect(editor.suggestions).toHaveText(['quick']);
    await editor.clickBeside();
    await expect(editor.suggestions).toBeHidden();
    await expect(
      editor.open,
      'a click beside the suggestions should close only them',
    ).toBeVisible();

    await editor.revert();
    await editor.clickBeside();
    await expect(editor.reverting).toBeHidden();
    await expect(editor.open, 'a click beside a confirmation should cancel only it').toBeVisible();

    await editor.selectTitlePastTheSheet();
    await expect(editor.open, 'a selection let go beside the sheet is no click').toBeVisible();

    await editor.dragRowPastTheSheet('Ingredients', { group: '', row: 1 });
    await expect(editor.open, 'a row let go beside the sheet is no click').toBeVisible();

    await editor.pressBesideAndLetGoOnTitle();
    await expect(editor.open, 'a press beside let go on the sheet is no click').toBeVisible();

    await editor.clickBeside('right');
    await expect(editor.open, 'only the primary button closes a sheet').toBeVisible();

    await editor.clickBeside();
    await expect(editor.root).toBeHidden();

    await contents.addNewRecipe();
    await editor.addTag('weekend');
    await editor.clickBeside();
    await expect(editor.warning).toBeVisible();
    await editor.clickBeside();
    await expect(editor.warning, 'a click beside the warning should go back to it').toBeHidden();
    await expect(editor.open).toBeVisible();
    await editor.dismiss();
    await editor.discard();

    await settings.open();
    await settings.clickBeside();
    await expect(settings.root).toBeHidden();

    await settings.open();
    await settings.import([recipeFile(lemonTart)]);
    await expect(settings.report).toHaveText('1 added');
    await settings.clickBeside();
    await expect(settings.root, 'Settings should close over its report').toBeHidden();

    await settings.open();
    await expect(settings.report, 'the report should not outlive the sheet').toBeHidden();
  },
);
