import { CdkScrollable } from '@angular/cdk/scrolling';
import {
  Component,
  ElementRef,
  Injector,
  Signal,
  afterNextRender,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { settled } from '../settled';

@Component({
  selector: 'app-sheet',
  imports: [CdkScrollable],
  host: { '(document:keydown.escape)': 'escape($event)' },
  templateUrl: './sheet.html',
  styleUrl: './sheet.css',
})
export class Sheet<T> {
  private readonly injector = inject(Injector);

  readonly label = input.required<string>();

  readonly shown = input<T | undefined>();

  readonly peel = input<() => boolean>(() => false);

  readonly dismiss = output();

  private readonly holding = signal<T | undefined>(undefined);

  readonly held: Signal<T | undefined> = this.holding.asReadonly();

  protected readonly leaving = signal(false);

  private readonly scrim = viewChild.required<ElementRef<HTMLDialogElement>>('scrim');

  private readonly frame = viewChild.required<ElementRef<HTMLElement>>('frame');

  private pressing: number | undefined;

  private landed = false;

  constructor() {
    effect(() => {
      const value = this.shown();

      untracked(() => {
        if (value !== undefined) this.enter(value);
        else if (this.held() !== undefined && !this.leaving()) this.exit();
      });
    });
  }

  protected escape(event: Event): void {
    if (event.defaultPrevented || this.held() === undefined || this.leaving()) return;

    event.preventDefault();
    if (!this.peel()()) this.dismiss.emit();
  }

  protected press(event: PointerEvent): void {
    this.pressing =
      this.beside(event) && !this.leaving() && !this.peel()() ? event.pointerId : undefined;
    this.landed = false;
  }

  protected lift(event: PointerEvent): void {
    if (event.pointerId === this.pressing) this.landed = this.beside(event);
  }

  protected release(event: MouseEvent): void {
    const closing = this.pressing !== undefined && this.landed && this.beside(event);
    this.pressing = undefined;
    this.landed = false;

    if (closing) this.dismiss.emit();
  }

  private enter(value: T): void {
    const scrim = this.scrim().nativeElement;

    this.leaving.set(false);
    if (!scrim.open) scrim.showModal();

    this.holding.set(value);
  }

  private exit(): void {
    this.leaving.set(true);
    afterNextRender(() => void this.leave(), { injector: this.injector });
  }

  private async leave(): Promise<void> {
    if (!this.leaving()) return;

    const scrim = this.scrim().nativeElement;
    scrim.close();

    if (!(await settled(scrim, this.frame().nativeElement)) || !this.leaving()) return;

    this.holding.set(undefined);
    this.leaving.set(false);
  }

  private beside(event: Event): boolean {
    return event.target === this.scrim().nativeElement;
  }
}
