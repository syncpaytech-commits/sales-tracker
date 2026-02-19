import { describe, expect, it, beforeEach } from "vitest";
import { createCallLog, createLead, getLeadById, getTodosByUser } from "./db";

describe("Parked Stage & Callback Features", () => {
  let testLeadId: number;

  beforeEach(async () => {
    // Create a test lead
    testLeadId = await createLead({
      companyName: "Test Parking Company",
      contactName: "Test Contact",
      phone: "+1-555-0199",
      email: "test@example.com",
      stage: "new",
      dataSource: "Test",
      dataCohort: "Q1 2026",
      ownerId: 1,
    });
  });

  describe("Parked Stage Automation", () => {
    it("should NOT park lead after 4 no-contact attempts", async () => {
      // Log 4 no-contact calls
      for (let i = 0; i < 4; i++) {
        await createCallLog({
          leadId: testLeadId,
          callDate: new Date(),
          callOutcome: i % 2 === 0 ? "No Answer" : "Gatekeeper",
          callDuration: 0,
          notes: `Attempt ${i + 1}`,
          agentId: 1,
        });
      }

      const lead = await getLeadById(testLeadId, 1, "admin");
      expect(lead?.stage).not.toBe("parked");
      expect(lead?.dialAttempts).toBe(4);
    });

    it("should auto-park lead after 5 no-contact attempts", async () => {
      // Log 5 no-contact calls
      for (let i = 0; i < 5; i++) {
        await createCallLog({
          leadId: testLeadId,
          callDate: new Date(),
          callOutcome: i % 2 === 0 ? "No Answer" : "Gatekeeper",
          callDuration: 0,
          notes: `Attempt ${i + 1}`,
          agentId: 1,
        });
      }

      const lead = await getLeadById(testLeadId, 1, "admin");
      expect(lead?.stage).toBe("parked");
      expect(lead?.dialAttempts).toBe(5);
    });

    it("should NOT park lead if DM is reached before 5 attempts", async () => {
      // Log 3 no-contact calls
      for (let i = 0; i < 3; i++) {
        await createCallLog({
          leadId: testLeadId,
          callDate: new Date(),
          callOutcome: "No Answer",
          callDuration: 0,
          notes: `Attempt ${i + 1}`,
          agentId: 1,
        });
      }

      // 4th call reaches DM - this advances stage to dm_engaged
      await createCallLog({
        leadId: testLeadId,
        callDate: new Date(),
        callOutcome: "DM Reached",
        callDuration: 10,
        notes: "Finally reached DM",
        agentId: 1,
      });

      const lead = await getLeadById(testLeadId, 1, "admin");
      expect(lead?.stage).toBe("dm_engaged"); // Should be dm_engaged
      expect(lead?.dialAttempts).toBe(4);
    });

    it("should NOT park already closed leads", async () => {
      // Close the lead first
      await createCallLog({
        leadId: testLeadId,
        callDate: new Date(),
        callOutcome: "Not Interested",
        callDuration: 2,
        notes: "Not interested",
        agentId: 1,
      });

      const lead = await getLeadById(testLeadId, 1, "admin");
      expect(lead?.stage).toBe("closed_lost"); // Should be closed_lost
      expect(lead?.dialAttempts).toBe(1);
    });
  });

  describe("Callback Scheduling", () => {
    it("should create todo task when callback checkbox is used", async () => {
      const callbackDate = new Date();
      callbackDate.setDate(callbackDate.getDate() + 1); // Tomorrow

      await createCallLog({
        leadId: testLeadId,
        callDate: new Date(),
        callOutcome: "DM Reached",
        callDuration: 5,
        notes: "Spoke with DM, scheduling callback",
        agentId: 1,
        callbackScheduled: "Yes",
        callbackDate: callbackDate,
      });

      const todos = await getTodosByUser(1);
      const callbackTodo = todos.find(t => t.linkedLeadId === testLeadId);
      
      expect(callbackTodo).toBeDefined();
      expect(callbackTodo?.title).toContain("Callback");
      expect(callbackTodo?.title).toContain("Test Parking Company");
      expect(callbackTodo?.priority).toBe("high");
      expect(callbackTodo?.status).toBe("pending");
    });

    it("should NOT create todo when callback is not scheduled", async () => {
      const todosBefore = await getTodosByUser(1);
      const countBefore = todosBefore.length;

      await createCallLog({
        leadId: testLeadId,
        callDate: new Date(),
        callOutcome: "DM Reached",
        callDuration: 8,
        notes: "Spoke with DM, no callback needed",
        agentId: 1,
        callbackScheduled: "No",
      });

      const todosAfter = await getTodosByUser(1);
      const countAfter = todosAfter.length;
      
      expect(countAfter).toBe(countBefore); // No new todo created
    });
  });
});
