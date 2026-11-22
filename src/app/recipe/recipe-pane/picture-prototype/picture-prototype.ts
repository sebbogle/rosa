import { Location } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';

export const VARIANTS = [
  { key: 'A', name: 'Banner, grows in place' },
  { key: 'B', name: 'Beside the notes, lightbox' },
  { key: 'C', name: 'Small square by the title, lightbox' },
  { key: 'D', name: 'Cover behind the title, lightbox' },
] as const;

export type VariantKey = (typeof VARIANTS)[number]['key'];

export const PICTURE_CHOICES = ['landscape', 'portrait', 'none', 'mixed'] as const;

export type PictureChoice = (typeof PICTURE_CHOICES)[number];

export interface PrototypePicture {
  readonly src: string;
  readonly width: number;
  readonly height: number;
  readonly portrait: boolean;
}

const LANDSCAPES: readonly PrototypePicture[] = [
  { src: 'picture-prototype/landscape-focaccia.jpg', width: 2048, height: 1542, portrait: false },
  { src: 'picture-prototype/landscape-lemon-tart.jpg', width: 2048, height: 1536, portrait: false },
];

const PORTRAITS: readonly PrototypePicture[] = [
  { src: 'picture-prototype/portrait-sandwich.jpg', width: 1409, height: 2048, portrait: true },
  {
    src: 'picture-prototype/portrait-chocolate-cake.jpg',
    width: 900,
    height: 1200,
    portrait: true,
  },
];

function hashOf(text: string): number {
  let hash = 0;
  for (const char of text) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash;
}

function cycled<T>(list: readonly T[], current: T, step: number): T {
  const at = list.indexOf(current);
  return list[(at + step + list.length) % list.length];
}

@Injectable({ providedIn: 'root' })
export class PicturePrototype {
  private readonly location = inject(Location);

  private readonly query = new URLSearchParams(this.location.path().split('?')[1] ?? '');

  readonly variant = signal<VariantKey>(
    VARIANTS.find((variant) => variant.key === this.query.get('variant'))?.key ?? 'A',
  );

  readonly choice = signal<PictureChoice>(
    PICTURE_CHOICES.find((choice) => choice === this.query.get('picture')) ?? 'landscape',
  );

  stepVariant(step: number): void {
    this.variant.set(
      cycled(
        VARIANTS.map((variant) => variant.key),
        this.variant(),
        step,
      ),
    );
    this.writeUrl();
  }

  stepPicture(step: number): void {
    this.choice.set(cycled(PICTURE_CHOICES, this.choice(), step));
    this.writeUrl();
  }

  pictureFor(id: string, side: number): PrototypePicture | undefined {
    const choice = this.choice();
    if (choice === 'none') return undefined;

    const portrait = choice === 'portrait' || (choice === 'mixed' && side === 1);
    const set = portrait ? PORTRAITS : LANDSCAPES;
    return set[hashOf(id) % set.length];
  }

  private writeUrl(): void {
    const [path, query = ''] = this.location.path().split('?');
    const params = new URLSearchParams(query);
    params.set('variant', this.variant());
    params.set('picture', this.choice());
    this.location.replaceState(path, params.toString());
  }
}
