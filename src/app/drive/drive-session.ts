import { Signal } from '@angular/core';
import { Shape, persisted, textIn } from '../shell/shelf';
import { whoseDrive } from './drive-api';
import { requestDriveToken } from './google-identity';

const CLIENT_ID = import.meta.env.NG_APP_GOOGLE_CLIENT_ID || undefined;

export const DRIVE_CONFIGURED = CLIENT_ID !== undefined;

const EXPIRY_MARGIN_MS = 60_000;

export interface DriveToken {
  readonly token: string;
  readonly expiresAt: number;
}

export interface FolderIdentity {
  readonly identifier: string;
  readonly folderId: string;
}

const driveTokenIn: Shape<DriveToken> = (value) => {
  if (typeof value !== 'object' || value === null) return undefined;

  const { token, expiresAt } = value as Partial<DriveToken>;
  if (typeof token !== 'string' || typeof expiresAt !== 'number') return undefined;

  return { token, expiresAt };
};

export const folderIdentityIn: Shape<FolderIdentity> = (value) => {
  if (typeof value !== 'object' || value === null) return undefined;

  const { identifier, folderId } = value as Partial<FolderIdentity>;
  if (typeof identifier !== 'string' || typeof folderId !== 'string') return undefined;

  return { identifier, folderId };
};

function oauthClientId(): string {
  if (CLIENT_ID === undefined) throw new Error('rosa reached Google Drive without a client id.');
  return CLIENT_ID;
}

export class DriveSession {
  private readonly held = persisted<DriveToken>({
    key: 'rosa.drive-token',
    shape: driveTokenIn,
    called: 'the Drive session',
  });

  private readonly shelvedAddress = persisted<string>({
    key: 'rosa.drive-address',
    shape: textIn,
    called: 'which Google account it is connected to',
  });

  private deadline: ReturnType<typeof setTimeout> | undefined;

  readonly token: Signal<DriveToken | undefined> = this.held.asReadonly();

  readonly address: Signal<string | undefined> = this.shelvedAddress.asReadonly();

  constructor(private readonly expired: () => void) {}

  get clientId(): string {
    return oauthClientId();
  }

  ask(): Promise<DriveToken | undefined> {
    return requestDriveToken(this.clientId);
  }

  hold(granted: DriveToken): void {
    this.held.set(granted);
    this.arm();

    void this.askWhoseDrive(granted);
  }

  arm(): void {
    this.disarm();

    const held = this.held();
    if (held === undefined) return;

    const wait = held.expiresAt - EXPIRY_MARGIN_MS - Date.now();
    if (wait <= 0) {
      this.expire();
      return;
    }

    this.deadline = setTimeout(() => this.expire(), wait);
  }

  forget(): void {
    this.disarm();
    this.held.set(undefined);
  }

  expire(): void {
    this.forget();
    this.expired();
  }

  end(): void {
    this.forget();
    this.shelvedAddress.set(undefined);
  }

  private disarm(): void {
    if (this.deadline === undefined) return;
    clearTimeout(this.deadline);
    this.deadline = undefined;
  }

  private async askWhoseDrive(granted: DriveToken): Promise<void> {
    const address = await whoseDrive(granted.token);
    if (address === undefined) return;

    if (this.held() !== granted) return;

    this.shelvedAddress.set(address);
  }
}
