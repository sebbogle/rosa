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
  display: none;
}

app-recipe-pane h1 {
  grid-area: title;
  margin: 0 0 6px;
  font-family: ui-serif, Georgia, 'Times New Roman', serif;
  font-size: 34px;
  font-weight: 600;
  line-height: 1.1;
}

app-recipe-pane .folder,
app-recipe-pane .meta {
  margin: 0 0 10px;
  color: var(--dim);
  font-size: 13px;
}

app-recipe-pane .folder {
  font-size: 14px;
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
  align-items: center;
  gap: 10px;
}

app-recipe-pane .source {
  display: flex;
  align-items: baseline;
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
  margin-left: 5px;
  opacity: 0.6;
  font-size: 11px;
}

app-recipe-pane .edit {
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

app-recipe-pane .columns {
  --two-column-split: minmax(0, 5fr) minmax(0, 7fr);
  margin-top: 26px;
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
  overflow-wrap: anywhere;
}

app-recipe-pane .group-card h3 {
  margin: 0 0 10px;
  font-size: 14px;
  font-weight: 600;
}

app-recipe-pane .ingredients {
  margin: 0;
  padding-left: 20px;
  list-style: disc;
}

app-recipe-pane .ingredients li {
  margin: 5px 0;
  line-height: 1.5;
}

app-recipe-pane .amount {
  font-variant-numeric: tabular-nums;
}

app-recipe-pane .steps {
  margin: 0;
  padding-left: 22px;
}

app-recipe-pane .steps li {
  margin: 9px 0;
  line-height: 1.6;
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
    display: block;
    margin: 0 0 10px;
    color: var(--dim);
    font-size: 16px;
  }

  app-recipe-pane .folder,
  app-recipe-pane .meta {
    display: none;
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
    font-size: 12px;
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
    justify-content: center;
    min-width: 44px;
    min-height: 44px;
  }

  app-recipe-pane .group-card h3 {
    font-size: 16px;
  }

  app-recipe-pane .ingredients {
    padding-left: 22px;
  }

  app-recipe-pane .ingredients li {
    margin: 8px 0;
    font-size: 18px;
    line-height: 1.5;
  }

  app-recipe-pane .steps {
    padding-left: 26px;
  }

  app-recipe-pane .steps li {
    margin: 12px 0;
    font-size: 19px;
    line-height: 1.65;
  }

  @media (width < 768px) {
    app-recipe-pane .head {
      grid-template-areas:
        'title edit'
        'main main'
        'source source';
      column-gap: 12px;
    }

    app-recipe-pane h1 {
      font-size: 34px;
      line-height: 1.1;
    }

    app-recipe-pane .crumbline {
      display: none;
    }

    app-recipe-pane .folder {
      display: block;
      margin: 0 0 12px;
      font-size: 16px;
    }

    app-recipe-pane .meta {
      display: block;
      margin: 0 0 12px;
      font-size: 15px;
    }

    app-recipe-pane .notes {
      margin: 0 0 16px;
      font-size: 18px;
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
      width: 44px;
      min-width: 44px;
      padding: 0;
    }

    app-recipe-pane .columns {
      gap: 26px;
      margin-top: 26px;
    }

    app-recipe-pane .ingredients li {
      margin: 9px 0;
    }

    app-recipe-pane .steps {
      padding-left: 24px;
    }

    app-recipe-pane .steps li {
      margin: 14px 0;
    }
  }
}
`;
