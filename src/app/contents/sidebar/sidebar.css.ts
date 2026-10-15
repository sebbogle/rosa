export const SIDEBAR_CSS = `
app-sidebar {
  display: contents;
}

app-sidebar .drawer {
  position: relative;
  inset: auto;
  display: flex;
  flex-direction: column;
  width: auto;
  height: auto;
  min-height: 0;
  max-width: none;
  max-height: none;
  margin: 0;
  padding: 0;
  overflow: visible;
  border: 0;
  border-right: 1px solid var(--line);
  background: var(--raised);
  color: inherit;
}

app-sidebar .searchwrap {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 12px 10px;
}

app-sidebar .search {
  flex: 1;
  min-width: 0;
  width: 100%;
  padding: 7px 10px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--field);
  font-size: 13px;
}

app-sidebar .search:focus {
  outline: var(--focus);
  outline-offset: -1px;
}

app-sidebar .shut {
  display: none;
}

app-sidebar .tree {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 4px 8px 12px;
}

app-sidebar .foot {
  flex: none;
  border-top: 1px solid var(--line);
}

app-sidebar .addnew {
  display: block;
  width: 100%;
  padding: 11px 16px;
  border: 0;
  background: transparent;
  color: var(--dim);
  font-size: 13px;
  text-align: left;
  cursor: pointer;
}

app-sidebar .addnew:hover {
  background: var(--hover);
  color: var(--ink);
}

app-sidebar app-grip {
  top: 0;
  right: -3px;
  bottom: 0;
}
@media (width < 1024px), (pointer: coarse) {
  app-sidebar .drawer {
    position: fixed;
    inset: 0 auto 0 0;
    z-index: 40;
    width: 320px;
    max-width: 86vw;
    box-shadow: var(--drawer-shadow);
    transform: translateX(-100%);
    visibility: hidden;
    transition:
      transform calc(180ms * var(--motion)) ease-out,
      visibility calc(180ms * var(--motion));
  }

  app-sidebar .drawer:modal {
    transform: none;
    visibility: visible;
    transition: transform calc(180ms * var(--motion)) ease-out;
  }

  app-sidebar .drawer::backdrop {
    background: var(--scrim);
    animation: contents-wash-in calc(180ms * var(--motion)) ease-out;
  }

  app-sidebar app-grip {
    display: none;
  }

  app-sidebar .search {
    padding: 12px;
    font-size: 16px;
  }

  app-sidebar .shut {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: none;
    width: 44px;
    height: 44px;
    padding: 0;
    border: 0;
    border-radius: var(--radius);
    background: transparent;
    color: var(--faint);
    font-size: 19px;
    line-height: 1;
    cursor: pointer;
  }

  app-sidebar .shut:hover {
    color: var(--ink);
  }

  app-sidebar .shut:focus-visible {
    outline: var(--focus);
  }

  app-sidebar .tree {
    overscroll-behavior: contain;
    scrollbar-width: none;
  }

  app-sidebar .tree::-webkit-scrollbar {
    display: none;
  }

  app-sidebar .addnew {
    min-height: 44px;
    padding: 15px 16px;
    font-size: 16px;
  }

  @media (width >= 768px) {
    app-sidebar .drawer {
      width: 360px;
    }
  }
}

@keyframes contents-wash-in {
  from {
    opacity: 0;
  }
}
`;
