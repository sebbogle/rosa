export async function settled(...elements: readonly Element[]): Promise<boolean> {
  const running = elements.flatMap((element) => element.getAnimations());

  try {
    await Promise.all(running.map((animation) => animation.finished));
    return true;
  } catch {
    return false;
  }
}
