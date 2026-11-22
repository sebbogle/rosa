import { Component, computed, inject, signal } from '@angular/core';
import { Importer } from '../../import/importer';
import {
  PicturePrototype,
  VARIANTS,
} from '../../recipe/recipe-pane/picture-prototype/picture-prototype';

const FIELDS = 'input, textarea, select, [contenteditable]';

@Component({
  selector: 'app-prototype-switcher',
  host: { '(window:keydown)': 'onKey($event)' },
  template: `
    <div class="prototype-bar" role="toolbar" aria-label="Prototype switcher">
      <button type="button" aria-label="Previous variant" (click)="prototype.stepVariant(-1)">
        ‹
      </button>
      <span class="label">
        <b>{{ prototype.variant() }}</b>
        <span class="name">{{ name() }}</span>
      </span>
      <button type="button" aria-label="Next variant" (click)="prototype.stepVariant(1)">›</button>
      <span class="divider"></span>
      <button type="button" class="picture" (click)="prototype.stepPicture(1)">
        Picture: <b>{{ prototype.choice() }}</b>
      </button>
      <span class="divider"></span>
      <button type="button" [disabled]="seeding() !== 'Add test recipes'" (click)="seed()">
        {{ seeding() }}
      </button>
    </div>
  `,
  styles: `
    :host {
      position: fixed;
      bottom: 16px;
      left: 50%;
      z-index: 1000;
      translate: -50% 0;
    }

    .prototype-bar {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 8px;
      border-radius: 999px;
      background: #111;
      box-shadow: 0 6px 24px rgb(0 0 0 / 0.35);
      color: #fff;
      font:
        13px/1.2 system-ui,
        sans-serif;
      white-space: nowrap;
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

    .label {
      display: flex;
      gap: 6px;
      padding: 0 4px;
    }

    .label b {
      color: #ffcc4d;
    }

    .divider {
      width: 1px;
      height: 18px;
      background: #444;
    }

    .picture b {
      color: #7fd1ff;
    }

    @media (width < 560px) {
      .name {
        display: none;
      }
    }
  `,
})
export class PrototypeSwitcher {
  protected readonly prototype = inject(PicturePrototype);

  private readonly importer = inject(Importer);

  protected readonly seeding = signal('Add test recipes');

  protected readonly name = computed(
    () => VARIANTS.find((variant) => variant.key === this.prototype.variant())?.name,
  );

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
    if (document.querySelector(':modal')) return;

    if (event.key === 'ArrowLeft') this.prototype.stepVariant(-1);
    else if (event.key === 'ArrowRight') this.prototype.stepVariant(1);
    else if (event.key === 'p') this.prototype.stepPicture(1);
    else return;

    event.preventDefault();
  }
}
