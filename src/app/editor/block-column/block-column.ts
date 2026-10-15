import {
  CDK_DRAG_CONFIG,
  CdkDrag,
  CdkDragDrop,
  CdkDragStart,
  CdkDropList,
  DragDropConfig,
} from '@angular/cdk/drag-drop';
import { ChangeDetectorRef, Component, ElementRef, computed, inject, input } from '@angular/core';
import { BlockRow } from '../block-row/block-row';
import { EditorSession } from '../editor-session';
import { GroupHead } from '../group-head/group-head';
import { Column } from '../working-list';

const LONG_PRESS = 400;

const DRAGGING: DragDropConfig = {
  dragStartDelay: { touch: LONG_PRESS, mouse: 0 },
  previewContainer: 'parent',
  lockAxis: 'y',
};

@Component({
  selector: 'app-block-column',
  host: {
    role: 'group',
    '[attr.aria-label]': 'label()',
  },
  imports: [BlockRow, CdkDrag, CdkDropList, GroupHead],
  providers: [{ provide: CDK_DRAG_CONFIG, useValue: DRAGGING }],
  templateUrl: './block-column.html',
  styleUrl: './block-column.css',
})
export class BlockColumn {
  private readonly session = inject(EditorSession);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly view = inject(ChangeDetectorRef);

  readonly column = input.required<Column>();
  readonly label = input.required<string>();
  readonly addLabel = input.required<string>();

  protected readonly blocks = computed(() => this.session.blocks(this.column()));

  protected readonly lists = computed(() =>
    this.blocks().map((_, at) => `${this.column()}-rows-${at}`),
  );

  protected readonly belowTheFirst = (index: number): boolean => index > 0;

  protected add(block: number): void {
    this.session.addRow(this.column(), block);
  }

  protected insertGroup(block: number): void {
    this.session.insertGroup(this.column(), block);
    this.landOnName(Math.max(block, 1));
  }

  protected dropRow(drop: CdkDragDrop<number>): void {
    const into = this.blocks()[drop.container.data];
    this.session.moveRow(
      this.column(),
      { block: drop.previousContainer.data, row: drop.previousIndex },
      {
        block: drop.container.data,
        row: into?.collapsed ? into.rows.length : drop.currentIndex,
      },
    );
  }

  protected dropGroup(drop: CdkDragDrop<unknown>): void {
    this.session.moveGroup(this.column(), drop.previousIndex, drop.currentIndex);
  }

  protected buzz(start: CdkDragStart): void {
    if (start.event.type.startsWith('touch')) navigator.vibrate?.(10);
  }

  private landOnName(block: number): void {
    this.view.detectChanges();
    const name = this.host.nativeElement.querySelector(`[data-name="${block}"]`);
    if (name instanceof HTMLInputElement) name.focus();
  }
}
