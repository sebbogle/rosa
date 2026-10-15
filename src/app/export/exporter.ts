import { EnvironmentInjector, Injectable, computed, inject } from '@angular/core';
import { Recipe } from '../recipe/recipe';
import { RecipeStore } from '../recipe/recipe-store';
import { downloadName, handOver } from './download';
import { paneMarkup } from './pane-markup';
import { recipeBlob, recipeFile, recipeFileName } from './recipe-file';
import { selectionOf } from './selection';
import { pageBlob } from './standalone-page';
import { storedZip } from './zip';

export type ExportFormat = 'json' | 'html';

interface Package {
  readonly extension: string;
  blob(name: string): Blob;
}

@Injectable({ providedIn: 'root' })
export class Exporter {
  private readonly recipes = inject(RecipeStore);
  private readonly injector = inject(EnvironmentInjector);

  readonly exportable = computed(() => this.recipes.recipes().length > 0);

  nameOf(taken: readonly Recipe[], format: ExportFormat): string {
    return this.named(taken, this.packageOf(taken, format).extension);
  }

  export(taken: readonly Recipe[], format: ExportFormat): void {
    if (taken.length === 0) return;

    const parcel = this.packageOf(taken, format);
    const name = this.named(taken, parcel.extension);
    handOver(parcel.blob(name), name);
  }

  private named(taken: readonly Recipe[], extension: string): string {
    return downloadName(selectionOf(taken, this.recipes.recipes()), extension);
  }

  private packageOf(taken: readonly Recipe[], format: ExportFormat): Package {
    if (format === 'html') {
      return {
        extension: 'html',
        blob: (name) => pageBlob(paneMarkup(taken, this.injector), name),
      };
    }

    if (taken.length === 1) return { extension: 'json', blob: () => recipeBlob(taken[0]) };

    return {
      extension: 'zip',
      blob: () =>
        storedZip(
          taken.map((recipe) => ({ name: recipeFileName(recipe), body: recipeFile(recipe) })),
        ),
    };
  }
}
