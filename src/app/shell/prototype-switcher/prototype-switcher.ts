import { Component, computed, inject, input, signal } from '@angular/core';
import { AddingPicture, VARIANTS } from '../../editor/picture-prototype/adding-picture';
import { EditorSession } from '../../editor/editor-session';
import { Importer } from '../../import/importer';

const FIELDS = 'input, textarea, select, [contenteditable]';

@Component({
  selector: 'app-prototype-switcher',
  host: {
    '(window:keydown)': 'onKey($event)',
    '[class.in-editor]': 'inEditor()',
    '[class.folded]': '!open()',
    '[hidden]': '!inEditor() && editorOpen()',
  },
  template: `
    <div class="prototype-bar" role="toolbar" aria-label="Prototype switcher">
      <span class="group">
        <button type="button" aria-label="Previous variant" (click)="prototype.stepVariant(-1)">
          ‹
        </button>
        <span class="label">
          <b>{{ prototype.variant() }}</b>
          <span class="name">{{ name() }}</span>
        </span>
        <button type="button" aria-label="Next variant" (click)="prototype.stepVariant(1)">
          ›
        </button>
        <button
          type="button"
          [attr.aria-label]="open() ? 'Fold the switcher' : 'Unfold the switcher'"
          (click)="open.set(!open())"
        >
          {{ open() ? '–' : '⋯' }}
        </button>
      </span>
      @if (open()) {
        <span class="group">
          <button type="button" (click)="prototype.stepUntitled()">
            Untitled: <b>{{ prototype.untitled() }}</b>
          </button>
          <button type="button" [class.on]="prototype.slow()" (click)="prototype.toggleSlow()">
            Slow: <b>{{ prototype.slow() ? 'on' : 'off' }}</b>
          </button>
          <button
            type="button"
            [class.on]="prototype.failNext() !== 'off'"
            (click)="prototype.stepFail()"
          >
            Next fails: <b>{{ prototype.failNext() }}</b>
          </button>
        </span>
        <span class="group">
          <button type="button" [disabled]="prototype.count() === 0" (click)="prototype.clear()">
            Clear pictures ({{ prototype.count() }})
          </button>
          @if (!inEditor()) {
            <button type="button" [disabled]="seeding() !== 'Add test recipes'" (click)="seed()">
              {{ seeding() }}
            </button>
          }
        </span>
        @if (prototype.last(); as last) {
          <span class="stats">
            {{ last.width }}×{{ last.height }} · {{ kb(last.bytes) }} KB · {{ last.ms }} ms
          </span>
        }
      }
    </div>
  `,
  styles: `
    :host[hidden] {
      display: none;
    }

    :host {
      position: fixed;
      bottom: 16px;
      left: 50%;
      z-index: 1000;
      width: max-content;
      max-width: calc(100vw - 16px);
      translate: -50% 0;
    }

    @media (width < 768px) {
      :host(.in-editor) {
        top: calc(6px + env(safe-area-inset-top));
        bottom: auto;
      }

      :host(.in-editor.folded) {
        right: 8px;
        left: auto;
        translate: none;
      }
    }

    .prototype-bar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: center;
      gap: 6px 10px;
      padding: 6px 8px;
      border-radius: 20px;
      background: #111;
      box-shadow: 0 6px 24px rgb(0 0 0 / 0.35);
      color: #fff;
      font:
        13px/1.2 system-ui,
        sans-serif;
      white-space: nowrap;
    }

    .group {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    button {
      padding: 4px 10px;
      border: 0;
      border-radius: 999px;
      background: #333;
      color: #fff;
      font: inherit;
      cursor: pointer;
    }

    button:hover {
      background: #555;
    }

    button:disabled {
      color: #888;
      cursor: default;
    }

    button.on {
      background: #5a3b00;
    }

    .label {
      display: flex;
      gap: 6px;
      padding: 0 4px;
    }

    .label b {
      color: #ffcc4d;
    }

    .group button b {
      color: #7fd1ff;
    }

    .stats {
      color: #aaa;
      font-variant-numeric: tabular-nums;
    }

    @media (width < 560px) {
      .name {
        display: none;
      }
    }
  `,
})
export class PrototypeSwitcher {
  protected readonly prototype = inject(AddingPicture);

  private readonly session = inject(EditorSession);

  private readonly importer = inject(Importer);

  readonly inEditor = input(false);

  protected readonly editorOpen = computed(() => this.session.editing() !== undefined);

  protected readonly seeding = signal('Add test recipes');

  protected readonly open = this.prototype.barOpen;

  protected readonly name = computed(
    () => VARIANTS.find((variant) => variant.key === this.prototype.variant())?.name,
  );

  protected kb(bytes: number): number {
    return Math.round(bytes / 1024);
  }

  protected async seed(): Promise<void> {
    this.seeding.set('Adding…');
    const recipes: { id: string }[] = await (await fetch('picture-prototype/seed.json')).json();
    const files = recipes.map(
      (recipe) =>
        new File([JSON.stringify(recipe)], `${recipe.id}.json`, { type: 'application/json' }),
    );
    const plan = await this.importer.read(files, () => undefined);
    await this.importer.write(plan, { replacing: false, restoring: false });
    this.seeding.set(`${plan.added.length} added, ${plan.here} already here`);
  }

  protected onKey(event: KeyboardEvent): void {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.target instanceof HTMLElement && event.target.matches(FIELDS)) return;
    if ((this.session.editing() !== undefined) !== this.inEditor()) return;
    if (this.inEditor() && document.querySelectorAll(':modal').length > 1) return;
    if (!this.inEditor() && document.querySelector(':modal')) return;

    if (event.key === 'ArrowLeft') this.prototype.stepVariant(-1);
    else if (event.key === 'ArrowRight') this.prototype.stepVariant(1);
    else return;

    event.preventDefault();
  }
}
