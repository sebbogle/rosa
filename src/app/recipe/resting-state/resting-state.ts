import { Component, computed, inject, input, viewChild } from '@angular/core';
import { ContentsDrawer } from '../../contents/contents-drawer';
import { ContentsFilter } from '../../contents/contents-filter';
import { UNREACHABLE } from '../../drive/drive-ladder';
import { DriveService } from '../../drive/drive-service';
import { EditorSession } from '../../editor/editor-session';
import { Bubble } from '../../shell/bubble/bubble';
import { RecipeStore } from '../recipe-store';
import { Tabs } from '../tabs';
import {
  RESTING_COPY,
  restingCaseOf,
  restingControlOf,
  restingHeldOf,
  restingInertOf,
} from './resting-ladder';

@Component({
  selector: 'app-resting-state',
  imports: [Bubble],
  templateUrl: './resting-state.html',
  styleUrl: './resting-state.css',
})
export class RestingState {
  private readonly recipes = inject(RecipeStore);
  private readonly tabs = inject(Tabs);
  private readonly filter = inject(ContentsFilter);
  private readonly editor = inject(EditorSession);
  private readonly drive = inject(DriveService);
  private readonly drawer = inject(ContentsDrawer);

  readonly side = input.required<number>();

  private readonly bubble = viewChild(Bubble);

  private readonly view = computed(() => this.tabs.sides()[this.side()]);

  private readonly state = computed(() =>
    restingCaseOf({
      drive: this.drive.state(),
      awaiting: this.drive.awaitingCookbook(),
      missing: this.view()?.missing ?? false,
      empty: this.recipes.recipes().length === 0,
      nothingMatches: this.filter.nothingMatches(),
    }),
  );

  protected readonly reason = UNREACHABLE;

  protected readonly copy = computed(() => RESTING_COPY[this.state()]);

  protected readonly control = computed(() =>
    restingControlOf(this.state(), this.drive.state(), this.view()?.focused ?? false),
  );

  protected readonly inert = computed(() => restingInertOf(this.state(), this.drive.offline()));

  protected readonly held = computed(() => restingHeldOf(this.state(), this.drive.acting()));

  protected readonly elsewhere = computed(() => this.state() === 'elsewhere');

  protected readonly stranded = computed(() => this.state() === 'nothing-open');

  protected press(): void {
    if (this.inert()) {
      this.bubble()?.say();
      return;
    }

    if (this.held()) return;

    if (this.elsewhere()) {
      void this.drive.sync();
      return;
    }

    this.editor.create();
  }

  protected openContents(): void {
    this.drawer.show();
  }
}
