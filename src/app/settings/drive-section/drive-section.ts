import { Component, computed, inject, signal } from '@angular/core';
import { SPEECH, Speech, UNREACHABLE, UNSENT, inertOf } from '../../drive/drive-ladder';
import { ClearOutcome, DriveService } from '../../drive/drive-service';
import { Ask, Confirm } from '../../shell/confirm/confirm';

const STILL_THERE = 'rosa could not clear Drive, and the folder is still there.';

const RECEIPTS: Record<ClearOutcome, string> = {
  gone: "rosa's folder is gone from your Google Drive.",
  'still there': STILL_THERE,
  unanswered: '',
};

const CLEAR_DRIVE: Ask = {
  label: 'Clear Drive',
  line: 'Clear Drive?',
  sentences: [
    "This deletes rosa's folder from your Google Drive, with everything in it, and there is no undo. Your recipes stay on this device.",
    'Your other devices keep their own recipes, and may put some back in Drive.',
  ],
  keep: 'Cancel',
  act: 'Clear Drive',
  tone: 'destroy',
};

@Component({
  selector: 'app-drive-section',
  imports: [Confirm],
  templateUrl: './drive-section.html',
  styleUrls: ['../settings-row.css', './drive-section.css'],
})
export class DriveSection {
  private readonly drive = inject(DriveService);

  protected readonly reason = UNREACHABLE;

  protected readonly unsentWords = UNSENT;

  protected readonly clearing = CLEAR_DRIVE;

  protected readonly speech = computed<Speech>(() => SPEECH[this.drive.state()]);

  protected readonly used = this.drive.used;

  protected readonly unsent = this.drive.unsent;

  protected readonly address = this.drive.address;

  protected readonly inert = computed(() => inertOf(this.drive.state(), this.drive.offline()));

  protected readonly clearInert = computed(
    () => this.drive.clearAsksGoogle() && this.drive.offline(),
  );

  protected readonly held = this.drive.acting;

  protected readonly confirming = signal(false);

  protected readonly receipt = signal('');

  protected press(): void {
    if (this.inert() || this.held()) return;

    if (this.drive.state() === 'cleared') {
      void this.drive.putThemBack();
      return;
    }

    void this.drive.sync();
  }

  protected disconnect(): void {
    this.drive.disconnect();
  }

  protected askToClear(): void {
    if (this.held() || this.clearInert()) return;

    if (!this.drive.clearable()) {
      this.receipt.set(STILL_THERE);
      return;
    }

    this.receipt.set('');
    this.confirming.set(true);
  }

  protected cancelClear(): void {
    this.confirming.set(false);
  }

  protected async clear(): Promise<void> {
    this.confirming.set(false);
    await this.drive.clearDrive();

    const end = this.drive.clearEnded();
    this.receipt.set(end === undefined ? '' : RECEIPTS[end.outcome]);
  }
}
