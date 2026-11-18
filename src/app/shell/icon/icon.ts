import { Component, ViewEncapsulation, computed, input } from '@angular/core';
import { ICON_CSS } from './icon.css';
import { ICONS, IconName } from './icons';

@Component({
  selector: 'app-icon',
  host: { 'aria-hidden': 'true' },
  template: `
    <svg viewBox="0 0 16 16" [style.width.em]="size()" [style.height.em]="size()">
      <path [attr.d]="shape().d" [attr.stroke-width]="weight() ?? shape().weight ?? null" />
    </svg>
  `,
  styles: [ICON_CSS],
  encapsulation: ViewEncapsulation.None,
})
export class Icon {
  readonly name = input.required<IconName>();

  readonly size = input(1);

  readonly weight = input<number>();

  protected readonly shape = computed(() => ICONS[this.name()]);
}
