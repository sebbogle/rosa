// These rules also run inside the exported page, which embeds each one with toString(). So each
// must use nothing from outside its own body: no imports, no module constants, no other helpers.

export interface OpenFolders {
  readonly expanded: ReadonlySet<string>;
  readonly searching: boolean;
  readonly matchedIn: ReadonlySet<string>;
}

export function searchTerms(query: string): readonly string[] {
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter((term) => term !== '');
}

export function matches(haystack: string, terms: readonly string[]): boolean {
  return terms.every((term) => haystack.includes(term));
}

export function isOpen(key: string, { expanded, searching, matchedIn }: OpenFolders): boolean {
  return expanded.has(key) || (searching && matchedIn.has(key));
}

export function toggled(set: ReadonlySet<string>, key: string): ReadonlySet<string> {
  const next = new Set(set);
  if (!next.delete(key)) next.add(key);
  return next;
}

export const CONTENTS_RULES = { searchTerms, matches, isOpen, toggled };

export type ContentsRules = typeof CONTENTS_RULES;
