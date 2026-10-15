const REVOKE_AFTER = 30_000;

export function downloadName(selection: string, extension: string): string {
  return `rosa-${selection}-${today()}.${extension}`;
}

export function handOver(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = name;
  link.click();

  setTimeout(() => URL.revokeObjectURL(url), REVOKE_AFTER);
}

function today(): string {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');

  return `${now.getFullYear()}-${month}-${day}`;
}
