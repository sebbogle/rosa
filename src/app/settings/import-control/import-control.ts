import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { Assent, ImportPlan, Importer, Landing, discloses, written } from '../../import/importer';
import { Refusal } from '../../recipe/recipe-gate';
import { plural } from '../../shell/formatting';

type Stage = 'ready' | 'reading' | 'asking' | 'writing' | 'done';

interface Report {
  readonly added: number;
  readonly replaced: number;
  readonly restored: number;
  readonly here: number;
  readonly leftDeleted: number;
  readonly leftInPlace: number;
  readonly unwritten: number;
  readonly refusals: readonly Refusal[];
}

@Component({
  selector: 'app-import-control',
  templateUrl: './import-control.html',
  styleUrls: ['../settings-row.css', './import-control.css'],
})
export class ImportControl {
  private readonly importer = inject(Importer);

  protected readonly stage = signal<Stage>('ready');

  private readonly plan = signal<ImportPlan | undefined>(undefined);

  private readonly report = signal<Report | undefined>(undefined);

  protected readonly replacing = signal(true);

  protected readonly restoring = signal(false);

  private readonly assent = computed<Assent>(() => ({
    replacing: this.replacing(),
    restoring: this.restoring(),
  }));

  private readonly counted = signal('');

  protected readonly sub = computed(() => {
    switch (this.stage()) {
      case 'reading':
      case 'writing':
        return this.counted();
      case 'asking':
        return 'rosa has read the files and written nothing yet.';
      default:
        return '';
    }
  });

  private readonly picker = viewChild.required<ElementRef<HTMLInputElement>>('picker');

  protected readonly disclosure = computed(() => {
    const plan = this.plan();
    if (plan === undefined) return undefined;

    return {
      lead: leadOf(plan),
      refused: refusedLine(plan.refusals.length),
      replacing: theseOf(plan.replaced.length, 'Replace'),
      restoring: theseOf(plan.restored.length, 'Restore'),
      replaced: plan.replaced.map((landing) => ({
        id: landing.recipe.id,
        title: landing.holds ?? landing.recipe.title,
        becoming: landing.holds === landing.recipe.title ? '' : landing.recipe.title,
      })),
      restored: plan.restored.map((landing) => ({
        id: landing.recipe.id,
        title: landing.recipe.title,
      })),
      writing: written(plan, this.assent()).length,
    };
  });

  protected readonly outcome = computed(() => {
    const report = this.report();
    if (report === undefined) return undefined;

    const counts = [
      phrase(report.added, 'added'),
      phrase(report.replaced, 'replaced'),
      phrase(report.restored, 'restored'),
      phrase(report.here, 'already here'),
    ].filter((line) => line !== '');

    const left = [
      phrase(report.leftDeleted, 'left deleted'),
      phrase(report.leftInPlace, 'left in place'),
      phrase(report.unwritten, 'could not be written'),
    ].filter((line) => line !== '');

    return {
      counts: counts.join(' · '),
      nothing: counts.length === 0,
      left,
      refused: refusedLine(report.refusals.length),
      refusals: report.refusals.map((refusal) => ({
        name: refusal.name,
        faults: refusal.faults.join('; '),
      })),
    };
  });

  protected pick(): void {
    this.picker().nativeElement.click();
  }

  protected chosen(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = [...(input.files ?? [])];

    input.value = '';
    if (files.length === 0) return;

    void this.run(files);
  }

  protected setReplacing(event: Event): void {
    this.replacing.set((event.target as HTMLInputElement).checked);
  }

  protected setRestoring(event: Event): void {
    this.restoring.set((event.target as HTMLInputElement).checked);
  }

  protected confirm(): void {
    const plan = this.plan();
    if (plan === undefined) return;

    void this.commit(plan, this.assent());
  }

  protected cancel(): void {
    this.plan.set(undefined);
    this.stage.set('ready');
  }

  protected dismiss(): void {
    this.report.set(undefined);
    this.stage.set('ready');
  }

  private async run(files: readonly File[]): Promise<void> {
    this.plan.set(undefined);
    this.report.set(undefined);
    this.replacing.set(true);
    this.restoring.set(false);
    this.stage.set('reading');
    this.counted.set(`Reading 0 of ${files.length}…`);

    const plan = await this.importer.read(files, (done, total) =>
      this.counted.set(`Reading ${done} of ${total}…`),
    );

    this.plan.set(plan);

    if (discloses(plan)) {
      this.stage.set('asking');
      return;
    }

    await this.commit(plan, { replacing: false, restoring: false });
  }

  private async commit(plan: ImportPlan, assent: Assent): Promise<void> {
    const writing = written(plan, assent).length;

    this.stage.set('writing');
    this.counted.set(`Writing ${writing} ${plural(writing, 'recipe')}…`);

    const missed = await this.importer.write(plan, assent);
    const landed = (group: readonly Landing[]): number =>
      group.filter((landing) => !missed.has(landing.recipe.id)).length;

    this.report.set({
      added: landed(plan.added),
      replaced: assent.replacing ? landed(plan.replaced) : 0,
      restored: assent.restoring ? landed(plan.restored) : 0,
      here: plan.here,
      leftDeleted: assent.restoring ? 0 : plan.restored.length,
      leftInPlace: assent.replacing ? 0 : plan.replaced.length,
      unwritten: missed.size,
      refusals: plan.refusals,
    });

    this.plan.set(undefined);
    this.stage.set('done');
  }
}

function leadOf(plan: ImportPlan): string {
  const replaced = `${plan.replaced.length} ${plural(plan.replaced.length, 'recipe')} will be replaced`;
  const restored = `${plan.restored.length} ${plural(plan.restored.length, 'recipe')} you deleted will be restored`;

  if (plan.replaced.length === 0) return `${restored}.`;
  if (plan.restored.length === 0) return `${replaced}.`;
  return `${replaced}, and ${restored}.`;
}

function refusedLine(refused: number): string {
  if (refused === 0) return '';
  return `${refused} ${plural(refused, 'file')} ${refused === 1 ? 'was' : 'were'} refused.`;
}

function theseOf(many: number, verb: string): string {
  return many === 1 ? `${verb} this recipe` : `${verb} these ${many} recipes`;
}

function phrase(many: number, word: string): string {
  return many === 0 ? '' : `${many} ${word}`;
}
