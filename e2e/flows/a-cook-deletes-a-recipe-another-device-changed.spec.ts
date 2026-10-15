import { shakshuka, tarkaDal } from '../recipes';
import { expect, test } from '../test';

const UPSTREAM_RETRY = 15_000;

const NOTES_THERE = 'Better with smoked paprika.';

const NOTES_HERE = 'Temper the spices in ghee, not oil.';

test('a cook deletes a recipe another device changed', async ({
  besideTheGear,
  cookbook,
  contents,
  editor,
  googleDrive,
  settings,
  sides,
}) => {
  test.slow();
  await cookbook.holds(shakshuka, tarkaDal);
  const { pane } = sides.one;
  const inDrive = () => googleDrive.recipes();
  const changedThere = { ...shakshuka, notes: NOTES_THERE };
  const changedHere = { ...tarkaDal, notes: NOTES_HERE };

  await settings.open();
  await settings.sync();
  await expect
    .poll(inDrive, { message: 'the first sync should fill Drive', timeout: UPSTREAM_RETRY })
    .toEqual([shakshuka, tarkaDal]);
  await settings.done();
  await googleDrive.fallsQuiet();
  googleDrive.lapse();

  await contents.pick('Shakshuka');
  await pane.edit();
  await editor.delete();
  await editor.confirmDelete();
  await contents.pick('Tarka dal');
  await pane.edit();
  await editor.typeNotes(NOTES_HERE);
  await editor.done();
  await expect(
    besideTheGear.syncButton,
    'a delete and an edit between hours should be unsent changes',
  ).toHaveAccessibleDescription('Unsent changes');

  googleDrive.anotherDeviceEdits(changedThere);
  googleDrive.anotherDeviceDeletes(tarkaDal);
  await besideTheGear.syncWithDrive();
  await expect(besideTheGear.root).toMatchAriaSnapshot(`
    - /children: equal
    - button "In Google Drive" [disabled]
  `);

  await expect
    .poll(inDrive, {
      message: 'a recipe deleted on one device and changed on the other should come back changed',
      timeout: UPSTREAM_RETRY,
    })
    .toEqual([changedThere, changedHere]);
  await contents.open();
  await expect(contents.root, 'both recipes should be back in the cookbook here')
    .toMatchAriaSnapshot(`
    - button "Shakshuka"
    - button "Tarka dal"
  `);
  await contents.close();
  await contents.pick('Shakshuka');
  await expect(pane.notes, 'the recipe deleted here should come back as changed there').toHaveText(
    NOTES_THERE,
  );
  await contents.pick('Tarka dal');
  await expect(pane.notes, 'the recipe deleted there should keep the change made here').toHaveText(
    NOTES_HERE,
  );
});
