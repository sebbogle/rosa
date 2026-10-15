import type { DriveToken } from './drive-session';

const GSI_SCRIPT = 'https://accounts.google.com/gsi/client';

const DRIVE_FILE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

interface TokenResponse {
  readonly access_token?: string;
  readonly expires_in?: number;
}

interface TokenClient {
  requestAccessToken(overrides?: { prompt?: string }): void;
}

interface GoogleIdentity {
  readonly accounts: {
    readonly oauth2: {
      initTokenClient(config: {
        client_id: string;
        scope: string;
        callback: (response: TokenResponse) => void;
        error_callback: (error: unknown) => void;
      }): TokenClient;
    };
  };
}

let loading: Promise<GoogleIdentity | undefined> | undefined;

function loadIdentityServices(): Promise<GoogleIdentity | undefined> {
  loading ??= new Promise<GoogleIdentity | undefined>((resolve) => {
    const script = document.createElement('script');
    script.src = GSI_SCRIPT;
    script.async = true;

    const give = (identity: GoogleIdentity | undefined) => {
      if (identity === undefined) {
        loading = undefined;
        script.remove();
      }
      resolve(identity);
    };

    script.onload = () => give((window as { google?: GoogleIdentity }).google);
    script.onerror = () => give(undefined);
    document.head.append(script);
  });

  return loading;
}

export async function requestDriveToken(clientId: string): Promise<DriveToken | undefined> {
  const identity = await loadIdentityServices();
  if (identity === undefined) return undefined;

  return new Promise<DriveToken | undefined>((resolve) => {
    let settled = false;
    const settle = (granted: DriveToken | undefined) => {
      if (settled) return;
      settled = true;
      resolve(granted);
    };

    const client = identity.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: DRIVE_FILE_SCOPE,
      callback: (response) => {
        const { access_token: token, expires_in: seconds } = response;
        if (typeof token !== 'string' || typeof seconds !== 'number') {
          settle(undefined);
          return;
        }
        settle({ token, expiresAt: Date.now() + seconds * 1000 });
      },
      error_callback: () => settle(undefined),
    });

    client.requestAccessToken({ prompt: '' });
  });
}
