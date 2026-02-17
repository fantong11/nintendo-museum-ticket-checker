import puppeteer, { Page } from "puppeteer";
import { ITicketChecker } from "../interfaces/ITicketChecker";
import { TicketStatus } from "../models/TicketStatus";

const CALENDAR_URL = "https://museum-tickets.nintendo.com/en/calendar";
const TARGET_YEAR = 2026;
const TARGET_MONTH = 3; // March
const TARGET_DAYS = [17, 18, 19, 20, 21, 22, 23];

export class PuppeteerTicketChecker implements ITicketChecker {
  async check(): Promise<TicketStatus[]> {
    const browser = await puppeteer.launch({
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });
    try {
      const page = await browser.newPage();
      await page.goto(CALENDAR_URL, { waitUntil: "networkidle2", timeout: 30000 });

      // Wait for FullCalendar to render
      await page.waitForSelector(".fc-daygrid-day", { timeout: 15000 });
      await new Promise((r) => setTimeout(r, 3000));

      // Extract ticket statuses using FullCalendar's data-date attributes and CSS classes
      const statuses = await page.evaluate(
        (targetDays: number[], targetYear: number, targetMonth: number) => {
          const results: { date: string; day: number; available: boolean; status: string }[] = [];

          for (const day of targetDays) {
            const dateStr = `${targetYear}-${String(targetMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

            // Find the non-overflow cell for this date (exclude fc-day-other which are overflow cells)
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

            results.push({
              date: dateStr,
              day,
              available: !isSoldOut && !isHoliday && !isNoData,
              status,
            });
          }

          return results;
        },
        TARGET_DAYS,
        TARGET_YEAR,
        TARGET_MONTH
      );

      // Log status details
      for (const s of statuses) {
        console.log(`[TicketChecker] ${s.date}: ${s.status}`);
      }

      return statuses;
    } finally {
      await browser.close();
    }
  }
}
