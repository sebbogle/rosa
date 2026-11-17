export const PANE_CSS = `
app-recipe-pane {
  display: block;
}

/* The rules after this block override it on the same specificity, so it must stay first. */
app-recipe-pane .two-column {
  display: grid;
  grid-template-columns: var(--two-column-split, minmax(0, 1fr) minmax(0, 1fr));
  gap: var(--gutter);
}
@container pane (width < 640px) {
  app-recipe-pane .two-column {
    grid-template-columns: minmax(0, 1fr);
  }
}

app-recipe-pane .column h2 {
  margin: 0 0 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--line);
  color: var(--dim);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

app-recipe-pane .group-card {
  margin-bottom: 14px;
  padding: 16px 18px;
  border-radius: var(--radius-large);
  background: var(--card);
  box-shadow: var(--card-shadow);
}
@media (width < 1024px), (pointer: coarse) {
  app-recipe-pane .column h2 {
    margin: 0 0 12px;
    padding-bottom: 9px;
    font-size: 13px;
  }

  app-recipe-pane .group-card {
    padding: 18px 20px;
  }
}

app-recipe-pane .head {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-areas:
    'title actions'
    'main main';
  align-items: start;
  column-gap: 24px;
}

app-recipe-pane .headmain {
  grid-area: main;
  min-width: 0;
}

app-recipe-pane .crumbline {
  margin: 0 0 10px;
  color: var(--dim);
  font-size: 14px;
}

app-recipe-pane h1 {
  grid-area: title;
  margin: 0 0 6px;
  font-family: ui-serif, Georgia, 'Times New Roman', serif;
  font-size: 34px;
  font-weight: 600;
  line-height: 1.1;
}

app-recipe-pane .tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0 0 10px;
}

app-recipe-pane .tag {
  padding: 2px 8px;
  border-radius: var(--radius-small);
  background: var(--accent);
  color: var(--on-accent);
  font-size: 11px;
}

app-recipe-pane .notes {
  margin: 0;
  max-width: 70ch;
  white-space: pre-wrap;
  line-height: 1.55;
}

app-recipe-pane .actions {
  grid-area: actions;
  display: flex;
  align-items: stretch;
  gap: 10px;
}

app-recipe-pane .source {
  display: flex;
  align-items: center;
  max-width: 40cqi;
  padding: 7px 12px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--field);
  color: var(--dim);
  font-size: 13px;
  text-decoration: none;
}

app-recipe-pane a.source:hover {
  border-color: var(--accent);
  color: var(--accent);
}

app-recipe-pane .source .text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

app-recipe-pane .tell {
  flex: none;
  width: 11px;
  height: 11px;
  margin-left: 6px;
  opacity: 0.7;
}

app-recipe-pane .edit {
  display: flex;
  align-items: center;
  padding: 7px 11px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--field);
  font-size: 14px;
  cursor: pointer;
}

app-recipe-pane .edit:hover {
  border-color: var(--accent);
  color: var(--accent);
}

app-recipe-pane .edit:active,
app-recipe-pane a.source:active {
  background: var(--hover);
}

app-recipe-pane .columns {
  --two-column-split: minmax(0, 5fr) minmax(0, 7fr);
  margin-top: 26px;
}

app-recipe-pane .column.alone {
  grid-column: 1 / -1;
  max-width: 70ch;
}

app-recipe-pane .columns .unwritten {
  grid-column: 1 / -1;
  margin: 0;
  color: var(--faint);
}

app-recipe-pane .column > h2,
app-recipe-pane .ingredients-head {
  display: flex;
  align-items: center;
  min-height: 29px;
  padding-bottom: 6px;
}

app-recipe-pane .ingredients-head {
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 6px 12px;
  margin: 0 0 10px;
  border-bottom: 1px solid var(--line);
}

app-recipe-pane .ingredients-head h2 {
  margin: 0;
  padding: 0;
  border: 0;
}

app-recipe-pane .sizing-name {
  color: var(--ink);
  font-size: 13px;
  font-weight: 600;
}

app-recipe-pane .ingredients-head app-segmented {
  flex-wrap: wrap;
  max-width: 100%;
}

app-recipe-pane .ingredients-head .segment {
  padding: 2px 9px;
  line-height: 16px;
  overflow-wrap: anywhere;
}

app-recipe-pane .group-card h3 {
  margin: 0 0 10px;
  font-size: 14px;
  font-weight: 600;
}

app-recipe-pane .ingredients {
  display: table;
  width: 100%;
  margin: 0;
  padding: 0;
  border-collapse: collapse;
  list-style: none;
}

app-recipe-pane .ingredients li {
  display: table-row;
  line-height: 1.5;
}

app-recipe-pane .ingredients li + li {
  border-top: 1px solid var(--line);
}

app-recipe-pane .amount,
app-recipe-pane .item {
  display: table-cell;
  padding-block: 5px;
}

app-recipe-pane .amount,
app-recipe-pane .ingredients li:not(:has(.amount))::before {
  width: 4.4em;
  padding-right: 14px;
}

app-recipe-pane .ingredients li:not(:has(.amount))::before {
  content: '';
  display: table-cell;
}

app-recipe-pane .amount {
  font-variant-numeric: tabular-nums;
  text-align: right;
  white-space: nowrap;
}

app-recipe-pane .steps {
  margin: 0;
  padding-left: 22px;
}

app-recipe-pane .steps li {
  margin: 9px 0;
  line-height: 1.6;
}

app-recipe-pane .steps li:first-child {
  margin-top: 4px;
}

app-recipe-pane .steps li:last-child {
  margin-bottom: 4px;
}

app-recipe-pane .steps li::marker {
  color: var(--accent);
}
@media (width < 1024px), (pointer: coarse) {
  app-recipe-pane h1 {
    margin: 0 0 8px;
    font-size: 40px;
    line-height: 1.05;
  }

  app-recipe-pane .crumbline {
    font-size: 16px;
  }

  app-recipe-pane .tags {
    gap: 7px;
    margin: 0 0 12px;
  }

  app-recipe-pane .tag {
    padding: 3px 10px;
    font-size: 13px;
  }

  app-recipe-pane .notes {
    font-size: 17px;
    line-height: 1.6;
  }

  app-recipe-pane .source {
    padding: 10px 14px;
    font-size: 15px;
  }

  app-recipe-pane .tell {
    width: 13px;
    height: 13px;
  }

  app-recipe-pane .edit {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 44px;
    height: 44px;
    padding: 0 13px;
    font-size: 17px;
  }

  app-recipe-pane .columns {
    --two-column-split: minmax(0, 4fr) minmax(0, 7fr);
    margin-top: 28px;
  }

  app-recipe-pane .ingredients-head {
    margin: 0 0 12px;
  }

  app-recipe-pane .sizing-name {
    font-size: 15px;
  }

  app-recipe-pane .ingredients-head .segment {
    padding: 2px 11px;
    font-size: 13px;
  }

  app-recipe-pane .group-card h3 {
    font-size: 16px;
  }

  app-recipe-pane .ingredients li {
    font-size: 18px;
    line-height: 1.5;
  }

  app-recipe-pane .amount,
  app-recipe-pane .item {
    padding-block: 8px;
  }

  app-recipe-pane .steps {
    padding-left: 26px;
  }

  app-recipe-pane .steps li {
    margin: 12px 0;
    font-size: 19px;
    line-height: 1.65;
  }

  app-recipe-pane .steps li:first-child {
    margin-top: 6px;
  }

  app-recipe-pane .steps li:last-child {
    margin-bottom: 6px;
  }

  @media (width < 768px) {
    app-recipe-pane h1 {
      font-size: 34px;
      line-height: 1.1;
    }

    app-recipe-pane .crumbline {
      margin: 0 0 12px;
    }

    app-recipe-pane .notes {
      font-size: 18px;
    }

    app-recipe-pane .edit {
      width: 44px;
      min-width: 44px;
      padding: 0;
    }

    app-recipe-pane .columns {
      gap: 26px;
      margin-top: 26px;
    }

    app-recipe-pane .amount,
    app-recipe-pane .item {
      padding-block: 9px;
    }

    app-recipe-pane .steps {
      padding-left: 24px;
    }

    app-recipe-pane .steps li {
      margin: 14px 0;
    }

    app-recipe-pane .steps li:first-child {
      margin-top: 7px;
    }

    app-recipe-pane .steps li:last-child {
      margin-bottom: 7px;
    }
  }
}
@container pane (width < 760px) {
  app-recipe-pane .head {
    grid-template-areas:
      'title edit'
      'main main'
      'source source';
    column-gap: 12px;
  }

  app-recipe-pane .headmain:has(+ .actions .source) .notes {
    margin-bottom: 16px;
  }

  app-recipe-pane .actions {
    display: contents;
  }

  app-recipe-pane .source {
    grid-area: source;
    justify-self: start;
    max-width: 100%;
  }

  app-recipe-pane .edit {
    grid-area: edit;
  }
}
`;
