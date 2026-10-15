import { Component, ViewEncapsulation, computed, inject, input, output } from '@angular/core';
import { EditorSession } from '../../editor/editor-session';
import { Segment, Segmented } from '../../shell/segmented/segmented';
import { drawnPath } from '../folders';
import { IngredientGroup, MethodGroup, Recipe, Source, shownName } from '../recipe';
import { PANE_CSS } from './recipe-pane.css';

interface Shown {
  readonly text: string;
  readonly link?: string;
}

interface ShownIngredient {
  readonly amount: string;
  readonly item: string;
}

interface ShownGroup<T> {
  readonly group: string;
  readonly rows: readonly T[];
}

const SCHEME = /^[a-z][a-z0-9+.-]*:(?!\d)/i;

const HOSTLIKE = /^[^\s/]+\.[^\s/]/;

function urlOf(link: string): URL | undefined {
  const typed = link.trim();
  if (typed === '') return undefined;

  const schemed = SCHEME.test(typed);
  if (!schemed && !HOSTLIKE.test(typed)) return undefined;

  let url: URL;
  try {
    url = new URL(schemed ? typed : `https://${typed}`);
  } catch {
    return undefined;
  }
  return url.protocol === 'http:' || url.protocol === 'https:' ? url : undefined;
}

function hostOf(url: URL): string {
  return url.hostname.replace(/^www\./, '');
}

function shownGroups<T>(groups: readonly ShownGroup<T>[]): readonly ShownGroup<T>[] {
  return groups.filter((group) => group.rows.length > 0 || group.group !== '');
}

function shownIngredients(
  groups: readonly IngredientGroup[],
  at: number,
): readonly ShownGroup<ShownIngredient>[] {
  return shownGroups(
    groups.map((group) => ({
      group: group.group,
      rows: group.items.flatMap(({ item, quantities }): ShownIngredient[] => {
        const { quantity, unit } = quantities[at];
        if (item === '' && quantity === '' && unit === '') return [];
        return [{ amount: [quantity, unit].filter(Boolean).join(' '), item }];
      }),
    })),
  );
}

function shownSource(source: Source): Shown | undefined {
  const text = source.text.trim();
  const url = urlOf(source.link);
  if (text !== '') return { text, link: url?.href };
  return url && { text: hostOf(url), link: url.href };
}

@Component({
  selector: 'app-recipe-pane',
  templateUrl: './recipe-pane.html',
  imports: [Segmented],
  styles: [PANE_CSS],
  encapsulation: ViewEncapsulation.None,
})
export class RecipePane {
  private readonly editor = inject(EditorSession);

  readonly recipe = input.required<Recipe>();

  readonly frozen = input(false);

  readonly sizing = input<string>();

  readonly choose = output<string>();

  protected readonly folder = computed(() => drawnPath(this.recipe().folder));

  protected readonly source = computed(() => shownSource(this.recipe().source));

  protected readonly meta = computed(() => {
    const { prep } = this.recipe();
    return prep && `Prep ${prep}`;
  });

  protected readonly sizings = computed(() => {
    const { sizings, ingredients } = this.recipe();
    return sizings.map((sizing, at) => ({
      id: sizing.id,
      groups: shownIngredients(ingredients, at),
    }));
  });

  protected readonly segments = computed(() =>
    this.recipe().sizings.map((sizing, at): Segment<string> => ({
      value: sizing.id,
      label: shownName(sizing, at),
    })),
  );

  protected readonly loneName = computed(() => this.recipe().sizings[0].name);

  protected readonly shown = computed(() => {
    const { sizings } = this.recipe();
    const held = this.sizing();
    return sizings.find((sizing) => sizing.id === held)?.id ?? sizings[0].id;
  });

  protected readonly crumbline = computed(() =>
    [this.folder(), this.meta()].filter(Boolean).join(' · '),
  );

  protected readonly method = computed(() =>
    shownGroups(
      this.recipe().method.map((group: MethodGroup) => ({
        group: group.group,
        rows: group.steps.filter((step) => step !== ''),
      })),
    ),
  );

  protected edit(): void {
    this.editor.edit(this.recipe());
  }
}
