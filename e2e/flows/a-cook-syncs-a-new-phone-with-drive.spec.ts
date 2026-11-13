import { ragu, shakshuka, sodaBread } from '../recipes';
import { expect, test } from '../test';

const DOWNSTREAM_RETRY = 6_000;

test(
  'a cook syncs a new phone with Drive',
  { tag: '@narrow' },
  async ({ besideTheGear, contents, device, googleDrive, page, safekeeping, settings, sides }) => {
    const { resting } = sides.one;
    const fetching = `
    - /children: equal
    - paragraph: Fetching your recipes.
    - paragraph: This device is getting your cookbook from Google Drive.
  `;
    const elsewhere = (...below: readonly string[]) => `
    - /children: equal
    - paragraph: Your recipes are in Google Drive.
    - paragraph: This device does not have them all yet.
    ${below.map((line) => `- ${line}`).join('\n    ')}
  `;
    for (const recipe of [ragu, shakshuka, sodaBread]) googleDrive.anotherDeviceWrites(recipe);

    await expect(resting.root, 'a device that has not used Drive should hear nothing of it')
      .toMatchAriaSnapshot(`
    - /children: equal
    - paragraph: No recipes yet.
    - paragraph: Recipes are written in rosa, and saved as you go.
    - button "Add new recipe"
  `);
    expect(safekeeping.asks, 'rosa should not ask the browser before anything arrives').toBe(0);

    await settings.open();
    const fetchStalls = googleDrive.stallAtTheLock();
    await settings.sync();
    await fetchStalls;
    await settings.done();
    await expect(resting.root).toMatchAriaSnapshot(fetching);

    await device.goOffline();
    await expect(
      resting.root,
      'a first fetch offline while the token is valid should wait with nothing to press',
    ).toMatchAriaSnapshot(elsewhere());
    await device.comeOnline();
    await expect(
      resting.root,
      'a first fetch should go on fetching once the network returns',
    ).toMatchAriaSnapshot(fetching);

    googleDrive.expireToken();
    googleDrive.resume();
    await expect(
      resting.root,
      'a first fetch cut short by the token expiring should leave the cookbook in Google Drive',
    ).toMatchAriaSnapshot(elsewhere('button "Sync with Drive"', 'status'));
    await expect(
      besideTheGear.syncButton,
      'Sync with Drive should sit beside the gear with the token expired',
    ).toBeVisible();
    await expect(
      resting.syncButton,
      'where the act beside the gear is a glyph alone, the pane should offer it too',
    ).toBeVisible();

    await contents.open();
    await expect(contents.root, 'the Contents should hold only what arrived').toMatchAriaSnapshot(`
    - navigation "Contents":
      - /children: equal
      - searchbox "Search recipes"
      - button "Close Contents"
      - button "Add new recipe"
  `);
    await contents.close();

    await page.waitForTimeout(DOWNSTREAM_RETRY);
    await expect(
      resting.root,
      'a first fetch cut short by the token expiring should never count as arrived',
    ).toMatchAriaSnapshot(elsewhere('button "Sync with Drive"', 'status'));

    await device.goOffline();
    await expect(
      resting.syncButton,
      'Sync with Drive should need Google Drive in reach',
    ).toBeDisabled();
    await resting.tryToSyncWithDrive();
    await expect(
      resting.root,
      'pressing Sync with Drive offline should say why nothing happens',
    ).toMatchAriaSnapshot(
      elsewhere('button "Sync with Drive" [disabled]', 'status: Unable to reach Google Drive.'),
    );

    await device.comeOnline();
    googleDrive.stall();
    await resting.syncWithDrive();
    await expect(
      resting.root,
      'Sync with Drive should fetch the rest of the cookbook',
    ).toMatchAriaSnapshot(fetching);
    googleDrive.resume();
    await expect(resting.root, 'the whole cookbook should arrive').toMatchAriaSnapshot(`
    - /children: equal
    - paragraph: Nothing open.
    - paragraph: Pick a recipe from the Contents.
    - button "Open Contents"
  `);
    await expect
      .poll(() => safekeeping.asks, {
        message: 'a cookbook that arrives from Drive should ask the browser once',
      })
      .toBe(1);

    await contents.open();
    await expect(contents.root).toMatchAriaSnapshot(`
    - navigation "Contents":
      - /children: equal
      - searchbox "Search recipes"
      - button "Close Contents"
      - button "Baking"
      - button "Pasta"
      - button "Shakshuka"
      - button "Add new recipe"
  `);
  },
);
