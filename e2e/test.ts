import { writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { type Locator, test as base, expect } from '@playwright/test';
import type { Recipe } from '../src/app/recipe/recipe';
import { Device } from './device';
import { GoogleDrive } from './google-drive';
import { recipeFile } from './recipe-file';
import { Safekeeping } from './safekeeping';
import { BesideTheGear } from './surfaces/beside-the-gear';
import { Contents } from './surfaces/contents';
import { Editor } from './surfaces/editor';
import { ExportPicker } from './surfaces/export-picker';
import { type FilePayload, Settings } from './surfaces/settings';
import { Sides } from './surfaces/sides';
import { StandalonePage } from './surfaces/standalone-page';
import { type Watch, keepWatch } from './watch';

const NARROWED = 800;

const GOOGLE = /(^|\.)(google|googleapis|gstatic|googleusercontent)\.com$/;

interface Cookbook {
  holds(...recipes: readonly Recipe[]): Promise<void>;
}

interface BrowserWindow {
  readonly root: Locator;
  narrow(): Promise<void>;
}

interface StandalonePages {
  open(file: FilePayload): Promise<StandalonePage>;
}

interface Fixtures {
  watch: Watch;
  rosa: void;
  besideTheGear: BesideTheGear;
  cookbook: Cookbook;
  contents: Contents;
  device: Device;
  editor: Editor;
  exportPicker: ExportPicker;
  googleDrive: GoogleDrive;
  safekeeping: Safekeeping;
  settings: Settings;
  sides: Sides;
  standalonePages: StandalonePages;
  window: BrowserWindow;
}

export const test = base.extend<Fixtures>({
  watch: async ({ context }, use) => use(keepWatch(context)),
  rosa: [
    async ({ context, page, safekeeping: _, watch }, use) => {
      await context.route(
        (url) => GOOGLE.test(url.hostname),
        (route) => route.abort(),
      );

      await page.goto('/');
      await page.getByRole('button', { name: 'Settings', exact: true }).waitFor();

      await use();

      expect(watch.offences, 'rosa printed what no flow lets through').toEqual([]);
    },
    { auto: true },
  ],
  besideTheGear: async ({ page }, use) => use(new BesideTheGear(page)),
  cookbook: async ({ settings, sides }, use) => {
    const { resting } = sides.one;

    await use({
      holds: (...recipes) =>
        base.step(
          `the cookbook holds ${recipes.map(({ title }) => title).join(', ')}`,
          async () => {
            await expect(resting.line, 'the cookbook was not empty before seeding').toHaveText(
              'No recipes yet.',
            );

            await settings.open();
            await settings.import(recipes.map(recipeFile));

            await expect(settings.report, 'every seeded recipe should be added').toHaveText(
              `${recipes.length} added`,
            );
            await expect(settings.refusal, 'every seeded recipe should be added').toHaveCount(0);

            await settings.done();
            await expect(resting.line).toHaveText('Nothing open.');
          },
        ),
    });
  },
  contents: async ({ page }, use) => use(new Contents(page)),
  device: async ({ context, page, watch }, use) => use(new Device(context, page, watch)),
  editor: async ({ page }, use) => use(new Editor(page)),
  exportPicker: async ({ page }, use) => use(new ExportPicker(page)),
  googleDrive: async ({ context, device, watch }, use) => {
    const googleDrive = new GoogleDrive(watch, device);
    await googleDrive.answer(context);

    await use(googleDrive);

    expect(
      googleDrive.unrecognised,
      'the fake Google Drive was asked what it does not serve',
    ).toEqual([]);
  },
  safekeeping: async ({ context }, use) => {
    const safekeeping = new Safekeeping();
    await safekeeping.answer(context);

    await use(safekeeping);
  },
  settings: async ({ page }, use) => use(new Settings(page)),
  sides: async ({ page }, use) => use(new Sides(page)),
  standalonePages: async ({ context }, use, testInfo) =>
    use({
      open: async ({ name, buffer }) => {
        const path = testInfo.outputPath(name);
        await writeFile(path, buffer);

        const page = await context.newPage();
        await page.goto(pathToFileURL(path).href);
        return new StandalonePage(page);
      },
    }),
  window: async ({ page }, use) =>
    use({
      root: page.locator(':root'),
      narrow: async () => {
        const drawn = page.viewportSize();
        if (!drawn) throw new Error('the window has no size to narrow');
        await page.setViewportSize({ ...drawn, width: NARROWED });
      },
    }),
});

export { expect };
