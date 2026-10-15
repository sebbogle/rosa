import {
  RxStorageDefaultCheckpoint,
  RxStorageInstance,
  RxStorageReplicationMeta,
  getRxReplicationMetaInstanceSchema,
  overwritable,
  removeConnectedStorageFromCollection,
} from 'rxdb';
import { Recipe } from '../recipe/recipe';
import { RecipeCollection } from '../recipe/recipe-schema';

export type ReplicationMeta = RxStorageReplicationMeta<Recipe, RxStorageDefaultCheckpoint>;

export type ReplicationMetaInstance = RxStorageInstance<ReplicationMeta, unknown, unknown>;

export async function openReplicationMeta(
  collection: RecipeCollection,
  identifier: string,
): Promise<ReplicationMetaInstance> {
  const database = collection.database;
  const name = [collection.name, identifier].join('-');

  return database.storage.createStorageInstance<ReplicationMeta>({
    databaseName: database.name,
    collectionName: `rx-replication-meta-${await database.hashFunction(name)}`,
    databaseInstanceToken: database.token,
    multiInstance: database.multiInstance,
    options: {},
    schema: getRxReplicationMetaInstanceSchema(collection.schema.jsonSchema, false),
    password: database.password,
    devMode: overwritable.isDevMode(),
  });
}

export async function dropReplicationMeta(
  collection: RecipeCollection,
  identifier: string,
): Promise<void> {
  const meta = await openReplicationMeta(collection, identifier);
  await meta.remove();
  await removeConnectedStorageFromCollection(collection, meta.collectionName, meta.schema);
}
