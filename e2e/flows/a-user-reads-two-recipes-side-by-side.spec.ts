import { focaccia, ragu, shakshuka, tarkaDal, turkishEggs } from '../recipes';
import { expect, test } from '../test';

test(
  'a user reads two recipes side by side',
  { tag: '@wide' },
  async ({ page, cookbook, contents, sides, window }) => {
    await cookbook.holds(shakshuka, turkishEggs, focaccia, tarkaDal, ragu);
    const { one, left, right } = sides;

    await contents.pick('Shakshuka');
    await expect(one.tabs).toHaveText(['Shakshuka']);
    await contents.pick('Tarka dal');
    await expect(one.tabs, 'the next recipe opened should take the preview').toHaveText([
      'Tarka dal',
    ]);
    await expect(one.pane.title).toHaveText('Tarka dal');

    await one.keep('Tarka dal');
    await contents.pick('Shakshuka');
    await expect(one.tabs, 'a double-clicked tab should be kept').toHaveText([
      'Tarka dal',
      'Shakshuka',
    ]);
    await contents.keep('Shakshuka');
    await contents.pick('Turkish eggs', ['Brunch']);
    await expect(one.tabs, 'a recipe double-clicked in the Contents should be kept').toHaveText([
      'Tarka dal',
      'Shakshuka',
      'Turkish eggs',
    ]);

    await one.dragAlong('Turkish eggs', 'Tarka dal');
    await expect(one.tabs).toHaveText(['Turkish eggs', 'Tarka dal', 'Shakshuka']);

    await sides.dragToEdge('Shakshuka', 'right');
    await expect(left.tabs).toHaveText(['Turkish eggs', 'Tarka dal']);
    await expect(right.tabs).toHaveText(['Shakshuka']);
    await expect(left.pane.title).toHaveText('Turkish eggs');
    await expect(right.pane.title).toHaveText('Shakshuka');
    await expect(page).toHaveURL(`/recipe/${shakshuka.id}`);

    await left.focus();
    await expect(page).toHaveURL(`/recipe/${turkishEggs.id}`);
    await contents.pick('Focaccia', ['Baking', 'Bread']);
    await expect(left.tabs, 'a dragged tab should be kept').toHaveText([
      'Turkish eggs',
      'Tarka dal',
      'Focaccia',
    ]);
    await expect(right.tabs).toHaveText(['Shakshuka']);
    await expect(left.pane.title).toHaveText('Focaccia');
    await expect(page).toHaveURL(`/recipe/${focaccia.id}`);

    await contents.pick('Shakshuka');
    await expect(page, 'a recipe should be open in one side at most').toHaveURL(
      `/recipe/${shakshuka.id}`,
    );
    await expect(left.tabs).toHaveText(['Turkish eggs', 'Tarka dal', 'Focaccia']);
    await expect(right.tabs).toHaveText(['Shakshuka']);

    await sides.dragAcross('Focaccia');
    await expect(left.tabs).toHaveText(['Turkish eggs', 'Tarka dal']);
    await expect(right.tabs).toHaveText(['Shakshuka', 'Focaccia']);
    await expect(left.pane.title).toHaveText('Tarka dal');
    await expect(right.pane.title).toHaveText('Focaccia');
    await expect(page).toHaveURL(`/recipe/${focaccia.id}`);

    await sides.showTab(1);
    await expect(right.pane.title).toHaveText('Shakshuka');
    await expect(page).toHaveURL(`/recipe/${shakshuka.id}`);
    await sides.showTab(2);
    await expect(right.pane.title).toHaveText('Focaccia');
    await sides.showPreviousTab();
    await expect(right.pane.title).toHaveText('Shakshuka');
    await sides.showNextTab();
    await expect(right.pane.title).toHaveText('Focaccia');
    await contents.searchFor('Foc');
    for (const keys of [
      'Alt+ArrowLeft',
      'Alt+ArrowRight',
      'Alt+Digit1',
      'Alt+Digit3',
      'Alt+KeyW',
    ]) {
      expect(
        await sides.pressIn(contents.search, keys),
        `${keys} should be left to the search field`,
      ).toBe('left alone');
    }
    await expect(right.tabs).toHaveText(['Shakshuka', 'Focaccia']);
    await expect(right.pane.title).toHaveText('Focaccia');
    await contents.clearSearch();
    await right.focus();
    await sides.showTab(1);
    await expect(right.pane.title).toHaveText('Shakshuka');
    await sides.closeActiveTab();
    await expect(right.tabs).toHaveText(['Focaccia']);
    await expect(right.pane.title).toHaveText('Focaccia');
    await expect(left.tabs).toHaveText(['Turkish eggs', 'Tarka dal']);
    await expect(left.pane.title).toHaveText('Tarka dal');
    await expect(page).toHaveURL(`/recipe/${focaccia.id}`);

    await sides.dragDivider('left');
    await expect.poll(() => sides.dividerSits()).toBe('left of centre');
    await sides.resetDivider();
    await expect.poll(() => sides.dividerSits()).toBe('centre');

    await page.reload();
    await expect(left.tabs).toHaveText(['Turkish eggs', 'Tarka dal']);
    await expect(right.tabs).toHaveText(['Focaccia']);
    await expect(left.pane.title).toHaveText('Tarka dal');
    await expect(right.pane.title).toHaveText('Focaccia');
    await expect(page).toHaveURL(`/recipe/${focaccia.id}`);

    await right.close('Focaccia');
    await expect(one.tabs).toHaveText(['Turkish eggs', 'Tarka dal']);
    await expect(one.pane.title).toHaveText('Tarka dal');
    await expect(page).toHaveURL(`/recipe/${tarkaDal.id}`);

    await sides.dragToEdge('Tarka dal', 'left');
    await expect(left.tabs).toHaveText(['Tarka dal']);
    await expect(right.tabs).toHaveText(['Turkish eggs']);

    await contents.pick('Ragù alla bolognese', ['Pasta']);
    await left.keep('Ragù alla bolognese');
    await left.pane.chooseSizing('Full house');
    await sides.showTab(1);
    await expect(left.pane.title, 'a chosen sizing should leave the tab keys working').toHaveText(
      'Tarka dal',
    );
    await sides.dragAcross('Ragù alla bolognese');
    await expect(left.tabs).toHaveText(['Tarka dal']);
    await expect(right.tabs).toHaveText(['Turkish eggs', 'Ragù alla bolognese']);
    await expect(
      right.pane.sizingShown,
      'a kept tab should take its sizing into the other side',
    ).toHaveAccessibleName('Full house');
    await left.focus();

    await window.narrow();
    await expect(left.root).toBeVisible();
    await expect(left.pane.title).toHaveText('Tarka dal');
    await expect(right.root).toBeHidden();
    await expect(left.tabs).toHaveText(['Tarka dal']);
    await expect(right.tabs).toHaveText(['Turkish eggs', 'Ragù alla bolognese']);
    await expect.poll(() => sides.rowsOfStrips()).toBe(1);
  },
);
