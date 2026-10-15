export const FRAME_CSS = `
.app {
  display: grid;
  grid-template-columns: var(--sidebar-width) minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr);
  height: 100%;
}

.reading {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  min-width: 0;
}

.chrome {
  display: flex;
  align-items: stretch;
  min-width: 0;
  overflow: hidden;
}

.chrome button {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 46px;
  padding: 0;
  border: 0;
  background: var(--raised);
  color: var(--dim);
  line-height: 1;
  cursor: pointer;
}

.chrome button:focus-visible {
  outline: var(--focus);
  outline-offset: -2px;
}

.chrome .contents {
  display: none;
}
@media (width < 1024px), (pointer: coarse) {
  .app {
    grid-template-columns: minmax(0, 1fr);
  }

  .chrome {
    height: 52px;
    background: var(--raised);
    border-bottom: 1px solid var(--line);
  }

  .chrome .contents {
    display: flex;
    border-right: 1px solid var(--line);
    font-size: 17px;
  }

  .chrome .contents.showing {
    background: var(--paper);
    color: var(--ink);
  }
}
`;

export const PANE_LAYOUT_CSS = `
.pane {
  container: pane / inline-size;
  min-width: 0;
  overflow: auto;
  overscroll-behavior-y: contain;
  padding: 28px 36px 60px;
}
@media (width < 1024px), (pointer: coarse) {
  .pane {
    padding: 26px 34px 44px;
    font-size: 17px;
  }

  @media (width < 768px) {
    .pane {
      padding: 22px 20px 44px;
      font-size: 18px;
    }
  }
}
`;
