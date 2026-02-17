import dotenv from "dotenv";
import puppeteer from "puppeteer";
import { EmailNotifier } from "./services/EmailNotifier";
import { TicketStatus } from "./models/TicketStatus";
import { parseDates } from "./utils/parseDates";

dotenv.config();

(async () => {
  const dates = parseDates("2026-04-01~2026-04-30");
  console.log(`Checking ${dates.length} dates in April for available tickets...`);

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto("https://museum-tickets.nintendo.com/en/calendar", {
    waitUntil: "networkidle2",
    timeout: 30000,
  });
  await page.waitForSelector(".fc-daygrid-day", { timeout: 15000 });
  await new Promise((r) => setTimeout(r, 3000));

  const statuses = await page.evaluate((targetDates: string[]) => {
    const results: { date: string; day: number; available: boolean; status: string }[] = [];
    for (const dateStr of targetDates) {
      const day = parseInt(dateStr.split("-")[2], 10);
      const allCells = Array.from(document.querySelectorAll(`td[data-date="${dateStr}"]`));
      const cell = allCells.find((td) => !td.classList.contains("fc-day-other"));
      if (!cell) {
        results.push({ date: dateStr, day, available: false, status: "not-found" });
        continue;
      }
      const isSoldOut = cell.classList.contains("fc-day-soldout");
      const isHoliday = cell.classList.contains("fc-day-holiday");
      const isNoData = cell.classList.contains("fc-day-no-data");
      let status = "available";
      if (isSoldOut) status = "soldout";
      else if (isHoliday) status = "holiday";
      else if (isNoData) status = "no-data";
      results.push({ date: dateStr, day, available: !isSoldOut && !isHoliday && !isNoData, status });
    }
    return results;
  }, dates);

  await browser.close();

  for (const s of statuses) {
    const icon = s.available ? "✅" : "❌";
    console.log(`  ${icon} ${s.date} (Day ${s.day}): ${s.status}`);
  }

  const available = statuses.filter((s) => s.available);
  if (available.length > 0) {
    console.log(`\n${available.length} date(s) available! Sending email...`);
    const notifier = new EmailNotifier(
      process.env.GMAIL_USER!,
      process.env.GMAIL_APP_PASSWORD!,
      process.env.NOTIFY_EMAIL!
    );
    await notifier.notify(available);
    console.log("Done!");
  } else {
    console.log("No available dates.");
  }
})();
