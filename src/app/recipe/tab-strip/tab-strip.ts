import { CdkDrag, CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import { Component, DestroyRef, computed, inject, input, signal } from '@angular/core';
import { clicks } from '../../shell/press';
import { TOUCH } from '../../shell/touch';
import { Tab, Tabs } from '../tabs';

const STRIP_NAMES = ['Open recipes on the left', 'Open recipes on the right'];

@Component({
  selector: 'app-tab-strip',
  imports: [CdkDrag, CdkDropList],
  host: {
    role: 'group',
    '[attr.aria-label]': 'label()',
    '[class.focused]': 'focused()',
    '(pointerdown)': 'press($event)',
  },
  templateUrl: './tab-strip.html',
  styleUrl: './tab-strip.css',
})
export class TabStrip {
  private readonly openSet = inject(Tabs);

  readonly side = input.required<number>();

  private readonly view = computed(() => this.openSet.sides()[this.side()]);

  protected readonly tabs = computed(() => this.view()?.tabs ?? []);

  protected readonly focused = computed(() => this.view()?.focused ?? false);

  protected readonly label = computed(() =>
    this.openSet.split() ? STRIP_NAMES[this.side()] : 'Open recipes',
  );

  protected readonly touch = signal(false);

  protected readonly beforePreview = (index: number, drag: CdkDrag<Tab>): boolean => {
    const tabs = this.tabs();
    const last = tabs.at(-1);
    if (!last?.preview || last.id === drag.data.id) return true;

    const carriedIn = this.openSet.sideOf(drag.data.id) !== this.side();
    return index < (carriedIn ? tabs.length : tabs.length - 1);
  };

  constructor() {
    const query = matchMedia(TOUCH);
    const follow = (): void => this.touch.set(query.matches);
    follow();
    query.addEventListener('change', follow);
    inject(DestroyRef).onDestroy(() => query.removeEventListener('change', follow));
  }

  protected press(event: PointerEvent): void {
    if (event.target instanceof Element && event.target.closest('.tab')) return;
    if (clicks(event)) this.openSet.focus(this.side());
  }

  protected land(drop: CdkDragDrop<unknown, unknown, Tab>): void {
    if (drop.isPointerOverContainer) {
      this.openSet.move(this.side(), drop.item.data.id, drop.currentIndex);
    }
  }

  protected activate(id: string): void {
    this.openSet.show(this.side(), id);
  }

  protected keep(id: string): void {
    this.openSet.keep(id);
  }

  protected close(id: string): void {
    this.openSet.focus(this.side());
    this.openSet.close(id);
  }
}
