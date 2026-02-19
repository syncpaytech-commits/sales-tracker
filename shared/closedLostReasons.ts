export const CLOSED_LOST_REASONS = [
  "Budget - Too Expensive",
  "Budget - No Budget",
  "Timing - Not Ready",
  "Timing - Delayed Decision",
  "Competitor - Chose Competitor",
  "Competitor - Existing Provider",
  "No Response - Ghosted",
  "No Response - Not Interested",
  "Not a Fit - Wrong Solution",
  "Not a Fit - No Need",
  "Other",
] as const;

export type ClosedLostReason = typeof CLOSED_LOST_REASONS[number];
