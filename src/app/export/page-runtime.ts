import { CONTENTS_RULES, ContentsRules } from '../contents/contents-rules';

export interface PageRecipe {
  readonly id: string;
  readonly haystack: string;
  readonly ancestry: readonly string[];
}

export interface PageContents {
  readonly recipes: readonly PageRecipe[];
  readonly touch: string;
}

export function pageScript(contents: PageContents | null): string {
  const rules = Object.entries(CONTENTS_RULES).map(([name, rule]) => `${name}: ${rule}`);
  return `<script>(${pageRuntime})(${inScript(contents)}, { ${rules.join(', ')} });</script>`;
}

function inScript(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

// The exported page's behaviour. pageScript embeds it with toString(), so it must use nothing from
// outside its own body: everything it needs arrives as an argument.
function pageRuntime(contents: PageContents | null, rules: ContentsRules): void {
  addEventListener('pageshow', (event) => {
    if (event.persisted) return;
    for (const choice of document.querySelectorAll<HTMLInputElement>('app-segmented input')) {
      choice.checked = choice.defaultChecked;
    }
  });

  document.addEventListener('change', (event) => {
    const choice = event.target;
    if (!(choice instanceof HTMLInputElement)) return;

    const control = choice.closest('app-segmented');
    if (!control) return;

    const at = [...control.querySelectorAll('input')].indexOf(choice);
    control
      .closest('app-recipe-pane')
      ?.querySelectorAll<HTMLElement>('.sizing')
      .forEach((sizing, index) => {
        sizing.hidden = index !== at;
      });
  });

  if (contents === null) return;

  const need = <T extends HTMLElement>(id: string, kind: new () => T): T => {
    const found = document.getElementById(id);
    if (!(found instanceof kind)) throw new Error(`the exported page has no #${id}`);
    return found;
  };

  const drawer = need('drawer', HTMLDialogElement);
  const search = need('search', HTMLInputElement);
  const shut = need('shut', HTMLButtonElement);
  const tree = need('tree', HTMLElement);
  const opener = need('opener', HTMLButtonElement);
  const pane = need('pane', HTMLElement);

  const touch = matchMedia(contents.touch);
  const lines = [...tree.querySelectorAll<HTMLElement>(':scope > .line')];
  const renderings = [...pane.querySelectorAll<HTMLElement>(':scope > .rendering')];
  const nomatch = document.createElement('p');
  nomatch.className = 'nomatch';

  const ancestry = new Map(contents.recipes.map((recipe) => [recipe.id, recipe.ancestry]));
  const above = new Map<string, readonly string[]>();
  for (const chain of ancestry.values()) {
    chain.forEach((key, at) => {
      if (!above.has(key)) above.set(key, chain.slice(0, at));
    });
  }

  const first = lines.find((line) => line.dataset['id'] !== undefined)?.dataset['id'] ?? '';

  let expanded: ReadonlySet<string> = new Set();
  let reading = '';
  let showing = false;
  let searching = false;

  const paint = (): void => {
    const terms = rules.searchTerms(search.value);
    searching = terms.length > 0;
    const hits = new Set(
      contents.recipes
        .filter((recipe) => rules.matches(recipe.haystack, terms))
        .map((recipe) => recipe.id),
    );
    const matchedIn = new Set([...hits].flatMap((id) => ancestry.get(id) ?? []));
    const open = { expanded, searching, matchedIn };
    const under = (chain: readonly string[]): boolean =>
      chain.every((key) => rules.isOpen(key, open));

    const shown = lines.filter((line) => {
      const row = line.querySelector('.row');
      const id = line.dataset['id'];
      if (id !== undefined) {
        row?.classList.toggle('active', id === reading);
        return hits.has(id) && under(ancestry.get(id) ?? []);
      }

      const key = line.dataset['key'] ?? '';
      const folderOpen = rules.isOpen(key, open);
      line.querySelector('.chevron')?.classList.toggle('open', folderOpen);
      row?.setAttribute('aria-expanded', String(folderOpen));
      return matchedIn.has(key) && under(above.get(key) ?? []);
    });

    nomatch.textContent = `No recipes match “${search.value.trim()}”.`;
    tree.replaceChildren(...shown, ...(searching && hits.size === 0 ? [nomatch] : []));
  };

  const follow = (open: boolean): void => {
    showing = open;
    opener.classList.toggle('showing', open);
    opener.setAttribute('aria-expanded', String(open));

    if (open && touch.matches) {
      if (!drawer.open) drawer.showModal();
    } else if (drawer.open) {
      drawer.close();
    }
  };

  const hide = (): void => {
    if (!showing) return;
    follow(false);
    search.value = '';
    paint();
  };

  const read = (id: string): void => {
    reading = id;
    for (const one of renderings) one.hidden = one.dataset['id'] !== id;
    expanded = new Set([...expanded, ...(ancestry.get(id) ?? [])]);
    pane.scrollTop = 0;
    hide();
    paint();
  };

  const asked = (): string => {
    const hash = location.hash.replace(/^#r=/, '');
    let id = hash;
    try {
      id = decodeURIComponent(hash);
    } catch {
      // A malformed hash is looked up as it is.
    }
    return ancestry.has(id) ? id : first;
  };

  search.addEventListener('input', paint);

  tree.addEventListener('click', (event) => {
    const line =
      event.target instanceof Element ? event.target.closest<HTMLElement>('.line') : null;
    if (!line) return;

    const id = line.dataset['id'];
    if (id !== undefined) {
      location.hash = `r=${encodeURIComponent(id)}`;
      read(id);
      return;
    }

    if (searching) return;

    expanded = rules.toggled(expanded, line.dataset['key'] ?? '');
    paint();
  });

  opener.addEventListener('click', () => {
    if (showing) hide();
    else follow(true);
  });

  shut.addEventListener('click', hide);

  drawer.addEventListener('click', (event) => {
    if (event.target !== drawer || !drawer.matches(':modal')) return;

    const { left, right, top, bottom } = drawer.getBoundingClientRect();
    const within =
      event.clientX >= left &&
      event.clientX <= right &&
      event.clientY >= top &&
      event.clientY <= bottom;
    if (!within) hide();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !showing) return;
    event.preventDefault();
    hide();
  });

  touch.addEventListener('change', () => {
    if (!touch.matches) hide();
  });

  addEventListener('hashchange', () => read(asked()));
  read(asked());
}
