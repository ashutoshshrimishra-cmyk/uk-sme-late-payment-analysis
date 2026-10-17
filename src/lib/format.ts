export function daysBetween(a: Date | string, b: Date | string): number {
  const d1 = new Date(a).getTime();
  const d2 = new Date(b).getTime();
  return Math.max(0, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)));
}
