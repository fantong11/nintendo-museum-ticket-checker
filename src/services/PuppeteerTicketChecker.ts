import puppeteer, { Page } from "puppeteer";
import { ITicketChecker } from "../interfaces/ITicketChecker";
import { TicketStatus } from "../models/TicketStatus";

const CALENDAR_URL = "https://museum-tickets.nintendo.com/en/calendar";

export class PuppeteerTicketChecker implements ITicketChecker {
  private readonly dates: string[];

  constructor(dates: string[]) {
    this.dates = dates;
  }

  async check(): Promise<TicketStatus[]> {
    const browser = await puppeteer.launch({
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });
    try {
      const page = await browser.newPage();
      await page.goto(CALENDAR_URL, { waitUntil: "networkidle2", timeout: 60000 });

      // Wait for FullCalendar to render
      await page.waitForSelector(".fc-daygrid-day", { timeout: 15000 });
      await new Promise((r) => setTimeout(r, 3000));

      // Extract ticket statuses using FullCalendar's data-date attributes and CSS classes
      const statuses = await page.evaluate((targetDates: string[]) => {
        const results: { date: string; day: number; available: boolean; status: string }[] = [];

        for (const dateStr of targetDates) {
          const day = parseInt(dateStr.split("-")[2], 10);

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
      }, this.dates);

      // Log status details
      for (const s of statuses) {
        console.log(`[TicketChecker] ${s.date}: ${s.status}`);
      }

      // Phase 2: scrape time slots for available dates
      const enriched: TicketStatus[] = [];
      for (const s of statuses) {
        if (!s.available) {
          enriched.push({ date: s.date, day: s.day, available: false });
          continue;
        }
        let timeSlots: string[] | undefined;
        try {
          timeSlots = await this.scrapeTimeSlots(page, s.date);
        } catch (err) {
          console.error(`[TicketChecker] Slot scrape failed for ${s.date}:`, err);
        }
        // Reload calendar between dates to reset SPA state
        await page.goto(CALENDAR_URL, { waitUntil: "networkidle2", timeout: 60000 });
        await page.waitForSelector(".fc-daygrid-day", { timeout: 15000 });
        await new Promise((r) => setTimeout(r, 2000));

        enriched.push({ date: s.date, day: s.day, available: true, timeSlots });
      }
      return enriched;
    } finally {
      await browser.close();
    }
  }

  private async scrapeTimeSlots(page: Page, date: string): Promise<string[]> {
    // Click the correct month tab so FullCalendar shows the right month
    const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const monthName = monthNames[parseInt(date.split("-")[1], 10) - 1];
    await page.evaluate((name) => {
      const tab = Array.from(document.querySelectorAll<HTMLElement>("a.p-period__month"))
        .find((el) => el.textContent?.includes(name));
      if (tab) tab.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
    }, monthName);
    await new Promise((r) => setTimeout(r, 2000));

    // Click the fc-event for this date to open the time slot modal
    const link = await page.$(`td[data-date="${date}"]:not(.fc-day-other) a.fc-event`);
    if (!link) throw new Error(`fc-event not found for ${date}`);

    await link.click();
    await new Promise((r) => setTimeout(r, 2000));

    if (process.env.DEBUG_SLOTS) {
      const fs = await import("fs");
      await page.screenshot({ path: `debug-after-dateclick-${date}.png`, fullPage: true });
      fs.writeFileSync(`debug-after-dateclick-${date}.html`, await page.content(), "utf8");
    }

    // Wait for the time slot modal
    await page.waitForSelector(".p-timelist", { timeout: 10000 });
    await new Promise((r) => setTimeout(r, 500));

    // Extract available slots (exclude cantSelect = sold out)
    const slots = await page.evaluate((): string[] =>
      Array.from(
        document.querySelectorAll(".p-timelist__item:not(.cantSelect) .p-timelist__item--time")
      ).map((el) => (el.textContent || "").trim()).filter(Boolean)
    );

    console.log(`[TicketChecker] ${date}: ${slots.length} slot(s) available – ${slots.join(", ") || "none"}`);

    // Close modal
    await page.evaluate(() => {
      const back = document.querySelector<HTMLElement>(".c-modal__footer .c-button--left");
      if (back) back.click();
    });
    await new Promise((r) => setTimeout(r, 500));

    return slots;
  }
}
