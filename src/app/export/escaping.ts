export function escaped(text: string): string {
  const node = document.createElement('span');
  node.textContent = text;
  return node.innerHTML;
}

export function escapedAttribute(value: string): string {
  return escaped(value).replace(/"/g, '&quot;');
}
