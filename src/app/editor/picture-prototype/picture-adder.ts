import {
  Component,
  ElementRef,
  ViewEncapsulation,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { EditorSession } from '../editor-session';
import { AddingPicture, UNREADABLE } from './adding-picture';
import { PICTURE_ADDER_CSS } from './picture-adder.css';

export type AdderSlot = 'top' | 'field' | 'meta' | 'bar' | 'overlay';

@Component({
  selector: 'app-picture-adder',
  host: {
    '[class]': '"pa-host pa-" + slot()',
    '(document:dragover)': 'guardDrag($event)',
    '(document:drop)': 'guardDrop($event)',
    '(document:paste)': 'paste($event)',
    '(document:pointerdown)': 'outside($event)',
  },
  template: `
    @let state = adding();
    @let shown = picture();

    <input
      #chooser
      class="pa-file"
      type="file"
      accept="image/*"
      tabindex="-1"
      aria-hidden="true"
      (change)="picked($event)"
    />
    <input
      #camera
      class="pa-file"
      type="file"
      accept="image/*"
      capture="environment"
      tabindex="-1"
      aria-hidden="true"
      (change)="picked($event)"
    />

    @switch (slot() + variant()) {
      @case ('topA') {
        <div
          class="pa-band"
          [class.pa-empty]="!shown"
          [class.pa-over]="over()"
          (dragover)="dragOver($event)"
          (drop)="drop($event)"
        >
          @if (shown) {
            <img [src]="shown.url" alt="" />
          } @else if (state.kind === 'shrinking') {
            <img class="pa-dim" [src]="state.preview" alt="" (error)="hideBroken($event)" />
            <progress class="pa-spinner" aria-label="Adding the picture"></progress>
          } @else {
            <div class="pa-empty-body">
              <div class="pa-buttons">
                <button
                  type="button"
                  class="quiet"
                  [attr.aria-disabled]="locked() || null"
                  [attr.aria-describedby]="locked() ? 'pa-locked' : null"
                  (click)="choose()"
                >
                  Add a picture
                </button>
                @if (coarse) {
                  <button
                    type="button"
                    class="quiet"
                    [attr.aria-disabled]="locked() || null"
                    (click)="takePhoto()"
                  >
                    Take a photo
                  </button>
                }
              </div>
              @if (locked()) {
                <p class="pa-hint" id="pa-locked">Give the recipe a title first.</p>
              } @else if (!coarse) {
                <p class="pa-hint">or drop one here</p>
              }
              @if (state.kind === 'failed') {
                <p class="pa-error" role="alert">
                  <b>{{ unreadable[state.why].line }}</b> {{ unreadable[state.why].sentence }}
                </p>
              }
            </div>
          }
        </div>
      }

      @case ('topC') {
        @if (shown) {
          <div class="pa-band" #appeared>
            <img [src]="shown.url" alt="" />
          </div>
        }
      }

      @case ('topD') {
        @if (shown) {
          <div class="pa-band">
            <img [src]="shown.url" alt="" />
          </div>
        } @else {
          <button
            type="button"
            class="pa-slim"
            [attr.aria-disabled]="locked() || null"
            [attr.aria-describedby]="locked() ? 'pa-locked' : null"
            (click)="choose()"
          >
            + Add a picture
          </button>
          @if (locked()) {
            <p class="pa-hint pa-under" id="pa-locked">Give the recipe a title first.</p>
          }
        }
      }

      @case ('metaB') {
        <div class="pa-field pa-meta-field">
          <span class="pa-name">Picture</span>
          <div class="pa-row">
            @if (shown) {
              <img class="pa-thumb" [src]="shown.url" alt="" />
            }
            @if (state.kind === 'shrinking') {
              <span class="pa-busy">
                <progress class="pa-spinner pa-small" aria-label="Adding the picture"></progress>
                Adding…
              </span>
            } @else if (!shown) {
              <div class="pa-menu-anchor">
                <button
                  type="button"
                  class="quiet pa-add"
                  [attr.aria-disabled]="locked() || null"
                  [attr.aria-describedby]="locked() ? 'pa-locked' : 'pa-error'"
                  [attr.aria-haspopup]="coarse ? 'menu' : null"
                  [attr.aria-expanded]="coarse ? menu() : null"
                  (click)="coarse ? toggleMenu() : choose()"
                >
                  + Add a picture
                </button>
                @if (menu()) {
                  <div class="menu pa-menu" role="menu">
                    <button type="button" role="menuitem" (click)="menuChoose()">
                      Choose a picture
                    </button>
                    <button type="button" role="menuitem" (click)="menuPhoto()">
                      Take a photo
                    </button>
                  </div>
                }
              </div>
            }
          </div>
          @if (locked() && !shown) {
            <p class="pa-hint" id="pa-locked">Give the recipe a title first.</p>
          }
          <p class="pa-error" id="pa-error" role="alert">
            @if (state.kind === 'failed') {
              Unable to load picture.
            }
          </p>
        </div>
      }

      @case ('barC') {
        @if (state.kind === 'shrinking') {
          <span class="pa-status">
            <progress class="pa-spinner pa-small" aria-label="Adding the picture"></progress>
            Adding<span class="pa-long"> the picture</span>…
          </span>
        } @else if (!shown) {
          <div class="pa-menu-anchor">
            <button
              type="button"
              class="quiet"
              [attr.aria-disabled]="locked() || null"
              [title]="locked() ? 'Give the recipe a title first' : ''"
              [attr.aria-haspopup]="coarse ? 'menu' : null"
              [attr.aria-expanded]="coarse ? menu() : null"
              (click)="coarse ? toggleMenu() : choose()"
            >
              Add a picture
            </button>
            @if (menu()) {
              <div class="menu pa-menu pa-up" role="menu">
                <button type="button" role="menuitem" (click)="menuChoose()">
                  Choose a picture
                </button>
                <button type="button" role="menuitem" (click)="menuPhoto()">Take a photo</button>
              </div>
            }
          </div>
        }
      }

      @case ('overlayC') {
        @if (over()) {
          <div class="pa-drop-overlay"><span>Drop to add a picture</span></div>
        }
        <dialog #alert class="pa-dialog" aria-labelledby="pa-alert-line" (cancel)="dismiss()">
          @if (state.kind === 'failed') {
            <p class="pa-dialog-line" id="pa-alert-line">{{ unreadable[state.why].line }}</p>
            <p class="pa-dialog-sentence">{{ unreadable[state.why].sentence }}</p>
          }
          <div class="pa-dialog-actions">
            <button type="button" class="primary" (click)="dismiss()">OK</button>
          </div>
        </dialog>
      }

      @case ('overlayD') {
        <dialog
          #review
          class="pa-dialog pa-review"
          aria-labelledby="pa-review-line"
          (cancel)="dismiss()"
        >
          <input
            #reviewChooser
            class="pa-file"
            type="file"
            accept="image/*"
            tabindex="-1"
            aria-hidden="true"
            (change)="picked($event)"
          />
          <p class="pa-dialog-line" id="pa-review-line">
            @switch (state.kind) {
              @case ('failed') {
                {{ unreadable[state.kind === 'failed' ? state.why : 'damaged'].line }}
              }
              @default {
                Add this picture?
              }
            }
          </p>

          @if (state.kind === 'reviewing') {
            <div class="pa-preview-band">
              <img [src]="state.picture.url" alt="" />
              <span class="pa-preview-title">{{ titleShown() }}</span>
            </div>
            <p class="pa-dialog-sentence">
              The recipe shows it like this. Tap the picture there to see all of it:
            </p>
            <img class="pa-preview-whole" [src]="state.picture.url" alt="" />
          } @else if (state.kind === 'shrinking') {
            <div class="pa-preview-band pa-waiting">
              <img class="pa-dim" [src]="state.preview" alt="" (error)="hideBroken($event)" />
              <progress class="pa-spinner" aria-label="Adding the picture"></progress>
            </div>
          } @else if (state.kind === 'failed') {
            <p class="pa-dialog-sentence">{{ unreadable[state.why].sentence }}</p>
          }

          <div class="pa-dialog-actions">
            <button type="button" class="quiet" (click)="dismiss()">Cancel</button>
            <button type="button" class="quiet" (click)="chooseAgain()">Choose another</button>
            @if (state.kind === 'reviewing') {
              <button type="button" class="primary" (click)="accept()">Use this picture</button>
            }
          </div>
        </dialog>
      }
    }
  `,
  styles: [PICTURE_ADDER_CSS],
  encapsulation: ViewEncapsulation.None,
})
export class PictureAdder {
  private readonly session = inject(EditorSession);

  protected readonly pictures = inject(AddingPicture);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  readonly slot = input.required<AdderSlot>();

  protected readonly unreadable = UNREADABLE;

  protected readonly coarse = matchMedia('(pointer: coarse)').matches;

  protected readonly variant = this.pictures.variant;

  protected readonly menu = signal(false);

  protected readonly over = signal(false);

  private overTimer: ReturnType<typeof setTimeout> | undefined;

  private readonly chooser = viewChild.required<ElementRef<HTMLInputElement>>('chooser');

  private readonly camera = viewChild.required<ElementRef<HTMLInputElement>>('camera');

  private readonly reviewChooser = viewChild<ElementRef<HTMLInputElement>>('reviewChooser');

  private readonly alert = viewChild<ElementRef<HTMLDialogElement>>('alert');

  private readonly review = viewChild<ElementRef<HTMLDialogElement>>('review');

  private readonly appeared = viewChild<ElementRef<HTMLElement>>('appeared');

  private readonly key = computed(() => {
    const editing = this.session.editing();
    return editing && (editing.id ?? editing.draft);
  });

  protected readonly picture = computed(() => this.pictures.of(this.key()));

  protected readonly adding = computed(() => this.pictures.stateFor(this.key()));

  protected readonly locked = computed(() => {
    const editing = this.session.editing();
    return (
      this.pictures.untitled() === 'title-first' &&
      editing !== undefined &&
      editing.id === undefined &&
      editing.fields.title.trim() === ''
    );
  });

  protected readonly titleShown = computed(() => this.session.title() || 'Untitled recipe');

  constructor() {
    effect(() => {
      const dialog = this.alert()?.nativeElement;
      if (!dialog) return;
      const failed = this.adding().kind === 'failed';
      if (failed && !dialog.open) dialog.showModal();
      else if (!failed && dialog.open) dialog.close();
    });

    effect(() => {
      const dialog = this.review()?.nativeElement;
      if (!dialog) return;
      const showing = this.adding().kind !== 'idle';
      if (showing && !dialog.open) dialog.showModal();
      else if (!showing && dialog.open) dialog.close();
    });

    effect(() => {
      const band = this.appeared()?.nativeElement;
      band?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }

  protected choose(): void {
    if (this.locked()) return;
    this.chooser().nativeElement.click();
  }

  protected takePhoto(): void {
    if (this.locked()) return;
    this.camera().nativeElement.click();
  }

  protected chooseAgain(): void {
    this.reviewChooser()?.nativeElement.click();
  }

  protected toggleMenu(): void {
    if (this.locked()) return;
    this.menu.set(!this.menu());
  }

  protected outside(event: PointerEvent): void {
    if (!this.menu()) return;
    const target = event.target instanceof Node ? event.target : null;
    if (!target || !this.host.querySelector('.pa-menu-anchor')?.contains(target)) {
      this.menu.set(false);
    }
  }

  protected menuChoose(): void {
    this.menu.set(false);
    this.choose();
  }

  protected menuPhoto(): void {
    this.menu.set(false);
    this.takePhoto();
  }

  protected picked(event: Event): void {
    const field = event.target as HTMLInputElement;
    const file = field.files?.[0];
    field.value = '';
    if (file) this.add(file);
  }

  protected accept(): void {
    this.pictures.accept();
  }

  protected dismiss(): void {
    this.pictures.dismiss();
  }

  protected hideBroken(event: Event): void {
    (event.target as HTMLElement).hidden = true;
  }

  protected dragOver(event: DragEvent): void {
    if (!this.carriesFiles(event) || this.locked()) return;
    event.preventDefault();
    this.flagOver();
  }

  protected drop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.over.set(false);
    const file = event.dataTransfer?.files[0];
    if (file && !this.locked()) this.add(file);
  }

  protected guardDrag(event: DragEvent): void {
    if (this.slot() !== 'overlay' || !this.session.editing() || !this.carriesFiles(event)) return;
    event.preventDefault();
    if (this.variant() === 'C' && !this.locked()) this.flagOver();
  }

  protected guardDrop(event: DragEvent): void {
    if (this.slot() !== 'overlay' || !this.session.editing() || event.defaultPrevented) return;
    event.preventDefault();
    this.over.set(false);
    const file = event.dataTransfer?.files[0];
    if (file && this.variant() === 'C' && !this.locked()) this.add(file);
  }

  protected paste(event: ClipboardEvent): void {
    if (this.slot() !== 'overlay' || this.variant() !== 'C' || !this.session.editing()) return;
    const data = event.clipboardData;
    if (!data || data.types.includes('text/plain')) return;
    const file = [...data.files].find((candidate) => candidate.type.startsWith('image/'));
    if (!file || this.locked()) return;
    event.preventDefault();
    this.add(file);
  }

  private add(file: File): void {
    const key = this.key();
    if (key !== undefined) void this.pictures.add(file, key);
  }

  private carriesFiles(event: DragEvent): boolean {
    return event.dataTransfer?.types.includes('Files') ?? false;
  }

  private flagOver(): void {
    this.over.set(true);
    clearTimeout(this.overTimer);
    this.overTimer = setTimeout(() => this.over.set(false), 150);
  }
}
