export const PICTURE_PROTOTYPE_CSS = `
app-recipe-pane {
  --bleed-top: 28px;
  --bleed-x: 36px;
}
@media (width < 1024px), (pointer: coarse) {
  app-recipe-pane {
    --bleed-top: 26px;
    --bleed-x: 34px;
  }

  @media (width < 768px) {
    app-recipe-pane {
      --bleed-top: 22px;
      --bleed-x: 20px;
    }
  }
}

app-recipe-pane .banner,
app-recipe-pane .framed,
app-recipe-pane .thumb,
app-recipe-pane .cover-open {
  display: block;
  padding: 0;
  border: 0;
  background: var(--raised);
  cursor: zoom-in;
}

app-recipe-pane .banner img,
app-recipe-pane .framed img,
app-recipe-pane .thumb img,
app-recipe-pane .cover img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

app-recipe-pane .banner {
  position: relative;
  width: calc(100% + 2 * var(--bleed-x));
  height: clamp(180px, 30cqi, 360px);
  margin: calc(-1 * var(--bleed-top)) calc(-1 * var(--bleed-x)) 24px;
  overflow: hidden;
}
@container pane (width < 480px) {
  app-recipe-pane .banner {
    height: auto;
    aspect-ratio: 4 / 3;
  }
}

app-recipe-pane .banner.grown {
  height: auto;
  max-height: 85dvh;
  aspect-ratio: var(--ratio);
  background: #1b1714;
  cursor: zoom-out;
}

app-recipe-pane .banner.grown img {
  object-fit: contain;
}

app-recipe-pane .grow-tell {
  position: absolute;
  right: 12px;
  bottom: 12px;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgb(0 0 0 / 0.55);
  color: #fff;
  font-size: 12px;
}

app-recipe-pane .head.beside {
  grid-template-areas:
    'title actions'
    'main picture';
}

app-recipe-pane .head.beside .actions {
  justify-content: flex-end;
}

app-recipe-pane .framed {
  grid-area: picture;
  justify-self: end;
  width: 280px;
  aspect-ratio: 4 / 3;
  margin-top: 6px;
  overflow: hidden;
  border-radius: var(--radius-large);
  box-shadow: var(--card-shadow);
}

app-recipe-pane .beside.portrait .framed {
  width: 210px;
  aspect-ratio: 4 / 5;
}
@container pane (width < 760px) {
  app-recipe-pane .head.beside {
    grid-template-areas:
      'title edit'
      'main picture'
      'source source';
  }

  app-recipe-pane .head.beside .edit {
    justify-self: end;
  }

  app-recipe-pane .framed {
    width: 38cqi;
    margin-top: 0;
    margin-bottom: 14px;
  }

  app-recipe-pane .beside.portrait .framed {
    width: 30cqi;
  }
}

app-recipe-pane .head.thumbed {
  grid-template-columns: auto minmax(0, 1fr) auto;
  grid-template-areas:
    'thumb title actions'
    'main main main';
  column-gap: 18px;
}

app-recipe-pane .thumb {
  grid-area: thumb;
  align-self: center;
  width: 76px;
  aspect-ratio: 1;
  margin-bottom: 8px;
  overflow: hidden;
  border-radius: var(--radius-large);
  box-shadow: var(--card-shadow);
}
@container pane (width < 760px) {
  app-recipe-pane .head.thumbed {
    grid-template-areas:
      'thumb title edit'
      'main main main'
      'source source source';
    column-gap: 12px;
  }

  app-recipe-pane .thumb {
    width: 60px;
  }
}

app-recipe-pane .head.covered {
  display: block;
}

app-recipe-pane .cover {
  position: relative;
  height: min(380px, 42cqi);
  margin-bottom: 18px;
  overflow: hidden;
  border-radius: var(--radius-large);
  background: var(--raised);
  box-shadow: var(--card-shadow);
}
@container pane (width < 760px) {
  app-recipe-pane .cover {
    height: 58cqi;
  }
}
@container pane (width < 480px) {
  app-recipe-pane .cover {
    height: 75cqi;
    margin: calc(-1 * var(--bleed-top)) calc(-1 * var(--bleed-x)) 18px;
    border-radius: 0;
  }
}

app-recipe-pane .cover img {
  position: absolute;
  inset: 0;
}

app-recipe-pane .cover-open {
  position: absolute;
  inset: 0;
  width: 100%;
  background: transparent;
}

app-recipe-pane .cover-text {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  padding: 64px 24px 18px;
  background: linear-gradient(to top, rgb(0 0 0 / 0.72), rgb(0 0 0 / 0));
  color: #fff;
  pointer-events: none;
}

app-recipe-pane .cover-text h1 {
  margin: 0;
  text-shadow: 0 1px 3px rgb(0 0 0 / 0.45);
}

app-recipe-pane .head.covered .actions {
  position: absolute;
  top: 12px;
  right: 12px;
  display: flex;
}

app-recipe-pane .viewer {
  width: 100vw;
  height: 100dvh;
  max-width: none;
  max-height: none;
  margin: 0;
  padding: 0;
  border: 0;
  background: rgb(14 12 10 / 0.96);
  overflow: hidden;
  cursor: zoom-out;
}

app-recipe-pane .viewer[open] {
  display: grid;
  place-items: center;
}

app-recipe-pane .viewer:modal {
  overscroll-behavior: contain;
}

app-recipe-pane .viewer::backdrop {
  background: transparent;
  overflow: hidden;
  overscroll-behavior: contain;
}

app-recipe-pane .viewer img {
  display: block;
  max-width: calc(100vw - 32px);
  max-height: calc(100dvh - 32px);
}

app-recipe-pane .viewer-close {
  position: absolute;
  top: 12px;
  right: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: 0;
  border-radius: 50%;
  background: rgb(255 255 255 / 0.16);
  color: #fff;
  cursor: pointer;
}
`;
