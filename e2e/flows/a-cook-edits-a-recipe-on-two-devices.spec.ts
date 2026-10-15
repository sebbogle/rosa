import { shakshuka } from '../recipes';
import { expect, test } from '../test';

const UPSTREAM_RETRY = 15_000;

const NOTES_HERE = 'Good cold, straight from the pan.';

const NOTES_HERE_AGAIN = 'Good warm too, with yoghurt.';

const NOTES_THERE = 'Better with smoked paprika.';

const METHOD_THERE = [
  {
    group: '',
    steps: [
      'Soften the onion and pepper in the oil, then add the garlic and cumin.',
      'Tip in the tomatoes and simmer until thick.',
      'Make four wells, crack in the eggs, cover and cook until just set.',
    ],
  },
];

const TAGS_THERE = ['eggs', 'spicy', 'brunch'];

test('a cook edits a recipe on two devices', async ({
  besideTheGear,
  cookbook,
  contents,
  editor,
  googleDrive,
  settings,
  sides,
}) => {
  test.slow();
  await cookbook.holds(shakshuka);
  const { pane } = sides.one;
  const inDrive = () => googleDrive.recipes()?.find(({ id }) => id === shakshuka.id);
  const inGoogleDrive = `
    - /children: equal
    - button "In Google Drive" [disabled]
  `;

  await settings.open();
  await settings.sync();
  await expect
    .poll(inDrive, { message: 'the first sync should fill Drive', timeout: UPSTREAM_RETRY })
    .toEqual(shakshuka);
  await settings.done();
  await googleDrive.fallsQuiet();
  googleDrive.lapse();

  await contents.pick('Shakshuka');
  await pane.edit();
  await editor.typeNotes(NOTES_HERE);
  await editor.done();
  await expect(
    besideTheGear.syncButton,
    'notes written between hours should be an unsent change',
  ).toHaveAccessibleDescription('Unsent changes');

  googleDrive.anotherDeviceEdits({ ...shakshuka, method: METHOD_THERE });
  await besideTheGear.syncWithDrive();
  await expect(besideTheGear.root).toMatchAriaSnapshot(inGoogleDrive);

  const bothKept = { ...shakshuka, notes: NOTES_HERE, method: METHOD_THERE };
  await expect
    .poll(inDrive, {
      message: 'Drive should keep the notes written here and the method changed on another device',
      timeout: UPSTREAM_RETRY,
    })
    .toEqual(bothKept);
  await expect(pane.notes, 'the notes written here should be kept').toHaveText(NOTES_HERE);
  await expect(
    pane.method.rows,
    'the method changed on another device should arrive beside them',
  ).toHaveText(METHOD_THERE[0].steps);

  await googleDrive.fallsQuiet();
  googleDrive.lapse();
  await pane.edit();
  await editor.typeNotes(NOTES_HERE_AGAIN);
  await editor.done();
  await expect(besideTheGear.syncButton).toHaveAccessibleDescription('Unsent changes');

  googleDrive.anotherDeviceEdits({ ...bothKept, notes: NOTES_THERE, tags: TAGS_THERE });
  await besideTheGear.syncWithDrive();
  await expect(besideTheGear.root).toMatchAriaSnapshot(inGoogleDrive);

  const ownNotesKept = {
    ...bothKept,
    notes: NOTES_HERE_AGAIN,
    tags: TAGS_THERE,
  };
  await expect
    .poll(inDrive, {
      message: 'notes changed on both devices should be the syncing device’s own',
      timeout: UPSTREAM_RETRY,
    })
    .toEqual(ownNotesKept);
  await expect(pane.notes, 'the syncing device should keep its own notes').toHaveText(
    ownNotesKept.notes,
  );
  await expect(pane.tags, 'the tags changed on another device should still arrive').toHaveText(
    TAGS_THERE,
  );
});
