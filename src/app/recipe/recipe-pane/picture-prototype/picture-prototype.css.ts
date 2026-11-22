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

app-recipe-pane .cover-open {
  display: block;
  padding: 0;
  border: 0;
  cursor: zoom-in;
}

app-recipe-pane .cover img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
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
