import { describe, expect, it, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { createLead, deleteLead, getAllLeads } from "./db";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createTestContext(role: "admin" | "user" = "user", userId: number = 1): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `test-user-${userId}`,
    email: `test${userId}@example.com`,
    name: `Test User ${userId}`,
    loginMethod: "manus",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("Lead Management", () => {
  it("should create a new lead", async () => {
    const ctx = createTestContext("user", 1);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.leads.create({
      companyName: "Test Company",
      contactName: "John Doe",
      phone: "+1234567890",
      email: "john@test.com",
      ownerId: 1,
    });

    expect(result).toHaveProperty("id");
    expect(typeof result.id).toBe("number");

    // Clean up
    if (result.id) {
      await deleteLead(result.id, 1, "user");
    }
  });

  it("should retrieve leads for a user", async () => {
    const ctx = createTestContext("user", 1);
    const caller = appRouter.createCaller(ctx);

    // Create a test lead
    const leadId = await createLead({
      companyName: "Test Company 2",
      contactName: "Jane Doe",
      ownerId: 1,
    });

    const leads = await caller.leads.list();
    expect(Array.isArray(leads)).toBe(true);
    expect(leads.length).toBeGreaterThan(0);

    // Clean up
    await deleteLead(leadId, 1, "user");
  });

  it("should update a lead", async () => {
    const ctx = createTestContext("user", 1);
    const caller = appRouter.createCaller(ctx);

    // Create a test lead
    const leadId = await createLead({
      companyName: "Test Company 3",
      contactName: "Bob Smith",
      ownerId: 1,
    });

    const result = await caller.leads.update({
      id: leadId,
      data: {
        stage: "attempting",
        phone: "+9876543210",
      },
    });

    expect(result.success).toBe(true);

    // Verify the update
    const lead = await caller.leads.getById({ id: leadId });
    expect(lead?.stage).toBe("attempting");
    expect(lead?.phone).toBe("+9876543210");

    // Clean up
    await deleteLead(leadId, 1, "user");
  });

  it("should enforce role-based access control", async () => {
    const adminCtx = createTestContext("admin", 1);
    const userCtx = createTestContext("user", 2);
    
    const adminCaller = appRouter.createCaller(adminCtx);
    const userCaller = appRouter.createCaller(userCtx);

    // Create a lead owned by user 1
    const leadId = await createLead({
      companyName: "Test Company 4",
      contactName: "Alice Johnson",
      ownerId: 1,
    });

    // Admin should see all leads
    const adminLeads = await adminCaller.leads.list();
    expect(adminLeads.length).toBeGreaterThan(0);

    // User 2 should not see user 1's leads
    const user2Leads = await userCaller.leads.list();
    const hasUser1Lead = user2Leads.some(lead => lead.id === leadId);
    expect(hasUser1Lead).toBe(false);

    // Clean up
    await deleteLead(leadId, 1, "admin");
  });
});

describe("Call Logging", () => {
  it("should log a call and increment dial attempts", async () => {
    const ctx = createTestContext("user", 1);
    const caller = appRouter.createCaller(ctx);

    // Create a test lead
    const leadId = await createLead({
      companyName: "Test Company 5",
      contactName: "Charlie Brown",
      ownerId: 1,
    });

    // Get initial dial attempts
    const leadBefore = await caller.leads.getById({ id: leadId });
    const initialAttempts = leadBefore?.dialAttempts || 0;

    // Log a call
    const callResult = await caller.calls.create({
      leadId,
      callDate: new Date(),
      callOutcome: "No Answer",
      callDuration: 30,
      notes: "Test call",
    });

    expect(callResult).toHaveProperty("id");

    // Verify dial attempts incremented
    const leadAfter = await caller.leads.getById({ id: leadId });
    expect(leadAfter?.dialAttempts).toBe(initialAttempts + 1);

    // Verify call log was created
    const callLogs = await caller.calls.byLead({ leadId });
    expect(callLogs.length).toBeGreaterThan(0);
    expect(callLogs[0]?.callOutcome).toBe("No Answer");

    // Clean up
    await deleteLead(leadId, 1, "user");
  });
});

describe("Analytics", () => {
  it("should calculate metrics correctly", async () => {
    const ctx = createTestContext("user", 1);
    const caller = appRouter.createCaller(ctx);

    const metrics = await caller.analytics.metrics();

    expect(metrics).toHaveProperty("totalLeads");
    expect(metrics).toHaveProperty("totalDials");
    expect(metrics).toHaveProperty("connectRate");
    expect(metrics).toHaveProperty("closeRate");
    expect(typeof metrics.totalLeads).toBe("number");
    expect(typeof metrics.connectRate).toBe("number");
  });

  it("should provide stage distribution", async () => {
    const ctx = createTestContext("user", 1);
    const caller = appRouter.createCaller(ctx);

    const distribution = await caller.analytics.stageDistribution();

    expect(Array.isArray(distribution)).toBe(true);
  });
});
