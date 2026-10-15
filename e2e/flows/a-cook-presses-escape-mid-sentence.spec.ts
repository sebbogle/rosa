import { shakshuka } from '../recipes';
import { expect, test } from '../test';

const NOTES = 'Good cold, straight from the pan.';

const STEP = 'Make four wells, crack in the eggs, cover and cook until the whites set.';

test('a cook presses Escape mid-sentence', async ({ page, cookbook, contents, editor, sides }) => {
  await cookbook.holds(shakshuka);
  const { pane } = sides.one;

  await contents.pick('Shakshuka');
  await pane.edit();
  await editor.typeNotes(NOTES);
  await editor.dismiss();
  await expect(editor.root).toBeHidden();
  await expect(pane.notes, 'Escape should write the field being typed in').toHaveText(NOTES);

  await pane.edit();
  await editor.typeStep({ group: '', row: 3 }, STEP);
  await editor.dismiss();
  await expect(editor.root).toBeHidden();
  await expect(pane.method.rows, 'Escape should write the step being typed in').toHaveText([
    'Soften the onion and pepper in the oil, then add the garlic.',
    'Tip in the tomatoes and simmer until thick.',
    STEP,
  ]);

  await page.reload();
  await expect(pane.notes).toHaveText(NOTES);
  await expect(pane.method.rows.last()).toHaveText(STEP);
});
