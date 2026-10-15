import {
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { contentsSearch } from '../../contents/contents-filter';
import { isOpen, toggled } from '../../contents/contents-rules';
import { contentsRows, contentsTree } from '../../contents/contents-tree';
import { ExportFormat, Exporter } from '../../export/exporter';
import { beneathAt } from '../../recipe/folders';
import { RecipeStore } from '../../recipe/recipe-store';
import { plural } from '../../shell/formatting';
import { Segment, Segmented } from '../../shell/segmented/segmented';
import { settled } from '../../shell/settled';
import { Tick, tickOf } from './tick';

const COARSE = '(pointer: coarse)';

interface PickerFolderRow {
  readonly kind: 'folder';
  readonly key: string;
  readonly guides: readonly number[];
  readonly box: string;
  readonly segments: readonly string[];
  readonly name: string;
  readonly expanded: boolean;
  readonly tick: Tick;
}

interface PickerRecipeRow {
  readonly kind: 'recipe';
  readonly key: string;
  readonly guides: readonly number[];
  readonly id: string;
  readonly title: string;
  readonly ticked: boolean;
  readonly outside: boolean;
}

type PickerRow = PickerFolderRow | PickerRecipeRow;

@Component({
  selector: 'app-export-picker',
  imports: [Segmented],
  templateUrl: './export-picker.html',
  styleUrls: ['../settings-row.css', './export-picker.css'],
})
export class ExportPicker {
  private readonly store = inject(RecipeStore);
  private readonly exporter = inject(Exporter);
  private readonly injector = inject(Injector);

  private readonly cookbook = this.store.recipes;

  protected readonly exportable = this.exporter.exportable;

  private readonly toExport = signal<ReadonlySet<string> | null>(null);

  protected readonly open = signal(false);

  protected readonly leaving = signal(false);

  private readonly draft = signal<ReadonlySet<string>>(new Set());

  protected readonly typed = signal('');

  private readonly expanded = signal<ReadonlySet<string>>(new Set());

  protected readonly format = signal<ExportFormat>('json');

  protected readonly formats: readonly Segment<ExportFormat>[] = [
    { value: 'json', label: 'JSON' },
    { value: 'html', label: 'HTML' },
  ];

  private readonly opener = viewChild<ElementRef<HTMLButtonElement>>('opener');

  private readonly filter = viewChild<ElementRef<HTMLInputElement>>('filter');

  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');

  private readonly found = contentsSearch(this.cookbook, this.typed);

  private readonly searching = this.found.searching;

  private readonly matched = this.found.matched;

  private readonly ticked = computed(() => {
    const draft = this.draft();
    return this.cookbook().filter((recipe) => draft.has(recipe.id));
  });

  private readonly exporting = computed(() => {
    const toExport = this.toExport();
    const cookbook = this.cookbook();
    return toExport === null ? cookbook : cookbook.filter((recipe) => toExport.has(recipe.id));
  });

  private readonly hit = computed(() => new Set(this.matched().map((recipe) => recipe.id)));

  private readonly outside = computed(() => {
    if (!this.searching()) return new Set<string>();

    const hit = this.hit();
    return new Set(
      this.ticked()
        .filter((recipe) => !hit.has(recipe.id))
        .map((recipe) => recipe.id),
    );
  });

  private readonly shown = computed(() => {
    if (!this.searching()) return this.matched();

    const hit = this.hit();
    const outside = this.outside();
    return this.cookbook().filter((recipe) => hit.has(recipe.id) || outside.has(recipe.id));
  });

  protected readonly rows = computed<readonly PickerRow[]>(() => {
    const open = {
      expanded: this.expanded(),
      searching: this.searching(),
      matchedIn: this.found.matchedIn(),
    };
    const draft = this.draft();
    const outside = this.outside();
    const cookbook = this.cookbook();

    const rows = contentsRows(contentsTree(this.shown()), (key) => isOpen(key, open));

    return rows.map((row, at): PickerRow => {
      const shared = { key: row.key, guides: row.guides };

      if (row.kind === 'folder') {
        return {
          kind: 'folder',
          ...shared,
          box: `tick-${at}`,
          segments: row.segments,
          name: row.name,
          expanded: row.expanded,
          tick: tickOf(cookbook, row.segments, draft),
        };
      }

      return {
        kind: 'recipe',
        ...shared,
        id: row.id,
        title: row.title,
        ticked: draft.has(row.id),
        outside: outside.has(row.id),
      };
    });
  });

  protected readonly line = computed(() => {
    const exporting = this.exporting();
    if (exporting.length === 0) return 'Nothing to export';
    if (exporting.length === this.cookbook().length) return '';

    const name = this.exporter.nameOf(exporting, this.format());
    return `${countOf(exporting.length)} to export → ${name}`;
  });

  protected readonly tally = computed(() => {
    const count = this.ticked().length;
    const hidden = this.outside().size;

    return {
      count: count === 0 ? 'Nothing to export' : `${countOf(count)} to export`,
      hidden: hidden === 0 ? '' : `${hidden} of them outside the filter`,
      any: count > 0,
    };
  });

  protected readonly sweep = computed(() => {
    const matched = this.matched();
    const draft = this.draft();
    const held = matched.length > 0 && matched.every((recipe) => draft.has(recipe.id));

    return {
      label: held
        ? 'Untick these'
        : this.searching()
          ? `Export ${matched.length} matching`
          : `Export all ${this.cookbook().length}`,
      untick: held,
      nothing: matched.length === 0,
    };
  });

  protected readonly foot = computed(() => {
    const count = this.ticked().length;
    if (count === 0) return 'Nothing to export';
    if (count === this.cookbook().length) return `Everything · ${countOf(count)}`;
    return `${countOf(count)} to export`;
  });

  protected readonly exportLabel = computed(() => {
    const count = this.ticked().length;
    return count === 0 ? 'Export' : `Export ${count}`;
  });

  protected readonly quoted = computed(() => `“${this.typed().trim()}”`);

  protected show(): void {
    if (!this.exportable() || this.open()) return;

    const toExport = this.toExport();
    this.draft.set(new Set(toExport ?? this.cookbook().map((recipe) => recipe.id)));
    this.typed.set('');
    this.open.set(true);

    afterNextRender(
      () => {
        if (!matchMedia(COARSE).matches)
          this.filter()?.nativeElement.focus({ preventScroll: true });

        void this.reveal();
      },
      { injector: this.injector },
    );
  }

  protected cancel(): void {
    this.close();
  }

  protected send(): void {
    const ticked = this.ticked();
    if (ticked.length === 0) return;

    this.toExport.set(
      ticked.length === this.cookbook().length ? null : new Set(ticked.map((recipe) => recipe.id)),
    );
    this.exporter.export(ticked, this.format());
    this.close();
  }

  protected search(event: Event): void {
    this.typed.set((event.target as HTMLInputElement).value);
  }

  protected tickRecipe(id: string, event: Event): void {
    const on = (event.target as HTMLInputElement).checked;
    this.retick((draft) => (on ? draft.add(id) : draft.delete(id)));
  }

  protected tickFolder(row: PickerFolderRow, event: Event): void {
    const on = (event.target as HTMLInputElement).checked;
    const within = beneathAt(this.cookbook(), row.segments);

    this.retick((draft) => {
      for (const recipe of within) {
        if (on) draft.add(recipe.id);
        else draft.delete(recipe.id);
      }
    });
  }

  protected sweepMatching(): void {
    const untick = this.sweep().untick;
    const matched = this.matched();

    this.retick((draft) => {
      for (const recipe of matched) {
        if (untick) draft.delete(recipe.id);
        else draft.add(recipe.id);
      }
    });
  }

  protected clear(): void {
    this.draft.set(new Set());
  }

  protected toggle(key: string): void {
    this.expanded.update((open) => toggled(open, key));
  }

  protected choose(format: ExportFormat): void {
    this.format.set(format);
  }

  private close(): void {
    if (!this.open() || this.leaving()) return;

    this.leaving.set(true);
    afterNextRender(() => void this.fold(), { injector: this.injector });
  }

  private async reveal(): Promise<void> {
    const panel = this.panel()?.nativeElement;
    if (panel && (await settled(panel))) panel.scrollIntoView({ block: 'nearest' });
  }

  private async fold(): Promise<void> {
    const panel = this.panel()?.nativeElement;
    if (panel && !(await settled(panel))) return;

    this.open.set(false);
    this.leaving.set(false);

    afterNextRender(() => this.opener()?.nativeElement.focus(), { injector: this.injector });
  }

  private retick(change: (draft: Set<string>) => void): void {
    this.draft.update((held) => {
      const next = new Set(held);
      change(next);
      return next;
    });
  }
}

function countOf(many: number): string {
  return `${many} ${plural(many, 'recipe')}`;
}
