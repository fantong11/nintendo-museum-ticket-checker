export interface TicketStatus {
  date: string; // e.g. "2026-03-17"
  day: number; // e.g. 17
  available: boolean;
  timeSlots?: string[]; // ["10:00", "12:00"] — undefined if scrape failed
}
