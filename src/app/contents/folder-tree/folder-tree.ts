import {
  Component,
  ElementRef,
  Injector,
  ViewEncapsulation,
  afterNextRender,
  computed,
  effect,
  inject,
  linkedSignal,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { Placement, drawnPath, liftOf } from '../../recipe/folders';
import { RecipeStore } from '../../recipe/recipe-store';
import { Tabs } from '../../recipe/tabs';
import { Ask, Confirm } from '../../shell/confirm/confirm';
import { plural } from '../../shell/formatting';
import { ContentsDrawer } from '../contents-drawer';
import { ContentsFilter } from '../contents-filter';
import { isOpen, toggled } from '../contents-rules';
import { ancestorsOf, contentsRows, contentsTree, FolderRow, folderKey } from '../contents-tree';
import { FOLDER_TREE_CSS } from './folder-tree.css';

const ROOT = 'No folder';

@Component({
  selector: 'app-folder-tree',
  imports: [Confirm],
  host: { '(document:pointerdown)': 'dismiss($event)' },
  templateUrl: './folder-tree.html',
  styles: [FOLDER_TREE_CSS],
  encapsulation: ViewEncapsulation.None,
})
export class FolderTree {
  private readonly recipes = inject(RecipeStore);
  private readonly tabs = inject(Tabs);
  private readonly filter = inject(ContentsFilter);
  private readonly drawer = inject(ContentsDrawer);
  private readonly injector = inject(Injector);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  readonly surfaced = output();

  protected readonly openedId = this.tabs.openedId;

  private readonly expanded = linkedSignal<string | undefined, ReadonlySet<string>>({
    source: this.openedId,
    computation: (id, previous) => {
      const open = new Set(previous?.value);
      const recipe = id === undefined ? undefined : this.recipes.recipeAt(id);
      if (recipe) for (const key of ancestorsOf(recipe.folder)) open.add(key);
      return open;
    },
  });

  private readonly tree = computed(() => contentsTree(this.filter.matched()));

  protected readonly rows = computed(() => {
    const open = {
      expanded: this.expanded(),
      searching: this.filter.searching(),
      matchedIn: this.filter.matchedIn(),
    };

    return contentsRows(this.tree(), (key) => isOpen(key, open));
  });

  protected readonly nothingMatches = this.filter.nothingMatches;

  protected readonly quoted = computed(() => `\u201c${this.filter.query().trim()}\u201d`);

  protected readonly menuAt = signal<string | undefined>(undefined);

  protected readonly renamingAt = signal<string | undefined>(undefined);

  private readonly confirming = signal<Placement | undefined>(undefined);

  private readonly renameField = viewChild<ElementRef<HTMLInputElement>>('renameField');

  protected readonly removing = computed<Ask | undefined>(() => {
    const at = this.confirming();
    if (at === undefined) return undefined;

    const lift = liftOf(this.recipes.recipes(), at);
    const recipes = `${lift.recipes} ${plural(lift.recipes, 'recipe')}`;
    const folders =
      lift.folders === 0 ? '' : ` and ${lift.folders} ${plural(lift.folders, 'folder')}`;
    const moves = lift.recipes + lift.folders === 1 ? 'moves' : 'move';

    return {
      label: 'Remove folder',
      line: `Remove ${at[at.length - 1]}?`,
      sentences: [
        `${recipes}${folders} ${moves} up to ${drawnPath(lift.to) || ROOT}.`,
        'Nothing is deleted. Every recipe stays exactly where you can find it.',
      ],
      keep: 'Keep it',
      act: 'Remove the folder',
      tone: 'danger',
    };
  });

  constructor() {
    effect(() => {
      const field = this.renameField();
      if (!field) return;
      field.nativeElement.focus();
      field.nativeElement.select();
    });
  }

  protected toggle(key: string): void {
    if (this.filter.searching()) return;

    this.expanded.update((open) => toggled(open, key));
  }

  protected read(id: string, event: MouseEvent): void {
    if (event.ctrlKey || event.metaKey) this.tabs.keep(id);
    else this.tabs.open(id);
    this.drawer.hide();
  }

  protected keep(id: string): void {
    this.tabs.keep(id);
    this.drawer.hide();
  }

  protected middleClick(id: string, event: MouseEvent): void {
    if (event.button !== 1) return;
    this.tabs.keep(id);
    this.drawer.hide();
  }

  protected suppressAutoscroll(event: MouseEvent): void {
    if (event.button === 1) event.preventDefault();
  }

  protected menu(key: string): void {
    this.menuAt.update((at) => (at === key ? undefined : key));
  }

  protected dismiss(event: PointerEvent): void {
    if (this.menuAt() === undefined) return;

    const target = event.target;
    if (target instanceof Element && target.closest('.menu, .more')) return;

    this.menuAt.set(undefined);
  }

  protected startRename(row: FolderRow): void {
    this.menuAt.set(undefined);
    this.renamingAt.set(row.key);
  }

  protected commitRename(row: FolderRow, event: Event): void {
    if (this.renamingAt() !== row.key) return;
    this.renamingAt.set(undefined);

    const typed = (event.target as HTMLInputElement).value;
    void this.recipes.renameFolder(row.segments, typed);
  }

  protected cancelRename(): void {
    this.renamingAt.set(undefined);
  }

  protected askRemove(row: FolderRow): void {
    this.menuAt.set(undefined);
    this.confirming.set(row.segments);
  }

  protected confirmRemove(): void {
    const at = this.confirming();
    this.confirming.set(undefined);
    if (at === undefined) return;

    void this.recipes.removeFolder(at);
    if (at.length > 1) this.land(at.slice(0, -1));
    else this.surfaced.emit();
  }

  protected keepIt(): void {
    const at = this.confirming();
    this.confirming.set(undefined);
    if (at !== undefined) this.land(at);
  }

  peel(): boolean {
    if (this.renamingAt()) this.cancelRename();
    else if (this.menuAt()) this.menuAt.set(undefined);
    else return false;

    return true;
  }

  private land(at: Placement): void {
    const key = folderKey(at);
    afterNextRender(
      () => this.host.querySelector<HTMLElement>(`[data-key="${CSS.escape(key)}"]`)?.focus(),
      { injector: this.injector },
    );
  }
}
