import {
  Component,
  DestroyRef,
  ElementRef,
  ViewEncapsulation,
  effect,
  inject,
  untracked,
  viewChild,
} from '@angular/core';
import { EditorSession } from '../../editor/editor-session';
import { Grip } from '../../shell/grip/grip';
import { TOUCH } from '../../shell/touch';
import { ContentsDrawer } from '../contents-drawer';
import { ContentsFilter } from '../contents-filter';
import { FolderTree } from '../folder-tree/folder-tree';
import { contentsEdge } from '../sidebar-width';
import { SIDEBAR_CSS } from './sidebar.css';

@Component({
  selector: 'app-sidebar',
  imports: [FolderTree, Grip],
  host: { '(document:keydown.escape)': 'escape($event)' },
  templateUrl: './sidebar.html',
  styles: [SIDEBAR_CSS],
  encapsulation: ViewEncapsulation.None,
})
export class Sidebar {
  private readonly filter = inject(ContentsFilter);
  private readonly editor = inject(EditorSession);
  private readonly drawer = inject(ContentsDrawer);

  protected readonly query = this.filter.query;

  protected readonly edge = contentsEdge;

  private readonly layer = viewChild.required<ElementRef<HTMLDialogElement>>('layer');

  private readonly searchField = viewChild.required<ElementRef<HTMLInputElement>>('searchField');

  private readonly tree = viewChild.required(FolderTree);

  private readonly touch = matchMedia(TOUCH);

  constructor() {
    effect(() => {
      const open = this.drawer.open();
      untracked(() => this.follow(open));
    });

    const widen = (): void => {
      if (!this.touch.matches) this.drawer.hide();
    };
    this.touch.addEventListener('change', widen);
    inject(DestroyRef).onDestroy(() => this.touch.removeEventListener('change', widen));
  }

  protected search(event: Event): void {
    this.filter.search((event.target as HTMLInputElement).value);
  }

  protected add(): void {
    this.drawer.hide();
    this.editor.create();
  }

  protected close(): void {
    this.drawer.hide();
  }

  protected findSearch(): void {
    this.searchField().nativeElement.focus();
  }

  protected escape(event: Event): void {
    if (event.defaultPrevented) return;

    if (this.tree().peel()) {
      event.preventDefault();
    } else if (this.drawer.open()) {
      event.preventDefault();
      this.drawer.hide();
    }
  }

  protected beside(event: MouseEvent): void {
    const layer = this.layer().nativeElement;
    if (event.target !== layer || !layer.matches(':modal')) return;

    const { left, right, top, bottom } = layer.getBoundingClientRect();
    const within =
      event.clientX >= left &&
      event.clientX <= right &&
      event.clientY >= top &&
      event.clientY <= bottom;
    if (!within) this.drawer.hide();
  }

  private follow(open: boolean): void {
    const layer = this.layer().nativeElement;

    if (open && this.touch.matches) {
      if (!layer.open) layer.showModal();
    } else if (layer.open) {
      layer.close();
    }
  }
}
