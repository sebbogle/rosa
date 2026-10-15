import type { RxStorageInstanceReplicationState } from 'rxdb';
import type { RxReplicationState } from 'rxdb/plugins/replication';

const LOOK_AGAIN_MS = 50;

interface Arrivals {
  readonly down: number;
  readonly up: number;
}

function arrivalsAt<T>(state: RxStorageInstanceReplicationState<T>): Arrivals {
  return { down: state.stats.down.addNewTask, up: state.stats.up.processTasks };
}

function lookAgain(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, LOOK_AGAIN_MS));
}

export async function exchanged<T, C>(
  replication: RxReplicationState<T, C>,
  begin: () => unknown = () => replication.reSync(),
): Promise<boolean> {
  const state = replication.internalReplicationState;
  if (state === undefined) return false;

  const before = arrivalsAt(state);
  try {
    await begin();
  } catch {
    return false;
  }

  for (;;) {
    if (replication.isStoppedOrPaused()) return false;

    const { up, down } = state.streamQueue;
    const checkpoints = state.checkpointQueue;
    try {
      await Promise.all([up, down, checkpoints]);
    } catch {
      return false;
    }

    const after = arrivalsAt(state);
    const arrived = after.down > before.down && after.up > before.up;
    const settled =
      up === state.streamQueue.up &&
      down === state.streamQueue.down &&
      checkpoints === state.checkpointQueue;

    if (arrived && settled) return !replication.isStoppedOrPaused();
    if (!arrived) await lookAgain();
  }
}
