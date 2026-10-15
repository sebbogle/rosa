import type { Gone } from './drive-ladder';
import type { FolderIdentity } from './drive-session';

const DRIVE_API = 'https://www.googleapis.com/drive/v3';

export const FOLDER_PATH = 'rosa';

const FOLDER_TYPE = 'application/vnd.google-apps.folder';

type Answer<T> =
  { readonly ok: true; readonly value: T } | { readonly ok: false; readonly status: number };

async function ask<T>(
  token: string,
  failing: string,
  path: string,
  read: (body: unknown) => T,
  method: 'GET' | 'DELETE' = 'GET',
): Promise<Answer<T> | undefined> {
  try {
    const response = await fetch(`${DRIVE_API}${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return { ok: false, status: response.status };

    const body: unknown = method === 'GET' ? await response.json() : undefined;
    return { ok: true, value: read(body) };
  } catch (error) {
    console.warn(`rosa could not ${failing}.`, error);
    return undefined;
  }
}

function fateIn(body: unknown): Gone {
  const folder = body as { trashed?: boolean };
  return folder.trashed === true ? 'moved trashed' : 'moved renamed';
}

function folderIdsIn(body: unknown): readonly string[] {
  const listed = body as { files?: readonly { id?: unknown }[] };
  return (listed.files ?? []).flatMap(({ id }) => (typeof id === 'string' ? [id] : []));
}

function addressIn(body: unknown): string | undefined {
  const about = body as { user?: { emailAddress?: unknown } };
  const address = about.user?.emailAddress;
  return typeof address === 'string' && address !== '' ? address : undefined;
}

export async function whatBecameOf(token: string, folderId: string): Promise<Gone | undefined> {
  const answer = await ask(
    token,
    'tell what became of its Drive folder',
    `/files/${encodeURIComponent(folderId)}?fields=trashed`,
    fateIn,
  );
  if (answer === undefined) return undefined;
  if (!answer.ok) return answer.status === 404 ? 'cleared' : undefined;

  return answer.value;
}

export type Clearing = 'gone' | 'expired' | 'failed';

export async function deleteFolder(token: string, folderId: string): Promise<Clearing> {
  const answer = await ask(
    token,
    'clear its folder from Google Drive',
    `/files/${encodeURIComponent(folderId)}`,
    () => undefined,
    'DELETE',
  );
  if (answer === undefined) return 'failed';
  if (answer.ok) return 'gone';

  return answer.status === 401 ? 'expired' : 'failed';
}

export async function rosasFolders(token: string): Promise<readonly string[] | undefined> {
  const query = `name = '${FOLDER_PATH}' and 'root' in parents and trashed = false and mimeType = '${FOLDER_TYPE}'`;
  const answer = await ask(
    token,
    'look for its folder in Google Drive',
    `/files?fields=files(id)&orderBy=createdTime asc&q=${encodeURIComponent(query)}`,
    folderIdsIn,
  );
  if (answer === undefined || !answer.ok) return undefined;

  return answer.value;
}

export async function clearRosasFolder(
  token: string,
  remembered: FolderIdentity | undefined,
): Promise<Clearing> {
  const folders = await rosasFolders(token);
  if (folders === undefined) return 'failed';

  const folderId = remembered?.folderId ?? folders[0];
  if (folderId === undefined) return 'gone';
  if (folders.includes(folderId)) return deleteFolder(token, folderId);

  return (await whatBecameOf(token, folderId)) === 'cleared' ? 'gone' : 'failed';
}

export async function whoseDrive(token: string): Promise<string | undefined> {
  const answer = await ask(
    token,
    'tell which Google account it is connected to',
    '/about?fields=user(emailAddress)',
    addressIn,
  );
  if (answer === undefined || !answer.ok) return undefined;

  return answer.value;
}
