import { shakshuka } from '../recipes';
import { expect, test } from '../test';

const PAST_A_PAGE = 350;

const UPSTREAM_RETRY = 15_000;

test('a user syncs with a cluttered Drive', async ({ contents, googleDrive, settings }) => {
  test.slow();
  googleDrive.anotherDeviceWrites(shakshuka);
  googleDrive.pileUp(PAST_A_PAGE);
  const piledUp = googleDrive.controlFiles();

  await settings.open();
  await settings.sync();
  await expect(
    settings.googleDrive,
    'a sync should find the cookbook among the copies another device left behind',
  ).toMatchAriaSnapshot(
    `
    - region "Google Drive":
      - /children: equal
      - heading "Google Drive" [level=2]
      - paragraph: Your recipes are in Google Drive.
      - paragraph: ${googleDrive.account}
      - button "Clear Drive"
      - button "Disconnect"
  `,
    { timeout: UPSTREAM_RETRY },
  );
  await settings.done();

  await contents.open();
  await expect(contents.root, 'the cookbook in a cluttered Drive should arrive whole')
    .toMatchAriaSnapshot(`
    - navigation "Contents":
      - searchbox "Search recipes"
      - button "Shakshuka"
      - button "Add new recipe"
  `);
  await contents.close();

  await googleDrive.fallsQuiet();
  expect(googleDrive.controlFiles(), 'a sync should add nothing to the clutter').toEqual(piledUp);
  expect(
    googleDrive.copiesUsed().oldest,
    'a sync should take the lock in the oldest copy of it',
  ).toContain('transaction.json');
  expect(
    googleDrive.copiesUsed().newer,
    'a sync should leave every newer copy untouched and empty',
  ).toEqual([]);
});
