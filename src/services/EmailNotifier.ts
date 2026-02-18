import nodemailer from "nodemailer";
import { INotifier } from "../interfaces/INotifier";
import { TicketStatus } from "../models/TicketStatus";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const weekday = WEEKDAYS[d.getDay()];
  const month = d.toLocaleString("en-US", { month: "short" });
  return `${month} ${d.getDate()} (${weekday})`;
}

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
    const count = availableTickets.length;
    const dateList = availableTickets
      .map((t) => {
        const slotLine =
          t.timeSlots && t.timeSlots.length > 0
            ? `\n    Slots: ${t.timeSlots.join(", ")}`
            : "";
        return `  - ${formatDate(t.date)}${slotLine}`;
      })
      .join("\n");
    const checkedAt = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    const subject = `Nintendo Museum - ${count} date(s) available!`;

    const text = [
      `${count} date(s) with tickets available:`,
      "",
      dateList,
      "",
      "Book now: https://museum-tickets.nintendo.com/en/calendar",
      "",
      `Checked at: ${checkedAt} (JST)`,
    ].join("\n");

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0; padding:0; background:#f5f5f5; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5; padding:24px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:#e60012; padding:24px 32px; text-align:center;">
            <h1 style="margin:0; color:#ffffff; font-size:22px; font-weight:700; letter-spacing:0.5px;">
              Nintendo Museum
            </h1>
            <p style="margin:6px 0 0; color:rgba(255,255,255,0.9); font-size:14px;">
              Ticket Availability Alert
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:28px 32px;">
            <p style="margin:0 0 20px; font-size:16px; color:#333; line-height:1.5;">
              <strong>${count}</strong> date${count > 1 ? "s" : ""} now have tickets available:
            </p>

            <!-- Date cards -->
            <table width="100%" cellpadding="0" cellspacing="0">
              ${availableTickets
                .map((t) => {
                  const d = new Date(t.date + "T00:00:00");
                  const weekday = WEEKDAYS[d.getDay()];
                  const month = d.toLocaleString("en-US", { month: "short" });
                  const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                  const dotColor = isWeekend ? "#e60012" : "#1a8d1a";
                  const slotsHtml =
                    t.timeSlots && t.timeSlots.length > 0
                      ? `<tr><td colspan="2" style="padding:0 16px 10px; font-size:12px; color:#555;">
                          ${t.timeSlots
                            .map(
                              (s) =>
                                `<span style="display:inline-block; background:#e8f5e9; color:#1a8d1a; border:1px solid #c8e6c9; border-radius:4px; padding:2px 8px; margin:2px 4px 2px 0; font-weight:600; font-family:monospace;">${s}</span>`
                            )
                            .join("")}
                        </td></tr>`
                      : "";
                  return `
              <tr>
                <td style="padding:6px 0;">
                  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f9; border-radius:8px; border-left:4px solid ${dotColor};">
                    <tr>
                      <td style="padding:12px 16px;">
                        <span style="font-size:15px; color:#333; font-weight:600;">${month} ${d.getDate()}</span>
                        <span style="font-size:13px; color:#888; margin-left:8px;">${weekday}</span>
                      </td>
                      <td align="right" style="padding:12px 16px;">
                        <span style="display:inline-block; background:#1a8d1a; color:#fff; font-size:11px; font-weight:600; padding:3px 10px; border-radius:12px; text-transform:uppercase;">Available</span>
                      </td>
                    </tr>
                    ${slotsHtml}
                  </table>
                </td>
              </tr>`;
                })
                .join("")}
            </table>

            <!-- CTA Button -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
              <tr>
                <td align="center">
                  <a href="https://museum-tickets.nintendo.com/en/calendar"
                     style="display:inline-block; background:#e60012; color:#ffffff; text-decoration:none; padding:14px 36px; border-radius:8px; font-size:15px; font-weight:600; letter-spacing:0.3px;">
                    Book Tickets Now
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:16px 32px 20px; border-top:1px solid #eee; text-align:center;">
            <p style="margin:0; font-size:12px; color:#aaa; line-height:1.5;">
              Checked at ${checkedAt} (JST)<br>
              Nintendo Museum Ticket Checker
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

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
