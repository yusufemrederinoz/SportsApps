export function fitSize(preferred: number, minimum: number, available: number, fixed: number): number {
  if (available <= 0 || fixed <= 0) {
    return preferred;
  }
  return Math.max(minimum, Math.min(preferred, Math.floor(available - fixed)));
}
