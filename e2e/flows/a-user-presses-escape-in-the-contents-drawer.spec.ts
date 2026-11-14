import { focaccia, lemonTart, shakshuka, turkishEggs } from '../recipes';
import { tabsOutOf } from '../surfaces/layer';
import { expect, test } from '../test';

test(
  'a user presses Escape in the Contents drawer',
  { tag: '@narrow' },
  async ({ page, cookbook, contents }) => {
    await cookbook.holds(shakshuka, turkishEggs, focaccia, lemonTart);

    await contents.open();
    await expect(contents.search, 'opening the drawer should move focus into it').toBeFocused();
    expect(
      await tabsOutOf(page, contents.root),
      'Tab should reach nothing behind the drawer',
    ).toEqual([]);

    await contents.expand('Baking');
    await contents.openFolderActions('Bread');
    await contents.pressEscape();
    await expect(contents.menu).toBeHidden();
    await expect(contents.root, 'Escape should close only the folder menu').toBeVisible();

    await contents.removeFolder('Bread');
    expect(
      await tabsOutOf(page, contents.removing),
      'Tab should reach nothing behind the confirmation',
    ).toEqual([]);
    await contents.pressEscape();
    await expect(contents.removing).toBeHidden();
    await expect(contents.root, 'Escape should cancel only the confirmation').toBeVisible();

    await contents.removeFolder('Bread');
    await contents.keepFolder();
    await expect(
      contents.row('Bread'),
      'Keep it should hand focus back to the folder',
    ).toBeFocused();

    await contents.removeFolder('Bread');
    await contents.confirmRemoval();
    await expect(
      contents.row('Baking'),
      'focus should land on the folder the recipe rose into',
    ).toBeFocused();

    await contents.removeFolder('Brunch');
    await contents.confirmRemoval();
    await expect(
      contents.search,
      'focus should land on the search when recipes rise to the top',
    ).toBeFocused();
    await expect(contents.root).toMatchAriaSnapshot(`
      - navigation "Contents":
        - /children: equal
        - searchbox "Search recipes"
        - button "Close Contents"
        - button "Baking" [expanded]
        - button "Tarts" [expanded=false]
        - button "Focaccia"
        - button "Shakshuka"
        - button "Turkish eggs"
        - button "Add new recipe"
    `);

    await contents.dismiss();
    await expect(contents.root, 'Escape should close the drawer').toBeHidden();
    await expect(contents.drawerToggle, 'Escape should hand focus back to ☰').toBeFocused();
  },
);
