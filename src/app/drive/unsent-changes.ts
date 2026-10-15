import { Signal, computed, effect, signal, untracked } from '@angular/core';
import {
  RxDocumentData,
  getChangedDocumentsSince,
  getComposedPrimaryKeyOfDocumentData,
  writeDocToDocState,
} from 'rxdb';
import { EMPTY, Observable, catchError, first, from, startWith, switchMap } from 'rxjs';
import { Recipe } from '../recipe/recipe';
import { RecipeCollection } from '../recipe/recipe-schema';
import { ReplicationMeta, ReplicationMetaInstance, openReplicationMeta } from './replication-meta';

const READ_BATCH_SIZE = 100;

function keyOf(
  meta: ReplicationMetaInstance,
  itemId: string,
  isCheckpoint: ReplicationMeta['isCheckpoint'],
): string {
  return getComposedPrimaryKeyOfDocumentData(meta.schema, { itemId, isCheckpoint });
}

function anyUnsent(collection: RecipeCollection, identifier: string): Observable<boolean> {
  let opening: Promise<ReplicationMetaInstance> | undefined;

  const open = (): Promise<ReplicationMetaInstance> => {
    opening ??= openReplicationMeta(collection, identifier).catch((error: unknown) => {
      opening = undefined;
      throw error;
    });
    return opening;
  };

  const matches = (row: ReplicationMeta | undefined, doc: RxDocumentData<Recipe>): boolean => {
    if (row === undefined) return false;

    return collection.conflictHandler.isEqual(
      row.docData,
      writeDocToDocState(doc, false, false),
      'upstream-check-if-equal',
    );
  };

  const anyUnsentAmong = async (
    meta: ReplicationMetaInstance,
    documents: readonly RxDocumentData<Recipe>[],
  ): Promise<boolean> => {
    if (documents.length === 0) return false;

    const rows = await meta.findDocumentsById(
      documents.map(({ id }) => keyOf(meta, id, '0')),
      true,
    );
    const sent = new Map(rows.map((row) => [row.itemId, row]));

    return documents.some((doc) => !matches(sent.get(doc.id), doc));
  };

  async function* pages(): AsyncGenerator<boolean> {
    const meta = await open();
    const [up] = await meta.findDocumentsById([keyOf(meta, 'up', '1')], false);

    let since = up?.checkpointData;
    for (;;) {
      const { documents, checkpoint } = await getChangedDocumentsSince(
        collection.storageInstance,
        READ_BATCH_SIZE,
        since,
      );
      yield await anyUnsentAmong(meta, documents);

      if (documents.length < READ_BATCH_SIZE) return;
      since = checkpoint;
    }
  }

  return collection.eventBulks$.pipe(
    startWith(undefined),
    switchMap(() =>
      from(pages()).pipe(
        first((unsent) => unsent, false),
        catchError((error: unknown) => {
          console.warn('rosa could not tell what has not gone to Google Drive.', error);
          return EMPTY;
        }),
      ),
    ),
  );
}

export function unsentChanges(
  collection: RecipeCollection,
  identifier: string,
  betweenHours: Signal<boolean>,
): Signal<boolean> {
  const unsent = anyUnsent(collection, identifier);
  const any = signal(false);

  effect((onCleanup) => {
    if (!betweenHours()) return;

    const following = untracked(() => unsent.subscribe((found) => any.set(found)));
    onCleanup(() => {
      following.unsubscribe();
      any.set(false);
    });
  });

  return computed(() => betweenHours() && any());
}
