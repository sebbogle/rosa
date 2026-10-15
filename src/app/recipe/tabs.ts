import { Location } from '@angular/common';
import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { DriveService } from '../drive/drive-service';
import {
  Edge,
  Named,
  OpenSet,
  activatedAt,
  arrived,
  chosen,
  closed,
  focusedOn,
  followed,
  idsOf,
  keptOpen,
  moved,
  opened,
  openedIdOf,
  pruned,
  restored,
  settled,
  shelfOf,
  showTheSame,
  shown,
  sideMade,
  splittable,
  stepped,
  whichSide,
} from './open-set';
import { Recipe } from './recipe';
import { RecipeStore } from './recipe-store';
import { idOf, urlOf } from './recipe-url';
import { TabShelf, readTabShelf, rememberTabShelf, sameTabShelf } from './tab-shelf';

export type { Edge };

export interface Tab {
  readonly id: string;
  readonly title: string;
  readonly preview: boolean;
  readonly active: boolean;
}

export interface SideView {
  readonly key: number;
  readonly tabs: readonly Tab[];
  readonly reading: Recipe | undefined;
  readonly sizing: string | undefined;
  readonly missing: boolean;
  readonly focused: boolean;
}

const NO_SIDES: OpenSet = { sides: [], focused: 0, sizings: new Map() };

@Injectable({ providedIn: 'root' })
export class Tabs {
  private readonly recipes = inject(RecipeStore);
  private readonly location = inject(Location);
  private readonly drive = inject(DriveService);

  private nextKey = 0;
  private readonly keys = (): number => this.nextKey++;

  private readonly held = signal<OpenSet>(NO_SIDES);

  private inHistory: OpenSet = NO_SIDES;

  readonly split = computed(() => this.held().sides.length === 2);

  readonly openedId = computed(() => openedIdOf(this.held()));

  readonly splittable = computed(() => splittable(this.held()));

  private readonly titles = computed(
    () => new Map(this.recipes.recipes().map((recipe) => [recipe.id, recipe.title])),
  );

  readonly sides = computed<readonly SideView[]>(() => {
    const titles = this.titles();
    const { sides, focused, sizings } = this.held();

    return sides.map((side, at) => ({
      key: side.key,
      tabs: idsOf(side).map((id) => ({
        id,
        title: titles.get(id) ?? '',
        preview: id === side.preview,
        active: id === side.active,
      })),
      reading: side.active === undefined ? undefined : this.recipes.recipeAt(side.active),
      sizing: side.active === undefined ? undefined : sizings.get(side.active),
      missing: side.missing,
      focused: at === focused,
    }));
  });

  private readonly shelf = computed<TabShelf>(() => shelfOf(this.held()), {
    equal: sameTabShelf,
  });

  constructor() {
    const { open, refocused } = restored(readTabShelf(), this.keys);
    const { open: remaining } = pruned(open, this.known());

    const named = this.named();
    this.hold(arrived(remaining, named, refocused));
    this.correctUrl(named);
    this.inHistory = this.held();

    effect(() => {
      this.recipes.recipes();
      this.drive.awaitingCookbook();
      untracked(() => this.prune());
    });

    effect(() => {
      const open = this.held();

      untracked(() => {
        const focusOnly = showTheSame(open, this.inHistory);
        this.inHistory = open;

        const active = openedIdOf(open);
        this.writeUrl(active === undefined ? '/' : urlOf(active), focusOnly);
      });
    });

    effect(() => {
      const shelf = this.shelf();
      untracked(() => rememberTabShelf(shelf));
    });

    this.location.subscribe(() => this.followUrl());
  }

  sideOf(id: string): number {
    return whichSide(this.held(), id);
  }

  focus(at: number): void {
    this.hold(focusedOn(this.held(), at));
  }

  open(id: string): void {
    this.hold(opened(this.held(), id));
  }

  keep(id: string): void {
    this.hold(keptOpen(this.held(), id));
  }

  choose(id: string, sizing: string): void {
    this.hold(chosen(this.held(), id, sizing));
  }

  show(at: number, id: string): void {
    this.hold(shown(this.held(), at, id));
  }

  move(at: number, id: string, to?: number): void {
    this.hold(moved(this.held(), at, id, to));
  }

  makeSide(id: string, edge: Edge): void {
    this.hold(sideMade(this.held(), id, edge, this.keys));
  }

  close(id: string): void {
    this.hold(closed(this.held(), id));
  }

  closeActive(): void {
    const active = this.openedId();
    if (active !== undefined) this.close(active);
  }

  step(by: number): void {
    this.hold(stepped(this.held(), by));
  }

  activateAt(index: number): void {
    this.hold(activatedAt(this.held(), index));
  }

  private known(): ReadonlySet<string> | undefined {
    if (this.drive.awaitingCookbook()) return undefined;

    return new Set(this.recipes.recipes().map((recipe) => recipe.id));
  }

  private named(): Named | undefined {
    const id = idOf(this.location.path());
    if (id === undefined) return undefined;

    return { id, known: this.recipes.recipeAt(id) !== undefined || this.drive.awaitingCookbook() };
  }

  private correctUrl(named: Named | undefined): void {
    if (named !== undefined && !named.known) this.writeUrl('/', true);
  }

  private followUrl(): void {
    const named = this.named();
    this.hold(followed(this.held(), named));
    this.correctUrl(named);
  }

  private prune(): void {
    const { open, lostFocused } = pruned(this.held(), this.known());
    this.hold(open);
    if (lostFocused) this.writeUrl('/', true);
  }

  private hold(next: OpenSet): void {
    this.held.set(settled(next));
  }

  private writeUrl(url: string, replace: boolean): void {
    const [path, query = ''] = this.location.path().split('?');
    if (path === url) return;
    if (replace) this.location.replaceState(url, query);
    else this.location.go(url, query);
  }
}
