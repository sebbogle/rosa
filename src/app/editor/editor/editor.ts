import { Component, ElementRef, computed, effect, inject, viewChild } from '@angular/core';
import { shownName } from '../../recipe/recipe';
import { Ask, Confirm } from '../../shell/confirm/confirm';
import { Sheet } from '../../shell/sheet/sheet';
import { BlockColumn } from '../block-column/block-column';
import { EditorSession, SourceSlot } from '../editor-session';
import { FolderPicker } from '../folder-picker/folder-picker';
import { SizingBar } from '../sizing-bar/sizing-bar';
import { TagInput } from '../tag-input/tag-input';
import { Fields } from '../working-list';

type TextField = keyof Omit<Fields, 'folder' | 'tags' | 'source' | 'sizings'>;

const COARSE = '(pointer: coarse)';

const MENU_TOGGLE = '[aria-haspopup="menu"]';

const MENU = '[role="menu"]';

const MENU_ITEM = '[role="menuitem"]';

@Component({
  selector: 'app-editor',
  imports: [BlockColumn, Confirm, FolderPicker, Sheet, SizingBar, TagInput],
  host: {
    '(pointerdown)': 'shut($event)',
    '(click)': 'shut($event)',
    '(document:keydown.control.s)': 'swallow($event)',
    '(document:keydown.meta.s)': 'swallow($event)',
  },
  templateUrl: './editor.html',
  styleUrl: './editor.css',
})
export class Editor {
  private readonly session = inject(EditorSession);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  protected readonly open = this.session.editing;

  protected readonly deletable = this.session.deletable;
  protected readonly revertable = this.session.revertable;

  protected readonly asking = computed<Ask | undefined>(() => {
    const prompt = this.session.prompt();
    const called = this.session.title() || 'this recipe';

    switch (prompt) {
      case undefined:
        return undefined;
      case 'discard':
        return {
          label: 'This recipe has no title',
          line: 'This recipe has no title.',
          sentences: [
            'rosa keeps a recipe once it has a name, so this one is stored nowhere. Leaving lets it go.',
          ],
          keep: 'Back to it',
          act: 'Discard it',
          tone: 'danger',
        };
      case 'revert':
        return {
          label: 'Revert recipe',
          line: `Revert ${called}?`,
          sentences: [
            'Everything changed since you opened the editor goes back to how it was. rosa keeps nothing behind that.',
          ],
          keep: 'Keep editing',
          act: 'Revert',
          tone: 'danger',
        };
      case 'delete':
        return {
          label: 'Delete recipe',
          line: `Delete ${called}?`,
          sentences: ['It leaves rosa on every device you use, and there is no undo.'],
          keep: 'Cancel',
          act: 'Delete',
          tone: 'destroy',
        };
    }

    const sizings = this.session.sizings();
    const at = sizings.findIndex((sizing) => sizing.id === prompt.sizing);
    if (at === -1) return undefined;

    return {
      label: 'Delete sizing',
      line: `Delete ${shownName(sizings[at], at)}?`,
      sentences: [
        'Its name and every quantity and unit typed for it go. The ingredients and the other sizings stay.',
      ],
      keep: 'Cancel',
      act: 'Delete',
      tone: 'destroy',
    };
  });

  protected readonly peel = (): boolean => {
    const picker = this.folderPicker();

    if (this.session.menu()) this.session.showMenu(undefined);
    else if (picker?.open()) picker.close();
    else if (!this.tagInput()?.listing()) return false;

    return true;
  };

  private readonly titleField = viewChild<ElementRef<HTMLInputElement>>('titleField');

  private readonly folderPicker = viewChild(FolderPicker);

  private readonly tagInput = viewChild(TagInput);

  constructor() {
    effect(() => {
      const field = this.titleField();
      if (!field || matchMedia(COARSE).matches) return;
      field.nativeElement.focus();
      field.nativeElement.select();
    });
  }

  protected type(field: TextField, event: Event): void {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement;
    this.session.type(field, target.value);
  }

  protected settle(field: Exclude<TextField, 'title'>): void {
    this.session.settle(field);
  }

  protected settleTitle(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.session.settleTitle();
    target.value = this.session.editing()?.fields.title ?? target.value;
  }

  protected typeSource(slot: SourceSlot, event: Event): void {
    const target = event.target as HTMLInputElement;
    this.session.typeSource(slot, target.value);
  }

  protected settleSource(): void {
    this.session.settle('source');
  }

  protected tag(tags: readonly string[]): void {
    this.session.setTags(tags);
  }

  protected folder(folder: readonly string[]): void {
    this.session.chooseFolder(folder);
  }

  protected shut(event: MouseEvent): void {
    const target = event.target instanceof Element ? event.target : undefined;
    if (target?.closest(MENU_TOGGLE)) return;

    const chosen = event.type === 'click' && target?.closest(MENU_ITEM);
    if (target?.closest(MENU) && !chosen) return;

    this.session.showMenu(undefined);
  }

  protected swallow(event: Event): void {
    if (this.session.editing()) event.preventDefault();
  }

  protected requestClose(): void {
    if (this.session.discardable()) {
      this.session.ask('discard');
      return;
    }

    const active = document.activeElement;
    if (active instanceof HTMLElement && this.host.contains(active)) active.blur();

    this.session.flush();
    this.session.close();
  }

  protected requestDelete(): void {
    this.session.ask('delete');
  }

  protected requestRevert(): void {
    this.session.ask('revert');
  }

  protected withdraw(): void {
    this.session.withdraw();
  }

  protected answer(): void {
    this.session.answer();
  }
}
