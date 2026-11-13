import {
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { SettingsSheet } from '../../settings/settings-sheet';
import { Bubble } from '../../shell/bubble/bubble';
import { UNREACHABLE, UNSENT, inertOf } from '../drive-ladder';
import { CatchUpEnd, DriveService } from '../drive-service';

type Showing = 'nothing' | 'offered' | 'asking' | 'syncing' | 'in Google Drive' | 'Google Drive';

const WORDS: Record<Showing, string | undefined> = {
  nothing: undefined,
  offered: 'Sync with Drive',
  asking: 'Sync with Drive',
  syncing: 'Syncing',
  'in Google Drive': 'In Google Drive',
  'Google Drive': 'Google Drive',
};

const IN_GOOGLE_DRIVE_FOR_MS = 4500;

@Component({
  selector: 'app-sync-control',
  imports: [Bubble],
  templateUrl: './sync-control.html',
  styleUrl: './sync-control.css',
})
export class SyncControl {
  private readonly drive = inject(DriveService);
  private readonly settings = inject(SettingsSheet);

  private readonly bubble = viewChild(Bubble);

  private readonly sayingInGoogleDrive = signal(false);

  private readonly pointingToSettings = signal(false);

  private timer: ReturnType<typeof setTimeout> | undefined;

  protected readonly reason = UNREACHABLE;

  protected readonly unsentWords = UNSENT;

  protected readonly showing = computed<Showing>(() => {
    if (this.drive.catchingUp()) return 'syncing';
    if (this.sayingInGoogleDrive()) return 'in Google Drive';
    if (this.pointingToSettings()) return 'Google Drive';
    if (this.drive.state() !== 'token expired') return 'nothing';
    return this.drive.askingToSync() ? 'asking' : 'offered';
  });

  protected readonly words = computed(() => WORDS[this.showing()]);

  protected readonly turning = computed(
    () => this.showing() === 'asking' || this.showing() === 'syncing',
  );

  protected readonly held = computed(
    () => this.turning() || this.showing() === 'in Google Drive' || this.drive.acting(),
  );

  protected readonly inert = computed(
    () => this.showing() === 'offered' && inertOf(this.drive.state(), this.drive.offline()),
  );

  protected readonly marked = computed(
    () => this.drive.unsent() && (this.showing() === 'offered' || this.showing() === 'asking'),
  );

  constructor() {
    effect(() => {
      const end = this.drive.ended();
      if (end !== undefined) untracked(() => this.report(end));
    });

    effect(() => {
      if (this.settings.open()) untracked(() => this.pointingToSettings.set(false));
    });

    inject(DestroyRef).onDestroy(() => clearTimeout(this.timer));
  }

  protected press(): void {
    if (this.inert()) {
      this.bubble()?.say();
      return;
    }

    if (this.held()) return;

    void this.drive.sync();
  }

  protected openSettings(): void {
    this.settings.show();
  }

  private report({ outcome }: CatchUpEnd): void {
    clearTimeout(this.timer);
    this.sayingInGoogleDrive.set(outcome === 'in Google Drive');
    this.pointingToSettings.set(outcome === 'gone wrong' && !this.settings.open());

    if (outcome === 'in Google Drive') {
      this.timer = setTimeout(() => this.sayingInGoogleDrive.set(false), IN_GOOGLE_DRIVE_FOR_MS);
    }
  }
}
