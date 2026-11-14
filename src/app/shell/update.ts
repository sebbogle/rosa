import { Injectable, inject, signal } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';

@Injectable({ providedIn: 'root' })
export class Update {
  private readonly worker = inject(SwUpdate);

  private readonly ready = signal(false);

  readonly waiting = this.ready.asReadonly();

  constructor() {
    this.worker.versionUpdates.subscribe((event) => {
      if (event.type === 'VERSION_READY') this.ready.set(true);
    });

    this.worker.unrecoverable.subscribe(() => this.ready.set(true));
  }

  apply(): void {
    location.reload();
  }
}
