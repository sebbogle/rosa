import { CdkDrag, CdkDragDrop, CdkDropList, CdkDropListGroup } from '@angular/cdk/drag-drop';
import { Component, inject } from '@angular/core';
import { ContentsDrawer } from './contents/contents-drawer';
import { Sidebar } from './contents/sidebar/sidebar';
import { DriveService } from './drive/drive-service';
import { SyncControl } from './drive/sync-control/sync-control';
import { Editor } from './editor/editor/editor';
import { FRAME_CSS, PANE_LAYOUT_CSS } from './frame.css';
import { RecipePane } from './recipe/recipe-pane/recipe-pane';
import { RestingState } from './recipe/resting-state/resting-state';
import { TabStrip } from './recipe/tab-strip/tab-strip';
import { Edge, Tab, Tabs } from './recipe/tabs';
import { Settings } from './settings/settings/settings';
import { SettingsSheet } from './settings/settings-sheet';
import { dividerEdge } from './shell/divider/divider';
import { Grip } from './shell/grip/grip';
import { clicks } from './shell/press';
import { Update } from './shell/update';

const DIGITS = /^Digit([1-9])$/;

const SIDE_NAMES = ['Left side', 'Right side'];

const FIELDS =
  'input:not([type=checkbox], [type=radio], [type=button], [type=file]), textarea, select';

@Component({
  selector: 'app-root',
  imports: [
    CdkDropList,
    CdkDropListGroup,
    Editor,
    Grip,
    RecipePane,
    RestingState,
    Settings,
    Sidebar,
    SyncControl,
    TabStrip,
  ],
  host: { '(window:keydown)': 'onTabKeys($event)' },
  templateUrl: './app.html',
  styleUrl: './app.css',
  styles: [FRAME_CSS, PANE_LAYOUT_CSS],
})
export class App {
  private readonly tabs = inject(Tabs);
  private readonly drawer = inject(ContentsDrawer);
  private readonly settings = inject(SettingsSheet);

  protected readonly drive = inject(DriveService).available;

  protected readonly sides = this.tabs.sides;

  protected readonly split = this.tabs.split;

  protected readonly sideNames = SIDE_NAMES;

  protected readonly divider = dividerEdge;

  protected readonly splittable = (): boolean => this.tabs.splittable();

  protected readonly fromTheOtherSide = (drag: CdkDrag<Tab>, drop: CdkDropList<number>): boolean =>
    this.tabs.sideOf(drag.data.id) !== drop.data;

  protected readonly drawerOpen = this.drawer.open;

  protected readonly updateWaiting = inject(Update).waiting;

  protected toggleDrawer(): void {
    this.drawer.toggle();
  }

  protected openSettings(): void {
    this.settings.show();
  }

  protected choose(id: string, sizing: string): void {
    this.tabs.choose(id, sizing);
  }

  protected press(at: number, event: PointerEvent): void {
    if (clicks(event)) this.tabs.focus(at);
  }

  protected makeSide(drop: CdkDragDrop<unknown, unknown, Tab>, edge: Edge): void {
    if (drop.isPointerOverContainer) this.tabs.makeSide(drop.item.data.id, edge);
  }

  protected moveToSide(drop: CdkDragDrop<number, unknown, Tab>): void {
    if (drop.isPointerOverContainer) this.tabs.move(drop.container.data, drop.item.data.id);
  }

  protected onTabKeys(event: KeyboardEvent): void {
    if (!event.altKey || event.ctrlKey || event.metaKey) return;
    if (typedInto(event.target)) return;

    const act = this.tabAction(event.code);
    if (!act) return;

    event.preventDefault();
    if (!document.querySelector(':modal')) act();
  }

  private tabAction(code: string): (() => void) | undefined {
    const digit = DIGITS.exec(code);
    if (digit) return () => this.tabs.activateAt(Number(digit[1]) - 1);

    switch (code) {
      case 'KeyW':
        return () => this.tabs.closeActive();
      case 'ArrowLeft':
        return () => this.tabs.step(-1);
      case 'ArrowRight':
        return () => this.tabs.step(1);
      default:
        return undefined;
    }
  }
}

function typedInto(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || target.matches(FIELDS));
}
