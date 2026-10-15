import { focaccia, shakshuka, tarkaDal, turkishEggs } from '../recipes';
import { expect, test } from '../test';

test(
  'a cook finds a recipe in the kitchen',
  { tag: '@narrow' },
  async ({ page, cookbook, contents, sides }) => {
    await cookbook.holds(shakshuka, turkishEggs, focaccia, tarkaDal);
    const { one } = sides;
    const { tabs, pane, resting } = one;

    await expect(resting.line).toHaveText('Nothing open.');
    await expect(resting.control).toHaveText('Open Contents');
    await expect(contents.root).toBeHidden();
    await resting.openContents();
    await expect(contents.root).toBeVisible();

    await contents.searchFor('dal');
    await expect(contents.root).toMatchAriaSnapshot(`
      - navigation "Contents":
        - /children: equal
        - searchbox "Search recipes": dal
        - button "Close Contents"
        - button "Tarka dal"
        - button "Add new recipe"
    `);

    await contents.searchFor('spicy');
    await expect(contents.root).toMatchAriaSnapshot(`
      - navigation "Contents":
        - /children: equal
        - searchbox "Search recipes": spicy
        - button "Close Contents"
        - button "Shakshuka"
        - button "Add new recipe"
    `);

    await contents.searchFor('baking');
    await expect(contents.root).toMatchAriaSnapshot(`
      - navigation "Contents":
        - /children: equal
        - searchbox "Search recipes": baking
        - button "Close Contents"
        - button "Baking" [expanded]
        - button "Bread" [expanded]
        - button "Focaccia"
        - button "Add new recipe"
    `);

    await contents.pick('Focaccia');
    await expect(contents.root, 'a pick should close the drawer').toBeHidden();
    await expect(tabs).toHaveText(['Focaccia']);
    await expect(pane.title).toHaveText('Focaccia');
    await expect(page).toHaveURL(`/recipe/${focaccia.id}`);

    await contents.open();
    await expect(contents.search, 'a pick should clear the search').toHaveValue('');
    await expect(contents.root).toMatchAriaSnapshot(`
      - button "Brunch"
      - button "Shakshuka"
      - button "Tarka dal"
    `);

    await contents.pick('Tarka dal');
    await expect(tabs, 'the next recipe picked should take the preview').toHaveText([
      'Tarka dal',
    ]);
    await expect(pane.title).toHaveText('Tarka dal');
    await expect(page).toHaveURL(`/recipe/${tarkaDal.id}`);

    await one.keep('Tarka dal');
    await contents.searchFor('eggs');
    await contents.dismiss();
    await expect(contents.root, 'Escape should close the drawer').toBeHidden();
    await expect(contents.drawerToggle, 'Escape should hand focus back to ☰').toBeFocused();

    await page.goto('/');
    await expect(tabs, 'a kept tab should come back').toHaveText(['Tarka dal']);
    await expect(resting.line, 'a load at / should leave nothing open').toHaveText(
      'Nothing open.',
    );
    await expect(page).toHaveURL('/');
  },
);
