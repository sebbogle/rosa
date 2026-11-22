import { Location } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';

export const VARIANTS = [
  { key: 'A', name: 'Empty band at the top' },
  { key: 'B', name: 'Picture field by the tags' },
  { key: 'C', name: 'From the bar, drop or paste anywhere' },
  { key: 'D', name: 'Look before it goes in' },
] as const;

export type VariantKey = (typeof VARIANTS)[number]['key'];

export const UNTITLED = ['hold', 'title-first'] as const;

export type Untitled = (typeof UNTITLED)[number];

export const FAILS = ['off', 'heic', 'damaged'] as const;

export type Fail = (typeof FAILS)[number];

export type Unreadable = 'heic' | 'not-a-picture' | 'damaged';

export const UNREADABLE: Record<Unreadable, { readonly line: string; readonly sentence: string }> =
  {
    heic: {
      line: "This browser can't read HEIC pictures.",
      sentence:
        'iPhones and some Android phones take them. Choose a JPEG or PNG instead, or add this picture from Safari.',
    },
    'not-a-picture': {
      line: "That file isn't a picture.",
      sentence: 'rosa can add a JPEG, PNG, WebP or GIF.',
    },
    damaged: {
      line: "rosa couldn't read that picture.",
      sentence: "The file may be damaged, or in a format this browser doesn't know.",
    },
  };

export interface Picture {
  readonly url: string;
  readonly width: number;
  readonly height: number;
  readonly bytes: number;
  readonly ms: number;
}

export type Adding =
  | { readonly kind: 'idle' }
  | { readonly kind: 'shrinking'; readonly key: string; readonly preview: string }
  | { readonly kind: 'failed'; readonly key: string; readonly why: Unreadable }
  | { readonly kind: 'reviewing'; readonly key: string; readonly picture: Picture };

const LONG_SIDE = 2048;

const QUALITY = 0.8;

const SLOW_MS = 2500;

const WORKER = `
self.onmessage = async (event) => {
  const { file, longSide, quality } = event.data;
  const started = performance.now();
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, longSide / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    const canvas = new OffscreenCanvas(width, height);
    canvas.getContext('2d').drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality });
    self.postMessage({ ok: true, blob, width, height, ms: performance.now() - started });
  } catch (error) {
    self.postMessage({ ok: false, message: String(error) });
  }
};
`;

interface Shrunk {
  readonly blob: Blob;
  readonly width: number;
  readonly height: number;
  readonly ms: number;
}

function shrink(file: File): Promise<Shrunk> {
  const source = URL.createObjectURL(new Blob([WORKER], { type: 'text/javascript' }));
  const worker = new Worker(source);

  return new Promise<Shrunk>((resolve, reject) => {
    worker.onmessage = (event: MessageEvent) => {
      if (event.data.ok) resolve(event.data);
      else reject(new Error(event.data.message));
    };
    worker.onerror = (event) => reject(new Error(event.message));
    worker.postMessage({ file, longSide: LONG_SIDE, quality: QUALITY });
  }).finally(() => {
    worker.terminate();
    URL.revokeObjectURL(source);
  });
}

function unreadable(file: File): Unreadable {
  const name = file.name.toLowerCase();
  if (/hei[cf]/.test(file.type) || /\.hei[cf]$/.test(name)) return 'heic';
  if (file.type !== '' && !file.type.startsWith('image/')) return 'not-a-picture';
  return 'damaged';
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cycled<T>(list: readonly T[], current: T, step: number): T {
  const at = list.indexOf(current);
  return list[(at + step + list.length) % list.length];
}

@Injectable({ providedIn: 'root' })
export class AddingPicture {
  private readonly location = inject(Location);

  private readonly query = new URLSearchParams(this.location.path().split('?')[1] ?? '');

  readonly variant = signal<VariantKey>(
    VARIANTS.find((variant) => variant.key === this.query.get('variant'))?.key ?? 'A',
  );

  readonly untitled = signal<Untitled>(
    UNTITLED.find((mode) => mode === this.query.get('untitled')) ?? 'hold',
  );

  readonly slow = signal(this.query.get('slow') === '1');

  readonly failNext = signal<Fail>('off');

  readonly barOpen = signal(!matchMedia('(width < 768px)').matches);

  readonly adding = signal<Adding>({ kind: 'idle' });

  readonly last = signal<Picture | undefined>(undefined);

  private readonly store = signal<ReadonlyMap<string, Picture>>(new Map());

  private readonly aliases = new Map<string, string>();

  private before: { readonly id: string; readonly picture: Picture | undefined } | undefined;

  readonly count = () => this.store().size;

  of(key: string | undefined): Picture | undefined {
    if (key === undefined) return undefined;
    return this.store().get(this.resolve(key));
  }

  stateFor(key: string | undefined): Adding {
    const adding = this.adding();
    if (key === undefined || adding.kind === 'idle') return adding;
    return this.resolve(adding.key) === this.resolve(key) ? adding : { kind: 'idle' };
  }

  async add(file: File, key: string): Promise<void> {
    const preview = URL.createObjectURL(file);
    this.adding.set({ kind: 'shrinking', key, preview });

    const fail = this.failNext();
    this.failNext.set('off');

    try {
      if (fail !== 'off') {
        await delay(400);
        throw new Error(`prototype: ${fail}`);
      }

      const shrunk = await shrink(file);
      if (this.slow()) await delay(SLOW_MS);

      const picture: Picture = {
        url: URL.createObjectURL(shrunk.blob),
        width: shrunk.width,
        height: shrunk.height,
        bytes: shrunk.blob.size,
        ms: Math.round(shrunk.ms),
      };
      this.last.set(picture);

      if (this.variant() === 'D') {
        this.settle(key, { kind: 'reviewing', key, picture });
      } else {
        this.put(key, picture);
        this.settle(key, { kind: 'idle' });
      }
    } catch {
      this.settle(key, { kind: 'failed', key, why: fail !== 'off' ? fail : unreadable(file) });
    } finally {
      URL.revokeObjectURL(preview);
    }
  }

  accept(): void {
    const adding = this.adding();
    if (adding.kind !== 'reviewing') return;
    this.put(adding.key, adding.picture);
    this.adding.set({ kind: 'idle' });
  }

  dismiss(): void {
    this.adding.set({ kind: 'idle' });
  }

  opened(id: string | undefined): void {
    this.before = id === undefined ? undefined : { id, picture: this.store().get(id) };
    this.adding.set({ kind: 'idle' });
  }

  adopted(draft: string, id: string): void {
    this.aliases.set(draft, id);
    const held = this.store().get(draft);
    if (!held) return;

    this.store.update((store) => {
      const next = new Map(store);
      next.delete(draft);
      next.set(id, held);
      return next;
    });
  }

  dropped(draft: string): void {
    if (!this.store().has(draft)) return;
    this.store.update((store) => {
      const next = new Map(store);
      next.delete(draft);
      return next;
    });
  }

  reverted(id: string): void {
    if (this.before?.id !== id) return;
    const { picture } = this.before;

    this.store.update((store) => {
      const next = new Map(store);
      if (picture) next.set(id, picture);
      else next.delete(id);
      return next;
    });
  }

  clear(): void {
    this.store.set(new Map());
    this.aliases.clear();
    this.adding.set({ kind: 'idle' });
  }

  stepVariant(step: number): void {
    this.variant.set(
      cycled(
        VARIANTS.map((variant) => variant.key),
        this.variant(),
        step,
      ),
    );
    this.adding.set({ kind: 'idle' });
    this.writeUrl();
  }

  stepUntitled(): void {
    this.untitled.set(cycled(UNTITLED, this.untitled(), 1));
    this.writeUrl();
  }

  toggleSlow(): void {
    this.slow.set(!this.slow());
    this.writeUrl();
  }

  stepFail(): void {
    this.failNext.set(cycled(FAILS, this.failNext(), 1));
  }

  private settle(key: string, next: Adding): void {
    const current = this.adding();
    if (current.kind !== 'idle' && current.key === key) this.adding.set(next);
  }

  private put(key: string, picture: Picture): void {
    this.store.update((store) => new Map(store).set(this.resolve(key), picture));
  }

  private resolve(key: string): string {
    return this.aliases.get(key) ?? key;
  }

  private writeUrl(): void {
    const [path, query = ''] = this.location.path().split('?');
    const params = new URLSearchParams(query);
    params.set('variant', this.variant());
    params.set('untitled', this.untitled());
    if (this.slow()) params.set('slow', '1');
    else params.delete('slow');
    this.location.replaceState(path, params.toString());
  }
}
