export function clicks(event: PointerEvent): boolean {
  if (event.button !== 0) return false;

  const target = event.target;
  if (!(target instanceof HTMLElement) || target.clientWidth === 0) return true;

  return event.offsetX < target.clientWidth && event.offsetY < target.clientHeight;
}
