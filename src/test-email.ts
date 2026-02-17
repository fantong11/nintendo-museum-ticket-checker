import dotenv from "dotenv";
import { EmailNotifier } from "./services/EmailNotifier";

dotenv.config();

const gmailUser = process.env.GMAIL_USER!;
const gmailAppPassword = process.env.GMAIL_APP_PASSWORD!;
const notifyEmail = process.env.NOTIFY_EMAIL!;

const notifier = new EmailNotifier(gmailUser, gmailAppPassword, notifyEmail);

notifier
  .notify([
    { date: "2026-03-17", day: 17, available: true },
    { date: "2026-03-20", day: 20, available: true },
  ])
  .then(() => console.log("Test email sent successfully!"))
  .catch((err) => console.error("Failed to send email:", err));
