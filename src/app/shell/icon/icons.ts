export interface IconShape {
  readonly d: string;
  readonly weight?: number;
}

const SHAPES = {
  menu: { d: 'M2.5 4.5h11M2.5 8h11M2.5 11.5h11' },
  gear: {
    d: 'M6 8a2 2 0 1 0 4 0a2 2 0 1 0-4 0M6.9 2.3h2.2l.4 1.7 1.2.7 1.7-.5 1.1 1.9-1.3 1.2v1.4l1.3 1.2-1.1 1.9-1.7-.5-1.2.7-.4 1.7H6.9l-.4-1.7-1.2-.7-1.7.5-1.1-1.9 1.3-1.2V7.3L2.5 6.1l1.1-1.9 1.7.5 1.2-.7z',
  },
  pencil: { d: 'M10.9 2.6l2.5 2.5-7.6 7.6-3.1.6.6-3.1zM9.4 4.1l2.5 2.5' },
  close: { d: 'M4 4l8 8M12 4l-8 8' },
  chevron: { d: 'M6 3.5L10.5 8 6 12.5' },
  caret: { d: 'M3.5 6L8 10.5 12.5 6' },
  more: { d: 'M3.5 8h.01M8 8h.01M12.5 8h.01', weight: 2.2 },
  grip: { d: 'M6 3.5h.01M10 3.5h.01M6 8h.01M10 8h.01M6 12.5h.01M10 12.5h.01', weight: 2 },
  arrow: { d: 'M4.5 11.5l7-7M6 4.5h5.5V10' },
  folder: {
    d: 'M1.75 4.25a1 1 0 0 1 1-1h3.4l1.5 1.5h5.6a1 1 0 0 1 1 1v6.5a1 1 0 0 1-1 1H2.75a1 1 0 0 1-1-1z',
  },
  plus: { d: 'M8 3v10M3 8h10' },
  magnifier: { d: 'M2.5 7a4.5 4.5 0 1 0 9 0a4.5 4.5 0 1 0-9 0M10.5 10.5L14 14' },
} satisfies Record<string, IconShape>;

export type IconName = keyof typeof SHAPES;

export const ICONS: Readonly<Record<IconName, IconShape>> = SHAPES;
