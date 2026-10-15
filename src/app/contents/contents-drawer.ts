import { Injectable, inject, signal } from '@angular/core';
import { ContentsFilter } from './contents-filter';

@Injectable({ providedIn: 'root' })
export class ContentsDrawer {
  private readonly filter = inject(ContentsFilter);

  private readonly shown = signal(false);

  readonly open = this.shown.asReadonly();

  toggle(): void {
    if (this.shown()) this.hide();
    else this.show();
  }

  show(): void {
    this.shown.set(true);
  }

  hide(): void {
    if (!this.shown()) return;
    this.shown.set(false);
    this.filter.search('');
  }
}
