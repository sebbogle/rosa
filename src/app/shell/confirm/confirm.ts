import {
  Component,
  ElementRef,
  Injector,
  OutputEmitterRef,
  afterNextRender,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';

export interface Ask {
  readonly label: string;
  readonly line: string;
  readonly sentences: readonly string[];
  readonly keep: string;
  readonly act: string;
  readonly tone: 'danger' | 'destroy';
}

@Component({
  selector: 'app-confirm',
  templateUrl: './confirm.html',
  styleUrl: './confirm.css',
})
export class Confirm {
  private readonly injector = inject(Injector);

  readonly ask = input.required<Ask>();

  readonly keep = output();

  readonly act = output();

  private readonly scrim = viewChild.required<ElementRef<HTMLDialogElement>>('scrim');

  constructor() {
    afterNextRender(() => this.show());
  }

  protected escape(event: Event): void {
    event.preventDefault();
    this.answer(this.keep);
  }

  protected release(event: MouseEvent): void {
    if (event.target === this.scrim().nativeElement) this.answer(this.keep);
  }

  protected answer(choice: OutputEmitterRef<void>): void {
    this.scrim().nativeElement.close();
    choice.emit();
    afterNextRender(() => this.show(), { injector: this.injector });
  }

  private show(): void {
    const scrim = this.scrim().nativeElement;
    if (!scrim.open) scrim.showModal();
  }
}
