import { describe, it, expect, beforeEach } from "vitest";
import { appRouter } from "./routers";
import { getDb } from "./db";
import { leads, callLogs, users } from "../drizzle/schema";

describe("Multi-Tenant Analytics", () => {
  let adminUserId: number;
  let agent1Id: number;
  let agent2Id: number;
  let agent1LeadId: number;
  let agent2LeadId: number;

  beforeEach(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Create admin user
    const [admin] = await db.insert(users).values({
      openId: `admin-${Date.now()}`,
      name: "Admin User",
      email: "admin@test.com",
      role: "admin",
    });
    adminUserId = admin.insertId;

    // Create Agent 1
    const [agent1] = await db.insert(users).values({
      openId: `agent1-${Date.now()}`,
      name: "Agent One",
      email: "agent1@test.com",
      role: "user",
    });
    agent1Id = agent1.insertId;

    // Create Agent 2
    const [agent2] = await db.insert(users).values({
      openId: `agent2-${Date.now()}`,
      name: "Agent Two",
      email: "agent2@test.com",
      role: "user",
    });
    agent2Id = agent2.insertId;

    // Create lead for Agent 1
    const [lead1] = await db.insert(leads).values({
      companyName: "Agent 1 Company",
      contactName: "Contact 1",
      phone: "111-1111",
      email: "contact1@test.com",
      ownerId: agent1Id,
      stage: "dm_engaged",
    });
    agent1LeadId = lead1.insertId;

    // Create lead for Agent 2
    const [lead2] = await db.insert(leads).values({
      companyName: "Agent 2 Company",
      contactName: "Contact 2",
      phone: "222-2222",
      email: "contact2@test.com",
      ownerId: agent2Id,
      stage: "dm_engaged",
    });
    agent2LeadId = lead2.insertId;

    // Create call logs for Agent 1
    await db.insert(callLogs).values([
      {
        leadId: agent1LeadId,
        callDate: new Date(),
        callOutcome: "DM Reached",
        notes: "Agent 1 call",
        agentId: agent1Id,
      },
    ]);

    // Create call logs for Agent 2
    await db.insert(callLogs).values([
      {
        leadId: agent2LeadId,
        callDate: new Date(),
        callOutcome: "No Answer",
        notes: "Agent 2 call",
        agentId: agent2Id,
      },
      {
        leadId: agent2LeadId,
        callDate: new Date(),
        callOutcome: "DM Reached",
        notes: "Agent 2 second call",
        agentId: agent2Id,
      },
    ]);
  });

  it("admin should see all agents' aggregated data", async () => {
    const adminCaller = appRouter.createCaller({
      user: {
        id: adminUserId,
        openId: `admin-${Date.now()}`,
        name: "Admin User",
        email: "admin@test.com",
        role: "admin",
      },
    } as any);

    const metrics = await adminCaller.analytics.metrics();

    // Admin should see data from both agents
    expect(metrics.totalLeads).toBeGreaterThanOrEqual(2);
    expect(metrics.totalDials).toBeGreaterThanOrEqual(3);
  });

  it("admin should be able to filter by specific agent", async () => {
    const adminCaller = appRouter.createCaller({
      user: {
        id: adminUserId,
        openId: `admin-${Date.now()}`,
        name: "Admin User",
        email: "admin@test.com",
        role: "admin",
      },
    } as any);

    // Filter by Agent 1
    const agent1Metrics = await adminCaller.analytics.metrics({
      filterByAgentId: agent1Id,
    });

    expect(agent1Metrics.totalLeads).toBeGreaterThanOrEqual(1);
    expect(agent1Metrics.totalDials).toBe(1);

    // Filter by Agent 2
    const agent2Metrics = await adminCaller.analytics.metrics({
      filterByAgentId: agent2Id,
    });

    expect(agent2Metrics.totalLeads).toBeGreaterThanOrEqual(1);
    expect(agent2Metrics.totalDials).toBe(2);
  });

  it("agent should only see their own data", async () => {
    const agent1Caller = appRouter.createCaller({
      user: {
        id: agent1Id,
        openId: `agent1-${Date.now()}`,
        name: "Agent One",
        email: "agent1@test.com",
        role: "user",
      },
    } as any);

    const metrics = await agent1Caller.analytics.metrics();

    // Agent 1 should only see their own lead and call
    expect(metrics.totalLeads).toBeGreaterThanOrEqual(1);
    expect(metrics.totalDials).toBe(1);
  });

  it("agent cannot filter by another agent's ID", async () => {
    const agent1Caller = appRouter.createCaller({
      user: {
        id: agent1Id,
        openId: `agent1-${Date.now()}`,
        name: "Agent One",
        email: "agent1@test.com",
        role: "user",
      },
    } as any);

    // Agent 1 tries to filter by Agent 2's ID - should still only see their own data
    const metrics = await agent1Caller.analytics.metrics({
      filterByAgentId: agent2Id,
    });

    // Should still only see Agent 1's data (filterByAgentId is ignored for non-admin)
    expect(metrics.totalLeads).toBeGreaterThanOrEqual(1);
    expect(metrics.totalDials).toBe(1);
  });
});
