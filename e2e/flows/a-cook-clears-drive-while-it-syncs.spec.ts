import { shakshuka, tarkaDal } from '../recipes';
import { expect, test } from '../test';

test('a cook clears Drive while it syncs', async ({ cookbook, googleDrive, settings }) => {
  await cookbook.holds(shakshuka, tarkaDal);

  await settings.open();
  googleDrive.stall();
  await settings.sync();
  await settings.clearDrive();
  await settings.beginClearDrive();
  await expect(
    settings.clearButton,
    'Clear Drive pressed while rosa finds its folder should be held while it runs',
  ).toBeDisabled();

  googleDrive.resume();
  await expect(
    settings.googleDrive,
    'Clear Drive pressed while rosa finds its folder should still clear it',
  ).toMatchAriaSnapshot(`
    - region "Google Drive":
      - /children: equal
      - heading "Google Drive" [level=2]
      - paragraph: Not connected
      - button "Sync with Drive"
      - status: rosa's folder is gone from your Google Drive.
  `);
  expect(
    googleDrive.recipes(),
    'Clear Drive pressed while rosa finds its folder should leave no folder of rosa’s in Google Drive',
  ).toBeUndefined();
});
