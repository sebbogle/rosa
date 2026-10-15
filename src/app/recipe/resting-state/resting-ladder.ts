import { DriveState } from '../../drive/drive-ladder';

export type RestingCase =
  'fetching' | 'elsewhere' | 'not-found' | 'no-recipes' | 'no-match' | 'nothing-open';

export interface RestingFacts {
  readonly drive: DriveState;
  readonly awaiting: boolean;
  readonly missing: boolean;
  readonly empty: boolean;
  readonly nothingMatches: boolean;
}

export function restingCaseOf(facts: RestingFacts): RestingCase {
  if (facts.drive === 'fetching') return 'fetching';
  if (facts.awaiting) return 'elsewhere';
  if (facts.missing) return 'not-found';
  if (facts.empty) return 'no-recipes';
  if (facts.nothingMatches) return 'no-match';
  return 'nothing-open';
}

export interface RestingCopy {
  readonly line: string;
  readonly sentence: string;
  readonly control?: string;
}

export const RESTING_COPY: Record<RestingCase, RestingCopy> = {
  fetching: {
    line: 'Fetching your recipes.',
    sentence: 'This device is getting your cookbook from Google Drive.',
  },

  elsewhere: {
    line: 'Your recipes are in Google Drive.',
    sentence: 'This device does not have them all yet.',
    control: 'Sync with Drive',
  },

  'not-found': {
    line: 'That recipe is no longer in your cookbook.',
    sentence: 'It may have been deleted on another device.',
  },

  'no-recipes': {
    line: 'No recipes yet.',
    sentence: 'Recipes are written in rosa, and saved as you go.',
    control: 'Add new recipe',
  },

  'no-match': {
    line: 'Nothing matches.',
    sentence: 'Try fewer words.',
  },

  'nothing-open': {
    line: 'Nothing open.',
    sentence: 'Pick a recipe from the Contents.',
  },
};

export function restingControlOf(
  state: RestingCase,
  drive: DriveState,
  focused: boolean,
): string | undefined {
  const control = RESTING_COPY[state].control;
  if (state !== 'elsewhere') return control;

  return focused && drive === 'between hours' ? control : undefined;
}

export function restingInertOf(state: RestingCase, offline: boolean): boolean {
  return state === 'elsewhere' && offline;
}

export function restingHeldOf(state: RestingCase, acting: boolean): boolean {
  return state === 'elsewhere' && acting;
}
