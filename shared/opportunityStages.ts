export const OPPORTUNITY_STAGE_LABELS: Record<string, string> = {
  qualified: "Qualified",
  proposal: "Proposal Sent",
  negotiation: "Negotiation",
  closed_won: "Closed Won",
  closed_lost: "Closed Lost",
};

export const OPPORTUNITY_STAGES = Object.keys(OPPORTUNITY_STAGE_LABELS);
