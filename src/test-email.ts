import dotenv from "dotenv";
import { EmailNotifier } from "./services/EmailNotifier";

dotenv.config();

const gmailUser = process.env.GMAIL_USER!;
const gmailAppPassword = process.env.GMAIL_APP_PASSWORD!;
const notifyEmail = process.env.NOTIFY_EMAIL!;

const notifier = new EmailNotifier(gmailUser, gmailAppPassword, notifyEmail);

notifier
  .notify([
    { date: "2026-04-05", day: 5, available: true, timeSlots: ["16:00 - 16:30", "16:30 - 17:00", "17:00 - 17:30"] },
    { date: "2026-04-10", day: 10, available: true, timeSlots: [] },
    { date: "2026-04-18", day: 18, available: true },
  ])
  .then(() => console.log("Test email sent successfully!"))
  .catch((err) => console.error("Failed to send email:", err));
