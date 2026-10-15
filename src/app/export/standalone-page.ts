import TOKENS_CSS from '../../tokens.css' with { loader: 'text' };
import { PANE_LAYOUT_CSS } from '../frame.css';
import { PANE_CSS } from '../recipe/recipe-pane/recipe-pane.css';
import { SEGMENTED_CSS } from '../shell/segmented/segmented.css';
import { contentsShell } from './contents-shell';
import { escaped } from './escaping';
import { pageScript } from './page-runtime';
import { Frozen } from './pane-markup';

const HTML_TYPE = 'text/html;charset=utf-8';

// A lone recipe scrolls the body, so its pane must not become a scroller of its own.
const LONE_CSS = `
body {
  height: auto;
  min-height: 100dvh;
  overflow: auto;
}

.pane {
  overflow: visible;
}

.pane .inner {
  max-width: 1180px;
  margin: 0 auto;
}
`;

export interface Shell {
  readonly title: string;
  readonly css: readonly string[];
  readonly body: string;
}

export function pageBlob(frozen: readonly Frozen[], name: string): Blob {
  const shell = frozen.length > 1 ? contentsShell(frozen, name) : loneShell(frozen[0]);
  return new Blob([standalonePage(shell)], { type: HTML_TYPE });
}

function standalonePage({ title, css, body }: Shell): string {
  const styles = [TOKENS_CSS, PANE_CSS, SEGMENTED_CSS, ...css];

  return `<!doctype html>
<html lang="en" data-appearance="default">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escaped(title)}</title>
${styles.map((style) => `<style>${style}</style>`).join('\n')}
</head>
<body>
${body}
</body>
</html>
`;
}

function loneShell({ recipe, pane }: Frozen): Shell {
  const main = `<main class="pane"><div class="inner">${pane}</div></main>`;

  return {
    title: recipe.title.trim() || 'rosa',
    css: [PANE_LAYOUT_CSS, LONE_CSS],
    body: recipe.sizings.length > 1 ? `${main}\n${pageScript(null)}` : main,
  };
}
