import { describe, expect, it, beforeEach } from "vitest";
import { createCallLog, createLead, getLeadById } from "./db";

describe("Stage Automation", () => {
  let testLeadId: number;

  beforeEach(async () => {
    // Create a test lead
    testLeadId = await createLead({
      companyName: "Test Company",
      contactName: "Test Contact",
      phone: "+1-555-0199",
      email: "test@example.com",
      stage: "new",
      dataSource: "Test",
      dataCohort: "Q1 2026",
      ownerId: 1,
    });
  });

  it("should advance to 'attempting' stage when call outcome is 'No Answer'", async () => {
    await createCallLog({
      leadId: testLeadId,
      callDate: new Date(),
      callOutcome: "No Answer",
      callDuration: 0,
      notes: "Left voicemail",
      agentId: 1,
    });

    const lead = await getLeadById(testLeadId, 1, "admin");
    expect(lead?.stage).toBe("attempting");
    expect(lead?.dialAttempts).toBe(1);
  });

  it("should advance to 'dm_engaged' stage when call outcome is 'DM Reached'", async () => {
    await createCallLog({
      leadId: testLeadId,
      callDate: new Date(),
      callOutcome: "DM Reached",
      callDuration: 10,
      notes: "Spoke with decision maker",
      agentId: 1,
    });

    const lead = await getLeadById(testLeadId, 1, "admin");
    expect(lead?.stage).toBe("dm_engaged");
    expect(lead?.dialAttempts).toBe(1);
  });

  it("should advance to 'email_sent' stage when call outcome is 'Email Requested'", async () => {
    await createCallLog({
      leadId: testLeadId,
      callDate: new Date(),
      callOutcome: "Email Requested",
      callDuration: 5,
      notes: "Send info via email",
      agentId: 1,
    });

    const lead = await getLeadById(testLeadId, 1, "admin");
    expect(lead?.stage).toBe("email_sent");
  });

  it("should advance to 'statement_requested' stage when call outcome is 'Statement Agreed'", async () => {
    await createCallLog({
      leadId: testLeadId,
      callDate: new Date(),
      callOutcome: "Statement Agreed",
      callDuration: 12,
      notes: "Agreed to send processing statement",
      agentId: 1,
    });

    const lead = await getLeadById(testLeadId, 1, "admin");
    expect(lead?.stage).toBe("statement_requested");
  });

  it("should close as lost when call outcome is 'Not Interested'", async () => {
    await createCallLog({
      leadId: testLeadId,
      callDate: new Date(),
      callOutcome: "Not Interested",
      callDuration: 3,
      notes: "Not interested in service",
      agentId: 1,
    });

    const lead = await getLeadById(testLeadId, 1, "admin");
    expect(lead?.stage).toBe("closed_lost");
    expect(lead?.lossReason).toBe("Not Interested");
    expect(lead?.closedDate).toBeTruthy();
  });

  it("should close as lost when call outcome is 'Bad Data'", async () => {
    await createCallLog({
      leadId: testLeadId,
      callDate: new Date(),
      callOutcome: "Bad Data",
      callDuration: 0,
      notes: "Wrong number",
      agentId: 1,
    });

    const lead = await getLeadById(testLeadId, 1, "admin");
    expect(lead?.stage).toBe("closed_lost");
    expect(lead?.lossReason).toBe("Bad Data");
    expect(lead?.closedDate).toBeTruthy();
  });

  it("should increment dial attempts with each call", async () => {
    // First call
    await createCallLog({
      leadId: testLeadId,
      callDate: new Date(),
      callOutcome: "No Answer",
      callDuration: 0,
      notes: "First attempt",
      agentId: 1,
    });

    let lead = await getLeadById(testLeadId, 1, "admin");
    expect(lead?.dialAttempts).toBe(1);

    // Second call
    await createCallLog({
      leadId: testLeadId,
      callDate: new Date(),
      callOutcome: "Gatekeeper",
      callDuration: 2,
      notes: "Second attempt",
      agentId: 1,
    });

    lead = await getLeadById(testLeadId, 1, "admin");
    expect(lead?.dialAttempts).toBe(2);

    // Third call
    await createCallLog({
      leadId: testLeadId,
      callDate: new Date(),
      callOutcome: "DM Reached",
      callDuration: 8,
      notes: "Finally reached DM",
      agentId: 1,
    });

    lead = await getLeadById(testLeadId, 1, "admin");
    expect(lead?.dialAttempts).toBe(3);
    expect(lead?.stage).toBe("dm_engaged");
  });
});
