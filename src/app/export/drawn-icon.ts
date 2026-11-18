import { ICONS, IconName } from '../shell/icon/icons';

export function drawnIcon(name: IconName, size: number): string {
  const { d, weight } = ICONS[name];
  const stroke = weight === undefined ? '' : ` stroke-width="${weight}"`;
  return `<app-icon aria-hidden="true"><svg viewBox="0 0 16 16" style="width: ${size}em; height: ${size}em"><path d="${d}"${stroke}/></svg></app-icon>`;
}
