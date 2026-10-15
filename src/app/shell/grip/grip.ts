import { Component, ElementRef, inject, input, signal } from '@angular/core';

export type Drag = (travel: number) => void;

export interface Resize {
  start(within: DOMRect, at: DOMRect): Drag | undefined;
  remember(): void;
  reset(): void;
}

const RESIZING = 'resizing';

@Component({
  selector: 'app-grip',
  host: {
    role: 'separator',
    'aria-orientation': 'vertical',
    '[attr.aria-label]': 'label()',
    '[class.dragging]': 'dragging()',
    '(pointerdown)': 'press($event)',
    '(pointermove)': 'move($event)',
    '(pointerup)': 'release($event)',
    '(pointercancel)': 'release($event)',
    '(dblclick)': 'reset()',
  },
  template: '',
  styleUrl: './grip.css',
})
export class Grip {
  readonly edge = input.required<Resize>();
  readonly label = input.required<string>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly dragging = signal(false);

  private drag: Drag | undefined;
  private origin = 0;

  protected press(event: PointerEvent): void {
    if (event.button !== 0) return;

    const grip = this.host.nativeElement;
    const within = grip.offsetParent?.getBoundingClientRect();
    if (!within) return;

    event.preventDefault();

    const drag = this.edge().start(within, grip.getBoundingClientRect());
    if (!drag) return;

    this.drag = drag;
    this.origin = event.clientX;
    this.dragging.set(true);
    grip.setPointerCapture(event.pointerId);
    document.documentElement.classList.add(RESIZING);
  }

  protected move(event: PointerEvent): void {
    this.drag?.(event.clientX - this.origin);
  }

  protected release(event: PointerEvent): void {
    if (!this.drag) return;

    const grip = this.host.nativeElement;
    if (grip.hasPointerCapture(event.pointerId)) grip.releasePointerCapture(event.pointerId);

    this.drag = undefined;
    this.dragging.set(false);
    document.documentElement.classList.remove(RESIZING);
    this.edge().remember();
  }

  protected reset(): void {
    this.edge().reset();
  }
}
