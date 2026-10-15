import type { BrowserContext, ConsoleMessage, WebError } from '@playwright/test';

interface Line {
  readonly level: string;
  readonly opening: string;
}

const EVERY_LOAD: readonly Line[] = [
  { level: 'warning', opening: 'Module "util" has been externalized' },
  { level: 'warning', opening: '-------------- RxDB dev-mode warning' },
  { level: 'warning', opening: '-------------- RxDB Open Core RxStorage' },
];

const FAILING = new Set(['error', 'warning']);

const FAILED_TO_LOAD = 'Failed to load resource: ';

const GOOGLE_API = 'www.googleapis.com';

const FRAME_URL = /[a-z][a-z0-9+.-]*:\/\/[^\s)]+?(?=(?::\d+)*\)?$)/m;

export interface Watch {
  readonly offences: readonly string[];
  letThroughFromGoogle(failure: string): void;
}

export function keepWatch(context: BrowserContext): Watch {
  const offences: string[] = [];
  const failures = new Set<string>();

  context.on('console', (message) => {
    const offence = consoleOffence(message, failures);
    if (offence) offences.push(offence);
  });

  context.on('weberror', (error) => offences.push(webOffence(error)));

  return {
    offences,
    letThroughFromGoogle: (failure) => {
      failures.add(failure);
    },
  };
}

function consoleOffence(
  message: ConsoleMessage,
  failures: ReadonlySet<string>,
): string | undefined {
  const level = message.type();
  const text = message.text();
  if (!FAILING.has(level)) return undefined;
  if (EVERY_LOAD.some((line) => line.level === level && text.startsWith(line.opening))) {
    return undefined;
  }
  if (level === 'error' && failedAtGoogleApi(message) && endsWithAny(text, failures)) {
    return undefined;
  }
  return `${level}: ${firstLine(text)} (${message.location().url || 'no source'})`;
}

function failedAtGoogleApi(message: ConsoleMessage): boolean {
  const { url } = message.location();
  return (
    message.text().startsWith(FAILED_TO_LOAD) &&
    URL.canParse(url) &&
    new URL(url).hostname === GOOGLE_API
  );
}

function endsWithAny(text: string, failures: ReadonlySet<string>): boolean {
  return [...failures].some((failure) => text.endsWith(failure));
}

function webOffence(web: WebError): string {
  const error = web.error();
  const frames = error.stack?.split('\n').slice(1).join('\n') ?? '';
  const url = FRAME_URL.exec(frames)?.[0] ?? web.page()?.url() ?? 'no source';
  return `weberror: ${firstLine(`${error.name}: ${error.message}`)} (${url})`;
}

function firstLine(text: string): string {
  return text.split('\n', 1)[0];
}
