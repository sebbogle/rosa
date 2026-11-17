import { ICON_PATHS } from '../shell/icon/icon-paths';

export function drawnIcon(name: keyof typeof ICON_PATHS, size: number): string {
  return `<svg viewBox="0 0 16 16" width="${size}em" height="${size}em" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${ICON_PATHS[name]}"/></svg>`;
}
