import { Component, computed } from '@angular/core';
import { Appearance, appearance } from '../../shell/appearance';
import { Segment, Segmented } from '../../shell/segmented/segmented';

const SAYS: Record<Appearance, string> = {
  default: 'Colour, with shadows and motion.',
  'e-ink': 'Black and white for e-paper, with no shadows or motion.',
};

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

  protected readonly says = computed(() => SAYS[this.chosen()]);

  protected choose(next: Appearance): void {
    appearance.choose(next);
  }
}
