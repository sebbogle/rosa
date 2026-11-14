import { Component, inject } from '@angular/core';
import { Update } from '../../shell/update';

@Component({
  selector: 'app-update-card',
  templateUrl: './update-card.html',
  styleUrl: './update-card.css',
})
export class UpdateCard {
  private readonly update = inject(Update);

  protected readonly waiting = this.update.waiting;

  protected apply(): void {
    this.update.apply();
  }
}
