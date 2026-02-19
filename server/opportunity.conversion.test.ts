import { describe, it, expect, beforeEach } from "vitest";
import { appRouter } from "./routers";
import { getDb } from "./db";
import { leads, opportunities, callLogs, notes, users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("Lead to Opportunity Conversion", () => {
  let testUserId: number;
  let testLeadId: number;
  let testCallLogId: number;
  let testNoteId: number;

  beforeEach(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Create test user
    const [user] = await db.insert(users).values({
      openId: `test-conversion-${Date.now()}`,
      name: "Test User",
      email: "test@example.com",
      role: "admin",
    });
    testUserId = user.insertId;

    // Create test lead
    const [lead] = await db.insert(leads).values({
      companyName: "Test Conversion Company",
      contactName: "John Doe",
      phone: "1234567890",
      email: "john@test.com",
      ownerId: testUserId,
      stage: "dm_engaged",
    });
    testLeadId = lead.insertId;

    // Create test call log for the lead
    const [callLog] = await db.insert(callLogs).values({
      leadId: testLeadId,
      callDate: new Date(),
      callOutcome: "DM Reached",
      notes: "Had a great conversation",
      agentId: testUserId,
    });
    testCallLogId = callLog.insertId;

    // Create test note for the lead
    const [note] = await db.insert(notes).values({
      leadId: testLeadId,
      content: "This is a test note for the lead",
      createdBy: testUserId,
      createdByName: "Test User",
    });
    testNoteId = note.insertId;
  });

  it("should keep lead and call logs when converting to opportunity", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const caller = appRouter.createCaller({
      user: {
        id: testUserId,
        openId: `test-conversion-${Date.now()}`,
        name: "Test User",
        email: "test@example.com",
        role: "admin",
      },
    } as any);

    // Convert lead to opportunity
    const result = await caller.opportunities.create({
      leadId: testLeadId,
      name: "Test Conversion Deal",
      companyName: "Test Conversion Company",
      contactName: "John Doe",
      phone: "1234567890",
      email: "john@test.com",
      dealValue: "50000",
      expectedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    expect(result.id).toBeDefined();
    const opportunityId = result.id;

    // Verify call log stays with lead (not migrated)
    const [callLog] = await db
      .select()
      .from(callLogs)
      .where(eq(callLogs.id, testCallLogId));

    expect(callLog).toBeDefined();
    expect(callLog.leadId).toBe(testLeadId);
    expect(callLog.opportunityId).toBeNull();
    expect(callLog.notes).toBe("Had a great conversation");

    // Verify note stays with lead (not migrated)
    const [note] = await db
      .select()
      .from(notes)
      .where(eq(notes.id, testNoteId));

    expect(note).toBeDefined();
    expect(note.leadId).toBe(testLeadId);
    expect(note.opportunityId).toBeNull();
    expect(note.content).toBe("This is a test note for the lead");

    // Verify lead was NOT deleted, just marked as converted
    const [convertedLead] = await db
      .select()
      .from(leads)
      .where(eq(leads.id, testLeadId));

    expect(convertedLead).toBeDefined();
    expect(convertedLead.opportunityId).toBe(opportunityId);

    // Verify opportunity was created
    const [opportunity] = await db
      .select()
      .from(opportunities)
      .where(eq(opportunities.id, opportunityId));

    expect(opportunity).toBeDefined();
    expect(opportunity.name).toBe("Test Conversion Deal");
    expect(opportunity.stage).toBe("qualified");
  });

  it("should filter out converted leads when hideConverted is true", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const caller = appRouter.createCaller({
      user: {
        id: testUserId,
        openId: `test-conversion-${Date.now()}`,
        name: "Test User",
        email: "test@example.com",
        role: "admin",
      },
    } as any);

    // Convert lead to opportunity
    const result = await caller.opportunities.create({
      leadId: testLeadId,
      name: "Test Filter Deal",
      companyName: "Test Conversion Company",
      contactName: "John Doe",
      phone: "1234567890",
      email: "john@test.com",
      dealValue: "75000",
      expectedCloseDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
    });

    // Query leads with hideConverted = true (default)
    const leadsHidden = await caller.leads.list({ hideConverted: true });
    const convertedLeadHidden = leadsHidden.find(l => l.id === testLeadId);
    expect(convertedLeadHidden).toBeUndefined();

    // Query leads with hideConverted = false
    const leadsVisible = await caller.leads.list({ hideConverted: false });
    const convertedLeadVisible = leadsVisible.find(l => l.id === testLeadId);
    expect(convertedLeadVisible).toBeDefined();
    expect(convertedLeadVisible?.opportunityId).toBe(result.id);
  });
});
