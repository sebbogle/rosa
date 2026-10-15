import {
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { Placement, childrenOf, drawnPath, resolveFolderName } from '../../recipe/folders';
import { RecipeStore } from '../../recipe/recipe-store';

const ROOT = 'No folder';

@Component({
  selector: 'app-folder-picker',
  templateUrl: './folder-picker.html',
  styleUrl: './folder-picker.css',
})
export class FolderPicker {
  private readonly recipes = inject(RecipeStore);

  readonly folder = input.required<Placement>();
  readonly changed = output<Placement>();

  protected readonly root = ROOT;

  private readonly shown = signal(false);

  readonly open = this.shown.asReadonly();

  protected readonly at = signal<Placement>([]);

  protected readonly naming = signal(false);

  protected readonly typed = signal('');

  private readonly trigger = viewChild<ElementRef<HTMLButtonElement>>('trigger');
  private readonly putButton = viewChild<ElementRef<HTMLButtonElement>>('putButton');
  private readonly nameField = viewChild<ElementRef<HTMLInputElement>>('nameField');

  protected readonly label = computed(() => drawnPath(this.folder()) || ROOT);

  protected readonly crumb = computed(() =>
    this.at().map((name, index) => ({ name, depth: index + 1 })),
  );

  protected readonly children = computed(() => childrenOf(this.recipes.recipes(), this.at()));

  private readonly resolution = computed(() => resolveFolderName(this.children(), this.typed()));

  protected readonly sentence = computed(() => {
    const resolution = this.resolution();
    if (resolution === undefined) return '';

    return resolution.existing
      ? `${resolution.name} already exists here - you will go into that one.`
      : `Creates ${drawnPath([...this.at(), resolution.name])}`;
  });

  constructor() {
    effect(() => {
      const field = this.nameField();
      if (field) field.nativeElement.focus();
    });
  }

  focus(): void {
    this.trigger()?.nativeElement.focus();
  }

  close(): void {
    this.shown.set(false);
  }

  protected toggle(): void {
    if (this.open()) {
      this.shown.set(false);
      return;
    }

    this.stand(this.folder());
    this.shown.set(true);
  }

  protected into(name: string): void {
    this.walk([...this.at(), name]);
  }

  protected upTo(depth: number): void {
    this.walk(this.at().slice(0, depth));
  }

  protected coin(event?: Event): void {
    event?.preventDefault();

    const resolution = this.resolution();
    if (resolution === undefined) return;

    this.stand([...this.at(), resolution.name], true);

    setTimeout(() => this.nameField()?.nativeElement.focus());
  }

  protected startNaming(): void {
    this.naming.set(true);
  }

  protected name(event: Event): void {
    this.typed.set((event.target as HTMLInputElement).value);
  }

  protected put(): void {
    this.changed.emit(this.at());
    this.shown.set(false);
    this.focus();
  }

  protected escape(event: Event): void {
    if (!this.open()) return;
    event.preventDefault();
    this.shown.set(false);
    this.focus();
  }

  protected leave(event: FocusEvent): void {
    const going = event.relatedTarget;
    const picker = event.currentTarget;
    if (going instanceof Node && picker instanceof Node && picker.contains(going)) return;

    setTimeout(() => {
      if (picker instanceof Node && picker.contains(document.activeElement)) return;
      this.shown.set(false);
    });
  }

  private walk(at: Placement): void {
    this.putButton()?.nativeElement.focus();
    this.stand(at);
  }

  private stand(at: Placement, naming = false): void {
    this.at.set([...at]);
    this.naming.set(naming);
    this.typed.set('');
  }
}
