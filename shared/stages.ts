export const STAGE_LABELS: Record<string, string> = {
  new: "Lead (Not Contacted)",
  attempting: "Attempting",
  dm_engaged: "DM Engaged",
  email_sent: "Email Sent",
  statement_requested: "Statement Requested",
  statement_received: "Statement Received",
  quoted: "Quoted",
  negotiation: "Negotiation",
  closed_won: "Closed Won",
  closed_lost: "Closed Lost",
  parked: "Parked (5 Attempts No Contact)",
};

export const CALL_OUTCOMES = [
  "No Answer",
  "Gatekeeper",
  "DM Reached",
  "Callback Requested",
  "Email Requested",
  "Statement Agreed",
  "Not Interested",
  "Bad Data",
] as const;

export const STAGES = [
  "new",
  "attempting",
  "dm_engaged",
  "email_sent",
  "statement_requested",
  "statement_received",
  "quoted",
  "negotiation",
  "closed_won",
  "closed_lost",
  "parked",
] as const;

export type Stage = typeof STAGES[number];
export type CallOutcome = typeof CALL_OUTCOMES[number];
