export interface IScheduler {
  start(job: () => Promise<void>): void;
  stop(): void;
}
