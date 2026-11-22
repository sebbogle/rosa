import { Location } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';

export const VARIANTS = [
  { key: 'A', name: 'A menu on the thumbnail' },
  { key: 'B', name: 'A × on the thumbnail' },
  { key: 'C', name: 'Replace and Remove in the full-size view' },
  { key: 'D', name: 'Replace and Remove beside the thumbnail' },
] as const;

export type VariantKey = (typeof VARIANTS)[number]['key'];

export interface Picture {
  readonly url: string;
  readonly width: number;
  readonly height: number;
  readonly bytes: number;
  readonly ms: number;
}

export type Adding =
  | { readonly kind: 'idle' }
  | { readonly kind: 'shrinking'; readonly key: string }
  | { readonly kind: 'failed'; readonly key: string };

const SAMPLES = [
  { file: 'landscape-focaccia.jpg', width: 2048, height: 1542 },
  { file: 'portrait-sandwich.jpg', width: 1409, height: 2048 },
  { file: 'landscape-lemon-tart.jpg', width: 2048, height: 1536 },
  { file: 'portrait-chocolate-cake.jpg', width: 900, height: 1200 },
] as const;

export const SEEDED: Readonly<Record<string, number>> = {
  'focaccia-5e0c7a93d14b': 0,
  'lemon-tart-6d2f94b0a1c8': 2,
  'soda-bread-8e17c4a9b05d': 1,
};

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

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cycled<T>(list: readonly T[], current: T, step: number): T {
  const at = list.indexOf(current);
  return list[(at + step + list.length) % list.length];
}

function sampled(at: number): Picture {
  const sample = SAMPLES[at % SAMPLES.length];
  return {
    url: `picture-prototype/${sample.file}`,
    width: sample.width,
    height: sample.height,
    bytes: 0,
    ms: 0,
  };
}

@Injectable({ providedIn: 'root' })
export class AddingPicture {
  private readonly location = inject(Location);

  private readonly query = new URLSearchParams(this.location.path().split('?')[1] ?? '');

  readonly variant = signal<VariantKey>(
    VARIANTS.find((variant) => variant.key === this.query.get('variant'))?.key ?? 'A',
  );

  readonly slow = signal(this.query.get('slow') === '1');

  readonly asks = signal(this.query.get('asks') !== '0');

  readonly failNext = signal(false);

  readonly barOpen = signal(!matchMedia('(width < 768px)').matches);

  readonly adding = signal<Adding>({ kind: 'idle' });

  readonly last = signal<Picture | undefined>(undefined);

  private readonly store = signal<ReadonlyMap<string, Picture>>(new Map());

  private readonly aliases = new Map<string, string>();

  private readonly pending = new Map<string, number>();

  private tokens = 0;

  private samples = 0;

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
    const token = ++this.tokens;
    this.pending.set(this.resolve(key), token);
    this.adding.set({ kind: 'shrinking', key });

    const fail = this.failNext();
    this.failNext.set(false);
    const current = () => this.pending.get(this.resolve(key)) === token;

    try {
      if (fail) {
        await delay(this.slow() ? SLOW_MS : 400);
        throw new Error('prototype: next fails');
      }

      const shrunk = await shrink(file);
      if (this.slow()) await delay(SLOW_MS);
      if (!current()) return;

      const picture: Picture = {
        url: URL.createObjectURL(shrunk.blob),
        width: shrunk.width,
        height: shrunk.height,
        bytes: shrunk.blob.size,
        ms: Math.round(shrunk.ms),
      };
      this.last.set(picture);
      this.put(key, picture);
      this.settle(key, { kind: 'idle' });
    } catch {
      if (current()) this.settle(key, { kind: 'failed', key });
    } finally {
      if (current()) this.pending.delete(this.resolve(key));
    }
  }

  remove(key: string): void {
    this.cancel(key);
    this.store.update((store) => {
      const next = new Map(store);
      next.delete(this.resolve(key));
      return next;
    });
  }

  sample(key: string): void {
    this.cancel(key);
    this.put(key, sampled(this.samples++));
  }

  seed(): void {
    this.store.update((store) => {
      const next = new Map(store);
      for (const [id, at] of Object.entries(SEEDED)) next.set(id, sampled(at));
      return next;
    });
  }

  dismissFailure(key: string): void {
    if (this.stateFor(key).kind === 'failed') this.adding.set({ kind: 'idle' });
  }

  opened(id: string | undefined): void {
    this.before = id === undefined ? undefined : { id, picture: this.store().get(id) };
    if (this.adding().kind === 'failed') this.adding.set({ kind: 'idle' });
  }

  adopted(draft: string, id: string): void {
    this.aliases.set(draft, id);

    const token = this.pending.get(draft);
    if (token !== undefined) {
      this.pending.delete(draft);
      this.pending.set(id, token);
    }

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
    this.cancel(draft);
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
    this.cancel(id);

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
    this.pending.clear();
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
    this.writeUrl();
  }

  toggleSlow(): void {
    this.slow.set(!this.slow());
    this.writeUrl();
  }

  toggleAsks(): void {
    this.asks.set(!this.asks());
    this.writeUrl();
  }

  toggleFail(): void {
    this.failNext.set(!this.failNext());
  }

  private cancel(key: string): void {
    this.pending.delete(this.resolve(key));
    if (this.stateFor(key).kind !== 'idle') this.adding.set({ kind: 'idle' });
  }

  private settle(key: string, next: Adding): void {
    if (this.stateFor(key).kind !== 'idle') this.adding.set(next);
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
    params.delete('untitled');
    if (this.slow()) params.set('slow', '1');
    else params.delete('slow');
    if (this.asks()) params.delete('asks');
    else params.set('asks', '0');
    this.location.replaceState(path, params.toString());
  }
}
