export default function sleep(ms: number = 0): Promise<void> {
  return new Promise((resolve) => {
    const timeout = Number.isFinite(Number(ms)) ? Number(ms) : 0;
    setTimeout(resolve, Math.max(0, timeout));
  });
}
