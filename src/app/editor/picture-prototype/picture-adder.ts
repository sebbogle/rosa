import { NgTemplateOutlet } from '@angular/common';
import {
  Component,
  ElementRef,
  Injector,
  ViewEncapsulation,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Ask, Confirm } from '../../shell/confirm/confirm';
import { Icon } from '../../shell/icon/icon';
import { EditorSession } from '../editor-session';
import { AddingPicture } from './adding-picture';
import { PICTURE_ADDER_CSS } from './picture-adder.css';

const ITEMS = '[role="menuitem"]';

@Component({
  selector: 'app-picture-adder',
  imports: [Confirm, Icon, NgTemplateOutlet],
  host: { class: 'pa-host' },
  template: `
    @let state = adding();
    @let shown = picture();
    @let busy = state.kind === 'shrinking';

    <input
      #chooser
      class="pa-file"
      type="file"
      accept="image/*"
      tabindex="-1"
      aria-hidden="true"
      (change)="picked($event)"
    />

    <div class="pa-field" [class]="'pa-field pa-v' + variant()">
      <span class="pa-name" id="pa-name">Picture</span>

      <div class="pa-row">
        @if (!shown) {
          @if (busy) {
            <span class="pa-busy">
              <progress class="pa-spinner pa-small" aria-label="Adding the picture"></progress>
              Adding…
            </span>
          } @else {
            <button
              #addButton
              type="button"
              class="quiet pa-add"
              aria-describedby="pa-error"
              (click)="choose()"
            >
              + Add a picture
            </button>
          }
        } @else {
          @switch (variant()) {
            @case ('A') {
              <button
                #trigger
                id="pa-trigger"
                type="button"
                class="pa-thumb-button pa-with-caret"
                aria-haspopup="menu"
                [attr.aria-expanded]="menuOpen()"
                aria-label="Picture"
                commandfor="pa-menu"
                command="toggle-popover"
                [disabled]="busy"
                (pointerdown)="pointered = true"
                (keydown.arrowdown)="openFromKeys($event)"
                (keydown.escape)="escapeTrigger($event)"
                (click)="triggered($event)"
              >
                <ng-container *ngTemplateOutlet="thumb" />
                <app-icon name="caret" [size]="0.9" />
              </button>
              <div
                #menu
                id="pa-menu"
                popover="auto"
                class="menu pa-menu"
                role="menu"
                aria-labelledby="pa-name"
                (toggle)="menuToggled($event)"
                (keydown)="menuKey($event)"
              >
                <button type="button" role="menuitem" (click)="fromMenu('view')">
                  See it full-size
                </button>
                <button type="button" role="menuitem" (click)="fromMenu('replace')">
                  Replace picture
                </button>
                <button type="button" role="menuitem" (click)="fromMenu('remove')">
                  Remove picture
                </button>
              </div>
            }

            @case ('B') {
              <span class="pa-thumb-wrap">
                <button
                  type="button"
                  class="pa-thumb-button"
                  aria-label="See the picture full-size"
                  (click)="view()"
                >
                  <ng-container *ngTemplateOutlet="thumb" />
                </button>
                @if (!busy) {
                  <button
                    type="button"
                    class="pa-x"
                    aria-label="Remove the picture"
                    (click)="askRemove()"
                  >
                    <app-icon name="close" [size]="0.75" [weight]="2" />
                  </button>
                }
              </span>
            }

            @case ('C') {
              <button
                type="button"
                class="pa-thumb-button"
                aria-label="See, replace or remove the picture"
                (click)="view()"
              >
                <ng-container *ngTemplateOutlet="thumb" />
              </button>
            }

            @case ('D') {
              <button
                type="button"
                class="pa-thumb-button"
                aria-label="See the picture full-size"
                (click)="view()"
              >
                <ng-container *ngTemplateOutlet="thumb" />
              </button>
              @if (!busy) {
                <span class="pa-words">
                  <button type="button" class="quiet pa-word" (click)="choose()">Replace</button>
                  <button type="button" class="quiet pa-word" (click)="askRemove()">Remove</button>
                </span>
              }
            }
          }

          @if (busy) {
            <span class="pa-busy">Adding…</span>
          }
        }
      </div>

      <p class="pa-error" id="pa-error" role="alert">
        @if (state.kind === 'failed') {
          Unable to load picture.
        }
      </p>
    </div>

    <ng-template #thumb>
      <span class="pa-thumb-frame" [class.pa-busy-thumb]="busy">
        @if (shown) {
          <img class="pa-thumb" [src]="shown.url" alt="" />
        }
        @if (busy) {
          <progress class="pa-spinner pa-small" aria-label="Adding the picture"></progress>
        }
      </span>
    </ng-template>

    <dialog
      #viewer
      class="pa-viewer"
      closedby="any"
      aria-label="The recipe's picture"
      [class.pa-actions]="variant() === 'C'"
      (keydown.escape)="escapeViewer($event)"
      (click)="viewerClick($event)"
      (close)="viewerClosed()"
    >
      <input
        #viewerChooser
        class="pa-file"
        type="file"
        accept="image/*"
        tabindex="-1"
        aria-hidden="true"
        (change)="picked($event)"
      />
      <button type="button" class="pa-viewer-close" aria-label="Close the picture">
        <app-icon name="close" [size]="1.2" />
      </button>
      <div class="pa-viewer-stage">
        @if (shown) {
          <img [src]="shown.url" alt="" [class.pa-dim]="busy" />
        }
        @if (busy) {
          <progress class="pa-spinner" aria-label="Adding the picture"></progress>
        }
      </div>
      @if (variant() === 'C') {
        <div class="pa-viewer-bar">
          @if (state.kind === 'failed') {
            <p class="pa-viewer-error" role="alert">Unable to load picture.</p>
          }
          <div class="pa-viewer-buttons">
            <button
              type="button"
              class="pa-viewer-action"
              [disabled]="busy"
              (click)="chooseInViewer()"
            >
              Replace
            </button>
            <button type="button" class="pa-viewer-action" [disabled]="busy" (click)="askRemove()">
              Remove
            </button>
          </div>
        </div>
      }
    </dialog>

    @if (asking()) {
      <app-confirm [ask]="removeAsk()" (keep)="asking.set(false)" (act)="confirmRemove()" />
    }
  `,
  styles: [PICTURE_ADDER_CSS],
  encapsulation: ViewEncapsulation.None,
})
export class PictureAdder {
  private readonly session = inject(EditorSession);

  private readonly injector = inject(Injector);

  protected readonly pictures = inject(AddingPicture);

  protected readonly variant = this.pictures.variant;

  protected readonly menuOpen = signal(false);

  protected readonly asking = signal(false);

  protected pointered = false;

  private keyed = false;

  private readonly chooser = viewChild.required<ElementRef<HTMLInputElement>>('chooser');

  private readonly viewerChooser =
    viewChild.required<ElementRef<HTMLInputElement>>('viewerChooser');

  private readonly viewer = viewChild.required<ElementRef<HTMLDialogElement>>('viewer');

  private readonly menu = viewChild<ElementRef<HTMLElement>>('menu');

  private readonly trigger = viewChild<ElementRef<HTMLButtonElement>>('trigger');

  private readonly addButton = viewChild<ElementRef<HTMLButtonElement>>('addButton');

  private readonly key = computed(() => {
    const editing = this.session.editing();
    return editing && (editing.id ?? editing.draft);
  });

  protected readonly picture = computed(() => this.pictures.of(this.key()));

  protected readonly adding = computed(() => this.pictures.stateFor(this.key()));

  protected readonly removeAsk = computed<Ask>(() => ({
    label: 'Remove picture',
    line: 'Remove the picture?',
    sentences:
      this.session.editing()?.id !== undefined
        ? ['Revert puts it back while the editor is open.']
        : [],
    keep: 'Keep it',
    act: 'Remove',
    tone: 'danger',
  }));

  protected choose(): void {
    this.chooser().nativeElement.click();
  }

  protected chooseInViewer(): void {
    this.viewerChooser().nativeElement.click();
  }

  protected picked(event: Event): void {
    const field = event.target as HTMLInputElement;
    const file = field.files?.[0];
    field.value = '';
    const key = this.key();
    if (file && key !== undefined) void this.pictures.add(file, key);
  }

  protected view(): void {
    const viewer = this.viewer().nativeElement;
    if (!viewer.open) viewer.showModal();
  }

  protected escapeViewer(event: Event): void {
    event.preventDefault();
    this.viewer().nativeElement.close();
  }

  protected viewerClick(event: MouseEvent): void {
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest('.pa-viewer-bar')) return;
    this.viewer().nativeElement.close();
  }

  protected viewerClosed(): void {
    const key = this.key();
    if (key !== undefined && this.variant() === 'C') this.pictures.dismissFailure(key);
  }

  protected askRemove(): void {
    if (this.pictures.asks()) this.asking.set(true);
    else this.remove();
  }

  protected confirmRemove(): void {
    this.asking.set(false);
    this.remove();
  }

  protected triggered(event: MouseEvent): void {
    this.keyed = event.detail === 0 && !this.pointered;
    this.pointered = false;
  }

  protected openFromKeys(event: Event): void {
    event.preventDefault();
    const menu = this.menu()?.nativeElement;
    if (!menu) return;
    if (menu.matches(':popover-open')) this.items()[0]?.focus();
    else {
      this.keyed = true;
      this.trigger()?.nativeElement.click();
    }
  }

  protected escapeTrigger(event: Event): void {
    if (!this.menuOpen()) return;
    event.preventDefault();
    this.closeMenu();
  }

  protected menuToggled(event: Event): void {
    const opening = (event as ToggleEvent).newState === 'open';
    this.menuOpen.set(opening);
    if (!opening) return;

    this.place();
    if (this.keyed) this.items()[0]?.focus();
    this.keyed = false;
  }

  protected menuKey(event: KeyboardEvent): void {
    const items = this.items();
    const at = items.indexOf(document.activeElement as HTMLButtonElement);

    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeMenu();
      return;
    }

    let next: number;
    if (event.key === 'ArrowDown') next = (at + 1) % items.length;
    else if (event.key === 'ArrowUp') next = (at - 1 + items.length) % items.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = items.length - 1;
    else return;

    event.preventDefault();
    items[next]?.focus();
  }

  protected fromMenu(choice: 'view' | 'replace' | 'remove'): void {
    this.closeMenu();
    if (choice === 'view') this.view();
    else if (choice === 'replace') this.choose();
    else this.askRemove();
  }

  private remove(): void {
    const key = this.key();
    if (key === undefined) return;

    const viewer = this.viewer().nativeElement;
    if (viewer.open) viewer.close();

    this.pictures.remove(key);
    afterNextRender(() => this.addButton()?.nativeElement.focus(), { injector: this.injector });
  }

  private items(): HTMLButtonElement[] {
    return [...(this.menu()?.nativeElement.querySelectorAll<HTMLButtonElement>(ITEMS) ?? [])];
  }

  private closeMenu(): void {
    this.trigger()?.nativeElement.focus({ focusVisible: false } as FocusOptions);
    this.menu()?.nativeElement.hidePopover();
  }

  private place(): void {
    if (CSS.supports('position-area', 'block-start')) return;

    const menu = this.menu()?.nativeElement;
    const trigger = this.trigger()?.nativeElement;
    if (!menu || !trigger) return;

    const anchor = trigger.getBoundingClientRect();
    const box = menu.getBoundingClientRect();
    const above = anchor.top - box.height - 4;
    const top = above >= 8 ? above : anchor.bottom + 4;
    const left = Math.min(anchor.left, innerWidth - box.width - 8);

    menu.style.top = `${top}px`;
    menu.style.left = `${Math.max(8, left)}px`;
  }
}
