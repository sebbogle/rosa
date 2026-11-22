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

.pa-band {
  position: relative;
  display: grid;
  place-items: center;
  height: clamp(150px, 30cqi, 300px);
  margin-bottom: 22px;
  overflow: hidden;
  border-radius: var(--radius-large);
  background: var(--raised);
}

.pa-band > img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.pa-band.pa-empty {
  border: 1.5px dashed var(--edge);
  background: var(--card);
}

.pa-band.pa-over {
  border-color: var(--accent);
  background: var(--accent-wash);
}

.pa-dim {
  opacity: 0.5;
  filter: blur(3px) saturate(0.6);
}

.pa-band > .pa-spinner,
.pa-preview-band > .pa-spinner {
  position: relative;
}

.pa-empty-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px;
  text-align: center;
}

.pa-buttons {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
}

.pa-hint {
  margin: 0;
  color: var(--faint);
  font-size: 13px;
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

.pa-slim {
  display: block;
  width: 100%;
  min-height: 44px;
  margin-bottom: 18px;
  border: 1.5px dashed var(--edge);
  border-radius: var(--radius);
  background: transparent;
  color: var(--dim);
  font: inherit;
  font-size: 14px;
  cursor: pointer;
}

.pa-slim:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.pa-slim[aria-disabled='true'] {
  color: var(--faint);
  cursor: default;
}

.pa-slim[aria-disabled='true']:hover {
  border-color: var(--edge);
}

.pa-under {
  margin: -12px 0 16px;
}

.pa-field {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
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
  align-items: center;
  gap: 10px;
  min-height: var(--field-height);
}

.pa-thumb {
  height: var(--field-height);
  aspect-ratio: 4 / 3;
  object-fit: cover;
  border-radius: var(--radius-small);
}

.pa-add {
  min-height: var(--field-height);
}

.pa-busy,
.pa-status {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--dim);
  font-size: 13px;
  white-space: nowrap;
}

@media (width < 480px) {
  .pa-long {
    display: none;
  }
}

.pa-menu-anchor {
  position: relative;
}

.pa-menu {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  z-index: 3;
}

.pa-menu.pa-up {
  top: auto;
  right: 0;
  bottom: calc(100% + 8px);
  left: auto;
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

.pa-drop-overlay {
  position: fixed;
  inset: 0;
  z-index: 10;
  display: grid;
  place-items: center;
  background: color-mix(in srgb, var(--accent) 14%, transparent);
  pointer-events: none;
}

.pa-drop-overlay span {
  padding: 14px 22px;
  border: 2px dashed var(--accent);
  border-radius: var(--radius-sheet);
  background: var(--paper);
  color: var(--accent);
  font-weight: 600;
}

.pa-dialog {
  width: min(440px, calc(100vw - 32px));
  padding: 22px 24px 18px;
  border: 0;
  border-radius: var(--radius-sheet);
  background: var(--paper);
  color: var(--ink);
  box-shadow: var(--confirm-shadow);
}

.pa-dialog::backdrop {
  background: var(--scrim);
}

.pa-review {
  width: min(620px, calc(100vw - 32px));
  max-height: calc(100dvh - 32px);
  overflow: auto;
}

.pa-dialog-line {
  margin: 0 0 8px;
  font-size: 17px;
  font-weight: 600;
}

.pa-dialog-sentence {
  margin: 0 0 14px;
  color: var(--dim);
  font-size: 14px;
  line-height: 1.5;
}

.pa-dialog-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
}

.pa-preview-band {
  position: relative;
  display: grid;
  place-items: center;
  height: min(240px, 42cqi);
  min-height: 160px;
  margin: 6px 0 14px;
  overflow: hidden;
  border-radius: var(--radius-large);
  background: var(--card);
}

.pa-preview-band > img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.pa-preview-title {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  padding: 48px 18px 14px;
  background: linear-gradient(to top, rgb(0 0 0 / 0.72), rgb(0 0 0 / 0));
  color: #fff;
  font-size: 22px;
  font-weight: 600;
  text-shadow: 0 1px 3px rgb(0 0 0 / 0.45);
}

.pa-preview-whole {
  display: block;
  max-width: 100%;
  max-height: 260px;
  margin: 0 auto;
  border-radius: var(--radius);
}
`;
