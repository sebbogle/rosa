import { focaccia, lemonTart, shakshuka, tarkaDal, turkishEggs } from '../recipes';
import { expect, test } from '../test';

test(
  'a cook renames and removes folders',
  { tag: '@wide' },
  async ({ page, cookbook, contents, editor, sides }) => {
    await cookbook.holds(shakshuka, turkishEggs, focaccia, lemonTart, tarkaDal);
    const { pane, resting } = sides.one;

    await contents.searchFor('tarts');
    await expect(contents.root).toMatchAriaSnapshot(`
      - navigation "Contents":
        - /children: equal
        - searchbox "Search recipes": tarts
        - button "Baking" [expanded]
        - button "Tarts" [expanded]
        - button "Lemon tart"
        - button "Add new recipe"
        - separator "Contents edge"
    `);

    await contents.searchFor('tarts eggs');
    await expect(resting.line).toHaveText('Nothing matches.');
    await expect(contents.root).toMatchAriaSnapshot(`
      - navigation "Contents":
        - /children: equal
        - searchbox "Search recipes": tarts eggs
        - button "Add new recipe"
        - separator "Contents edge"
    `);

    await contents.clearSearch();
    await expect(resting.line).toHaveText('Nothing open.');
    await expect(contents.root).toMatchAriaSnapshot(`
      - navigation "Contents":
        - /children: equal
        - searchbox "Search recipes"
        - button "Baking" [expanded=false]
        - button "Brunch" [expanded=false]
        - button "Shakshuka"
        - button "Tarka dal"
        - button "Add new recipe"
        - separator "Contents edge"
    `);

    await contents.expand('Baking');
    await contents.expand('Brunch');
    await expect(contents.root).toMatchAriaSnapshot(`
      - navigation "Contents":
        - /children: equal
        - searchbox "Search recipes"
        - button "Baking" [expanded]
        - button "Bread" [expanded=false]
        - button "Tarts" [expanded=false]
        - button "Brunch" [expanded]
        - button "Turkish eggs"
        - button "Shakshuka"
        - button "Tarka dal"
        - button "Add new recipe"
        - separator "Contents edge"
    `);

    await contents.collapse('Baking');
    await expect(contents.root).toMatchAriaSnapshot(`
      - navigation "Contents":
        - /children: equal
        - searchbox "Search recipes"
        - button "Baking" [expanded=false]
        - button "Brunch" [expanded]
        - button "Turkish eggs"
        - button "Shakshuka"
        - button "Tarka dal"
        - button "Add new recipe"
        - separator "Contents edge"
    `);

    await contents.pick('Focaccia', ['Baking', 'Bread']);
    await expect(pane.title).toHaveText('Focaccia');
    await expect(pane.folder).toHaveText('Baking › Bread');
    await expect(page).toHaveURL(`/recipe/${focaccia.id}`);

    await contents.renameFolder('Baking', 'Bakery');
    await expect(pane.folder, 'the open recipe should follow its folder').toHaveText(
      'Bakery › Bread',
    );
    await expect(page, 'the address should keep the id').toHaveURL(`/recipe/${focaccia.id}`);

    await contents.expand('Bakery');
    await contents.expand('Bread');
    await contents.expand('Tarts');
    await expect(contents.root).toMatchAriaSnapshot(`
      - navigation "Contents":
        - /children: equal
        - searchbox "Search recipes"
        - button "Bakery" [expanded]
        - button "Bread" [expanded]
        - button "Focaccia"
        - button "Tarts" [expanded]
        - button "Lemon tart"
        - button "Brunch" [expanded]
        - button "Turkish eggs"
        - button "Shakshuka"
        - button "Tarka dal"
        - button "Add new recipe"
        - separator "Contents edge"
    `);

    await contents.removeFolder('Bread');
    await expect(contents.removing).toMatchAriaSnapshot(`
      - alertdialog "Remove folder":
        - paragraph: Remove Bread?
        - paragraph: 1 recipe moves up to Bakery.
        - paragraph: Nothing is deleted. Every recipe stays exactly where you can find it.
        - button "Keep it"
        - button "Remove the folder"
    `);
    await contents.confirmRemoval();
    await expect(
      contents.row('Bakery'),
      'focus should land on the folder the recipe rose into',
    ).toBeFocused();

    await expect(
      contents.root,
      'Focaccia should rise one level, into Bakery, and every recipe should stay',
    ).toMatchAriaSnapshot(`
      - navigation "Contents":
        - /children: equal
        - searchbox "Search recipes"
        - button "Bakery" [expanded]
        - button "Tarts" [expanded]
        - button "Lemon tart"
        - button "Focaccia"
        - button "Brunch" [expanded]
        - button "Turkish eggs"
        - button "Shakshuka"
        - button "Tarka dal"
        - button "Add new recipe"
        - separator "Contents edge"
    `);
    await expect(pane.folder).toHaveText('Bakery');
    await expect(page).toHaveURL(`/recipe/${focaccia.id}`);

    await pane.edit();
    await editor.openFolderPicker();
    await expect(editor.folderPicker).toMatchAriaSnapshot(`
      - navigation "Where this recipe goes":
        - /children: equal
        - button "No folder"
        - button "Bakery" [disabled]
      - list:
        - /children: equal
        - listitem:
          - button "Tarts"
    `);

    await editor.walkUpTo('No folder');
    await expect(editor.folderPicker).toMatchAriaSnapshot(`
      - navigation "Where this recipe goes":
        - /children: equal
        - button "No folder" [disabled]
      - list:
        - /children: equal
        - listitem:
          - button "Bakery"
        - listitem:
          - button "Brunch"
    `);
    await editor.done();
    await expect(pane.folder, 'walking the picker should put the recipe nowhere').toHaveText(
      'Bakery',
    );

    const narrower = await contents.width();
    await contents.widen();
    await expect.poll(() => contents.width()).toBeGreaterThan(narrower);
    const widened = await contents.width();

    await page.reload();
    await expect(pane.title).toHaveText('Focaccia');
    await expect
      .poll(() => contents.width(), 'rosa should remember how wide the Contents was left')
      .toBe(widened);
  },
);
