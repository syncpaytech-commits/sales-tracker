import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  getAllLeads,
  getLeadById,
  createLead,
  updateLead,
  deleteLead,
  getLeadsByStage,
  getFollowUpsDueToday,
  getOverdueFollowUps,
  getCallLogsByLead,
  getCallLogsByOpportunity,
  createCallLog,
  getAnalyticsMetrics,
  getAgentMetrics,
  getStageDistribution,
  getUserByAuthId,
  getAllEmailTemplates,
  getEmailTemplateById,
  createEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplate,
  getTodosByUser,
  createTodo,
  updateTodo,
  deleteTodo,
  getAllOpportunities,
  getOpportunityById,
  createOpportunity,
  updateOpportunity,
  deleteOpportunity,
  getOpportunitiesByStage,
  markLeadAsConverted,
  getOpportunityStageDistribution,
  getActivityReport,
  getWeeklyReport,
  getLossReasonBreakdown,
  bulkDeleteLeads,
  getAuditLogs,
  createAuditLog,
  createNote,
  getLeadNotes,
} from "./db";

// Admin-only procedure
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,
  
  // Auth routes (Supabase handles auth, these are just for frontend state)
  auth: router({
    me: protectedProcedure.query(({ ctx }) => ctx.user),
    logout: publicProcedure.mutation(() => {
      // Supabase logout handled on client side
      return { success: true } as const;
    }),
  }),

  // Lead management
  leads: router({
    list: protectedProcedure
      .input(z.object({ hideConverted: z.boolean().optional() }).optional())
      .query(async ({ ctx, input }) => {
        const hideConverted = input?.hideConverted ?? true;
        return await getAllLeads(ctx.user.id, ctx.user.role, hideConverted);
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        return await getLeadById(input.id, ctx.user.id, ctx.user.role);
      }),

    create: protectedProcedure
      .input(z.object({
        companyName: z.string(),
        contactName: z.string(),
        phone: z.string().optional(),
        email: z.string().email().or(z.literal("")).optional(),
        provider: z.string().optional(),
        processingVolume: z.string().optional(),
        effectiveRate: z.string().optional(),
        dataSource: z.string().optional(),
        dataCohort: z.string().optional(),
        ownerId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && input.ownerId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Cannot create leads for other users" });
        }
        const leadId = await createLead(input);
        return { id: leadId };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        data: z.object({
          companyName: z.string().optional(),
          contactName: z.string().optional(),
          phone: z.string().optional(),
          email: z.string().optional(),
          provider: z.string().optional(),
          processingVolume: z.string().optional(),
          effectiveRate: z.string().optional(),
          dataSource: z.string().optional(),
          dataCohort: z.string().optional(),
          stage: z.enum(["new", "attempting", "dm_engaged", "email_sent", "statement_requested", "statement_received", "quoted", "negotiation", "closed_won", "closed_lost", "parked"]).optional(),
          dataVerified: z.enum(["Yes", "No"]).optional(),
          phoneValid: z.enum(["Yes", "No"]).optional(),
          emailValid: z.enum(["Yes", "No"]).optional(),
          correctDecisionMaker: z.enum(["Yes", "No"]).optional(),
          lastContactDate: z.date().optional(),
          nextFollowUpDate: z.date().optional(),
          followUpTime: z.string().optional(),
          quoteDate: z.date().optional(),
          quotedRate: z.string().optional(),
          expectedResidual: z.string().optional(),
          signedDate: z.date().optional(),
          actualResidual: z.string().optional(),
          onboardingStatus: z.string().optional(),
          lossReason: z.string().optional(),
          emailSent: z.enum(["Yes", "No"]).optional(),
          emailSentDate: z.date().optional(),
          quoteEmailTemplate: z.string().optional(),
        }),
      }))
      .mutation(async ({ ctx, input }) => {
        await updateLead(input.id, input.data, ctx.user.id, ctx.user.role);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const lead = await getLeadById(input.id, ctx.user.id, ctx.user.role);
        
        await deleteLead(input.id, ctx.user.id, ctx.user.role);
        
        if (lead) {
          await createAuditLog({
            entityType: 'lead',
            entityId: lead.id,
            entityName: lead.companyName,
            deletedBy: ctx.user.id,
            deletedByName: ctx.user.name || ctx.user.email || 'Unknown User',
            additionalInfo: JSON.stringify({
              contactName: lead.contactName,
              phone: lead.phone,
              email: lead.email,
              stage: lead.stage,
            }),
          });
        }
        
        return { success: true };
      }),

    bulkDelete: protectedProcedure
      .input(z.object({ leadIds: z.array(z.number()) }))
      .mutation(async ({ ctx, input }) => {
        const deletedCount = await bulkDeleteLeads(
          input.leadIds,
          ctx.user.id,
          ctx.user.name || ctx.user.email || 'Unknown User',
          ctx.user.role
        );
        return { success: true, deletedCount };
      }),

    bulkImport: protectedProcedure
      .input(z.object({
        leads: z.array(z.object({
          companyName: z.string(),
          contactName: z.string(),
          phone: z.string().optional(),
          email: z.string().optional(),
          provider: z.string().optional(),
          processingVolume: z.string().optional(),
          effectiveRate: z.string().optional(),
          dataSource: z.string().optional(),
          dataCohort: z.string().optional(),
        })),
      }))
      .mutation(async ({ ctx, input }) => {
        let success = 0;
        let failed = 0;
        const errors: string[] = [];
        
        for (const leadData of input.leads) {
          try {
            await createLead({
              ...leadData,
              ownerId: ctx.user.id,
            });
            success++;
          } catch (error: any) {
            failed++;
            const errorMsg = `Failed to import ${leadData.companyName}: ${error.message || 'Unknown error'}`;
            errors.push(errorMsg);
            console.error('Failed to import lead:', leadData, error);
          }
        }
        return { success, failed, errors, total: input.leads.length };
      }),

    bulkAssign: protectedProcedure
      .input(z.object({
        leadIds: z.array(z.number()),
        newOwnerId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can bulk assign leads" });
        }
        
        let assigned = 0;
        for (const leadId of input.leadIds) {
          try {
            await updateLead(leadId, { ownerId: input.newOwnerId }, ctx.user.id, ctx.user.role);
            assigned++;
          } catch (error) {
            console.error('Failed to assign lead:', leadId, error);
          }
        }
        return { assigned, total: input.leadIds.length };
      }),

    byStage: protectedProcedure
      .input(z.object({ stage: z.string() }))
      .query(async ({ ctx, input }) => {
        return await getLeadsByStage(input.stage, ctx.user.id, ctx.user.role);
      }),

    followUpsDueToday: protectedProcedure.query(async ({ ctx }) => {
      return await getFollowUpsDueToday(ctx.user.id, ctx.user.role);
    }),

    overdueFollowUps: protectedProcedure.query(async ({ ctx }) => {
      return await getOverdueFollowUps(ctx.user.id, ctx.user.role);
    }),
  }),

  // Notes management
  notes: router({  
    create: protectedProcedure
      .input(z.object({
        leadId: z.number(),
        content: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const lead = await getLeadById(input.leadId, ctx.user.id, ctx.user.role);
        if (!lead) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Lead not found or access denied" });
        }
        
        await createNote({
          leadId: input.leadId,
          content: input.content,
          createdBy: ctx.user.id,
          createdByName: ctx.user.name || ctx.user.email || 'Unknown User',
        });
        return { success: true };
      }),
      
    byLead: protectedProcedure
      .input(z.object({ leadId: z.number() }))
      .query(async ({ ctx, input }) => {
        const lead = await getLeadById(input.leadId, ctx.user.id, ctx.user.role);
        if (!lead) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Lead not found or access denied" });
        }
        return await getLeadNotes(input.leadId);
      }),
  }),

  // Call logging
  calls: router({
    byLead: protectedProcedure
      .input(z.object({ leadId: z.number() }))
      .query(async ({ ctx, input }) => {
        return await getCallLogsByLead(input.leadId, ctx.user.id, ctx.user.role);
      }),

    byOpportunity: protectedProcedure
      .input(z.object({ opportunityId: z.number() }))
      .query(async ({ ctx, input }) => {
        return await getCallLogsByOpportunity(input.opportunityId, ctx.user.id, ctx.user.role);
      }),

    create: protectedProcedure
      .input(z.object({
        leadId: z.number().optional(),
        opportunityId: z.number().optional(),
        callDate: z.date(),
        callOutcome: z.enum(["No Answer", "Gatekeeper", "DM Reached", "Callback Requested", "Email Requested", "Statement Agreed", "Not Interested", "Bad Data"]),
        notes: z.string().optional(),
        callbackScheduled: z.enum(["Yes", "No"]),
        callbackDate: z.date().optional(),
        agentId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (input.leadId) {
          const lead = await getLeadById(input.leadId, ctx.user.id, ctx.user.role);
          if (!lead) {
            throw new TRPCError({ code: "FORBIDDEN", message: "Lead not found or access denied" });
          }
        }
        
        if (input.opportunityId) {
          const opp = await getOpportunityById(input.opportunityId, ctx.user.id, ctx.user.role);
          if (!opp) {
            throw new TRPCError({ code: "FORBIDDEN", message: "Opportunity not found or access denied" });
          }
        }
        
        const callLogId = await createCallLog(input);
        return { id: callLogId };
      }),
  }),

  // Analytics
  analytics: router({
    metrics: protectedProcedure
      .input(z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        filterByAgentId: z.number().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        return await getAnalyticsMetrics(
          ctx.user.id,
          ctx.user.role,
          input?.startDate,
          input?.endDate,
          input?.filterByAgentId
        );
      }),

    agentMetrics: adminProcedure.query(async ({ ctx }) => {
      return await getAgentMetrics(ctx.user.role);
    }),

    stageDistribution: protectedProcedure.query(async ({ ctx }) => {
      return await getStageDistribution(ctx.user.id, ctx.user.role);
    }),

    opportunityStageDistribution: protectedProcedure.query(async ({ ctx }) => {
      return await getOpportunityStageDistribution(ctx.user.id, ctx.user.role);
    }),
  }),

  // Email templates
  emailTemplates: router({
    list: protectedProcedure.query(async () => {
      return await getAllEmailTemplates();
    }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await getEmailTemplateById(input.id);
      }),

    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        subject: z.string(),
        body: z.string(),
        category: z.string(),
      }))
      .mutation(async ({ input }) => {
        await createEmailTemplate(input);
        return { success: true };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string(),
        subject: z.string(),
        body: z.string(),
        category: z.string(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateEmailTemplate(id, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteEmailTemplate(input.id);
        return { success: true };
      }),
  }),

  // Todos
  todos: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await getTodosByUser(ctx.user.id);
    }),

    create: protectedProcedure
      .input(z.object({
        title: z.string(),
        description: z.string().optional(),
        dueDate: z.date().optional(),
        priority: z.enum(["low", "medium", "high"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const todoId = await createTodo({
          ...input,
          ownerId: ctx.user.id,
        });
        return { id: todoId };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        completed: z.boolean().optional(),
        dueDate: z.date().optional(),
        priority: z.enum(["low", "medium", "high"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await updateTodo(id, ctx.user.id, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteTodo(input.id, ctx.user.id);
        return { success: true };
      }),
   }),

  // Opportunities
  opportunities: router({ 
    list: protectedProcedure.query(async ({ ctx }) => {
      return await getAllOpportunities(ctx.user.id, ctx.user.role);
    }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        return await getOpportunityById(input.id, ctx.user.id, ctx.user.role);
      }),

    create: protectedProcedure
      .input(z.object({
        leadId: z.number(),
        name: z.string(),
        companyName: z.string(),
        contactName: z.string(),
        phone: z.string().optional(),
        email: z.string().optional(),
        dealValue: z.string().optional(),
        expectedCloseDate: z.date().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const oppId = await createOpportunity({
          ...input,
          ownerId: ctx.user.id,
        });
        
        await markLeadAsConverted(input.leadId, oppId);
        
        return { id: oppId };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        stage: z.enum(["qualified", "proposal", "negotiation", "closed_won", "closed_lost"]).optional(),
        dealValue: z.string().optional(),
        probability: z.number().optional(),
        expectedCloseDate: z.date().optional(),
        actualCloseDate: z.date().optional(),
        notes: z.string().optional(),
        lossReason: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        
        if (input.stage && (input.stage === "proposal" || input.stage === "negotiation")) {
          const stageLabel = input.stage === "proposal" ? "Proposal" : "Negotiation";
          await createNote({
            opportunityId: id,
            content: `Stage changed to ${stageLabel}`,
            createdBy: ctx.user.id,
            createdByName: ctx.user.name || ctx.user.email || 'Unknown User',
          });
        }
        
        if (input.stage && (input.stage === "closed_won" || input.stage === "closed_lost")) {
          if (!input.actualCloseDate) {
            data.actualCloseDate = new Date();
          }
        }
        
        await updateOpportunity(id, data, ctx.user.id, ctx.user.role);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const opp = await getOpportunityById(input.id, ctx.user.id, ctx.user.role);
        
        await deleteOpportunity(input.id, ctx.user.id, ctx.user.role);
        
        if (opp) {
          await createAuditLog({
            entityType: 'opportunity',
            entityId: opp.id,
            entityName: opp.name,
            deletedBy: ctx.user.id,
            deletedByName: ctx.user.name || ctx.user.email || 'Unknown User',
            additionalInfo: JSON.stringify({
              companyName: opp.companyName,
              stage: opp.stage,
              dealValue: opp.dealValue,
            }),
          });
        }
        
        return { success: true };
      }),

    byStage: protectedProcedure
      .input(z.object({ stage: z.string() }))
      .query(async ({ ctx, input }) => {
        return await getOpportunitiesByStage(input.stage, ctx.user.id, ctx.user.role);
      }),

    notes: protectedProcedure
      .input(z.object({ opportunityId: z.number() }))
      .query(async ({ input }) => {
        const { getOpportunityNotes } = await import("./db");
        return await getOpportunityNotes(input.opportunityId);
      }),

    callLogs: protectedProcedure
      .input(z.object({ opportunityId: z.number() }))
      .query(async ({ input }) => {
        const { getOpportunityCallLogs } = await import("./db");
        return await getOpportunityCallLogs(input.opportunityId);
      }),

    createNote: protectedProcedure
      .input(z.object({
        opportunityId: z.number(),
        content: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        await createNote({
          opportunityId: input.opportunityId,
          content: input.content,
          createdBy: ctx.user.id,
          createdByName: ctx.user.name || ctx.user.email || 'Unknown User',
        });
        return { success: true };
      }),
  }),

  // Reports
  reports: router({
    dailyActivity: protectedProcedure
      .input(z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        agentId: z.number().optional(),
      }))
      .query(async ({ ctx, input }) => {
        const start = input.startDate ? new Date(input.startDate) : undefined;
        const end = input.endDate ? new Date(input.endDate) : undefined;
        const userId = (ctx.user.role === "admin" && input.agentId) ? input.agentId : ctx.user.id;
        const role = (ctx.user.role === "admin" && !input.agentId) ? "admin" : "user";
        return await getActivityReport(userId, role, start, end);
      }),

    weeklyActivity: protectedProcedure
      .input(z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        agentId: z.number().optional(),
      }))
      .query(async ({ ctx, input }) => {
        const start = input.startDate ? new Date(input.startDate) : undefined;
        const end = input.endDate ? new Date(input.endDate) : undefined;
        const userId = (ctx.user.role === "admin" && input.agentId) ? input.agentId : ctx.user.id;
        const role = (ctx.user.role === "admin" && !input.agentId) ? "admin" : "user";
        return await getWeeklyReport(userId, role, start, end);
      }),

    lossReasonBreakdown: protectedProcedure
      .input(z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        agentId: z.number().optional(),
      }))
      .query(async ({ ctx, input }) => {
        const userId = (ctx.user.role === "admin" && input.agentId) ? input.agentId : ctx.user.id;
        return await getLossReasonBreakdown(userId, input.startDate, input.endDate);
      }),
  }),

  // Audit logs (admin only)
  auditLogs: router({
    list: adminProcedure.query(async () => {
      return await getAuditLogs();
    }),
  }),

  // Users
  users: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can list users" });
      }
      const { getAllUsers } = await import("./db");
      return await getAllUsers();
    }),

    updateRole: protectedProcedure
      .input(z.object({
        userId: z.number(),
        role: z.enum(["admin", "user"]),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can update roles" });
        }
        if (ctx.user.id === input.userId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot change your own role" });
        }
        const { updateUserRole } = await import("./db");
        await updateUserRole(input.userId, input.role);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
