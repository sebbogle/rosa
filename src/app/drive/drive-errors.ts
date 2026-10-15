import { PlainJsonError } from 'rxdb';

export type ErrorKind = 'expired' | 'ignorable' | 'fatal';

interface Cause {
  readonly name: string;
  readonly message: string;
  readonly status: number | undefined;
  readonly errorText: string;
}

function causesOf(error: unknown): readonly Cause[] {
  if (typeof error !== 'object' || error === null) {
    return [{ name: '', message: String(error), status: undefined, errorText: '' }];
  }

  const held = error as Partial<PlainJsonError>;
  const here: Cause = {
    name: typeof held.name === 'string' ? held.name : '',
    message: typeof held.message === 'string' ? held.message : '',
    status: held.parameters?.status,
    errorText: held.parameters?.errorText ?? '',
  };

  const nested = held.parameters?.errors ?? [];
  return [here, ...nested.flatMap((cause) => causesOf(cause))];
}

function unauthorised(cause: Cause): boolean {
  return cause.status === 401 || /\b401\b/.test(cause.message);
}

const RATE_LIMITED = /rateLimitExceeded/i;

function busy(cause: Cause): boolean {
  const status = cause.status;
  if (status === undefined) return false;
  if (status === 429 || status >= 500) return true;

  return status === 403 && RATE_LIMITED.test(cause.errorText);
}

function transient(cause: Cause): boolean {
  return cause.name === 'TypeError' || busy(cause);
}

function missing(cause: Cause): boolean {
  return cause.status === 404;
}

export function errorKindOf(error: unknown): ErrorKind {
  const causes = causesOf(error);

  if (causes.some(unauthorised)) return 'expired';

  if (!navigator.onLine || causes.some(transient) || causes.some(missing)) return 'ignorable';

  return 'fatal';
}
