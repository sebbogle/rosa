import { shakshuka } from '../recipes';
import { expect, test } from '../test';

const UPSTREAM_RETRY = 15_000;

test('a cook syncs with Drive day after day', async ({
  cookbook,
  contents,
  editor,
  googleDrive,
  page,
  settings,
}) => {
  test.slow();
  await cookbook.holds(shakshuka);
  const written = ['Shakshuka'];

  await settings.open();
  await settings.sync();
  await expect
    .poll(() => googleDrive.titles(), {
      message: 'the first sync should fill Drive',
      timeout: UPSTREAM_RETRY,
    })
    .toEqual(written);
  await settings.done();
  await googleDrive.fallsQuiet();
  expect(
    googleDrive.controlFiles(),
    'the first sync should leave one of each file rosa keeps beside the recipes',
  ).toEqual(googleDrive.oneOfEach);

  for (const title of ['Pea soup', 'Soda farls', 'Tarka dal']) {
    await page.reload();
    await contents.addNewRecipe();
    await editor.typeTitle(title);
    await editor.leaveTitle();
    await editor.done();
    written.push(title);
    await expect
      .poll(() => googleDrive.titles(), {
        message: 'a reload should carry the hour on and send what is written',
        timeout: UPSTREAM_RETRY,
      })
      .toEqual([...written].sort());
    await googleDrive.fallsQuiet();
    expect(
      googleDrive.controlFiles(),
      'carrying the hour on should add nothing beside the recipes in Drive',
    ).toEqual(googleDrive.oneOfEach);
  }
});
