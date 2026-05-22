const MIN_MS = 80;

/** Reduce timing oracle between fast/slow handler branches (local recon). */
export async function withMinResponseDelay<T>(fn: () => Promise<T>): Promise<T> {
  const start = Date.now();
  try {
    return await fn();
  } finally {
    const elapsed = Date.now() - start;
    if (elapsed < MIN_MS) {
      await new Promise((r) => setTimeout(r, MIN_MS - elapsed));
    }
  }
}
