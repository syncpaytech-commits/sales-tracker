import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import { getDb } from "./db";

describe("Delete Functionality with Audit Logging", () => {
  let caller: any;
  let testUserId: number;
  let testLeadId: number;
  let testOpportunityId: number;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    
    // Create test user
    const { users } = await import("../drizzle/schema");
    const userResult = await db.insert(users).values({
      openId: `test-delete-${Date.now()}`,
      name: "Test Delete User",
      email: "testdelete@example.com",
      role: "admin",
    });
    testUserId = Number(userResult[0].insertId);

    // Create caller with test user context
    caller = appRouter.createCaller({
      user: {
        id: testUserId,
        openId: `test-delete-${Date.now()}`,
        name: "Test Delete User",
        email: "testdelete@example.com",
        role: "admin",
      },
    });

    // Create test lead
    const lead = await caller.leads.create({
      companyName: "Test Delete Company",
      contactName: "Test Contact",
      phone: "1234567890",
      email: "test@delete.com",
      ownerId: testUserId,
    });
    testLeadId = lead.id;

    // Create test opportunity
    const opp = await caller.opportunities.create({
      leadId: testLeadId,
      name: "Test Delete Opportunity",
      companyName: "Test Delete Company",
      contactName: "Test Contact",
      phone: "1234567890",
      email: "test@delete.com",
      dealValue: "10000",
    });
    testOpportunityId = opp.id;
  });

  it("should delete a lead and create audit log entry", async () => {
    // Delete the lead
    const result = await caller.leads.delete({ id: testLeadId });
    expect(result.success).toBe(true);

    // Check audit log was created
    const auditLogs = await caller.auditLogs.list();
    const leadAuditLog = auditLogs.find(
      (log: any) => log.entityType === "lead" && log.entityId === testLeadId
    );
    
    expect(leadAuditLog).toBeDefined();
    expect(leadAuditLog.entityName).toBe("Test Delete Company");
    expect(leadAuditLog.deletedBy).toBe(testUserId);
    expect(leadAuditLog.deletedByName).toBe("Test Delete User");
  });

  it("should delete an opportunity and create audit log entry", async () => {
    // Delete the opportunity
    const result = await caller.opportunities.delete({ id: testOpportunityId });
    expect(result.success).toBe(true);

    // Check audit log was created
    const auditLogs = await caller.auditLogs.list();
    const oppAuditLog = auditLogs.find(
      (log: any) => log.entityType === "opportunity" && log.entityId === testOpportunityId
    );
    
    expect(oppAuditLog).toBeDefined();
    expect(oppAuditLog.entityName).toBe("Test Delete Opportunity");
    expect(oppAuditLog.deletedBy).toBe(testUserId);
  });

  it("should bulk delete leads and create audit log entries", async () => {
    // Create multiple test leads
    const lead1 = await caller.leads.create({
      companyName: "Bulk Delete 1",
      contactName: "Contact 1",
      ownerId: testUserId,
    });
    const lead2 = await caller.leads.create({
      companyName: "Bulk Delete 2",
      contactName: "Contact 2",
      ownerId: testUserId,
    });
    const lead3 = await caller.leads.create({
      companyName: "Bulk Delete 3",
      contactName: "Contact 3",
      ownerId: testUserId,
    });

    const leadIds = [lead1.id, lead2.id, lead3.id];

    // Bulk delete
    const result = await caller.leads.bulkDelete({ leadIds });
    expect(result.success).toBe(true);
    expect(result.deletedCount).toBe(3);

    // Check audit logs were created for all three
    const auditLogs = await caller.auditLogs.list();
    const bulkAuditLogs = auditLogs.filter(
      (log: any) => leadIds.includes(log.entityId) && log.entityType === "lead"
    );
    
    expect(bulkAuditLogs.length).toBe(3);
  });

  it("should allow deleting lead even when opportunity exists (foreign key set null)", async () => {
    // Create new lead and opportunity
    const lead = await caller.leads.create({
      companyName: "FK Test Company",
      contactName: "FK Test Contact",
      ownerId: testUserId,
    });
    
    const opp = await caller.opportunities.create({
      leadId: lead.id,
      name: "FK Test Opportunity",
      companyName: "FK Test Company",
      contactName: "FK Test Contact",
      dealValue: "5000",
    });

    // Delete the lead (should succeed due to ON DELETE SET NULL)
    const deleteResult = await caller.leads.delete({ id: lead.id });
    expect(deleteResult.success).toBe(true);

    // Verify opportunity still exists with null leadId
    const opportunityAfter = await caller.opportunities.getById({ id: opp.id });
    expect(opportunityAfter).toBeDefined();
    expect(opportunityAfter.leadId).toBeNull();
  });
});
