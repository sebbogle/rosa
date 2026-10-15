const PREFIX = '/recipe/';

export function urlOf(id: string): string {
  return PREFIX + encodeURIComponent(id);
}

export function idOf(url: string): string | undefined {
  const path = url.split(/[?#]/)[0];
  if (!path.startsWith(PREFIX)) return undefined;

  const encoded = path.slice(PREFIX.length);
  if (encoded === '' || encoded.includes('/')) return undefined;

  try {
    return decodeURIComponent(encoded);
  } catch {
    return undefined;
  }
}
