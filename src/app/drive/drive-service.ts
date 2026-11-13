import { Injectable, Signal, computed, signal } from '@angular/core';
import type { RxGoogleDriveReplicationState } from 'rxdb/plugins/replication-google-drive';
import {
  Clearing,
  FOLDER_PATH,
  clearRosasFolder,
  deleteFolder,
  rosasFolders,
  whatBecameOf,
} from './drive-api';
import { errorKindOf } from './drive-errors';
import { DriveFacts, DriveState, Gone, awaitingCookbookOf, driveStateOf } from './drive-ladder';
import { loadDrivePlugin } from './drive-plugin';
import { cookbook } from '../recipe/cookbook';
import { Recipe } from '../recipe/recipe';
import { recipeStateOf } from '../recipe/recipe-schema';
import { persisted, presence } from '../shell/shelf';
import {
  DRIVE_CONFIGURED,
  DriveSession,
  DriveToken,
  FolderIdentity,
  folderIdentityIn,
} from './drive-session';
import { exchanged } from './exchange';
import { dropReplicationMeta } from './replication-meta';
import { unsentChanges } from './unsent-changes';

const REPLICATION_IDENTIFIER = 'rosa-drive';

const PENDING_AFTER_MS = 30_000;

const PUSH_BATCH_SIZE = 50;

const BUILD_RETRY_MS = 5_000;

export type CatchUpOutcome = 'in Google Drive' | 'gone wrong' | 'cut short';

export interface CatchUpEnd {
  readonly outcome: CatchUpOutcome;
}

export type ClearOutcome = 'gone' | 'still there' | 'unanswered';

export interface ClearEnd {
  readonly outcome: ClearOutcome;
}

type Asking = 'sync' | 'clear' | 'put back';

@Injectable({ providedIn: 'root' })
export class DriveService {
  private readonly collection = cookbook().recipes;

  readonly available = DRIVE_CONFIGURED;

  private replication: RxGoogleDriveReplicationState<Recipe> | undefined;

  private readonly usedHere = persisted<boolean>({
    key: 'rosa.drive-used',
    shape: presence,
    called: 'that this device has used Drive',
    fallback: false,
  });

  private readonly session = new DriveSession(() => this.quiet());

  private readonly running = signal(false);

  private readonly fetched = persisted<boolean>({
    key: 'rosa.drive-fetched',
    shape: presence,
    called: 'that the cookbook has arrived',
    fallback: false,
  });

  private readonly rememberedFolder = persisted<FolderIdentity>({
    key: 'rosa.drive-folder',
    shape: folderIdentityIn,
    called: 'which Drive folder it is looking at',
    acrossTabs: true,
  });

  private readonly broke = signal(false);

  private readonly gone = signal<Gone | undefined>(undefined);

  private readonly disconnected = signal(!navigator.onLine);

  private readonly waiting = signal(false);

  private readonly asking = signal<Asking | undefined>(undefined);

  private readonly catchUpFor = signal<DriveToken | undefined>(undefined);

  private readonly lastEnd = signal<CatchUpEnd | undefined>(undefined);

  private readonly clearingDrive = signal(false);

  private readonly lastClear = signal<ClearEnd | undefined>(undefined);

  private found: FolderIdentity | undefined;

  private starting: Promise<boolean> | undefined;

  private settling: { readonly timer: ReturnType<typeof setTimeout> } | undefined;

  readonly offline = this.disconnected.asReadonly();

  readonly acting = computed(() => this.asking() !== undefined || this.clearingDrive());

  readonly askingToSync = computed(() => this.asking() === 'sync');

  readonly catchingUp = computed(() => this.catchUpFor() !== undefined);

  readonly ended = this.lastEnd.asReadonly();

  readonly clearEnded = this.lastClear.asReadonly();

  private readonly facts = computed<DriveFacts>(() => ({
    used: this.used(),
    tokenValid: this.session.token() !== undefined,
    gone: this.gone(),
    broken: this.broke(),
    offline: this.disconnected(),
    fetched: this.fetched(),
    catchingUp: this.catchingUp(),
    waiting: this.waiting(),
  }));

  readonly used = computed(() => this.available && this.usedHere());

  readonly address = computed(() => (this.used() ? this.session.address() : undefined));

  readonly clearable = computed(() => this.used() && this.facts().gone === undefined);

  readonly clearAsksGoogle = computed(() => this.clearable() && this.session.token() === undefined);

  readonly state: Signal<DriveState> = computed(() => driveStateOf(this.facts()));

  readonly awaitingCookbook = computed(() => awaitingCookbookOf(this.facts()));

  readonly unsent = unsentChanges(
    this.collection,
    REPLICATION_IDENTIFIER,
    computed(() => this.state() === 'token expired'),
  );

  start(): void {
    if (!this.available) return;
    if (!this.used()) this.session.forget();

    document.addEventListener('visibilitychange', () => this.onVisible());
    window.addEventListener('online', () => this.reachable(true));
    window.addEventListener('offline', () => this.reachable(false));

    this.collection.$.subscribe(() => this.watchSettling());

    this.session.arm();
    void this.ensureReplicating();
  }

  async sync(): Promise<void> {
    if (this.broke() || this.gone() !== undefined || this.clearingDrive()) return;

    const wasUsed = this.used();
    const granted = await this.askGoogle('sync');
    if (granted === undefined || (wasUsed && !this.used())) return;

    this.catchUpFor.set(granted);
    this.hold(granted);

    let inGoogleDrive = false;
    try {
      inGoogleDrive = await this.catchUp(granted);
    } catch (error) {
      this.classify(error);
    } finally {
      if (this.catchUpFor() === granted) this.endCatchUp(inGoogleDrive);
    }
  }

  disconnect(): void {
    if (!this.used()) return;

    this.usedHere.set(false);
    this.session.end();

    this.gone.set(undefined);

    this.quiet();
  }

  async clearDrive(): Promise<void> {
    if (this.clearingDrive()) return;

    this.clearingDrive.set(true);
    let outcome: ClearOutcome = 'still there';
    try {
      outcome = await this.clear();
    } finally {
      this.clearingDrive.set(false);
      this.lastClear.set({ outcome });
    }
  }

  private async clear(): Promise<ClearOutcome> {
    if (!this.clearable()) return 'still there';

    const held = this.session.token();
    const clearing =
      held === undefined ? await this.clearWithoutToken() : await this.clearWithToken(held);
    if (clearing === undefined) return 'unanswered';
    if (clearing !== 'gone') return 'still there';

    await this.forgetFolder();
    return 'gone';
  }

  private async clearWithToken(held: DriveToken): Promise<Clearing> {
    if (this.found === undefined) await this.starting;

    const found = this.found;

    const clearing =
      found === undefined
        ? await clearRosasFolder(held.token, this.rememberedFolder())
        : await deleteFolder(held.token, found.folderId);
    if (clearing === 'expired') this.session.expire();
    return clearing;
  }

  private async clearWithoutToken(): Promise<Clearing | undefined> {
    const granted = await this.askGoogle('clear');
    if (granted === undefined) return undefined;

    return clearRosasFolder(granted.token, this.rememberedFolder());
  }

  private async forgetFolder(): Promise<void> {
    const replication = this.replication;
    try {
      if (replication === undefined) {
        await dropReplicationMeta(this.collection, REPLICATION_IDENTIFIER);
      } else {
        replication.signalingState?.close();
        await replication.remove();
      }
    } catch (error) {
      console.warn('rosa cleared its Drive folder but could not drop the checkpoint.', error);
    }

    this.replication = undefined;
    this.found = undefined;
    this.rememberedFolder.set(undefined);

    this.disconnect();
  }

  private async askGoogle(why: Asking): Promise<DriveToken | undefined> {
    if (this.asking() !== undefined || this.disconnected()) return undefined;

    this.asking.set(why);
    try {
      return await this.session.ask();
    } finally {
      this.asking.set(undefined);
    }
  }

  private hold(granted: DriveToken): void {
    this.usedHere.set(true);
    this.session.hold(granted);
  }

  private async catchUp(granted: DriveToken): Promise<boolean> {
    if (this.starting !== undefined) return this.starting;

    const replication = this.replication;
    const resuming = replication !== undefined && (await this.canResume(granted));
    if (this.session.token() !== granted || this.replication !== replication) return false;

    if (replication !== undefined && resuming) {
      replication.googleDrive.authToken = granted.token;
      return this.live(replication, () => replication.start());
    }

    if (replication !== undefined) await this.letGo(replication);
    return this.ensureReplicating();
  }

  private async canResume(granted: DriveToken): Promise<boolean> {
    const found = this.found;
    if (found === undefined || found.identifier !== this.rememberedFolder()?.identifier) {
      return false;
    }

    const folders = await rosasFolders(granted.token);
    return folders === undefined || folders.includes(found.folderId);
  }

  private async letGo(replication: RxGoogleDriveReplicationState<Recipe>): Promise<void> {
    this.replication = undefined;
    this.found = undefined;

    try {
      await replication.cancel();
    } catch (error) {
      console.warn('rosa could not stop syncing with a folder it no longer looks at.', error);
    }
  }

  private live(
    replication: RxGoogleDriveReplicationState<Recipe>,
    begin?: () => Promise<void>,
  ): Promise<boolean> {
    this.running.set(true);
    const exchange = exchanged(replication, begin);
    void this.markFirstPull(exchange);

    this.watchSettling();
    return exchange;
  }

  private reachable(online: boolean): void {
    this.disconnected.set(!online);
    if (online) void this.ensureReplicating();
  }

  private onVisible(): void {
    if (document.visibilityState !== 'visible') return;

    this.session.arm();
    if (this.session.token() === undefined) return;

    const replication = this.replication;
    if (replication !== undefined && this.running()) {
      void this.live(replication);
      return;
    }

    void this.ensureReplicating();
  }

  private async ensureReplicating(): Promise<boolean> {
    if (this.starting !== undefined) return this.starting;
    if (this.broke() || this.gone() !== undefined) return false;
    if (this.replication !== undefined) return false;

    if (this.session.token() === undefined) return false;

    this.starting = this.startReplicating();
    return this.starting;
  }

  private async startReplicating(): Promise<boolean> {
    try {
      const replication = await this.buildWhileHeld();
      if (replication === undefined) return false;

      await replication.startPromise;
      const holding = this.session.token();
      if (holding === undefined) {
        this.quiet();
        return false;
      }

      replication.googleDrive.authToken = holding.token;
      return this.live(replication);
    } finally {
      this.starting = undefined;
    }
  }

  private async buildWhileHeld(): Promise<RxGoogleDriveReplicationState<Recipe> | undefined> {
    for (;;) {
      const held = this.session.token();
      if (held === undefined) return undefined;

      const replication = await this.build(held);
      if (replication !== undefined || !this.mayBuildAgain()) return replication;

      await new Promise((retry) => setTimeout(retry, BUILD_RETRY_MS));
      if (!this.mayBuildAgain()) return undefined;
    }
  }

  private mayBuildAgain(): boolean {
    return (
      this.session.token() !== undefined &&
      !this.broke() &&
      this.gone() === undefined &&
      this.replication === undefined &&
      !this.disconnected() &&
      !this.clearingDrive()
    );
  }

  private async build(
    held: DriveToken,
  ): Promise<RxGoogleDriveReplicationState<Recipe> | undefined> {
    try {
      const { replicateGoogleDrive } = await loadDrivePlugin();
      const replication = await replicateGoogleDrive<Recipe>({
        replicationIdentifier: REPLICATION_IDENTIFIER,
        collection: this.collection,
        googleDrive: {
          oauthClientId: this.session.clientId,
          authToken: held.token,
          folderPath: FOLDER_PATH,
        },
        pull: { modifier: recipeStateOf },
        push: { batchSize: PUSH_BATCH_SIZE },
        toggleOnDocumentVisible: false,
      });

      this.replication = replication;

      replication.error$.subscribe((error) => this.classify(error));

      const gone = await this.whichFolder(replication);
      if (gone !== undefined) {
        this.gone.set(gone);
        this.quiet();
        return undefined;
      }

      return replication;
    } catch (error) {
      this.classify(error);
      return undefined;
    }
  }

  private async whichFolder(
    replication: RxGoogleDriveReplicationState<Recipe>,
  ): Promise<Gone | undefined> {
    const found: FolderIdentity = {
      identifier: replication.driveStructure.replicationIdentifier,
      folderId: replication.driveStructure.rootFolderId,
    };
    this.found = found;

    const remembered = this.rememberedFolder();
    if (remembered === undefined) {
      this.rememberedFolder.set(found);
      return undefined;
    }

    if (remembered.identifier === found.identifier) return undefined;

    return await whatBecameOf(replication.googleDrive.authToken, remembered.folderId);
  }

  async putThemBack(): Promise<void> {
    const replication = this.replication;
    const found = this.found;
    if (this.gone() !== 'cleared' || replication === undefined || found === undefined) return;
    if (this.clearingDrive()) return;

    if (this.session.token() === undefined) {
      const granted = await this.askGoogle('put back');
      if (granted === undefined) return;
      if (this.gone() !== 'cleared' || this.replication !== replication) return;

      this.hold(granted);
    }

    try {
      await replication.remove();
    } catch (error) {
      console.warn('rosa could not put the cookbook back in Google Drive.', error);
      return;
    }

    this.replication = undefined;

    this.rememberedFolder.set(found);
    this.gone.set(undefined);

    await this.ensureReplicating();
  }

  private async markFirstPull(exchange: Promise<boolean>): Promise<void> {
    if (this.fetched()) return;

    const arrived = await exchange;
    if (!arrived || this.fetched()) return;

    this.fetched.set(true);
  }

  private watchSettling(): void {
    const replication = this.replication;
    if (this.settling !== undefined || replication === undefined || !this.running()) return;

    const watch = { timer: setTimeout(() => this.waiting.set(true), PENDING_AFTER_MS) };
    this.settling = watch;

    void replication
      .awaitInSync()
      .catch(() => undefined)
      .then(() => {
        if (this.settling === watch) this.stopSettling();
      });
  }

  private stopSettling(): void {
    const watch = this.settling;
    this.settling = undefined;
    this.waiting.set(false);
    if (watch !== undefined) clearTimeout(watch.timer);
  }

  private classify(error: unknown): void {
    const kind = errorKindOf(error);

    if (kind === 'expired') this.session.expire();
    if (kind === 'fatal') this.breakDown(error);
  }

  private breakDown(error: unknown): void {
    console.error('rosa could not keep the cookbook in Drive.', error);
    this.broke.set(true);
    this.quiet();
  }

  private endCatchUp(inGoogleDrive: boolean): void {
    if (this.catchUpFor() === undefined) return;

    this.catchUpFor.set(undefined);
    this.lastEnd.set({ outcome: this.outcomeOf(inGoogleDrive) });
  }

  private outcomeOf(inGoogleDrive: boolean): CatchUpOutcome {
    if (inGoogleDrive) return 'in Google Drive';
    return this.broke() || this.gone() !== undefined ? 'gone wrong' : 'cut short';
  }

  private quiet(): void {
    this.running.set(false);
    this.endCatchUp(false);
    this.stopSettling();

    const replication = this.replication;
    if (replication === undefined) return;

    const stop = (): void => {
      void replication.pause();
      replication.signalingState?.close();
    };

    stop();
    void replication.startPromise.then(stop);
  }
}
