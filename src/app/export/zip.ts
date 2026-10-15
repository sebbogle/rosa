const LOCAL_SIGNATURE = 0x04034b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const END_SIGNATURE = 0x06054b50;

const LOCAL_SIZE = 30;
const CENTRAL_SIZE = 46;
const END_SIZE = 22;

const STORED = 0;
const NEEDED = 10;
const MADE_BY = 0x0014;
const UTF8_NAMES = 0x0800;

const DOS_EPOCH = 1980;

const ZIP_TYPE = 'application/zip';

type Bytes = Uint8Array<ArrayBuffer>;

export interface Member {
  readonly name: string;
  readonly body: string;
}

interface Stamp {
  readonly time: number;
  readonly date: number;
}

const encoder = new TextEncoder();

let table: Uint32Array | undefined;

export function storedZip(members: readonly Member[]): Blob {
  const stamp = stampOf(new Date());
  const entries: Bytes[] = [];
  const directory: Bytes[] = [];
  let offset = 0;

  for (const member of members) {
    const name = encoder.encode(member.name);
    const body = encoder.encode(member.body);
    const crc = crc32(body);

    entries.push(localHeader(name, body, crc, stamp), name, body);
    directory.push(centralHeader(name, body, crc, stamp, offset), name);
    offset += LOCAL_SIZE + name.length + body.length;
  }

  const catalogue = directory.reduce((total, part) => total + part.length, 0);
  const end = endOfDirectory(members.length, catalogue, offset);

  return new Blob([...entries, ...directory, end], { type: ZIP_TYPE });
}

function localHeader(name: Bytes, body: Bytes, crc: number, stamp: Stamp): Bytes {
  const header = new DataView(new ArrayBuffer(LOCAL_SIZE));

  header.setUint32(0, LOCAL_SIGNATURE, true);
  header.setUint16(4, NEEDED, true);
  header.setUint16(6, UTF8_NAMES, true);
  header.setUint16(8, STORED, true);
  header.setUint16(10, stamp.time, true);
  header.setUint16(12, stamp.date, true);
  header.setUint32(14, crc, true);
  header.setUint32(18, body.length, true);
  header.setUint32(22, body.length, true);
  header.setUint16(26, name.length, true);
  header.setUint16(28, 0, true);

  return new Uint8Array(header.buffer);
}

function centralHeader(name: Bytes, body: Bytes, crc: number, stamp: Stamp, offset: number): Bytes {
  const header = new DataView(new ArrayBuffer(CENTRAL_SIZE));

  header.setUint32(0, CENTRAL_SIGNATURE, true);
  header.setUint16(4, MADE_BY, true);
  header.setUint16(6, NEEDED, true);
  header.setUint16(8, UTF8_NAMES, true);
  header.setUint16(10, STORED, true);
  header.setUint16(12, stamp.time, true);
  header.setUint16(14, stamp.date, true);
  header.setUint32(16, crc, true);
  header.setUint32(20, body.length, true);
  header.setUint32(24, body.length, true);
  header.setUint16(28, name.length, true);
  header.setUint16(30, 0, true);
  header.setUint16(32, 0, true);
  header.setUint16(34, 0, true);
  header.setUint16(36, 0, true);
  header.setUint32(38, 0, true);
  header.setUint32(42, offset, true);

  return new Uint8Array(header.buffer);
}

function endOfDirectory(count: number, size: number, offset: number): Bytes {
  const record = new DataView(new ArrayBuffer(END_SIZE));

  record.setUint32(0, END_SIGNATURE, true);
  record.setUint16(4, 0, true);
  record.setUint16(6, 0, true);
  record.setUint16(8, count, true);
  record.setUint16(10, count, true);
  record.setUint32(12, size, true);
  record.setUint32(16, offset, true);
  record.setUint16(20, 0, true);

  return new Uint8Array(record.buffer);
}

function stampOf(at: Date): Stamp {
  return {
    time: (at.getHours() << 11) | (at.getMinutes() << 5) | (at.getSeconds() >> 1),
    date: ((at.getFullYear() - DOS_EPOCH) << 9) | ((at.getMonth() + 1) << 5) | at.getDate(),
  };
}

function crc32(bytes: Bytes): number {
  table ??= crcTable();

  let crc = 0xffffffff;
  for (const byte of bytes) crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function crcTable(): Uint32Array {
  const built = new Uint32Array(256);

  for (let index = 0; index < 256; index++) {
    let value = index;
    for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    built[index] = value;
  }

  return built;
}
