import {
  EnvironmentInjector,
  EnvironmentProviders,
  inject,
  makeEnvironmentProviders,
  provideAppInitializer,
} from '@angular/core';
import { DriveService } from '../drive/drive-service';
import { openCookbook } from './cookbook';
import { RecipeStore } from './recipe-store';

async function start(injector: EnvironmentInjector): Promise<void> {
  await openCookbook(injector);

  const recipes = injector.get(RecipeStore);
  await recipes.ready;

  injector.get(DriveService).start();
}

export function provideCookbook(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideAppInitializer(() => start(inject(EnvironmentInjector))),
  ]);
}
