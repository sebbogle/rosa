import { Component, ViewEncapsulation, input, output } from '@angular/core';
import { SEGMENTED_CSS } from './segmented.css';

export interface Segment<T extends string> {
  readonly value: T;
  readonly label: string;
}

let groups = 0;

@Component({
  selector: 'app-segmented',
  host: { role: 'radiogroup', '[attr.aria-label]': 'label()' },
  templateUrl: './segmented.html',
  styles: [SEGMENTED_CSS],
  encapsulation: ViewEncapsulation.None,
})
export class Segmented<T extends string> {
  readonly label = input.required<string>();

  readonly options = input.required<readonly Segment<T>[]>();

  readonly chosen = input.required<T>();

  readonly choose = output<T>();

  protected readonly name = `segmented-${++groups}`;
}
