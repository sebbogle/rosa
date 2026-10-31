import {
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { searchTerms, toggled } from '../../contents/contents-rules';
import { ancestorsOf, folderKey } from '../../contents/contents-tree';
import {
  Placement,
  beneath,
  childrenOf,
  drawnPath,
  folderNameOf,
  resolveFolderName,
} from '../../recipe/folders';
import { RecipeStore } from '../../recipe/recipe-store';
import { folderRows } from './folder-rows';

const ROOT = 'No folder';

const COARSE = '(pointer: coarse)';

interface Adding {
  readonly at: Placement;
  readonly name: string;
}

@Component({
  selector: 'app-folder-picker',
  templateUrl: './folder-picker.html',
  styleUrls: ['../../shell/tree-row.css', './folder-picker.css'],
})
export class FolderPicker {
  private readonly recipes = inject(RecipeStore);
  private readonly injector = inject(Injector);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  readonly folder = input.required<Placement>();
  readonly changed = output<Placement>();

  protected readonly root = ROOT;

  protected readonly rootKey = folderKey([]);

  private readonly shown = signal(false);

  readonly open = this.shown.asReadonly();

  private readonly expanded = signal<ReadonlySet<string>>(new Set());

  protected readonly typed = signal('');

  protected readonly adding = signal<Adding | undefined>(undefined);

  private readonly trigger = viewChild<ElementRef<HTMLButtonElement>>('trigger');
  private readonly finder = viewChild<ElementRef<HTMLInputElement>>('finder');
  private readonly nameField = viewChild<ElementRef<HTMLInputElement>>('nameField');

  protected readonly label = computed(() => drawnPath(this.folder()) || ROOT);

  protected readonly above = computed(() => {
    const folder = this.folder();
    return folder.length > 1 ? `${drawnPath(folder.slice(0, -1))} › ` : '';
  });

  protected readonly here = computed(() => this.folder().at(-1) ?? ROOT);

  // Folders are implied by recipes. The chosen placement joins them so a folder made a moment ago
  // shows before the recipe holding it is saved.
  private readonly folders = computed(() => [
    ...this.recipes.recipes().map((recipe) => recipe.folder),
    this.folder(),
  ]);

  private readonly searching = computed(() => searchTerms(this.typed()).length > 0);

  protected readonly rows = computed(() =>
    folderRows(this.folders(), {
      chosen: this.folder(),
      expanded: this.expanded(),
      typed: this.typed(),
      addingAt: this.adding()?.at,
    }),
  );

  protected readonly nothing = computed(() => this.searching() && this.rows().length === 0);

  protected readonly quoted = computed(() => `“${this.typed().trim()}”`);

  protected readonly coined = computed(() => folderNameOf(this.typed()));

  protected readonly named = computed(() => folderNameOf(this.adding()?.name ?? '') !== '');

  focus(): void {
    this.trigger()?.nativeElement.focus();
  }

  close(): void {
    this.shown.set(false);
    this.stopAdding();
  }

  protected toggle(): void {
    if (this.open()) {
      this.close();
      return;
    }

    this.expanded.set(new Set(ancestorsOf(this.folder().slice(0, -1))));
    this.typed.set('');
    this.stopAdding();
    this.shown.set(true);

    afterNextRender(
      () => {
        if (!matchMedia(COARSE).matches) this.finder()?.nativeElement.focus();
      },
      { injector: this.injector },
    );
  }

  protected choose(folder: Placement): void {
    this.changed.emit(folder);
    this.close();
    this.focus();
  }

  protected flip(folder: Placement): void {
    if (this.searching()) return;

    const key = folderKey(folder);
    const closing = this.expanded().has(key);
    this.expanded.update((open) => toggled(open, key));

    const adding = this.adding();
    if (closing && adding !== undefined && beneath(adding.at, folder)) this.stopAdding();
  }

  protected search(event: Event): void {
    this.typed.set((event.target as HTMLInputElement).value);
    this.stopAdding();
  }

  protected startAdding(at: Placement): void {
    if (at.length === 0) this.typed.set('');
    else this.expanded.update((open) => new Set(open).add(folderKey(at)));

    this.adding.set({ at: [...at], name: '' });

    afterNextRender(() => this.nameField()?.nativeElement.focus(), { injector: this.injector });
  }

  protected name(event: Event): void {
    const name = (event.target as HTMLInputElement).value;
    this.adding.update((adding) => adding && { ...adding, name });
  }

  protected add(event?: Event): void {
    event?.preventDefault();

    const adding = this.adding();
    if (adding === undefined) return;

    const resolution = resolveFolderName(childrenOf(this.folders(), adding.at), adding.name);
    if (resolution !== undefined) this.choose([...adding.at, resolution.name]);
  }

  protected createFromFilter(): void {
    const resolution = resolveFolderName(childrenOf(this.folders(), []), this.typed());
    if (resolution !== undefined) this.choose([resolution.name]);
  }

  protected escape(event: Event): void {
    if (!this.open()) return;
    event.preventDefault();

    const adding = this.adding();
    if (adding === undefined) {
      this.close();
      this.focus();
      return;
    }

    this.stopAdding();
    const from = `[data-adds="${CSS.escape(folderKey(adding.at))}"]`;
    afterNextRender(
      () => (this.host.querySelector<HTMLElement>(from) ?? this.finder()?.nativeElement)?.focus(),
      { injector: this.injector },
    );
  }

  protected leave(event: FocusEvent): void {
    const going = event.relatedTarget;
    const picker = event.currentTarget;
    if (going instanceof Node && picker instanceof Node && picker.contains(going)) return;

    setTimeout(() => {
      if (picker instanceof Node && picker.contains(document.activeElement)) return;
      this.close();
    });
  }

  private stopAdding(): void {
    this.adding.set(undefined);
  }
}
