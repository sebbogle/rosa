export const PICTURE_ADDER_CSS = `
.pa-host {
  display: contents;
}

.pa-file {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

.pa-field {
  --field-height: 37px;
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
}

@media (width < 1024px), (pointer: coarse) {
  .pa-field {
    --field-height: 46px;
  }

  @media (width < 768px) {
    .pa-field {
      --field-height: 37px;
    }
  }
}

.pa-name {
  color: var(--dim);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.pa-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 10px;
  min-height: var(--field-height);
}

.pa-add {
  min-height: var(--field-height);
}

.pa-error {
  margin: 0;
  max-width: 48ch;
  color: var(--accent);
  font-size: 13px;
  line-height: 1.45;
}

.pa-error:empty {
  display: none;
}

.pa-busy {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--dim);
  font-size: 13px;
  white-space: nowrap;
}

.pa-thumb-button {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0;
  border: 0;
  border-radius: var(--radius-small);
  background: transparent;
  color: var(--dim);
  cursor: zoom-in;
}

.pa-thumb-button:focus-visible {
  outline: var(--focus);
  outline-offset: 2px;
}

.pa-thumb-button:disabled {
  cursor: default;
}

.pa-with-caret {
  padding-right: 8px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--card);
  cursor: pointer;
}

.pa-with-caret:hover:not(:disabled),
.pa-with-caret[aria-expanded='true'] {
  border-color: var(--edge);
  background: var(--hover);
}

.pa-with-caret .pa-thumb-frame {
  border-radius: calc(var(--radius) - 1px) 0 0 calc(var(--radius) - 1px);
}

.pa-with-caret .pa-thumb {
  height: calc(var(--field-height) - 2px);
  border-radius: 0;
}

.pa-thumb-frame {
  position: relative;
  display: grid;
  place-items: center;
  overflow: hidden;
  border-radius: var(--radius-small);
}

.pa-thumb-frame > * {
  grid-area: 1 / 1;
}

.pa-thumb {
  display: block;
  height: var(--field-height);
  aspect-ratio: 4 / 3;
  object-fit: cover;
  border-radius: var(--radius-small);
}

.pa-busy-thumb .pa-thumb {
  opacity: 0.45;
  filter: saturate(0.5);
}

.pa-thumb-wrap {
  position: relative;
  display: inline-flex;
}

.pa-x {
  position: absolute;
  top: -7px;
  right: -7px;
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  padding: 0;
  border: 1.5px solid var(--paper);
  border-radius: 50%;
  background: var(--ink);
  color: var(--paper);
  cursor: pointer;
}

.pa-x::before {
  content: '';
  position: absolute;
  inset: -9px;
}

.pa-x:hover {
  background: var(--accent);
}

.pa-x:focus-visible {
  outline: var(--focus);
  outline-offset: 1px;
}

.pa-words {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 6px;
}

.pa-word {
  min-height: var(--field-height);
}

.pa-menu {
  margin: 0;
}

@supports (position-area: block-start) {
  .pa-menu {
    inset: auto;
    margin: 4px 0;
    position-area: block-start span-inline-end;
    position-try-fallbacks: flip-block, flip-inline, flip-block flip-inline;
  }
}

@supports not (position-area: block-start) {
  .pa-menu {
    position: fixed;
    inset: auto;
  }
}

.pa-viewer {
  width: 100vw;
  height: 100dvh;
  max-width: none;
  max-height: none;
  margin: 0;
  padding: 0;
  border: 0;
  background: rgb(14 12 10 / 0.96);
  color: #fff;
  overflow: hidden;
  cursor: zoom-out;
}

.pa-viewer[open] {
  display: grid;
  grid-template-rows: minmax(0, 1fr);
}

.pa-viewer.pa-actions[open] {
  grid-template-rows: minmax(0, 1fr) auto;
}

.pa-viewer::backdrop {
  background: transparent;
}

.pa-viewer-stage {
  display: grid;
  place-items: center;
  min-height: 0;
  padding: 16px;
}

.pa-viewer-stage > * {
  grid-area: 1 / 1;
}

.pa-viewer-stage img {
  display: block;
  max-width: 100%;
  max-height: calc(100dvh - 32px);
  transition: opacity 0.2s;
}

.pa-actions .pa-viewer-stage img {
  max-height: calc(100dvh - 32px - 76px);
}

.pa-viewer-stage img.pa-dim {
  opacity: 0.35;
  filter: blur(2px);
}

.pa-viewer-close {
  position: absolute;
  top: calc(12px + env(safe-area-inset-top));
  right: 12px;
  z-index: 1;
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

.pa-viewer-bar {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 0 16px calc(18px + env(safe-area-inset-bottom));
  cursor: default;
}

.pa-viewer-error {
  margin: 0;
  color: #ffb4a8;
  font-size: 14px;
}

.pa-viewer-buttons {
  display: flex;
  gap: 10px;
}

.pa-viewer-action {
  min-width: 112px;
  min-height: 44px;
  padding: 0 18px;
  border: 0;
  border-radius: 999px;
  background: rgb(255 255 255 / 0.16);
  color: #fff;
  font: inherit;
  font-size: 15px;
  cursor: pointer;
}

.pa-viewer-action:hover:not(:disabled) {
  background: rgb(255 255 255 / 0.26);
}

.pa-viewer-action:disabled {
  color: rgb(255 255 255 / 0.4);
  cursor: default;
}

.pa-viewer-action:focus-visible,
.pa-viewer-close:focus-visible {
  outline: 2px solid #fff;
  outline-offset: 2px;
}

.pa-spinner {
  --size: 40px;
  --thickness: 3px;
  flex: none;
  width: var(--size);
  height: var(--size);
  appearance: none;
  border: 0;
  border-radius: 50%;
  background: conic-gradient(from 90deg, var(--accent) 0 40%, transparent 0) var(--hover-strong);
  mask-image: radial-gradient(
    farthest-side,
    transparent calc(100% - var(--thickness)),
    black calc(100% - var(--thickness))
  );
  animation: pa-spin 0.9s linear infinite;
}

.pa-spinner.pa-small {
  --size: 18px;
  --thickness: 2.5px;
}

.pa-spinner::-webkit-progress-bar {
  display: none;
  background: none;
}

.pa-spinner::-webkit-progress-value {
  display: none;
  background: none;
}

.pa-spinner::-moz-progress-bar {
  display: none;
  background: none;
}

@keyframes pa-spin {
  to {
    rotate: 1turn;
  }
}

@media (prefers-reduced-motion: reduce) {
  .pa-spinner {
    animation-duration: 6s;
  }
}

@media (forced-colors: active) {
  .pa-spinner {
    forced-color-adjust: none;
    background: conic-gradient(from 90deg, CanvasText 0 40%, transparent 0) Canvas;
  }
}
`;
