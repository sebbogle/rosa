import { ICONS, IconName } from '../shell/icon/icons';

export function drawnIcon(name: IconName, size: number, className?: string): string {
  const { d, weight } = ICONS[name];
  const classes = className === undefined ? '' : ` class="${className}"`;
  const stroke = weight === undefined ? '' : ` stroke-width="${weight}"`;
  return `<app-icon${classes} aria-hidden="true"><svg viewBox="0 0 16 16" style="width: ${size}em; height: ${size}em"><path d="${d}"${stroke}/></svg></app-icon>`;
}
