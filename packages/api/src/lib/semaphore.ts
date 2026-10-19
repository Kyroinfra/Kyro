/**
 * Counting semaphore — bounds concurrent async work (ingest pipelines,
 * webhook deliveries) without any external dependency.
 *
 * run() acquires a slot, executes the callback, and releases the slot
 * when it settles. Excess callers wait in FIFO order.
 */
export class Semaphore {
  private waiting: Array<() => void> = [];
  private active = 0;

  constructor(private readonly limit: number) {}

  async run<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }

  private acquire(): Promise<void> {
    if (this.active < this.limit) {
      this.active++;
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      this.waiting.push(() => {
        this.active++;
        resolve();
      });
    });
  }

  private release(): void {
    this.active--;
    const next = this.waiting.shift();
    if (next) {
      next();
    }
  }
}
