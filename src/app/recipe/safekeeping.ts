import { take } from 'rxjs';
import { numberIn, shelved } from '../shell/shelf';
import { RecipeCollection } from './recipe-schema';

const ASK_AGAIN_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

const refusal = shelved<number>({
  key: 'rosa.keep-refused',
  shape: numberIn,
  called: 'when this browser declined to keep your cookbook',
});

export function dueToAsk(refusedAt: number | undefined, now: number): boolean {
  if (refusedAt === undefined || now < refusedAt) return true;
  return now - refusedAt >= ASK_AGAIN_AFTER_MS;
}

export function safekeep(recipes: RecipeCollection): void {
  recipes.$.pipe(take(1)).subscribe(() => {
    void ask().catch((error: unknown) => {
      console.warn('rosa could not ask this browser to keep your cookbook.', error);
    });
  });
}

async function ask(): Promise<void> {
  const storage = navigator.storage as StorageManager | undefined;
  if (typeof storage?.persist !== 'function' || typeof storage.persisted !== 'function') return;

  if (await storage.persisted()) {
    refusal.forget();
    return;
  }

  if (!dueToAsk(refusal.read(), Date.now())) return;

  if (await storage.persist()) refusal.forget();
  else refusal.remember(Date.now());
}
