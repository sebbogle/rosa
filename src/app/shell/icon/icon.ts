import { Component, input } from '@angular/core';

export type IconName = 'menu' | 'gear' | 'pencil' | 'close' | 'chevron' | 'caret' | 'more' | 'grip';

@Component({
  selector: 'app-icon',
  host: { 'aria-hidden': 'true' },
  template: `
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      [style.width.em]="size()"
      [style.height.em]="size()"
    >
      @switch (name()) {
        @case ('menu') {
          <path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11" />
        }
        @case ('gear') {
          <circle cx="8" cy="8" r="2" />
          <path
            d="M6.9 2.3h2.2l.4 1.7 1.2.7 1.7-.5 1.1 1.9-1.3 1.2v1.4l1.3 1.2-1.1 1.9-1.7-.5-1.2.7-.4 1.7H6.9l-.4-1.7-1.2-.7-1.7.5-1.1-1.9 1.3-1.2V7.3L2.5 6.1l1.1-1.9 1.7.5 1.2-.7z"
          />
        }
        @case ('pencil') {
          <path d="M10.9 2.6l2.5 2.5-7.6 7.6-3.1.6.6-3.1z" />
          <path d="M9.4 4.1l2.5 2.5" />
        }
        @case ('close') {
          <path d="M4 4l8 8M12 4l-8 8" />
        }
        @case ('chevron') {
          <path d="M6 3.5L10.5 8 6 12.5" />
        }
        @case ('caret') {
          <path d="M3.5 6L8 10.5 12.5 6" />
        }
        @case ('more') {
          <path d="M3.5 8h.01M8 8h.01M12.5 8h.01" stroke-width="2.2" />
        }
        @case ('grip') {
          <path
            d="M6 3.5h.01M10 3.5h.01M6 8h.01M10 8h.01M6 12.5h.01M10 12.5h.01"
            stroke-width="2"
          />
        }
      }
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
      flex: none;
    }

    svg {
      display: block;
    }
  `,
})
export class Icon {
  readonly name = input.required<IconName>();

  readonly size = input(1);
}
