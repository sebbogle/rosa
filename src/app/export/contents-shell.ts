import { FOLDER_TREE_CSS } from '../contents/folder-tree/folder-tree.css';
import { haystackOf } from '../contents/contents-filter';
import { ancestorsOf, contentsRows, contentsTree, ContentsRow } from '../contents/contents-tree';
import { SIDEBAR_CSS } from '../contents/sidebar/sidebar.css';
import { FRAME_CSS, PANE_LAYOUT_CSS } from '../frame.css';
import { Recipe } from '../recipe/recipe';
import { TOUCH } from '../shell/touch';
import { CONTENTS_SHELL_CSS } from './contents-shell.css';
import { escaped, escapedAttribute } from './escaping';
import { PageContents, pageScript } from './page-runtime';
import { Frozen } from './pane-markup';
import type { Shell } from './standalone-page';

export function contentsShell(frozen: readonly Frozen[], name: string): Shell {
  const recipes = frozen.map((one) => one.recipe);

  return {
    title: name,
    css: [FRAME_CSS, PANE_LAYOUT_CSS, SIDEBAR_CSS, FOLDER_TREE_CSS, CONTENTS_SHELL_CSS],
    body: `<div class="app">
  <app-sidebar>
    <dialog class="drawer" id="drawer" role="navigation" aria-label="Contents" closedby="none">
      <div class="searchwrap">
        <input
          class="search"
          id="search"
          type="search"
          placeholder="Search recipes…"
          aria-label="Search recipes"
          autocomplete="off"
        >
        <button type="button" class="shut" id="shut" aria-label="Close Contents">
          <span aria-hidden="true">×</span>
        </button>
      </div>

      <div class="tree">
        <app-folder-tree id="tree">
${treeMarkup(recipes)}
        </app-folder-tree>
      </div>
    </dialog>
  </app-sidebar>

  <div class="reading">
    <div class="chrome">
      <button
        type="button"
        class="contents"
        id="opener"
        aria-label="Contents"
        aria-expanded="false"
      >
        <span aria-hidden="true">☰</span>
      </button>
      <span class="bookname">${escaped(name)}</span>
    </div>

    <main class="pane" id="pane">
${frozen.map(rendering).join('\n')}
    </main>
  </div>
</div>

${pageScript(contentsOf(recipes))}
`,
  };
}

function contentsOf(recipes: readonly Recipe[]): PageContents {
  return {
    recipes: recipes.map((recipe) => ({
      id: recipe.id,
      haystack: haystackOf(recipe),
      ancestry: ancestorsOf(recipe.folder),
    })),
    touch: TOUCH,
  };
}

function rendering(one: Frozen): string {
  return `      <article class="rendering" data-id="${escapedAttribute(one.recipe.id)}" hidden>${one.pane}</article>`;
}

function treeMarkup(recipes: readonly Recipe[]): string {
  return contentsRows(contentsTree(recipes), () => true)
    .map(rowMarkup)
    .join('\n');
}

function rowMarkup(row: ContentsRow): string {
  const guides = row.guides.map(() => '<span class="guide" aria-hidden="true"></span>').join('');

  if (row.kind === 'folder') {
    return `          <div class="line" data-key="${escapedAttribute(row.key)}">${guides}<button type="button" class="row folder" aria-expanded="false"><span class="chevron" aria-hidden="true">▸</span><span class="label">${escaped(row.name)}</span></button></div>`;
  }

  return `          <div class="line" data-id="${escapedAttribute(row.id)}">${guides}<button type="button" class="row recipe"><span class="label">${escaped(row.title)}</span></button></div>`;
}
