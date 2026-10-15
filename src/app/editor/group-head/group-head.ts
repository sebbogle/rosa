import { CdkDragHandle } from '@angular/cdk/drag-drop';
import { Component, ElementRef, computed, inject, input, output, viewChild } from '@angular/core';
import { EditorSession } from '../editor-session';
import { Column } from '../working-list';

@Component({
  selector: 'app-group-head',
  imports: [CdkDragHandle],
  templateUrl: './group-head.html',
  styleUrl: './group-head.css',
})
export class GroupHead {
  private readonly session = inject(EditorSession);

  readonly column = input.required<Column>();
  readonly block = input.required<number>();
  readonly group = input.required<string>();
  readonly collapsed = input.required<boolean>();

  readonly insert = output();

  protected readonly called = computed(() => this.group() || 'group');

  protected readonly open = computed(() => {
    const menu = this.session.menu();
    return typeof menu === 'object' && menu.column === this.column() && menu.block === this.block();
  });

  private readonly nameField = viewChild.required<ElementRef<HTMLInputElement>>('nameField');

  protected toggle(): void {
    this.session.toggleCollapse(this.column(), this.block());
  }

  protected rename(event: Event): void {
    this.session.renameGroup(this.column(), this.block(), (event.target as HTMLInputElement).value);
  }

  protected settle(): void {
    this.session.settle(this.column());
  }

  protected toggleMenu(): void {
    this.session.showMenu(this.open() ? undefined : { column: this.column(), block: this.block() });
  }

  protected startRename(): void {
    const name = this.nameField().nativeElement;
    name.focus();
    name.select();
  }

  protected shift(delta: 1 | -1): void {
    this.session.shiftGroup(this.column(), this.block(), delta);
  }

  protected delete(): void {
    this.session.deleteGroup(this.column(), this.block());
  }
}
