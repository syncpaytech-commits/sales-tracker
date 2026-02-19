import { describe, it, expect, beforeEach } from "vitest";
import { appRouter } from "./routers";
import { getDb } from "./db";
import { leads, callLogs, users } from "../drizzle/schema";

describe("Analytics with Converted Leads", () => {
  let testUserId: number;
  let testLeadId: number;

  beforeEach(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Create test user
    const [user] = await db.insert(users).values({
      openId: `test-analytics-${Date.now()}`,
      name: "Test User",
      email: "test@example.com",
      role: "admin",
    });
    testUserId = user.insertId;

    // Create test lead
    const [lead] = await db.insert(leads).values({
      companyName: "Test Analytics Company",
      contactName: "Jane Doe",
      phone: "1234567890",
      email: "jane@test.com",
      ownerId: testUserId,
      stage: "dm_engaged",
    });
    testLeadId = lead.insertId;

    // Create call logs for the lead
    await db.insert(callLogs).values([
      {
        leadId: testLeadId,
        callDate: new Date(),
        callOutcome: "No Answer",
        notes: "First attempt",
        agentId: testUserId,
      },
      {
        leadId: testLeadId,
        callDate: new Date(),
        callOutcome: "DM Reached",
        notes: "Connected with decision maker",
        agentId: testUserId,
      },
    ]);
  });

  it("should count leads and calls before conversion", async () => {
    const caller = appRouter.createCaller({
      user: {
        id: testUserId,
        openId: `test-analytics-${Date.now()}`,
        name: "Test User",
        email: "test@example.com",
        role: "admin",
      },
    } as any);

    const metrics = await caller.analytics.metrics();

    expect(metrics.totalLeads).toBe(1);
    expect(metrics.totalDials).toBe(2);
    expect(metrics.connectRate).toBeGreaterThan(0);
  });

  it("should still count leads and calls after conversion to opportunity", async () => {
    const caller = appRouter.createCaller({
      user: {
        id: testUserId,
        openId: `test-analytics-${Date.now()}`,
        name: "Test User",
        email: "test@example.com",
        role: "admin",
      },
    } as any);

    // Convert lead to opportunity
    await caller.opportunities.create({
      leadId: testLeadId,
      name: "Test Analytics Deal",
      companyName: "Test Analytics Company",
      contactName: "Jane Doe",
      phone: "1234567890",
      email: "jane@test.com",
      dealValue: "100000",
      expectedCloseDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    });

    // Check analytics still count the converted lead
    const metricsAfter = await caller.analytics.metrics();

    expect(metricsAfter.totalLeads).toBe(1); // Lead should still be counted
    expect(metricsAfter.totalDials).toBe(2); // Calls should still be counted
    expect(metricsAfter.connectRate).toBeGreaterThan(0);
  });

  it("should include converted leads in stage distribution", async () => {
    const caller = appRouter.createCaller({
      user: {
        id: testUserId,
        openId: `test-analytics-${Date.now()}`,
        name: "Test User",
        email: "test@example.com",
        role: "admin",
      },
    } as any);

    // Convert lead to opportunity
    await caller.opportunities.create({
      leadId: testLeadId,
      name: "Test Distribution Deal",
      companyName: "Test Analytics Company",
      contactName: "Jane Doe",
      phone: "1234567890",
      email: "jane@test.com",
      dealValue: "100000",
      expectedCloseDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    });

    // Check stage distribution includes the converted lead
    const distribution = await caller.analytics.stageDistribution();
    
    const dmEngagedStage = distribution.find(d => d.stage === "dm_engaged");
    expect(dmEngagedStage).toBeDefined();
    expect(dmEngagedStage?.count).toBe(1);
  });
});
