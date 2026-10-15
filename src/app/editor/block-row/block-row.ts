import { CdkDragHandle } from '@angular/cdk/drag-drop';
import { Component, computed, inject, input } from '@angular/core';
import { EditorSession } from '../editor-session';
import { Column, Row, Slot, quantityAt } from '../working-list';

@Component({
  selector: 'app-block-row',
  imports: [CdkDragHandle],
  host: {
    role: 'group',
    '[attr.aria-label]': 'label()',
    '[class.step]': 'steps()',
  },
  templateUrl: './block-row.html',
  styleUrl: './block-row.css',
})
export class BlockRow {
  private readonly session = inject(EditorSession);

  readonly column = input.required<Column>();
  readonly block = input.required<number>();
  readonly index = input.required<number>();
  readonly row = input.required<Row>();

  protected readonly steps = computed(() => this.column() === 'method');

  protected readonly label = computed(
    () => `${this.steps() ? 'Step' : 'Ingredient'} ${this.index() + 1}`,
  );

  protected readonly quantity = computed(() => quantityAt(this.row(), this.session.showing()));

  protected type(slot: Slot, event: Event): void {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement;
    this.session.retype(this.column(), this.block(), this.index(), slot, target.value);
  }

  protected settle(): void {
    this.session.settle(this.column());
  }

  protected remove(): void {
    this.session.deleteRow(this.column(), this.block(), this.index());
  }
}
