import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SettingsSheet {
  private readonly shown = signal(false);

  readonly open = this.shown.asReadonly();

  show(): void {
    this.shown.set(true);
  }

  hide(): void {
    this.shown.set(false);
  }
}
