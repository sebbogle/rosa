export const SEGMENTED_CSS = `
app-segmented {
  display: inline-flex;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: var(--radius);
}

app-segmented .segment {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: var(--segment-target, auto);
  min-height: var(--segment-target, auto);
  padding: 6px 11px;
  background: var(--paper);
  color: var(--dim);
  font-size: 12px;
  cursor: pointer;
  user-select: none;
}

app-segmented .segment input {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

app-segmented .segment:has(input:checked) {
  background: var(--selected);
  color: var(--on-selected);
  font-weight: 600;
}

app-segmented .segment:has(input:focus-visible) {
  outline: var(--focus);
  outline-offset: 1px;
}
`;
