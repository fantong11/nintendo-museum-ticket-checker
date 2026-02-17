import dotenv from "dotenv";
import { PuppeteerTicketChecker } from "./services/PuppeteerTicketChecker";
import { EmailNotifier } from "./services/EmailNotifier";
import { CronScheduler } from "./services/CronScheduler";
import { ITicketChecker } from "./interfaces/ITicketChecker";
import { INotifier } from "./interfaces/INotifier";
import { IScheduler } from "./interfaces/IScheduler";
import { parseDates } from "./utils/parseDates";

dotenv.config();

const gmailUser = process.env.GMAIL_USER;
const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;
const notifyEmail = process.env.NOTIFY_EMAIL;

const targetDatesRaw = process.env.TARGET_DATES;
if (!targetDatesRaw) {
  console.error("[Main] TARGET_DATES environment variable is required.");
  console.error("[Main] Example: TARGET_DATES=2026-03-17~2026-03-23,2026-04-05");
  process.exit(1);
}
const targetDates = parseDates(targetDatesRaw);
console.log(`[Main] Target dates: ${targetDates.join(", ")}`);

// Dependency injection
const checker: ITicketChecker = new PuppeteerTicketChecker(targetDates);

const notifier: INotifier | null =
  gmailUser && gmailAppPassword && notifyEmail
    ? new EmailNotifier(gmailUser, gmailAppPassword, notifyEmail)
    : null;

if (!notifier) {
  console.warn("[Main] Email credentials not fully configured. Notifications disabled.");
  console.warn("[Main] Set GMAIL_USER, GMAIL_APP_PASSWORD, and NOTIFY_EMAIL in .env to enable.");
}

async function runCheck(): Promise<void> {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`[Main] Checking tickets at ${new Date().toLocaleString("en-US", { timeZone: "Asia/Taipei", hour12: false })}`);
  console.log("=".repeat(60));

  const statuses = await checker.check();

  // Log all statuses
  for (const status of statuses) {
    const icon = status.available ? "✅" : "❌";
    console.log(`  ${icon} ${status.date} (Day ${status.day}): ${status.available ? "AVAILABLE" : "Sold Out"}`);
  }

  const available = statuses.filter((s) => s.available);

  if (available.length > 0) {
    console.log(`\n[Main] 🎉 ${available.length} date(s) with tickets available!`);
    if (notifier) {
      await notifier.notify(available);
    } else {
      console.log("[Main] (Email notification skipped - no credentials configured)");
    }
  } else {
    console.log("\n[Main] No tickets available for target dates.");
  }
}

// Entry point
const isOnce = process.argv.includes("--once");

if (isOnce) {
  // Single run mode (npm run check)
  runCheck()
    .then(() => {
      console.log("\n[Main] Single check completed.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("[Main] Check failed:", err);
      process.exit(1);
    });
} else {
  // Scheduled mode (npm start)
  const scheduler: IScheduler = new CronScheduler("0 * * * *");
  scheduler.start(runCheck);
}
