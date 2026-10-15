import { Component, DestroyRef, inject, input, signal } from '@angular/core';

const SAID_FOR_MS = 3000;

@Component({
  selector: 'app-bubble',
  template: `
    <p class="bubble" role="status" [class.saying]="saying()">
      @if (saying()) {
        {{ words() }}
      }
    </p>
  `,
  styleUrl: './bubble.css',
})
export class Bubble {
  readonly words = input.required<string>();

  protected readonly saying = signal(false);

  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.timer));
  }

  say(): void {
    clearTimeout(this.timer);
    this.saying.set(true);
    this.timer = setTimeout(() => this.saying.set(false), SAID_FOR_MS);
  }
}
