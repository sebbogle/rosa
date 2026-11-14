import { shakshuka } from '../recipes';
import { expect, test } from '../test';

const UPSTREAM_RETRY = 15_000;

const NOTES_HERE = 'Good cold, straight from the pan.';

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

test('a user puts their recipes back after another device did', async ({
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
  const inDrive = () => googleDrive.recipes();
  const keptHere = { ...shakshuka, notes: NOTES_HERE };

  await settings.open();
  await settings.sync();
  await expect
    .poll(inDrive, { message: 'the first sync should fill Drive', timeout: UPSTREAM_RETRY })
    .toEqual([shakshuka]);
  await settings.done();
  await googleDrive.fallsQuiet();
  googleDrive.expireToken();

  await contents.pick('Shakshuka');
  await pane.edit();
  await editor.typeNotes(NOTES_HERE);
  await editor.done();
  await expect(besideTheGear.syncButton).toHaveAccessibleDescription('Unsent changes');

  googleDrive.clearedElsewhere();
  googleDrive.anotherDeviceWrites({ ...shakshuka, method: METHOD_THERE });
  await besideTheGear.syncWithDrive();
  await besideTheGear.openGoogleDrive();
  await expect(
    settings.googleDrive,
    'a folder put back by another device should still be a Drive cleared from here',
  ).toMatchAriaSnapshot(`
    - region "Google Drive":
      - /children: equal
      - heading "Google Drive" [level=2]
      - paragraph: Your recipes are still on this device, but they are no longer in Google Drive.
      - paragraph: ${googleDrive.account}
      - button "Clear Drive"
      - button "Disconnect"
      - button "Put them back in Drive"
  `);
  expect(inDrive(), 'nothing should be sent before the user puts them back').toEqual([
    { ...shakshuka, method: METHOD_THERE },
  ]);

  await settings.putThemBack();
  await expect
    .poll(inDrive, {
      message: 'the device putting them back should keep its own wherever the two differ',
      timeout: UPSTREAM_RETRY,
    })
    .toEqual([keptHere]);
  await settings.done();
  await expect(pane.notes).toHaveText(NOTES_HERE);
  await expect(
    pane.method.rows,
    'the method put back by another device should give way to this device’s own',
  ).toHaveText(shakshuka.method[0].steps);
});
