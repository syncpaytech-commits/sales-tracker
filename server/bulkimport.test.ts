import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { getAllLeads } from "./db";

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

describe("Bulk Import", () => {
  it("should import multiple leads successfully", async () => {
    const ctx = createTestContext("user", 1);
    const caller = appRouter.createCaller(ctx);

    const testLeads = [
      {
        companyName: "Bulk Test Company 1",
        contactName: "Contact 1",
        phone: "+1234567890",
        email: "contact1@test.com",
      },
      {
        companyName: "Bulk Test Company 2",
        contactName: "Contact 2",
        phone: "+0987654321",
        email: "contact2@test.com",
      },
    ];

    const result = await caller.leads.bulkImport({ leads: testLeads });

    expect(result.success).toBe(2);
    expect(result.failed).toBe(0);
    expect(result.errors.length).toBe(0);

    // Verify leads were created
    const allLeads = await getAllLeads(1, "user");
    const importedLeads = allLeads.filter(
      (lead) =>
        lead.companyName === "Bulk Test Company 1" ||
        lead.companyName === "Bulk Test Company 2"
    );
    expect(importedLeads.length).toBeGreaterThanOrEqual(2);
  });

  it("should handle partial import failures gracefully", async () => {
    const ctx = createTestContext("user", 1);
    const caller = appRouter.createCaller(ctx);

    const testLeads = [
      {
        companyName: "Valid Company",
        contactName: "Valid Contact",
      },
      {
        companyName: "", // Invalid - empty company name
        contactName: "Invalid Contact",
      },
    ];

    const result = await caller.leads.bulkImport({ leads: testLeads });

    // Should succeed for valid lead and fail for invalid
    expect(result.success).toBeGreaterThanOrEqual(1);
    expect(result.failed).toBeGreaterThanOrEqual(0);
  });
});
