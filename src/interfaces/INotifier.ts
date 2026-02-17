import { TicketStatus } from "../models/TicketStatus";

export interface INotifier {
  notify(availableTickets: TicketStatus[]): Promise<void>;
}
