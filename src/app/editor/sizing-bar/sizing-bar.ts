import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  computed,
  inject,
  viewChild,
} from '@angular/core';
import { shownName } from '../../recipe/recipe';
import { Segment, Segmented } from '../../shell/segmented/segmented';
import { EditorSession } from '../editor-session';

@Component({
  selector: 'app-sizing-bar',
  imports: [Segmented],
  templateUrl: './sizing-bar.html',
  styleUrl: './sizing-bar.css',
})
export class SizingBar {
  private readonly session = inject(EditorSession);
  private readonly view = inject(ChangeDetectorRef);

  private readonly sizings = this.session.sizings;

  protected readonly several = computed(() => this.sizings().length > 1);

  private readonly showing = this.session.showing;

  protected readonly segments = computed(() =>
    this.sizings().map((sizing, at): Segment<string> => ({
      value: sizing.id,
      label: shownName(sizing, at),
    })),
  );

  protected readonly chosen = computed(() => this.sizings()[this.showing()]?.id ?? '');

  protected readonly name = computed(() => this.sizings()[this.showing()]?.name ?? '');

  protected readonly placeholder = computed(() =>
    this.several() ? `Sizing ${this.showing() + 1}` : 'Sizing name',
  );

  protected readonly actions = computed(() => {
    const sizing = this.sizings()[this.showing()];
    if (!sizing) return 'Actions for sizing';
    const named = this.several() || sizing.name.trim() !== '';
    return `Actions for ${named ? shownName(sizing, this.showing()) : 'sizing'}`;
  });

  protected readonly first = computed(() => this.showing() === 0);

  protected readonly last = computed(() => this.showing() === this.sizings().length - 1);

  protected readonly open = computed(() => this.session.menu() === 'sizing');

  private readonly nameField = viewChild.required<ElementRef<HTMLInputElement>>('nameField');

  protected rename(event: Event): void {
    this.session.renameSizing((event.target as HTMLInputElement).value);
  }

  protected settle(): void {
    this.session.settle('sizings');
  }

  protected choose(id: string): void {
    this.session.chooseSizing(id);
  }

  protected add(): void {
    this.session.addSizing();
    this.landOnName();
  }

  protected copy(): void {
    this.session.copySizing();
    this.landOnName();
  }

  protected move(delta: 1 | -1): void {
    this.session.moveSizing(delta);
  }

  protected toggleMenu(): void {
    this.session.showMenu(this.open() ? undefined : 'sizing');
  }

  protected delete(): void {
    this.session.requestDeleteSizing();
  }

  private landOnName(): void {
    this.view.detectChanges();
    this.nameField().nativeElement.focus();
  }
}
