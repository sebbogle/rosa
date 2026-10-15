export function plural(many: number, word: string): string {
  return many === 1 ? word : `${word}s`;
}
