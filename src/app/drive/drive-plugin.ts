type NextTick = (callback: (...args: unknown[]) => void, ...args: unknown[]) => void;

type DrivePlugin = typeof import('rxdb/plugins/replication-google-drive');

function installNodeGlobals(): void {
  const root = globalThis as unknown as Record<string, unknown>;

  root['global'] ??= globalThis;
  root['process'] ??= {};

  const node = root['process'] as { nextTick?: NextTick };
  node.nextTick ??= (callback, ...args) => queueMicrotask(() => callback(...args));
}

export async function loadDrivePlugin(): Promise<DrivePlugin> {
  installNodeGlobals();
  return import('rxdb/plugins/replication-google-drive');
}
