import { Injector, isDevMode } from '@angular/core';
import { RxStorage, addRxPlugin, createRxDatabase } from 'rxdb';
import {
  AngularSignalReactivityLambda,
  createReactivityFactory,
} from 'rxdb/plugins/reactivity-angular';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { crossedEdits } from './crossed-edits';
import { Cookbook, CookbookCollections, RECIPE_SCHEMA } from './recipe-schema';

const COOKBOOK_NAME = 'rosa';

let opening: Promise<Cookbook> | undefined;

let opened: Cookbook | undefined;

export function cookbook(): Cookbook {
  if (opened === undefined) throw new Error('rosa read the cookbook before it was open.');
  return opened;
}

async function storage(): Promise<RxStorage<unknown, unknown>> {
  const dexie = getRxStorageDexie();
  if (!isDevMode()) return dexie;

  const [devMode, validate] = await Promise.all([
    import('rxdb/plugins/dev-mode'),
    import('rxdb/plugins/validate-ajv'),
  ]);

  addRxPlugin(devMode.RxDBDevModePlugin);
  return validate.wrappedValidateAjvStorage({ storage: dexie });
}

async function open(injector: Injector): Promise<Cookbook> {
  const database = await createRxDatabase<
    CookbookCollections,
    unknown,
    unknown,
    AngularSignalReactivityLambda
  >({
    name: COOKBOOK_NAME,
    storage: await storage(),
    reactivity: createReactivityFactory(injector),
    closeDuplicates: true,
  });

  await database.addCollections({
    recipes: {
      schema: RECIPE_SCHEMA,
      migrationStrategies: {},
      conflictHandler: crossedEdits,
    },
  });

  opened = database;
  return database;
}

export function openCookbook(injector: Injector): Promise<Cookbook> {
  opening ??= open(injector);
  return opening;
}
