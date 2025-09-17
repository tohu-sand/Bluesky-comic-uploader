export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: { retries?: number; baseDelayMs?: number; factor?: number } = {}
): Promise<T> {
  const {
    retries = 4,
    baseDelayMs = 500,
    factor = 2
  } = options;

  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (error) {
      if (attempt >= retries) {
        throw error;
      }
      const wait = baseDelayMs * factor ** attempt + Math.random() * 250;
      await new Promise((resolve) => setTimeout(resolve, wait));
      attempt += 1;
    }
  }
}

export function createSemaphore(maxConcurrency: number) {
  let active = 0;
  const queue: Array<() => void> = [];

  const release = () => {
    active -= 1;
    if (active < 0) active = 0;
    const next = queue.shift();
    if (next) next();
  };

  const acquire = async () => {
    if (active < maxConcurrency) {
      active += 1;
      return;
    }
    await new Promise<void>((resolve) => queue.push(() => {
      active += 1;
      resolve();
    }));
  };

  return async function runWithSemaphore<T>(fn: () => Promise<T>): Promise<T> {
    await acquire();
    try {
      return await fn();
    } finally {
      release();
    }
  };
}
