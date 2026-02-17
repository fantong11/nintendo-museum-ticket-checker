/**
 * Parse a TARGET_DATES string into a sorted array of YYYY-MM-DD date strings.
 *
 * Format: comma-separated entries, each either a single date or a range with `~`.
 *   "2026-03-17~2026-03-23,2026-04-05"
 *   → ["2026-03-17","2026-03-18",...,"2026-03-23","2026-04-05"]
 */
export function parseDates(input: string): string[] {
  const dates = new Set<string>();

  for (const segment of input.split(",")) {
    const trimmed = segment.trim();
    if (!trimmed) continue;

    if (trimmed.includes("~")) {
      const [startStr, endStr] = trimmed.split("~").map((s) => s.trim());
      const start = new Date(startStr + "T00:00:00");
      const end = new Date(endStr + "T00:00:00");

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new Error(`Invalid date range: "${trimmed}"`);
      }
      if (start > end) {
        throw new Error(`Start date is after end date: "${trimmed}"`);
      }

      const cursor = new Date(start);
      while (cursor <= end) {
        dates.add(formatDate(cursor));
        cursor.setDate(cursor.getDate() + 1);
      }
    } else {
      const d = new Date(trimmed + "T00:00:00");
      if (isNaN(d.getTime())) {
        throw new Error(`Invalid date: "${trimmed}"`);
      }
      dates.add(formatDate(d));
    }
  }

  return [...dates].sort();
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
