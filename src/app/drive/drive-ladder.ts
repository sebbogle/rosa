export type DriveState =
  | 'unused'
  | 'cleared'
  | 'moved renamed'
  | 'moved trashed'
  | 'broken'
  | 'between hours'
  | 'offline'
  | 'fetching'
  | 'syncing'
  | 'pending'
  | 'up to date';

export type Gone = 'cleared' | 'moved renamed' | 'moved trashed';

export interface DriveFacts {
  readonly used: boolean;
  readonly inTheHour: boolean;
  readonly gone: Gone | undefined;
  readonly broken: boolean;
  readonly offline: boolean;
  readonly fetched: boolean;
  readonly catchingUp: boolean;
  readonly waiting: boolean;
}

export function driveStateOf(facts: DriveFacts): DriveState {
  if (!facts.used) return 'unused';
  if (facts.gone !== undefined) return facts.gone;
  if (facts.broken) return 'broken';
  if (!facts.inTheHour) return 'between hours';
  if (facts.offline) return 'offline';
  if (!facts.fetched) return 'fetching';
  if (facts.catchingUp) return 'syncing';
  if (facts.waiting) return 'pending';
  return 'up to date';
}

export function awaitingCookbookOf(facts: DriveFacts): boolean {
  return facts.used && !facts.fetched;
}

export interface Speech {
  readonly line?: string;
  readonly button?: string;
}

export const SPEECH: Record<DriveState, Speech> = {
  unused: {
    button: 'Sync with Drive',
  },
  cleared: {
    line: 'Your recipes are still on this device, but they are no longer in Google Drive.',
    button: 'Put them back in Drive',
  },
  'moved renamed': {
    line: "rosa's folder in Google Drive was moved or renamed, so rosa has made a new, empty one.",
  },
  'moved trashed': {
    line: "rosa's folder is in your Google Drive bin, so rosa has made a new, empty one.",
  },
  broken: {
    line: 'Something went wrong with Google Drive, so rosa has stopped. Your recipes are safe on this device.',
  },
  'between hours': {
    button: 'Sync with Drive',
  },
  offline: {
    line: 'This device is offline. Your recipes will go to Google Drive when it is back.',
  },
  fetching: {
    line: 'rosa is getting your cookbook from Google Drive.',
  },
  syncing: {
    line: 'Syncing with Google Drive.',
  },
  pending: {
    line: 'Some of your recipes are not in Google Drive yet. rosa is still putting them there.',
  },
  'up to date': {
    line: 'Your recipes are in Google Drive.',
  },
};

function pressableOf(state: DriveState): boolean {
  return SPEECH[state].button !== undefined;
}

export function inertOf(state: DriveState, offline: boolean): boolean {
  return pressableOf(state) && offline;
}

export const UNREACHABLE = 'Unable to reach Google Drive.';

export const UNSENT = 'Unsent changes';
