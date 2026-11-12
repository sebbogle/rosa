import { shakshuka, tarkaDal, turkishEggs } from '../recipes';
import { tabsOutOf } from '../surfaces/layer';
import { expect, test } from '../test';

const UPSTREAM_RETRY = 15_000;

const LEAVES_FOR_THE_HOUR = 10_000;

const ASKS_AT_ONCE = 1_000;

test('a cook keeps their cookbook in Drive', async ({
  besideTheGear,
  cookbook,
  contents,
  device,
  editor,
  googleDrive,
  page,
  settings,
  sides,
}) => {
  test.slow();
  await cookbook.holds(shakshuka, tarkaDal);
  const { pane } = sides.one;
  const inDrive = () => googleDrive.recipes()?.map(({ title }) => title);
  const unused = `
    - region "Google Drive":
      - /children: equal
      - heading "Google Drive" [level=2]
      - paragraph: Not connected
      - button "Sync with Drive"
  `;
  const inTheHour = (line: string) => `
    - region "Google Drive":
      - /children: equal
      - heading "Google Drive" [level=2]
      - paragraph: ${line}
      - paragraph: ${googleDrive.account}
      - button "Clear Drive"
      - button "Disconnect"
  `;
  const cleared = `
    - region "Google Drive":
      - /children: equal
      - heading "Google Drive" [level=2]
      - paragraph: Your recipes are still on this device, but they are no longer in Google Drive.
      - paragraph: ${googleDrive.account}
      - button "Clear Drive"
      - button "Disconnect"
      - button "Put them back in Drive"
  `;
  const unsent = `
    - region "Google Drive":
      - /children: equal
      - heading "Google Drive" [level=2]
      - paragraph: Unsent changes
      - paragraph: ${googleDrive.account}
      - button "Clear Drive"
      - button "Disconnect"
      - button "Sync with Drive"
  `;
  const betweenHours = `
    - region "Google Drive":
      - /children: equal
      - heading "Google Drive" [level=2]
      - paragraph: ${googleDrive.account}
      - button "Clear Drive"
      - button "Disconnect"
      - button "Sync with Drive"
  `;
  const confirmation = `
    - alertdialog "Clear Drive":
      - paragraph: Clear Drive?
      - paragraph: This deletes rosa's folder from your Google Drive, with everything in it, and there is no undo. Your recipes stay on this device.
      - paragraph: Your other devices keep their own recipes, and may put some back in Drive.
      - button "Cancel"
      - button "Clear Drive"
  `;
  const gone = `
    - region "Google Drive":
      - /children: equal
      - heading "Google Drive" [level=2]
      - paragraph: Not connected
      - button "Sync with Drive"
      - status: rosa's folder is gone from your Google Drive.
  `;
  const syncing = `
    - /children: equal
    - button "Syncing" [disabled]
  `;
  const inGoogleDrive = `
    - /children: equal
    - button "In Google Drive" [disabled]
  `;
  const offered = `
    - /children: equal
    - button "Sync with Drive"
    - status
  `;

  await expect(
    besideTheGear.controls,
    'nothing should sit beside the gear before the first sync',
  ).toHaveCount(0);

  await settings.open();
  await expect(
    settings.googleDrive,
    'a device that has not used Drive should say it is not connected and offer the act alone',
  ).toMatchAriaSnapshot(unused);
  googleDrive.stall();
  await settings.sync();
  await settings.disconnect();
  await expect(
    settings.googleDrive,
    'Disconnect while the first sync finds the folder should leave Drive not connected, with the act alone',
  ).toMatchAriaSnapshot(unused);
  await settings.sync();
  await settings.done();
  await expect(
    besideTheGear.root,
    'a sync pressed again while the first was finding the folder should be watched beside the gear',
  ).toMatchAriaSnapshot(syncing);
  googleDrive.resume();
  await expect(besideTheGear.root, 'the first sync should say where it ended').toMatchAriaSnapshot(
    inGoogleDrive,
  );
  await expect(
    besideTheGear.controls,
    'nothing should sit beside the gear during the hour',
  ).toHaveCount(0, { timeout: LEAVES_FOR_THE_HOUR });
  await settings.open();
  await expect(settings.googleDrive).toMatchAriaSnapshot(
    inTheHour('Your recipes are in Google Drive.'),
  );
  await settings.done();

  await contents.addNewRecipe();
  await editor.typeTitle('Soda bread');
  await editor.leaveTitle();
  await editor.done();
  await expect
    .poll(inDrive, { message: 'Drive should hold what was written', timeout: UPSTREAM_RETRY })
    .toEqual(['Shakshuka', 'Soda bread', 'Tarka dal']);

  await googleDrive.fallsQuiet();
  googleDrive.lapse();
  await page.reload();
  await settings.open();
  await expect(
    settings.googleDrive,
    'a lapse after everything has been sent should leave no line',
  ).toMatchAriaSnapshot(betweenHours);
  await settings.done();
  await expect(
    besideTheGear.root,
    'Sync with Drive should sit beside the gear between hours',
  ).toMatchAriaSnapshot(offered);
  await expect(besideTheGear.syncButton).toHaveAccessibleDescription('');

  await contents.pick('Soda bread');
  await pane.edit();
  await expect(editor.title).toHaveValue('Soda bread');
  await expect(editor.driveControls, 'the Editor’s foot should say nothing of Drive').toHaveCount(
    0,
  );
  await editor.typeTitle('Soda farls');
  await editor.leaveTitle();
  await editor.done();

  await settings.open();
  await expect(
    settings.googleDrive,
    'a recipe edited between hours should be an unsent change',
  ).toMatchAriaSnapshot(unsent);
  await settings.done();
  await expect(
    besideTheGear.syncButton,
    'an unsent change should mark Sync with Drive beside the gear',
  ).toHaveAccessibleDescription('Unsent changes');

  await pane.edit();
  await editor.typeTitle('Soda bread');
  await editor.leaveTitle();
  await editor.done();

  await settings.open();
  await expect(
    settings.googleDrive,
    'a recipe written back to what was sent should not be an unsent change',
  ).toMatchAriaSnapshot(betweenHours);
  await settings.done();
  await expect(besideTheGear.syncButton).toHaveAccessibleDescription('');

  await pane.edit();
  await editor.delete();
  await editor.confirmDelete();

  await settings.open();
  await expect(
    settings.googleDrive,
    'a recipe deleted between hours should be an unsent change',
  ).toMatchAriaSnapshot(unsent);
  await settings.done();

  const asked = googleDrive.asked;
  await page.reload();
  await settings.open();
  await expect(
    settings.googleDrive,
    'a reload between hours should still know what has not gone to Google Drive',
  ).toMatchAriaSnapshot(unsent);
  expect(googleDrive.asked, 'a reload between hours should not resume the hour').toBe(asked);

  await device.goOffline();
  await expect(
    settings.syncButton,
    'Sync with Drive should need Google Drive in reach',
  ).toBeDisabled();
  await expect(settings.syncButton).toHaveAccessibleDescription('Unable to reach Google Drive.');
  await expect(
    settings.clearButton,
    'Clear Drive between hours should need Google Drive in reach',
  ).toBeDisabled();
  await expect(settings.clearButton).toHaveAccessibleDescription('Unable to reach Google Drive.');
  await expect(settings.googleDrive, 'Unsent changes should stay while the device is offline')
    .toMatchAriaSnapshot(`
    - region "Google Drive":
      - /children: equal
      - heading "Google Drive" [level=2]
      - paragraph: Unsent changes
      - paragraph: ${googleDrive.account}
      - button "Clear Drive" [disabled]
      - button "Disconnect"
      - button "Sync with Drive" [disabled]
      - paragraph: Unable to reach Google Drive.
  `);
  await settings.done();
  await expect(
    besideTheGear.syncButton,
    'Sync with Drive beside the gear should need Google Drive in reach',
  ).toBeDisabled();
  await expect(
    besideTheGear.syncButton,
    'the act beside the gear should stay marked while the device is offline',
  ).toHaveAccessibleDescription('Unsent changes');
  await besideTheGear.tryToSyncWithDrive();
  await expect(
    besideTheGear.root,
    'pressing Sync with Drive offline should say why nothing happens',
  ).toMatchAriaSnapshot(`
    - /children: equal
    - button "Sync with Drive" [disabled]
    - status: Unable to reach Google Drive.
  `);

  await device.comeOnline();
  googleDrive.stall();
  await besideTheGear.syncWithDrive();
  await expect(
    besideTheGear.root,
    'Sync with Drive should be watched beside the gear while it runs',
  ).toMatchAriaSnapshot(syncing);
  await settings.open();
  await expect(
    settings.googleDrive,
    'Sync with Drive should take Unsent changes away and be watched while it runs',
  ).toMatchAriaSnapshot(inTheHour('Syncing with Google Drive.'));
  await settings.done();
  googleDrive.resume();
  await expect(besideTheGear.root, 'the catch-up should say where it ended').toMatchAriaSnapshot(
    inGoogleDrive,
  );
  expect(
    inDrive(),
    'the catch-up should end only once Drive no longer holds the recipe deleted between hours',
  ).toEqual(['Shakshuka', 'Tarka dal']);
  await expect(
    besideTheGear.controls,
    'Sync with Drive should leave the row for the hour',
  ).toHaveCount(0, { timeout: LEAVES_FOR_THE_HOUR });
  await settings.open();
  await expect(settings.googleDrive, 'the catch-up should end in Google Drive').toMatchAriaSnapshot(
    inTheHour('Your recipes are in Google Drive.'),
  );
  await settings.done();

  await googleDrive.fallsQuiet();
  googleDrive.lapse();
  await contents.addNewRecipe();
  await editor.typeTitle('Pea soup');
  await editor.leaveTitle();
  await editor.done();

  await settings.open();
  await expect(
    settings.googleDrive,
    'a recipe written after the hour should be an unsent change',
  ).toMatchAriaSnapshot(unsent);
  await settings.disconnect();
  await expect(
    settings.googleDrive,
    'Disconnect should take Unsent changes away',
  ).toMatchAriaSnapshot(unused);
  await settings.sync();
  await expect(settings.googleDrive).toMatchAriaSnapshot(
    inTheHour('Your recipes are in Google Drive.'),
    { timeout: UPSTREAM_RETRY },
  );
  expect(
    inDrive(),
    'a catch-up that resumes the hour should end only once the recipe written between hours is in Drive',
  ).toEqual(['Pea soup', 'Shakshuka', 'Tarka dal']);

  await googleDrive.fallsQuiet();
  await settings.clearDrive();
  await expect(settings.clearing).toMatchAriaSnapshot(confirmation);
  expect(
    await tabsOutOf(page, settings.clearing),
    'Tab should reach nothing behind Clear Drive?',
  ).toEqual([]);
  await settings.pressEscape();
  await expect(settings.clearing).toBeHidden();
  await expect(settings.root, 'Escape should cancel only Clear Drive?').toBeVisible();
  await settings.clearDrive();
  await settings.confirmClearDrive();
  await expect(
    settings.googleDrive,
    'Clear Drive should leave Drive not connected, with the act alone',
  ).toMatchAriaSnapshot(gone);
  expect(inDrive(), 'Clear Drive should delete rosa’s folder from Google Drive').toBeUndefined();
  const askedOnceCleared = googleDrive.asked;
  await device.goOffline();
  await device.comeOnline();
  await page.waitForTimeout(ASKS_AT_ONCE);
  expect(
    googleDrive.asked,
    'Clear Drive should leave nothing asking Google Drive, even once the device is back online',
  ).toBe(askedOnceCleared);
  await settings.done();

  await contents.open();
  await expect(contents.root, 'Clear Drive should keep every recipe here').toMatchAriaSnapshot(`
    - button "Pea soup"
    - button "Shakshuka"
    - button "Tarka dal"
  `);
  await contents.close();

  await settings.open();
  await settings.sync();
  await expect
    .poll(inDrive, {
      message: 'the sync after Clear Drive should fill a new folder with the whole cookbook',
      timeout: UPSTREAM_RETRY,
    })
    .toEqual(['Pea soup', 'Shakshuka', 'Tarka dal']);
  await expect(settings.googleDrive).toMatchAriaSnapshot(
    inTheHour('Your recipes are in Google Drive.'),
  );
  await settings.done();

  await googleDrive.fallsQuiet();
  googleDrive.anotherDeviceWrites(turkishEggs);
  await device.leaveRosa();
  await device.returnToRosa();
  await contents.open();
  await expect(
    contents.root,
    'a recipe another device wrote during the hour should arrive once rosa comes back into view',
  ).toMatchAriaSnapshot(`
    - button "Brunch"
    - button "Pea soup"
    - button "Shakshuka"
    - button "Tarka dal"
  `);
  await contents.close();

  await settings.open();
  await googleDrive.fallsQuiet();
  await settings.disconnect();
  await expect(
    settings.googleDrive,
    'Disconnect should leave Drive not connected, with the act alone',
  ).toMatchAriaSnapshot(unused);
  expect(inDrive(), 'Disconnect should delete nothing in Drive').toEqual([
    'Pea soup',
    'Shakshuka',
    'Tarka dal',
    'Turkish eggs',
  ]);
  await settings.done();

  await contents.open();
  await expect(contents.root, 'Disconnect should keep every recipe here').toMatchAriaSnapshot(`
    - button "Brunch"
    - button "Pea soup"
    - button "Shakshuka"
    - button "Tarka dal"
  `);
  await contents.close();

  await settings.open();
  await settings.sync();
  await expect(settings.googleDrive).toMatchAriaSnapshot(
    inTheHour('Your recipes are in Google Drive.'),
  );
  await settings.done();

  const wholeCookbook = ['Pea soup', 'Shakshuka', 'Tarka dal', 'Turkish eggs'];
  await googleDrive.fallsQuiet();
  googleDrive.lapse();
  await page.reload();
  await settings.open();
  await expect(settings.googleDrive).toMatchAriaSnapshot(betweenHours);
  await settings.clearDrive();
  await expect(
    settings.clearing,
    'Clear Drive between hours should be confirmed as it is during the hour',
  ).toMatchAriaSnapshot(confirmation);
  googleDrive.stall();
  await settings.beginClearDrive();
  await settings.done();
  await expect(
    besideTheGear.syncButton,
    'Sync with Drive should be held while Clear Drive runs',
  ).toBeDisabled();
  await settings.open();
  await expect(
    settings.syncButton,
    'Sync with Drive should stay held while Clear Drive runs, though Settings was closed',
  ).toBeDisabled();
  googleDrive.resume();
  await expect(settings.syncButton).toBeEnabled();
  await expect(
    settings.googleDrive,
    'Clear Drive between hours should leave Drive not connected, with the act alone, though Settings was closed',
  ).toMatchAriaSnapshot(`
    - region "Google Drive":
      - /children: equal
      - heading "Google Drive" [level=2]
      - paragraph: Not connected
      - button "Sync with Drive"
  `);
  expect(
    inDrive(),
    'Clear Drive between hours should delete rosa’s folder from Google Drive',
  ).toBeUndefined();
  await settings.done();

  await settings.open();
  await settings.sync();
  await expect
    .poll(inDrive, {
      message:
        'the sync after Clear Drive between hours should fill a new folder with the whole cookbook',
      timeout: UPSTREAM_RETRY,
    })
    .toEqual(wholeCookbook);
  await expect(settings.googleDrive).toMatchAriaSnapshot(
    inTheHour('Your recipes are in Google Drive.'),
  );
  await settings.done();

  await googleDrive.fallsQuiet();
  googleDrive.lapse();
  await device.leaveRosa();
  await device.returnToRosa();
  await settings.open();
  await expect(settings.googleDrive).toMatchAriaSnapshot(betweenHours);
  googleDrive.clearedElsewhere();
  await settings.clearDrive();
  await settings.confirmClearDrive();
  await expect(
    settings.googleDrive,
    'Clear Drive between hours should find a folder cleared from another device already gone',
  ).toMatchAriaSnapshot(gone);
  await settings.done();

  await settings.open();
  await settings.sync();
  await expect
    .poll(inDrive, {
      message:
        'the sync after a folder already gone should fill a new folder with the whole cookbook',
      timeout: UPSTREAM_RETRY,
    })
    .toEqual(wholeCookbook);
  await expect(settings.googleDrive).toMatchAriaSnapshot(
    inTheHour('Your recipes are in Google Drive.'),
  );
  await settings.done();

  await googleDrive.fallsQuiet();
  googleDrive.lapse();
  await device.leaveRosa();
  await device.returnToRosa();
  await expect(besideTheGear.root).toMatchAriaSnapshot(offered);
  googleDrive.clearedElsewhere();
  await besideTheGear.syncWithDrive();
  await expect(
    besideTheGear.root,
    'a sync in the same session that finds Drive cleared from another device should send the cook to Google Drive',
  ).toMatchAriaSnapshot(`
    - /children: equal
    - button "Google Drive"
  `);
  await besideTheGear.openGoogleDrive();
  await expect(
    settings.googleDrive,
    'Google Drive should open onto Drive cleared from another device',
  ).toMatchAriaSnapshot(cleared);
  await expect(
    besideTheGear.controls,
    'Google Drive should go once Settings has been opened',
  ).toHaveCount(0);

  await settings.disconnect();
  await page.clock.install();
  await settings.sync();
  await expect(
    settings.googleDrive,
    'Sync with Drive should never put a cleared cookbook back',
  ).toMatchAriaSnapshot(cleared);

  await googleDrive.fallsQuiet();
  await page.clock.fastForward('01:00:00');
  googleDrive.lapse();
  await settings.putThemBack();
  await expect
    .poll(inDrive, {
      message: 'Put them back in Drive between hours should put the whole cookbook back',
      timeout: UPSTREAM_RETRY,
    })
    .toEqual(wholeCookbook);
  await expect(
    settings.googleDrive,
    'Put them back in Drive between hours should run the hour',
  ).toMatchAriaSnapshot(inTheHour('Your recipes are in Google Drive.'));
  await settings.done();

  await googleDrive.fallsQuiet();
  googleDrive.lapse();
  await page.reload();
  await settings.open();
  await expect(settings.googleDrive).toMatchAriaSnapshot(betweenHours);
  googleDrive.binnedElsewhere();
  await settings.clearDrive();
  await settings.confirmClearDrive();
  await expect(
    settings.googleDrive,
    'Clear Drive between hours should leave a folder binned from another device still there',
  ).toMatchAriaSnapshot(`
    - region "Google Drive":
      - /children: equal
      - heading "Google Drive" [level=2]
      - paragraph: ${googleDrive.account}
      - button "Clear Drive"
      - button "Disconnect"
      - button "Sync with Drive"
      - status: rosa could not clear Drive, and the folder is still there.
  `);
  expect(
    googleDrive.recipesInTheBin()?.map(({ title }) => title),
    'a Clear Drive that leaves the folder still there should delete nothing',
  ).toEqual(wholeCookbook);
});
