import { TicketStatus } from "../models/TicketStatus";

export interface ITicketChecker {
  check(): Promise<TicketStatus[]>;
}
