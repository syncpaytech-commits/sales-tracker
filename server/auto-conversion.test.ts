import { describe, it, expect, beforeEach } from "vitest";
import { appRouter } from "./routers";
import { getDb } from "./db";
import { leads, opportunities, users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("Manual Conversion Logic", () => {
  let testUser: any;
  let testLead: any;

  beforeEach(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Create test user
    const userResult = await db.insert(users).values({
      openId: `test-agent-${Date.now()}`,
      name: "Test Agent",
      email: "agent@test.com",
      role: "user",
      loginMethod: "email",
    });
    const userId = Number(userResult[0].insertId);
    const userRows = await db.select().from(users).where(eq(users.id, userId));
    testUser = userRows[0];

    // Create test lead
    const leadResult = await db.insert(leads).values({
      companyName: "Auto Convert Test Co",
      contactName: "John Doe",
      phone: "555-0100",
      email: "john@autoconvert.com",
      ownerId: userId,
      stage: "attempting",
      convertedToOpportunity: "No",
    });
    const leadId = Number(leadResult[0].insertId);
    const leadRows = await db.select().from(leads).where(eq(leads.id, leadId));
    testLead = leadRows[0];
  });

  it("should allow lead to reach dm_engaged stage without auto-converting", async () => {
    const caller = appRouter.createCaller({
      user: testUser,
      req: {} as any,
      res: {} as any,
    });

    // Update lead to dm_engaged stage
    await caller.leads.update({
      id: testLead.id,
      data: { stage: "dm_engaged" },
    });

    // Check that lead was NOT automatically converted
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    
    const updatedLeadRows = await db.select().from(leads).where(eq(leads.id, testLead.id));
    const updatedLead = updatedLeadRows[0];
    
    expect(updatedLead.stage).toBe("dm_engaged");
    expect(updatedLead.convertedToOpportunity).toBe("No");
    expect(updatedLead.opportunityId).toBeNull();
  });

  it("should manually convert lead to opportunity", async () => {
    const caller = appRouter.createCaller({
      user: testUser,
      req: {} as any,
      res: {} as any,
    });

    // Manually create opportunity
    const result = await caller.opportunities.create({
      leadId: testLead.id,
      name: "Manual Test Deal",
      companyName: testLead.companyName,
      contactName: testLead.contactName,
      phone: testLead.phone,
      email: testLead.email,
      notes: "Manually converted",
    });

    const db = await getDb();
    if (!db) throw new Error("Database not available");
    
    // Check that lead was marked as converted
    const updatedLeadRows = await db.select().from(leads).where(eq(leads.id, testLead.id));
    const updatedLead = updatedLeadRows[0];
    
    expect(updatedLead.convertedToOpportunity).toBe("Yes");
    expect(updatedLead.opportunityId).toBe(result.id);

    // Check that opportunity was created
    const opportunityRows = await db.select().from(opportunities).where(eq(opportunities.id, result.id));
    expect(opportunityRows.length).toBe(1);
    
    const opportunity = opportunityRows[0];
    expect(opportunity.companyName).toBe("Auto Convert Test Co");
    expect(opportunity.stage).toBe("qualified");
  });

  it("should update lead stage when call outcome is DM Reached without auto-converting", async () => {
    const caller = appRouter.createCaller({
      user: testUser,
      req: {} as any,
      res: {} as any,
    });

    // Log a call with DM Reached outcome (this triggers stage change to dm_engaged)
    await caller.calls.create({
      leadId: testLead.id,
      callDate: new Date(),
      callOutcome: "DM Reached",
      notes: "Spoke with decision maker",
    });

    // Check that lead stage was updated but NOT auto-converted
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    
    const updatedLeadRows = await db.select().from(leads).where(eq(leads.id, testLead.id));
    const updatedLead = updatedLeadRows[0];
    
    expect(updatedLead.stage).toBe("dm_engaged");
    expect(updatedLead.convertedToOpportunity).toBe("No");

    // Check no opportunity was auto-created
    const opportunityRows = await db.select().from(opportunities).where(eq(opportunities.leadId, testLead.id));
    expect(opportunityRows.length).toBe(0);
  });
});
