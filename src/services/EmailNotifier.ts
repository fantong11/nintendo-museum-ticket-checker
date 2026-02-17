import nodemailer from "nodemailer";
import { INotifier } from "../interfaces/INotifier";
import { TicketStatus } from "../models/TicketStatus";

export class EmailNotifier implements INotifier {
  private transporter: nodemailer.Transporter;
  private from: string;
  private to: string;

  constructor(gmailUser: string, gmailAppPassword: string, notifyEmail: string) {
    this.from = gmailUser;
    this.to = notifyEmail;
    this.transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: gmailUser,
        pass: gmailAppPassword,
      },
    });
  }

  async notify(availableTickets: TicketStatus[]): Promise<void> {
    const dateList = availableTickets
      .map((t) => `  - ${t.date} (Day ${t.day})`)
      .join("\n");

    const subject = `🎮 Nintendo Museum Tickets Available! (${availableTickets.length} date(s))`;
    const text = [
      "Nintendo Museum tickets are now available for the following dates:",
      "",
      dateList,
      "",
      "Book now: https://museum-tickets.nintendo.com/en/calendar",
      "",
      `Checked at: ${new Date().toISOString()}`,
    ].join("\n");

    const html = [
      "<h2>Nintendo Museum Tickets Available!</h2>",
      "<p>The following dates now have tickets available:</p>",
      "<ul>",
      ...availableTickets.map((t) => `<li><strong>${t.date}</strong> (Day ${t.day})</li>`),
      "</ul>",
      '<p><a href="https://museum-tickets.nintendo.com/en/calendar">Book Now →</a></p>',
      `<p><small>Checked at: ${new Date().toISOString()}</small></p>`,
    ].join("\n");

    await this.transporter.sendMail({
      from: this.from,
      to: this.to,
      subject,
      text,
      html,
    });

    console.log(`[EmailNotifier] Notification sent to ${this.to}`);
  }
}
