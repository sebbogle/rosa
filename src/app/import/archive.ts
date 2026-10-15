const LOCAL_SIGNATURE = 0x04034b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const END_SIGNATURE = 0x06054b50;

const LOCAL_SIZE = 30;
const CENTRAL_SIZE = 46;
const END_SIZE = 22;

const STORED = 0;
const DEFLATED = 8;

const COMMENT_MAX = 0xffff;

const JSON_SUFFIX = '.json';
const RESOURCE_FORKS = '__MACOSX';
const APPLE_DOUBLE = '._';

type Bytes = Uint8Array<ArrayBuffer>;

export interface ArchiveMember {
  readonly name: string;
  text(): Promise<string>;
}

interface Entry {
  readonly name: string;
  readonly method: number;
  readonly compressed: number;
  readonly at: number;
}

interface Directory {
  readonly count: number;
  readonly offset: number;
  readonly size: number;
}

const decoder = new TextDecoder();

export async function openArchive(file: File): Promise<readonly ArchiveMember[] | undefined> {
  let bytes: Bytes;

  try {
    bytes = new Uint8Array(await file.arrayBuffer());
  } catch {
    return undefined;
  }

  const entries = entriesOf(bytes);
  if (entries === undefined) return undefined;

  return entries.filter(isCandidate).map((entry) => ({
    name: entry.name,
    text: () => bodyOf(bytes, entry),
  }));
}

function isCandidate(entry: Entry): boolean {
  const segments = entry.name.split('/');
  const basename = segments[segments.length - 1];

  if (!basename.toLowerCase().endsWith(JSON_SUFFIX)) return false;
  if (basename.startsWith(APPLE_DOUBLE)) return false;

  return !segments.includes(RESOURCE_FORKS);
}

function entriesOf(bytes: Bytes): Entry[] | undefined {
  const directory = directoryOf(bytes);
  if (directory === undefined) return undefined;

  const view = new DataView(bytes.buffer);
  const entries: Entry[] = [];
  let at = directory.offset;

  for (let read = 0; read < directory.count; read++) {
    if (at + CENTRAL_SIZE > bytes.length) return undefined;
    if (view.getUint32(at, true) !== CENTRAL_SIGNATURE) return undefined;

    const nameLength = view.getUint16(at + 28, true);
    const extraLength = view.getUint16(at + 30, true);
    const commentLength = view.getUint16(at + 32, true);
    const name = bytes.subarray(at + CENTRAL_SIZE, at + CENTRAL_SIZE + nameLength);

    entries.push({
      name: decoder.decode(name),
      method: view.getUint16(at + 10, true),
      compressed: view.getUint32(at + 20, true),
      at: view.getUint32(at + 42, true),
    });

    at += CENTRAL_SIZE + nameLength + extraLength + commentLength;
  }

  if (at !== directory.offset + directory.size) return undefined;

  return entries;
}

function directoryOf(bytes: Bytes): Directory | undefined {
  const view = new DataView(bytes.buffer);
  const last = bytes.length - END_SIZE;

  for (let at = last; at >= Math.max(0, last - COMMENT_MAX); at--) {
    if (view.getUint32(at, true) !== END_SIGNATURE) continue;
    if (view.getUint16(at + 20, true) !== last - at) continue;

    const offset = view.getUint32(at + 16, true);
    const size = view.getUint32(at + 12, true);

    if (offset + size > at) continue;

    return { count: view.getUint16(at + 10, true), offset, size };
  }

  return undefined;
}

async function bodyOf(bytes: Bytes, entry: Entry): Promise<string> {
  const view = new DataView(bytes.buffer);

  if (entry.at + LOCAL_SIZE > bytes.length) throw new Error('no local header');
  if (view.getUint32(entry.at, true) !== LOCAL_SIGNATURE) throw new Error('no local header');

  const nameLength = view.getUint16(entry.at + 26, true);
  const extraLength = view.getUint16(entry.at + 28, true);
  const from = entry.at + LOCAL_SIZE + nameLength + extraLength;
  const to = from + entry.compressed;

  if (to > bytes.length) throw new Error('member runs past the end of the archive');

  const body = bytes.subarray(from, to);

  if (entry.method === STORED) return decoder.decode(body);
  if (entry.method === DEFLATED) return decoder.decode(await inflated(body));

  throw new Error(`compression method ${entry.method}`);
}

function inflated(body: Bytes): Promise<ArrayBuffer> {
  const stream = new Blob([body]).stream().pipeThrough(new DecompressionStream('deflate-raw'));

  return new Response(stream).arrayBuffer();
}
