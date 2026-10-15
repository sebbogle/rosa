import { Injectable, inject, untracked } from '@angular/core';
import { Recipe, sameRecipe } from '../recipe/recipe';
import { Refusal, Verdict, admitRecipeFile, terminal } from '../recipe/recipe-gate';
import { RecipeStore } from '../recipe/recipe-store';
import { ArchiveMember, openArchive } from './archive';

const ARCHIVE_SUFFIX = '.zip';

const QUALIFIER = ' › ';

export interface Landing {
  readonly recipe: Recipe;
  readonly holds: string | undefined;
}

export interface Assent {
  readonly replacing: boolean;
  readonly restoring: boolean;
}

export interface ImportPlan {
  readonly added: readonly Landing[];
  readonly replaced: readonly Landing[];
  readonly restored: readonly Landing[];
  readonly here: number;
  readonly refusals: readonly Refusal[];
}

export function discloses(plan: ImportPlan): boolean {
  return plan.replaced.length > 0 || plan.restored.length > 0;
}

@Injectable({ providedIn: 'root' })
export class Importer {
  private readonly store = inject(RecipeStore);

  async read(
    files: readonly File[],
    counted: (done: number, total: number) => void,
  ): Promise<ImportPlan> {
    const verdicts: Verdict[] = [];
    let total = files.length;

    for (const file of files) {
      if (!isArchive(file)) {
        verdicts.push(admitRecipeFile(await file.text(), file.name));
        counted(verdicts.length, total);
        continue;
      }

      const members = await openArchive(file);

      if (members === undefined) {
        verdicts.push(terminal(file.name, 'could not be opened as an archive'));
        counted(verdicts.length, total);
        continue;
      }

      total += members.length - 1;
      counted(verdicts.length, total);

      for (const member of members) {
        verdicts.push(await admitMember(file.name, member));
        counted(verdicts.length, total);
      }
    }

    return this.planned(verdicts);
  }

  async write(plan: ImportPlan, assent: Assent): Promise<ReadonlySet<string>> {
    return this.store.land(written(plan, assent).map((landing) => landing.recipe));
  }

  private async planned(verdicts: readonly Verdict[]): Promise<ImportPlan> {
    const refusals: Refusal[] = [];
    const admitted: Recipe[] = [];
    const duplicated = duplicatedIds(verdicts);

    for (const verdict of verdicts) {
      if (verdict.kind === 'refused') {
        refusals.push({ name: verdict.name, faults: verdict.faults });
        continue;
      }

      if (duplicated.has(verdict.recipe.id)) {
        refusals.push({
          name: verdict.name,
          faults: ['another file in this selection carries the same id'],
        });
        continue;
      }

      admitted.push(verdict.recipe);
    }

    const cookbook = new Map(untracked(this.store.recipes).map((held) => [held.id, held]));
    const free = admitted.filter((recipe) => !cookbook.has(recipe.id)).map((recipe) => recipe.id);
    const tombstones = await this.store.tombstoned(free);

    const added: Landing[] = [];
    const replaced: Landing[] = [];
    const restored: Landing[] = [];
    let here = 0;

    for (const recipe of admitted) {
      const held = cookbook.get(recipe.id);

      if (held !== undefined) {
        if (sameRecipe(recipe, held)) here += 1;
        else replaced.push({ recipe, holds: held.title });
      } else if (tombstones.has(recipe.id)) {
        restored.push({ recipe, holds: undefined });
      } else {
        added.push({ recipe, holds: undefined });
      }
    }

    return { added, replaced, restored, here, refusals };
  }
}

export function written(plan: ImportPlan, assent: Assent): readonly Landing[] {
  return [
    ...plan.added,
    ...(assent.replacing ? plan.replaced : []),
    ...(assent.restoring ? plan.restored : []),
  ];
}

function isArchive(file: File): boolean {
  return file.name.toLowerCase().endsWith(ARCHIVE_SUFFIX);
}

async function admitMember(archive: string, member: ArchiveMember): Promise<Verdict> {
  const name = `${archive}${QUALIFIER}${member.name}`;

  try {
    return admitRecipeFile(await member.text(), name);
  } catch {
    return terminal(name, 'could not be read from the archive');
  }
}

function duplicatedIds(verdicts: readonly Verdict[]): ReadonlySet<string> {
  const seen = new Set<string>();
  const twice = new Set<string>();

  for (const verdict of verdicts) {
    if (verdict.kind !== 'admitted') continue;
    if (seen.has(verdict.recipe.id)) twice.add(verdict.recipe.id);
    seen.add(verdict.recipe.id);
  }

  return twice;
}
