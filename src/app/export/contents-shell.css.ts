export const CONTENTS_SHELL_CSS = `
.chrome {
  display: none;
}

.pane {
  grid-row: 2;
}
@media (width < 1024px), (pointer: coarse) {
  .chrome {
    display: flex;
    align-items: center;
    gap: 12px;
    padding-right: 16px;
  }

  .chrome .contents {
    align-self: stretch;
  }

  .bookname {
    min-width: 0;
    overflow: hidden;
    color: var(--dim);
    font-size: 15px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
`;
