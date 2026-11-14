import { type BrowserContext, type Route, expect } from '@playwright/test';
import type { Recipe } from '../src/app/recipe/recipe';
import type { Device } from './device';
import type { Watch } from './watch';

const ACCOUNT = 'user@example.com';

const IDENTITY_SCRIPT = 'https://accounts.google.com/gsi/client';

const API = 'https://www.googleapis.com/**';

const GRANT = 'grantDriveAccess';

const IDENTITY = `window.google = { accounts: { oauth2: { initTokenClient: (client) => ({
  requestAccessToken: () => window.${GRANT}().then((granted) => client.callback(granted)),
}) } } };`;

const TOKEN_LIFETIME_S = 3600;

const PRECONDITION_FAILED = 'status of 412 (Precondition Failed)';

const UNAUTHORIZED = 'status of 401 (Unauthorized)';

const NOT_FOUND = 'status of 404 (Not Found)';

const QUIET_FOR_MS = 500;

const QUIET_WITHIN_MS = 10_000;

const MY_DRIVE = 'my-drive';

const FOLDER = 'application/vnd.google-apps.folder';

const DRIVE = 'rosa';

const DOCS = 'docs';

const SIGNALING = 'signaling';

const RXDB = 'rxdb.json';

const WAL = 'rxdb-wal.json';

const LOCK = 'transaction.json';

const DEFAULT_FIELDS = 'kind,id,name,mimeType';

const DEFAULT_PAGE_SIZE = 100;

const CONTROL_FILES: readonly string[] = [RXDB, LOCK, WAL];

const ONE_OF_EACH: Readonly<Record<string, number>> = Object.fromEntries(
  CONTROL_FILES.map((name) => [name, 1]),
);

const DOC_TYPE = 'application/json';

interface StoredFile {
  readonly id: string;
  readonly serial: number;
  readonly name: string;
  readonly mimeType: string;
  readonly parents: readonly string[];
  readonly createdTime: string;
  modifiedTime: string;
  content: string;
  version: number;
  trashed: boolean;
}

interface Metadata {
  readonly name: string;
  readonly mimeType: string | undefined;
  readonly parents: readonly string[] | undefined;
}

type Placed = Metadata & { readonly parents: readonly string[] };

type Stored = Recipe & { readonly _deleted?: boolean };

interface WalRow {
  readonly newDocumentState: Stored;
}

interface CopiesUsed {
  readonly oldest: readonly string[];
  readonly newer: readonly string[];
}

interface Stall {
  readonly until: Promise<void>;
  readonly release: () => void;
}

type Reply =
  | { readonly status: number; readonly json: unknown }
  | { readonly status: 200; readonly media: StoredFile }
  | { readonly status: 204 };

interface Asked {
  readonly params: URLSearchParams;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: Buffer;
  readonly id: string;
}

interface Endpoint {
  readonly method: string;
  readonly path: RegExp;
  readonly serve: (asked: Asked) => Reply | undefined;
}

type Match = (file: StoredFile) => boolean;

type Order = (a: StoredFile, b: StoredFile) => number;

interface Term {
  readonly kind: string;
  readonly pattern: RegExp;
  readonly match: (found: RegExpExecArray) => Match;
}

const NAME = String.raw`name = '((?:[^'\\]|\\.)*)'`;

const TERMS: readonly Term[] = [
  {
    kind: 'name',
    pattern: new RegExp(`^${NAME}$`),
    match:
      ([, name]) =>
      (file) =>
        file.name === unquote(name),
  },
  {
    kind: 'names',
    pattern: new RegExp(`^\\((${NAME}(?: or ${NAME})*)\\)$`),
    match: ([, names]) => {
      const wanted = [...names.matchAll(new RegExp(NAME, 'g'))].map(([, name]) => unquote(name));
      return (file) => wanted.includes(file.name);
    },
  },
  {
    kind: 'parent',
    pattern: /^'([^']+)' in parents$/,
    match:
      ([, parent]) =>
      (file) =>
        file.parents.includes(parentOf(parent)),
  },
  { kind: 'trashed', pattern: /^trashed = false$/, match: () => (file) => !file.trashed },
  {
    kind: 'mimeType',
    pattern: /^mimeType = '([^']+)'$/,
    match:
      ([, type]) =>
      (file) =>
        file.mimeType === type,
  },
  {
    kind: 'modifiedSince',
    pattern: /^modifiedTime >= '([^']+)'$/,
    match:
      ([, since]) =>
      (file) =>
        Date.parse(file.modifiedTime) >= Date.parse(since),
  },
];

const QUERIES: readonly string[] = [
  'name parent trashed',
  'name parent trashed mimeType',
  'parent trashed',
  'parent trashed modifiedSince',
  'names trashed parent',
];

const byCreation: Order = (a, b) => compare(a.createdTime, b.createdTime) || a.serial - b.serial;

const newestFirst: Order = (a, b) => byCreation(b, a);

const ORDERS = new Map<string, Order>([
  ['createdTime asc', byCreation],
  ['createdTime desc', newestFirst],
  [
    'modifiedTime asc,name asc',
    (a, b) => compare(a.modifiedTime, b.modifiedTime) || compare(a.name, b.name),
  ],
]);

export class GoogleDrive {
  readonly account = ACCOUNT;
  readonly oneOfEach = ONE_OF_EACH;
  private readonly files = new Files(ACCOUNT);
  private readonly watch: Watch;
  private readonly device: Device;
  private readonly accepted = new Set<string>();
  private issued = 0;
  private current: string | undefined;
  private requests = 0;
  private stalled: Stall | undefined;
  private armedAtTheLock: (() => void) | undefined;

  constructor(watch: Watch, device: Device) {
    this.watch = watch;
    this.device = device;
    watch.letThroughFromGoogle(PRECONDITION_FAILED);
  }

  get unrecognised(): readonly string[] {
    return this.files.unrecognised;
  }

  get asked(): number {
    return this.requests;
  }

  async answer(context: BrowserContext): Promise<void> {
    await context.exposeBinding(GRANT, () => this.grant());
    await context.route(IDENTITY_SCRIPT, (route) => this.identify(route));
    await context.route(API, (route) => this.serve(route));
  }

  expireToken(): void {
    this.watch.letThroughFromGoogle(UNAUTHORIZED);
    if (this.current !== undefined) this.accepted.delete(this.current);
  }

  clearedElsewhere(): void {
    this.watch.letThroughFromGoogle(NOT_FOUND);
    this.files.clear();
  }

  binnedElsewhere(): void {
    this.files.bin();
  }

  stall(): void {
    if (this.stalled !== undefined) return;

    let release = (): void => undefined;
    const until = new Promise<void>((resolve) => (release = resolve));
    this.stalled = { until, release };
  }

  resume(): void {
    this.stalled?.release();
    this.stalled = undefined;
  }

  stallAtTheLock(): Promise<void> {
    return new Promise((stalled) => (this.armedAtTheLock = stalled));
  }

  anotherDeviceWrites(recipe: Recipe): void {
    this.files.write(recipe);
  }

  anotherDeviceEdits(recipe: Recipe): void {
    this.files.rewrite({ ...recipe, _deleted: false });
  }

  anotherDeviceDeletes(recipe: Recipe): void {
    this.files.rewrite({ ...recipe, _deleted: true });
  }

  pileUp(copies: number): void {
    this.files.pileUp(copies);
  }

  controlFiles(): Readonly<Record<string, number>> {
    return this.files.controlFiles();
  }

  copiesUsed(): CopiesUsed {
    return this.files.copiesUsed();
  }

  async fallsQuiet(): Promise<void> {
    await expect
      .poll(() => this.files.quiet(), {
        message: 'Google Drive should fall quiet between transactions',
        timeout: QUIET_WITHIN_MS,
      })
      .toBe(true);
  }

  recipes(): readonly Recipe[] | undefined {
    return this.files.recipes(false);
  }

  titles(): readonly string[] | undefined {
    return this.recipes()?.map(({ title }) => title);
  }

  recipesInTheBin(): readonly Recipe[] | undefined {
    return this.files.recipes(true);
  }

  private grant(): { readonly access_token: string; readonly expires_in: number } {
    const token = `token-${++this.issued}`;
    this.accepted.add(token);
    this.current = token;
    return { access_token: token, expires_in: TOKEN_LIFETIME_S };
  }

  private async identify(route: Route): Promise<void> {
    if (this.device.offline) return route.abort('internetdisconnected');

    await route.fulfill({ status: 200, contentType: 'text/javascript', body: IDENTITY });
  }

  private async serve(route: Route): Promise<void> {
    this.requests += 1;
    const request = route.request();
    const armed = this.armedAtTheLock;
    if (armed !== undefined && this.files.readsTheLock(request.method(), request.url())) {
      this.stall();
      this.armedAtTheLock = undefined;
      armed();
    }

    await this.stalled?.until;
    if (this.device.offline) return route.abort('internetdisconnected');

    const headers = request.headers();
    const token = (headers['authorization'] ?? '').replace(/^Bearer /, '');

    const reply = this.accepted.has(token)
      ? this.files.serve(request.method(), request.url(), headers, request.postDataBuffer())
      : failure(401, 'Request had invalid authentication credentials.', 'authError');

    await route.fulfill(fulfilment(reply, headers['origin']));
  }
}

class Files {
  readonly unrecognised: string[] = [];
  private readonly stored = new Map<string, StoredFile>();
  private readonly filled = new Set<string>();
  private readonly endpoints: readonly Endpoint[];
  private made = 0;
  private lockTouched = 0;

  constructor(account: string) {
    this.endpoints = [
      {
        method: 'GET',
        path: /^\/drive\/v3\/about$/,
        serve: ({ params }) =>
          json(200, pick({ user: { emailAddress: account } }, params.get('fields'))),
      },
      { method: 'GET', path: /^\/drive\/v3\/files$/, serve: (asked) => this.list(asked) },
      { method: 'POST', path: /^\/drive\/v3\/files$/, serve: (asked) => this.createEmpty(asked) },
      {
        method: 'GET',
        path: /^\/drive\/v3\/files\/([^/]+)$/,
        serve: (asked) => this.readV3(asked),
      },
      {
        method: 'DELETE',
        path: /^\/drive\/v3\/files\/([^/]+)$/,
        serve: (asked) => this.delete(asked),
      },
      {
        method: 'GET',
        path: /^\/drive\/v2\/files\/([^/]+)$/,
        serve: (asked) => this.readV2(asked),
      },
      {
        method: 'PUT',
        path: /^\/upload\/drive\/v2\/files\/([^/]+)$/,
        serve: (asked) => this.fill(asked),
      },
      {
        method: 'POST',
        path: /^\/upload\/drive\/v3\/files$/,
        serve: (asked) => this.upload(asked),
      },
    ];
  }

  serve(
    method: string,
    url: string,
    headers: Readonly<Record<string, string>>,
    body: Buffer | null,
  ): Reply {
    const { pathname, searchParams } = new URL(url);

    const reply = attempt(() => {
      const endpoint = this.endpoints.find((it) => it.method === method && it.path.test(pathname));
      const id = decodeURIComponent(endpoint?.path.exec(pathname)?.[1] ?? '');
      return endpoint?.serve({ params: searchParams, headers, body: body ?? Buffer.alloc(0), id });
    });
    if (reply) return reply;

    this.unrecognised.push(`${method} ${url}`);
    return failure(500, `The fake Google Drive does not serve ${method} ${url}.`, 'unrecognised');
  }

  recipes(binned: boolean): readonly Recipe[] | undefined {
    const drive = this.find(DRIVE, MY_DRIVE, binned);
    if (drive === undefined) return undefined;

    const latest = new Map<string, Stored>();
    const docs = this.find(DOCS, drive.id, binned);
    for (const file of this.stored.values()) {
      if (docs === undefined || !file.parents.includes(docs.id) || file.content === '') continue;
      const doc = JSON.parse(file.content) as Stored;
      latest.set(doc.id, doc);
    }

    for (const { newDocumentState } of walRows(this.find(WAL, drive.id, binned))) {
      latest.set(newDocumentState.id, newDocumentState);
    }

    return [...latest.values()]
      .filter((doc) => doc._deleted !== true)
      .map(recipeOf)
      .sort((a, b) => compare(a.title, b.title));
  }

  clear(): void {
    const drive = this.find(DRIVE, MY_DRIVE);
    if (drive === undefined) throw new Error('Google Drive holds no folder of rosa’s to clear');

    this.remove(drive.id);
  }

  bin(): void {
    const drive = this.find(DRIVE, MY_DRIVE);
    if (drive === undefined) throw new Error('Google Drive holds no folder of rosa’s to bin');

    this.putInTheBin(drive);
  }

  write(recipe: Recipe): void {
    const drive = this.find(DRIVE, MY_DRIVE);
    const docs = drive === undefined ? this.layOut() : this.find(DOCS, drive.id);
    if (docs === undefined) throw new Error('Google Drive holds no folder of rosa’s to write into');

    this.make(
      { name: `${recipe.id}.json`, mimeType: DOC_TYPE, parents: [docs.id] },
      JSON.stringify({ ...recipe, _deleted: false } satisfies Stored),
    );
  }

  rewrite(doc: Stored): void {
    const drive = this.find(DRIVE, MY_DRIVE);
    const docs = drive && this.find(DOCS, drive.id);
    if (drive === undefined || docs === undefined) {
      throw new Error('Google Drive holds no folder of rosa’s to change a recipe in');
    }

    this.applyWal(drive, docs);
    const file = this.find(`${doc.id}.json`, docs.id);
    if (file === undefined) throw new Error(`Google Drive holds no ${doc.title} to change`);

    this.change(file, JSON.stringify(doc));
  }

  pileUp(copies: number): void {
    const drive = this.find(DRIVE, MY_DRIVE);
    if (drive === undefined) throw new Error('Google Drive holds no folder of rosa’s to clutter');

    for (let copy = 0; copy < copies; copy += 1) {
      for (const name of CONTROL_FILES) {
        this.make({ name, mimeType: DOC_TYPE, parents: [drive.id] }, '');
      }
    }
  }

  controlFiles(): Readonly<Record<string, number>> {
    return Object.fromEntries(CONTROL_FILES.map((name) => [name, this.copies(name).length]));
  }

  copiesUsed(): CopiesUsed {
    const used = (file: StoredFile) => this.filled.has(file.id) || file.content !== '';
    const oldest: string[] = [];
    const newer: string[] = [];
    for (const name of CONTROL_FILES) {
      const [first, ...rest] = this.copies(name);
      if (first !== undefined && this.filled.has(first.id)) oldest.push(name);
      if (rest.some(used)) newer.push(name);
    }

    return { oldest, newer };
  }

  readsTheLock(method: string, url: string): boolean {
    const lock = this.lock();
    const { pathname, searchParams } = new URL(url);

    return (
      lock !== undefined &&
      method === 'GET' &&
      pathname === `/drive/v2/files/${lock.id}` &&
      searchParams.get('alt') === 'media'
    );
  }

  quiet(): boolean {
    const lock = this.lock();
    const held = lock !== undefined && lock.content !== '';
    return !held && Date.now() - this.lockTouched >= QUIET_FOR_MS;
  }

  private lock(): StoredFile | undefined {
    const drive = this.find(DRIVE, MY_DRIVE);
    return drive && this.find(LOCK, drive.id);
  }

  private list({ params }: Asked): Reply | undefined {
    const matches = query(params.get('q') ?? '');
    const orderBy = params.get('orderBy');
    const order = orderBy === null ? newestFirst : ORDERS.get(orderBy);
    if (matches === undefined || order === undefined) return undefined;

    const fields = params.get('fields') ?? '';
    const from = Number(params.get('pageToken') ?? 0);
    const size = Number(params.get('pageSize') ?? DEFAULT_PAGE_SIZE);
    const all = [...this.stored.values()].filter(matches).sort(order);
    const files = all
      .slice(from, from + size)
      .map((file) => pick(v3(file), /files\(([^)]*)\)/.exec(fields)?.[1] ?? DEFAULT_FIELDS));

    const more = from + size < all.length && fields.includes('nextPageToken');
    return json(200, more ? { files, nextPageToken: String(from + size) } : { files });
  }

  private createEmpty({ params, body }: Asked): Reply {
    return this.create(metadataOf(JSON.parse(body.toString('utf8'))), '', params);
  }

  private readV3({ params, id }: Asked): Reply {
    const file = this.stored.get(id);
    if (file === undefined) return notFound(id);

    if (params.get('alt') !== 'media') {
      return json(200, pick(v3(file), params.get('fields') ?? DEFAULT_FIELDS));
    }

    return file.mimeType === FOLDER
      ? failure(403, 'Only files with binary content can be downloaded.', 'fileNotDownloadable')
      : { status: 200, media: file };
  }

  private delete({ id }: Asked): Reply {
    if (!this.stored.has(id)) return notFound(id);

    this.remove(id);
    return { status: 204 };
  }

  private readV2({ params, id }: Asked): Reply {
    const file = this.stored.get(id);
    if (file === undefined) return notFound(id);
    this.touch(file);

    return params.get('alt') === 'media'
      ? { status: 200, media: file }
      : json(200, pick(v2(file), params.get('fields')));
  }

  private fill({ params, headers, body, id }: Asked): Reply | undefined {
    const expected = headers['if-match'];
    if (params.get('uploadType') !== 'media' || expected === undefined) return undefined;

    const file = this.stored.get(id);
    if (file === undefined) return notFound(id);
    this.touch(file);

    if (expected !== etagOf(file)) return failure(412, 'Precondition Failed', 'conditionNotMet');

    this.change(file, body.toString('utf8'));
    this.filled.add(file.id);
    return json(200, pick(v2(file), params.get('fields')));
  }

  private upload({ params, headers, body }: Asked): Reply | undefined {
    if (params.get('uploadType') !== 'multipart') return undefined;

    const parts = multipart(headers['content-type'] ?? '', body);
    if (parts === undefined) return undefined;

    return this.create(parts.metadata, parts.content, params);
  }

  private create(metadata: Metadata, content: string, params: URLSearchParams): Reply {
    const within = (metadata.parents ?? ['root']).map(parentOf);
    const missing = within.find((parent) => parent !== MY_DRIVE && !this.stored.has(parent));
    if (missing !== undefined) return notFound(missing);

    const file = this.make({ ...metadata, parents: within }, content);
    return json(200, pick(v3(file), params.get('fields') ?? DEFAULT_FIELDS));
  }

  private make({ name, mimeType, parents }: Placed, content: string): StoredFile {
    const at = new Date().toISOString();
    const serial = ++this.made;
    const file: StoredFile = {
      id: `file-${serial}`,
      serial,
      name,
      mimeType: mimeType ?? 'application/octet-stream',
      parents,
      createdTime: at,
      modifiedTime: at,
      content,
      version: 1,
      trashed: false,
    };

    this.stored.set(file.id, file);
    return file;
  }

  private layOut(): StoredFile {
    const drive = this.make({ name: DRIVE, mimeType: FOLDER, parents: [MY_DRIVE] }, '');
    const within = [drive.id];

    this.make(
      { name: RXDB, mimeType: DOC_TYPE, parents: within },
      JSON.stringify({ replicationIdentifier: 'another-device' }),
    );
    const docs = this.make({ name: DOCS, mimeType: FOLDER, parents: within }, '');
    this.make({ name: SIGNALING, mimeType: FOLDER, parents: within }, '');
    this.make({ name: LOCK, mimeType: DOC_TYPE, parents: within }, '');
    this.make({ name: WAL, mimeType: DOC_TYPE, parents: within }, '');

    return docs;
  }

  private applyWal(drive: StoredFile, docs: StoredFile): void {
    const wal = this.find(WAL, drive.id);
    const rows = walRows(wal);
    if (wal === undefined || rows.length === 0) return;

    for (const { newDocumentState } of rows) {
      const content = JSON.stringify(newDocumentState);
      const file = this.find(`${newDocumentState.id}.json`, docs.id);
      if (file === undefined) {
        this.make(
          { name: `${newDocumentState.id}.json`, mimeType: DOC_TYPE, parents: [docs.id] },
          content,
        );
      } else {
        this.change(file, content);
      }
    }

    this.change(wal, '');
  }

  private change(file: StoredFile, content: string): void {
    file.content = content;
    file.version += 1;
    file.modifiedTime = new Date().toISOString();
  }

  private touch(file: StoredFile): void {
    if (file.name === LOCK) this.lockTouched = Date.now();
  }

  private remove(id: string): void {
    this.stored.delete(id);
    for (const file of [...this.stored.values()]) {
      if (file.parents.includes(id)) this.remove(file.id);
    }
  }

  private putInTheBin(file: StoredFile): void {
    file.trashed = true;
    for (const within of this.stored.values()) {
      if (within.parents.includes(file.id)) this.putInTheBin(within);
    }
  }

  private copies(name: string): readonly StoredFile[] {
    const drive = this.find(DRIVE, MY_DRIVE);
    if (drive === undefined) return [];

    return [...this.stored.values()]
      .filter((file) => file.name === name && file.parents.includes(drive.id) && !file.trashed)
      .sort(byCreation);
  }

  private find(name: string, parent: string, binned = false): StoredFile | undefined {
    return [...this.stored.values()]
      .filter(
        (file) => file.name === name && file.parents.includes(parent) && file.trashed === binned,
      )
      .sort(byCreation)[0];
  }
}

function query(q: string): Match | undefined {
  const kinds: string[] = [];
  const matches: Match[] = [];
  for (const clause of q.split(' and ')) {
    const term = TERMS.find(({ pattern }) => pattern.test(clause));
    const found = term?.pattern.exec(clause);
    if (!term || !found) return undefined;
    kinds.push(term.kind);
    matches.push(term.match(found));
  }

  if (!QUERIES.includes(kinds.join(' '))) return undefined;
  return (file) => matches.every((match) => match(file));
}

function walRows(wal: StoredFile | undefined): readonly WalRow[] {
  const content = wal?.content.trim() ?? '';
  return content === '' ? [] : (JSON.parse(content) as readonly WalRow[]);
}

function pick(resource: Record<string, unknown>, fields: string | null): Record<string, unknown> {
  if (fields === null) return resource;

  const wanted = fields.split(',').map((field) => field.trim().replace(/\(.*$/, ''));
  return Object.fromEntries(
    wanted
      .filter((field) => resource[field] !== undefined)
      .map((field) => [field, resource[field]]),
  );
}

function v3(file: StoredFile): Record<string, unknown> {
  return {
    kind: 'drive#file',
    id: file.id,
    name: file.name,
    mimeType: file.mimeType,
    parents: file.parents,
    trashed: file.trashed,
    createdTime: file.createdTime,
    modifiedTime: file.modifiedTime,
    size: sizeOf(file),
  };
}

function v2(file: StoredFile): Record<string, unknown> {
  return {
    kind: 'drive#file',
    id: file.id,
    etag: etagOf(file),
    title: file.name,
    mimeType: file.mimeType,
    fileSize: sizeOf(file),
    createdDate: file.createdTime,
    modifiedDate: file.modifiedTime,
    parents: file.parents.map((id) => ({ id })),
    labels: { trashed: file.trashed },
  };
}

function sizeOf(file: StoredFile): string | undefined {
  return file.mimeType === FOLDER ? undefined : String(Buffer.byteLength(file.content));
}

function etagOf(file: StoredFile): string {
  return `"${file.id}/${file.version}"`;
}

function multipart(
  contentType: string,
  body: Buffer,
): { readonly metadata: Metadata; readonly content: string } | undefined {
  const boundary = /boundary="?([^";]+)"?/.exec(contentType)?.[1];
  if (boundary === undefined) return undefined;

  const parts = body
    .toString('utf8')
    .split(`--${boundary}`)
    .map((part) => part.replace(/^\r\n/, ''))
    .filter((part) => part !== '' && !part.startsWith('--'))
    .map((part) => part.slice(part.indexOf('\r\n\r\n') + 4).replace(/\r\n$/, ''));
  if (parts.length !== 2) return undefined;

  const [metadata, content] = parts;
  return { metadata: metadataOf(JSON.parse(metadata)), content };
}

function metadataOf(value: unknown): Metadata {
  const { name, mimeType, parents } = (value ?? {}) as Record<string, unknown>;
  const listed = Array.isArray(parents) && parents.every((parent) => typeof parent === 'string');
  if (
    typeof name !== 'string' ||
    (mimeType !== undefined && typeof mimeType !== 'string') ||
    (parents !== undefined && !listed)
  ) {
    throw new Error(`not file metadata: ${JSON.stringify(value)}`);
  }
  return { name, mimeType, parents: parents as readonly string[] | undefined };
}

function recipeOf(doc: Stored): Recipe {
  return Object.fromEntries(
    Object.entries(doc).filter(([key]) => !key.startsWith('_')),
  ) as unknown as Recipe;
}

function json(status: number, body: unknown): Reply {
  return { status, json: body };
}

function failure(status: number, message: string, reason: string): Reply {
  return json(status, {
    error: { code: status, message, errors: [{ message, domain: 'global', reason }] },
  });
}

function notFound(id: string): Reply {
  return failure(404, `File not found: ${id}.`, 'notFound');
}

function fulfilment(
  reply: Reply,
  origin: string | undefined,
): { status: number; headers: Record<string, string>; body: string } {
  const headers = {
    'access-control-allow-origin': origin ?? '*',
    'access-control-expose-headers': 'Date',
    vary: 'Origin',
    date: new Date().toUTCString(),
  };

  if ('media' in reply) {
    return {
      status: reply.status,
      headers: { ...headers, 'content-type': reply.media.mimeType },
      body: reply.media.content,
    };
  }

  if ('json' in reply) {
    return {
      status: reply.status,
      headers: { ...headers, 'content-type': 'application/json; charset=UTF-8' },
      body: JSON.stringify(reply.json),
    };
  }

  return { status: reply.status, headers, body: '' };
}

function attempt<T>(serve: () => T): T | undefined {
  try {
    return serve();
  } catch {
    return undefined;
  }
}

function parentOf(id: string): string {
  return id === 'root' ? MY_DRIVE : id;
}

function unquote(quoted: string): string {
  return quoted.replace(/\\(.)/g, '$1');
}

function compare(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}
