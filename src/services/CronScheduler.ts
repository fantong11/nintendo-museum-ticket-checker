import cron from "node-cron";
import { IScheduler } from "../interfaces/IScheduler";

export class CronScheduler implements IScheduler {
  private task: cron.ScheduledTask | null = null;
  private cronExpression: string;

  constructor(cronExpression: string = "0 * * * *") {
    this.cronExpression = cronExpression;
  }

  start(job: () => Promise<void>): void {
    console.log(`[CronScheduler] Starting scheduler with expression: ${this.cronExpression}`);

    // Run immediately on start
    console.log("[CronScheduler] Running initial check...");
    job().catch((err) => console.error("[CronScheduler] Initial check failed:", err));

    // Schedule recurring runs
    this.task = cron.schedule(this.cronExpression, () => {
      console.log(`[CronScheduler] Scheduled check at ${new Date().toISOString()}`);
      job().catch((err) => console.error("[CronScheduler] Scheduled check failed:", err));
    });

    console.log("[CronScheduler] Scheduler is running. Press Ctrl+C to stop.");
  }

  stop(): void {
    if (this.task) {
      this.task.stop();
      this.task = null;
      console.log("[CronScheduler] Scheduler stopped.");
    }
  }
}
