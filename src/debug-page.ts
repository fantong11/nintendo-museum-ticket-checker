import puppeteer from "puppeteer";

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto("https://museum-tickets.nintendo.com/en/calendar", {
    waitUntil: "networkidle2",
    timeout: 30000,
  });
  await new Promise((r) => setTimeout(r, 5000));

  // Find any date that is NOT soldout, holiday, no-data, or other
  const available = await page.evaluate(() => {
    const tds = Array.from(document.querySelectorAll("td.fc-daygrid-day"));
    return tds
      .filter((td) =>
        !td.classList.contains("fc-day-other") &&
        !td.classList.contains("fc-day-soldout") &&
        !td.classList.contains("fc-day-holiday") &&
        !td.classList.contains("fc-day-no-data") &&
        !td.classList.contains("fc-day-past")
      )
      .map((td) => td.getAttribute("data-date"));
  });

  if (available.length > 0) {
    console.log("Available dates found:", available);
  } else {
    console.log("No available dates found on the entire page.");
  }

  await browser.close();
})();
