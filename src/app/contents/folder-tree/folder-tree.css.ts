export const FOLDER_TREE_CSS = `
app-folder-tree {
  display: block;
}

app-folder-tree > .line {
  position: relative;
  display: flex;
  align-items: center;
}

app-folder-tree .guide {
  flex: none;
  width: 17px;
}

app-folder-tree .row {
  display: grid;
  grid-template-columns: 13px minmax(0, 1fr);
  align-items: center;
  column-gap: 4px;
  width: 100%;
  min-width: 0;
  padding: 5px 8px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--dim);
  font-size: 13px;
  text-align: left;
  cursor: pointer;
}

app-folder-tree .label {
  grid-column: 2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

app-folder-tree .row.recipe .label {
  grid-column: 1 / -1;
}

app-folder-tree .row:hover {
  background: var(--hover);
  color: var(--ink);
}

app-folder-tree .chevron {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 13px;
  height: 13px;
  font-size: 9px;
  line-height: 1;
  color: var(--faint);
  transition: transform calc(120ms * var(--motion)) ease;
}

app-folder-tree .chevron.open {
  transform: rotate(90deg);
}

app-folder-tree .folder {
  font-weight: 500;
}

app-folder-tree .row.active {
  background: var(--accent);
  color: var(--on-accent);
}

app-folder-tree .row.active .chevron {
  color: inherit;
}

app-folder-tree .more {
  position: absolute;
  right: 4px;
  display: none;
  width: 22px;
  height: 22px;
  padding: 0;
  border: 0;
  border-radius: var(--radius-small);
  background: var(--hover);
  color: var(--dim);
  font-size: 13px;
  line-height: 1;
  cursor: pointer;
}

app-folder-tree > .line:hover > .more,
app-folder-tree > .line.menu-open > .more {
  display: block;
}

app-folder-tree .more:hover {
  background: var(--edge);
  color: var(--ink);
}

app-folder-tree .menu {
  position: absolute;
  top: 100%;
  right: 4px;
  z-index: 20;
}

app-folder-tree .rename {
  width: 100%;
  min-width: 0;
  padding: 4px 8px;
  border: 1px solid var(--accent);
  border-radius: 6px;
  background: var(--paper);
  color: var(--ink);
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
}

app-folder-tree .rename:focus {
  outline: none;
}

app-folder-tree .nomatch {
  display: none;
}

@media (width < 1024px), (pointer: coarse) {
  app-folder-tree .guide {
    width: 21px;
  }

  app-folder-tree .row {
    grid-template-columns: 15px minmax(0, 1fr);
    column-gap: 6px;
    min-height: 44px;
    padding: 11px 8px;
    border-radius: var(--radius-small-button);
    font-size: 17px;
  }

  app-folder-tree .chevron {
    width: 15px;
    height: 15px;
    font-size: 11px;
  }

  app-folder-tree .more {
    width: 32px;
    height: 32px;
    font-size: 15px;
  }

  app-folder-tree .rename {
    padding: 10px 8px;
    font-size: 17px;
  }

  app-folder-tree .nomatch {
    display: block;
    margin: 14px 10px;
    color: var(--faint);
    font-size: 16px;
    line-height: 1.5;
    text-wrap: pretty;
  }
}
`;
