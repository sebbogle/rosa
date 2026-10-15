import { Component } from '@angular/core';
import { Appearance, appearance } from '../../shell/appearance';
import { Segment, Segmented } from '../../shell/segmented/segmented';

@Component({
  selector: 'app-appearance-section',
  imports: [Segmented],
  templateUrl: './appearance-section.html',
  styleUrls: ['../settings-row.css', './appearance-section.css'],
})
export class AppearanceSection {
  protected readonly appearances: readonly Segment<Appearance>[] = [
    { value: 'default', label: 'Default' },
    { value: 'e-ink', label: 'E-ink' },
  ];

  protected readonly chosen = appearance.chosen;

  protected choose(next: Appearance): void {
    appearance.choose(next);
  }
}
