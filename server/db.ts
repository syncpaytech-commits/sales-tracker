import { and, count, desc, eq, gte, isNotNull, isNull, lt, lte, notInArray, sql, inArray, or } from "drizzle-orm";
import { db } from "./_core/supabase.js";
import { InsertUser, users, callLogs, InsertCallLog, InsertLead, Lead, leads, todos, opportunities, notes, InsertNote, emailTemplates, auditLogs } from "../drizzle/schema";
import { ENV } from './_core/env';

// ============ USER QUERIES ============

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.auth_id) {
    throw new Error("User auth_id is required for upsert");
  }

  try {
    const values: InsertUser = {
      auth_id: user.auth_id,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.auth_id === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onConflictDoUpdate({
      target: users.auth_id,
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByAuthId(auth_id: string) {
  const result = await db.select().from(users).where(eq(users.auth_id, auth_id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============ LEAD QUERIES ============

export async function getAllLeads(userId?: number, role?: string, hideConverted: boolean = true) {
  // Admin can see all leads, regular users only see their own
  if (role === "admin") {
    if (hideConverted) {
      return await db.select().from(leads)
        .where(isNull(leads.opportunityId))
        .orderBy(desc(leads.createdAt));
    }
    return await db.select().from(leads).orderBy(desc(leads.createdAt));
  } else if (userId) {
    if (hideConverted) {
      return await db.select().from(leads)
        .where(and(eq(leads.ownerId, userId), isNull(leads.opportunityId)))
        .orderBy(desc(leads.createdAt));
    }
    return await db.select().from(leads)
      .where(eq(leads.ownerId, userId))
      .orderBy(desc(leads.createdAt));
  }
  return [];
}

export async function getLeadById(leadId: number, userId?: number, role?: string) {
  const result = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
  const lead = result[0];

  // Check access: admin can see all, users only their own
  if (!lead) return undefined;
  if (role === "admin" || lead.ownerId === userId) {
    return lead;
  }
  return undefined;
}

export async function createLead(data: InsertLead) {
  const result = await db.insert(leads).values(data).returning({ id: leads.id });
  return result[0].id;
}

export async function updateLead(leadId: number, data: Partial<Lead>, userId?: number, role?: string) {
  // Verify access
  const lead = await getLeadById(leadId, userId, role);
  if (!lead) throw new Error("Lead not found or access denied");

  await db.update(leads).set(data).where(eq(leads.id, leadId));
  return true;
}

export async function deleteLead(leadId: number, userId?: number, role?: string) {
  // Verify access
  const lead = await getLeadById(leadId, userId, role);
  if (!lead) throw new Error("Lead not found or access denied");

  await db.delete(leads).where(eq(leads.id, leadId));
  return true;
}

export async function getLeadsByStage(stage: string, userId?: number, role?: string) {
  if (role === "admin") {
    return await db.select().from(leads).where(eq(leads.stage, stage as any)).orderBy(desc(leads.createdAt));
  } else if (userId) {
    return await db.select().from(leads).where(and(eq(leads.stage, stage as any), eq(leads.ownerId, userId))).orderBy(desc(leads.createdAt));
  }
  return [];
}

export async function getFollowUpsDueToday(userId?: number, role?: string) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const startOfYesterday = new Date();
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  startOfYesterday.setHours(0, 0, 0, 0);
  
  const endOfYesterday = new Date();
  endOfYesterday.setDate(endOfYesterday.getDate() - 1);
  endOfYesterday.setHours(23, 59, 59, 999);

  const followUps: any[] = [];

  // Get leads with callbacks due today
  if (role === "admin") {
    const leadsWithCallbacks = await db.select().from(leads)
      .where(and(
        notInArray(leads.stage, ["closed_won", "closed_lost"]),
        isNotNull(leads.nextFollowUpDate),
        gte(leads.nextFollowUpDate, startOfToday),
        lte(leads.nextFollowUpDate, endOfToday)
      ))
      .orderBy(leads.nextFollowUpDate);
    followUps.push(...leadsWithCallbacks);
  } else if (userId) {
    const leadsWithCallbacks = await db.select().from(leads)
      .where(and(
        eq(leads.ownerId, userId),
        notInArray(leads.stage, ["closed_won", "closed_lost"]),
        isNotNull(leads.nextFollowUpDate),
        gte(leads.nextFollowUpDate, startOfToday),
        lte(leads.nextFollowUpDate, endOfToday)
      ))
      .orderBy(leads.nextFollowUpDate);
    followUps.push(...leadsWithCallbacks);
  }

  // Get opportunities that reached Proposal or Negotiation stage yesterday
  const stageChangeNotes = await db.select().from(notes)
    .where(and(
      or(
        sql`${notes.content} LIKE '%Stage changed to Proposal%'`,
        sql`${notes.content} LIKE '%Stage changed to Negotiation%'`
      ),
      gte(notes.createdAt, startOfYesterday),
      lte(notes.createdAt, endOfYesterday)
    ));

  const oppIds = stageChangeNotes.filter(n => n.opportunityId).map(n => n.opportunityId!);
  if (oppIds.length > 0) {
    if (role === "admin") {
      const opps = await db.select().from(opportunities)
        .where(inArray(opportunities.id, oppIds));
      followUps.push(...opps.map(o => ({ ...o, isOpportunity: true })));
    } else if (userId) {
      const opps = await db.select().from(opportunities)
        .where(and(
          eq(opportunities.ownerId, userId),
          inArray(opportunities.id, oppIds)
        ));
      followUps.push(...opps.map(o => ({ ...o, isOpportunity: true })));
    }
  }

  return followUps;
}

export async function getOverdueFollowUps(userId?: number, role?: string) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  twoDaysAgo.setHours(0, 0, 0, 0);

  const overdueItems: any[] = [];

  // Get leads with overdue callbacks
  if (role === "admin") {
    const overdueLeads = await db.select().from(leads)
      .where(and(
        isNotNull(leads.nextFollowUpDate),
        lt(leads.nextFollowUpDate, startOfToday),
        notInArray(leads.stage, ["closed_won", "closed_lost"])
      ))
      .orderBy(leads.nextFollowUpDate);
    overdueItems.push(...overdueLeads);
  } else if (userId) {
    const overdueLeads = await db.select().from(leads)
      .where(and(
        eq(leads.ownerId, userId),
        isNotNull(leads.nextFollowUpDate),
        lt(leads.nextFollowUpDate, startOfToday),
        notInArray(leads.stage, ["closed_won", "closed_lost"])
      ))
      .orderBy(leads.nextFollowUpDate);
    overdueItems.push(...overdueLeads);
  }

  // Get opportunities in Proposal/Negotiation stage for >1 day with no calls since
  const stageChangeNotes = await db.select().from(notes)
    .where(and(
      or(
        sql`${notes.content} LIKE '%Stage changed to Proposal%'`,
        sql`${notes.content} LIKE '%Stage changed to Negotiation%'`
      ),
      lt(notes.createdAt, twoDaysAgo)
    ));

  for (const note of stageChangeNotes) {
    if (!note.opportunityId) continue;
    
    let opp;
    if (role === "admin") {
      const oppResult = await db.select().from(opportunities)
        .where(eq(opportunities.id, note.opportunityId))
        .limit(1);
      opp = oppResult[0];
    } else if (userId) {
      const oppResult = await db.select().from(opportunities)
        .where(and(
          eq(opportunities.id, note.opportunityId),
          eq(opportunities.ownerId, userId)
        ))
        .limit(1);
      opp = oppResult[0];
    }

    if (!opp) continue;

    const callsSinceStageChange = await db.select().from(callLogs)
      .where(and(
        eq(callLogs.opportunityId, note.opportunityId),
        gte(callLogs.createdAt, note.createdAt)
      ));

    if (callsSinceStageChange.length === 0) {
      overdueItems.push({ ...opp, isOpportunity: true });
    }
  }

  return overdueItems;
}

// ============ CALL LOG QUERIES ============

export async function getCallLogsByLead(leadId: number, userId?: number, role?: string) {
  const lead = await getLeadById(leadId, userId, role);
  if (!lead) return [];

  return await db.select().from(callLogs).where(eq(callLogs.leadId, leadId)).orderBy(desc(callLogs.callDate));
}

export async function getCallLogsByOpportunity(opportunityId: number, userId?: number, role?: string) {
  const opportunity = await getOpportunityById(opportunityId, userId, role);
  if (!opportunity) return [];

  const opp = await db.select().from(opportunities).where(eq(opportunities.id, opportunityId)).limit(1);
  if (opp.length === 0) return [];
  
  const leadId = opp[0].leadId;
  
  return await db.select().from(callLogs)
    .where(or(
      eq(callLogs.opportunityId, opportunityId),
      eq(callLogs.leadId, leadId)
    ))
    .orderBy(desc(callLogs.callDate));
}

export async function createCallLog(data: InsertCallLog) {
  const result = await db.insert(callLogs).values(data).returning({ id: callLogs.id });
  
  const outcomeToStage: Record<string, string> = {
    "No Answer": "attempting",
    "Gatekeeper": "attempting",
    "DM Reached": "dm_engaged",
    "Callback Requested": "dm_engaged",
    "Email Requested": "email_sent",
    "Statement Agreed": "statement_requested",
    "Not Interested": "closed_lost",
    "Bad Data": "closed_lost",
  };
  
  if (data.leadId) {
    const [currentLead] = await db.select().from(leads).where(eq(leads.id, data.leadId)).limit(1);
    if (!currentLead) throw new Error("Lead not found");
  
    const newStage = outcomeToStage[data.callOutcome];
    const newDialAttempts = (currentLead.dialAttempts || 0) + 1;
    const noContactOutcomes = ["No Answer", "Gatekeeper"];
    
    const updateData: any = { dialAttempts: newDialAttempts };
    
    if (newStage) {
      updateData.stage = newStage;
      
      if (newStage === "closed_lost") {
        updateData.closedDate = new Date();
        if (data.callOutcome === "Not Interested") {
          updateData.lossReason = "Not Interested";
        } else if (data.callOutcome === "Bad Data") {
          updateData.lossReason = "Bad Data";
        }
      }
      
      const earlyStages = ["new", "attempting"];
      if (newStage === "attempting" && noContactOutcomes.includes(data.callOutcome) && newDialAttempts >= 5 && earlyStages.includes(currentLead.stage)) {
        updateData.stage = "parked";
      }
    }
    
    await db.update(leads)
      .set(updateData)
      .where(eq(leads.id, data.leadId));
    
    if (data.callbackScheduled === "Yes" && data.callbackDate && data.agentId) {
      await db.insert(todos).values({
        ownerId: data.agentId,
        title: `Callback: ${currentLead?.companyName || 'Lead'}`,
        description: `Scheduled callback for lead ID ${data.leadId}`,
        dueDate: data.callbackDate,
        priority: "high",
        status: "pending",
        linkedLeadId: data.leadId,
      });
    }
  }

  return result[0].id;
}

// ============ ANALYTICS QUERIES ============

export async function getAnalyticsMetrics(userId?: number, role?: string, startDate?: Date, endDate?: Date, filterByAgentId?: number) {
  const effectiveUserId = (role === "admin" && filterByAgentId) ? filterByAgentId : userId;
  const effectiveRole = (role === "admin" && filterByAgentId) ? "user" : role;

  let allLeads = await getAllLeads(effectiveUserId, effectiveRole, false);
  
  if (startDate || endDate) {
    allLeads = allLeads.filter(lead => {
      const createdAt = new Date(lead.createdAt);
      if (startDate && createdAt < startDate) return false;
      if (endDate && createdAt > endDate) return false;
      return true;
    });
  }
  
  const allOpportunities = await getAllOpportunities(effectiveUserId, effectiveRole);
  
  const leadIds = allLeads.map(l => l.id);
  let allCalls: any[] = [];
  if (leadIds.length > 0) {
    allCalls = await db.select().from(callLogs).where(inArray(callLogs.leadId, leadIds));
  }

  const totalLeads = allLeads.length;
  const totalDials = allCalls.length;
  
  const dmReachedCalls = allCalls.filter(c => c.callOutcome === "DM Reached");
  const connectRate = totalDials > 0 ? (dmReachedCalls.length / totalDials) * 100 : 0;
  
  const leadsWithDMReached = new Set(dmReachedCalls.map(c => c.leadId));
  const dmRate = totalLeads > 0 ? (leadsWithDMReached.size / totalLeads) * 100 : 0;
  
  const avgCallsToReachDM = leadsWithDMReached.size > 0 ? dmReachedCalls.length / leadsWithDMReached.size : 0;
  
  const statementsAgreed = allCalls.filter(c => c.callOutcome === "Statement Agreed").length;
  const quoted = allLeads.filter(l => l.stage === "quoted" || l.stage === "negotiation" || l.stage === "closed_won").length;
  
  const wonOpportunities = allOpportunities.filter(o => o.stage === "closed_won");
  const totalCallsToClosedWon = wonOpportunities.reduce((sum, opp) => {
    const linkedLead = allLeads.find(l => l.id === opp.leadId);
    if (linkedLead) {
      const leadCalls = allCalls.filter(c => c.leadId === linkedLead.id);
      return sum + leadCalls.length;
    }
    return sum;
  }, 0);
  const avgCallsToClosedWon = wonOpportunities.length > 0 ? totalCallsToClosedWon / wonOpportunities.length : 0;
  
  const statementRate = totalLeads > 0 ? (statementsAgreed / totalLeads) * 100 : 0;
  const quoteRate = totalLeads > 0 ? (quoted / totalLeads) * 100 : 0;
  
  const opportunitiesWonCount = allOpportunities.filter(o => o.stage === "closed_won").length;
  const closeRate = allOpportunities.length > 0 ? (opportunitiesWonCount / allOpportunities.length) * 100 : 0;
  
  const endToEndConversion = totalLeads > 0 ? (opportunitiesWonCount / totalLeads) * 100 : 0;

  const wonLeads = allLeads.filter(l => l.stage === "closed_won");
  const totalMRR = wonLeads.reduce((sum, l) => {
    const residual = parseFloat(l.actualResidual || "0");
    return sum + residual;
  }, 0);
  const avgResidual = wonLeads.length > 0 ? totalMRR / wonLeads.length : 0;

  const badData = allLeads.filter(l => l.phoneValid === "No" || l.emailValid === "No").length;
  const badDataPercent = totalLeads > 0 ? (badData / totalLeads) * 100 : 0;

  const convertedLeads = allLeads.filter(l => l.convertedToOpportunity === "Yes").length;
  const leadToOpportunityRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;
  
  const totalOpportunities = allOpportunities.length;
  const opportunitiesWon = allOpportunities.filter(o => o.stage === "closed_won").length;
  const opportunitiesLost = allOpportunities.filter(o => o.stage === "closed_lost").length;
  const opportunityWinRate = totalOpportunities > 0 ? (opportunitiesWon / totalOpportunities) * 100 : 0;
  
  const totalPipelineValue = allOpportunities
    .filter(o => o.stage !== "closed_won" && o.stage !== "closed_lost")
    .reduce((sum, o) => sum + parseFloat(o.dealValue || "0"), 0);
  
  const avgDealSize = totalOpportunities > 0 
    ? allOpportunities.reduce((sum, o) => sum + parseFloat(o.dealValue || "0"), 0) / totalOpportunities 
    : 0;
  
  const forecastedRevenue = allOpportunities
    .filter(o => o.stage !== "closed_won" && o.stage !== "closed_lost")
    .reduce((sum, o) => {
      const value = parseFloat(o.dealValue || "0");
      const probability = (o.probability || 0) / 100;
      return sum + (value * probability);
    }, 0);

  return {
    totalLeads,
    totalDials,
    connectRate,
    dmRate,
    avgCallsToReachDM,
    avgCallsToClosedWon,
    statementRate,
    quoteRate,
    closeRate,
    endToEndConversion,
    totalMRR,
    avgResidual,
    badDataPercent,
    totalOpportunities,
    leadToOpportunityRate,
    opportunityWinRate,
    totalPipelineValue,
    avgDealSize,
    forecastedRevenue,
  };
}

export async function getAgentMetrics(role?: string) {
  if (role !== "admin") return [];

  const allUsers = await db.select().from(users);
  
  const metrics = [];
  for (const agent of allUsers) {
    const agentLeads = await getAllLeads(agent.id, "user", false);
    const leadIds = agentLeads.map(l => l.id);
    
    let agentCalls: any[] = [];
    if (leadIds.length > 0) {
      agentCalls = await db.select().from(callLogs).where(inArray(callLogs.leadId, leadIds));
    }

    const totalLeads = agentLeads.length;
    const totalDials = agentCalls.length;
    const dmReached = agentCalls.filter(c => c.callOutcome === "DM Reached").length;
    const statementsAgreed = agentCalls.filter(c => c.callOutcome === "Statement Agreed").length;
    const quoted = agentLeads.filter(l => l.stage === "quoted" || l.stage === "negotiation" || l.stage === "closed_won").length;
    const closedWon = agentLeads.filter(l => l.stage === "closed_won").length;

    const connectPercent = totalDials > 0 ? (dmReached / totalDials) * 100 : 0;
    const statementPercent = totalLeads > 0 ? (statementsAgreed / totalLeads) * 100 : 0;
    const quotePercent = totalLeads > 0 ? (quoted / totalLeads) * 100 : 0;
    const closePercent = totalLeads > 0 ? (closedWon / totalLeads) * 100 : 0;

    metrics.push({
      agentId: agent.id,
      agentName: agent.name || agent.email || "Unknown",
      totalLeads,
      totalDials,
      connectPercent,
      statementPercent,
      quotePercent,
      closePercent,
      wins: closedWon,
    });
  }

  return metrics;
}

export async function getStageDistribution(userId?: number, role?: string) {
  const allLeads = await getAllLeads(userId, role, false);
  
  const distribution: Record<string, number> = {};
  allLeads.forEach(lead => {
    distribution[lead.stage] = (distribution[lead.stage] || 0) + 1;
  });

  return Object.entries(distribution).map(([stage, count]) => ({ stage, count }));
}

export async function getOpportunityStageDistribution(userId?: number, role?: string) {
  const allOpportunities = await getAllOpportunities(userId, role);
  
  const distribution: Record<string, number> = {};
  allOpportunities.forEach(opp => {
    distribution[opp.stage] = (distribution[opp.stage] || 0) + 1;
  });

  return Object.entries(distribution).map(([stage, count]) => ({ stage, count }));
}

// ============ EMAIL TEMPLATES ============

export async function getAllEmailTemplates() {
  return await db.select().from(emailTemplates).where(eq(emailTemplates.isActive, true));
}

export async function getEmailTemplateById(id: number) {
  const result = await db.select().from(emailTemplates).where(eq(emailTemplates.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createEmailTemplate(data: { name: string; subject: string; body: string; category: string }) {
  await db.insert(emailTemplates).values({
    name: data.name,
    subject: data.subject,
    body: data.body,
    category: data.category as "cold_outreach" | "follow_up" | "quote" | "closing" | "nurture",
    isActive: true,
  });
}

export async function updateEmailTemplate(id: number, data: { name: string; subject: string; body: string; category: string }) {
  await db.update(emailTemplates).set({
    name: data.name,
    subject: data.subject,
    body: data.body,
    category: data.category as "cold_outreach" | "follow_up" | "quote" | "closing" | "nurture",
  }).where(eq(emailTemplates.id, id));
}

export async function deleteEmailTemplate(id: number) {
  await db.update(emailTemplates).set({ isActive: false }).where(eq(emailTemplates.id, id));
}

// ============ TODOS ============

export async function getTodosByUser(userId: number) {
  return await db.select().from(todos).where(eq(todos.ownerId, userId)).orderBy(desc(todos.createdAt));
}

export async function createTodo(data: { ownerId: number; title: string; description?: string; dueDate?: Date; priority?: "low" | "medium" | "high" }) {
  const result = await db.insert(todos).values(data).returning({ id: todos.id });
  return result[0].id;
}

export async function updateTodo(id: number, userId: number, data: { title?: string; description?: string; completed?: boolean; dueDate?: Date; priority?: "low" | "medium" | "high" }) {
  await db.update(todos).set(data).where(and(eq(todos.id, id), eq(todos.ownerId, userId)));
}

export async function deleteTodo(id: number, userId: number) {
  await db.delete(todos).where(and(eq(todos.id, id), eq(todos.ownerId, userId)));
}

// ============ OPPORTUNITIES ============

export async function getAllOpportunities(userId?: number, role?: string) {
  if (role === "admin") {
    return await db.select().from(opportunities).orderBy(desc(opportunities.createdAt));
  }
  
  return await db.select().from(opportunities).where(eq(opportunities.ownerId, userId!)).orderBy(desc(opportunities.createdAt));
}

export async function getOpportunityById(id: number, userId?: number, role?: string) {
  let query = db.select().from(opportunities).where(eq(opportunities.id, id));
  
  if (role !== "admin") {
    query = db.select().from(opportunities).where(and(eq(opportunities.id, id), eq(opportunities.ownerId, userId!)));
  }
  
  const result = await query.limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createOpportunity(data: {
  leadId: number;
  name: string;
  companyName: string;
  contactName: string;
  phone?: string;
  email?: string;
  ownerId: number;
  dealValue?: string;
  expectedCloseDate?: Date;
  notes?: string;
}) {
  const result = await db.insert(opportunities).values(data).returning({ id: opportunities.id });
  return result[0].id;
}

export async function updateOpportunity(id: number, data: Partial<{
  name: string;
  stage: "qualified" | "proposal" | "negotiation" | "closed_won" | "closed_lost";
  dealValue: string;
  probability: number;
  expectedCloseDate: Date;
  actualCloseDate: Date;
  notes: string;
  lossReason: string;
}>, userId?: number, role?: string) {
  if (role === "admin") {
    await db.update(opportunities).set(data).where(eq(opportunities.id, id));
  } else {
    await db.update(opportunities).set(data).where(and(eq(opportunities.id, id), eq(opportunities.ownerId, userId!)));
  }
}

export async function deleteOpportunity(id: number, userId?: number, role?: string) {
  if (role === "admin") {
    await db.delete(opportunities).where(eq(opportunities.id, id));
  } else {
    await db.delete(opportunities).where(and(eq(opportunities.id, id), eq(opportunities.ownerId, userId!)));
  }
}

export async function getOpportunitiesByStage(stage: string, userId?: number, role?: string) {
  if (role === "admin") {
    return await db.select().from(opportunities).where(eq(opportunities.stage, stage as any));
  }
  
  return await db.select().from(opportunities).where(and(eq(opportunities.stage, stage as any), eq(opportunities.ownerId, userId!)));
}

// ============ AUTO-CONVERSION LOGIC ============

export async function autoConvertLeadToOpportunity(leadId: number) {
  const leadResult = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
  if (leadResult.length === 0) return null;
  
  const lead = leadResult[0];
  
  const shouldConvert = 
    lead.stage === "dm_engaged" && 
    lead.convertedToOpportunity === "No";
  
  if (!shouldConvert) return null;
  
  const opportunityData = {
    leadId: lead.id,
    name: `${lead.companyName} - Deal`,
    companyName: lead.companyName,
    contactName: lead.contactName,
    phone: lead.phone,
    email: lead.email,
    ownerId: lead.ownerId,
    stage: "qualified" as const,
    probability: 50,
    dealValue: lead.processingVolume || undefined,
    notes: `Auto-converted from lead #${lead.id} when DM was engaged.`,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  const oppResult = await db.insert(opportunities).values(opportunityData).returning({ id: opportunities.id });
  const opportunityId = oppResult[0].id;
  
  await db.update(leads)
    .set({
      convertedToOpportunity: "Yes",
      opportunityId: opportunityId,
      conversionDate: new Date(),
    })
    .where(eq(leads.id, leadId));
  
  return opportunityId;
}

export async function markLeadAsConverted(leadId: number, opportunityId: number) {
  await db.update(leads)
    .set({
      convertedToOpportunity: "Yes",
      opportunityId: opportunityId,
      conversionDate: new Date(),
    })
    .where(eq(leads.id, leadId));
}

// ============ TIME-BASED REPORTING QUERIES ============

export async function getActivityReport(userId?: number, role?: string, startDate?: Date, endDate?: Date) {
  const start = startDate || new Date('2000-01-01');
  const end = endDate || new Date();

  const allLeads = await getAllLeads(userId, role, false);
  const allOpportunities = await getAllOpportunities(userId, role);
  
  const leadIds = allLeads.map(l => l.id);
  
  let calls: any[] = [];
  if (leadIds.length > 0) {
    calls = await db.select().from(callLogs).where(
      and(
        inArray(callLogs.leadId, leadIds),
        gte(callLogs.createdAt, start),
        lte(callLogs.createdAt, end)
      )
    );
  }

  const dailyActivity: Record<string, any> = {};
  
  calls.forEach(call => {
    const date = new Date(call.createdAt).toISOString().split('T')[0];
    if (!dailyActivity[date]) {
      dailyActivity[date] = {
        date,
        totalCalls: 0,
        dmReached: 0,
        callbacks: 0,
        businesses: new Set(),
        opportunitiesCreated: 0,
        opportunitiesWon: 0,
        opportunitiesLost: 0,
        wonValue: 0,
        lostValue: 0,
        lostReasons: [] as string[],
      };
    }
    
    dailyActivity[date].totalCalls++;
    if (call.callOutcome === 'DM Reached') dailyActivity[date].dmReached++;
    if (call.callbackScheduled === 'Yes') dailyActivity[date].callbacks++;
    
    const lead = allLeads.find(l => l.id === call.leadId);
    if (lead) dailyActivity[date].businesses.add(lead.companyName);
  });
  
  allOpportunities.forEach(opp => {
    const createdDate = new Date(opp.createdAt).toISOString().split('T')[0];
    if (new Date(opp.createdAt) >= start && new Date(opp.createdAt) <= end) {
      if (!dailyActivity[createdDate]) {
        dailyActivity[createdDate] = {
          date: createdDate,
          totalCalls: 0,
          dmReached: 0,
          callbacks: 0,
          businesses: new Set(),
          opportunitiesCreated: 0,
          opportunitiesWon: 0,
          opportunitiesLost: 0,
          wonValue: 0,
          lostValue: 0,
          lostReasons: [] as string[],
        };
      }
      dailyActivity[createdDate].opportunitiesCreated++;
    }
    
    if (opp.stage === 'closed_won' && opp.actualCloseDate) {
      const closeDate = new Date(opp.actualCloseDate).toISOString().split('T')[0];
      if (new Date(opp.actualCloseDate) >= start && new Date(opp.actualCloseDate) <= end) {
        if (!dailyActivity[closeDate]) {
          dailyActivity[closeDate] = {
            date: closeDate,
            totalCalls: 0,
            dmReached: 0,
            callbacks: 0,
            businesses: new Set(),
            opportunitiesCreated: 0,
            opportunitiesWon: 0,
            opportunitiesLost: 0,
            wonValue: 0,
            lostValue: 0,
            lostReasons: [] as string[],
          };
        }
        dailyActivity[closeDate].opportunitiesWon++;
        const value = parseFloat(opp.dealValue?.replace(/[^0-9.]/g, '') || '0');
        dailyActivity[closeDate].wonValue += value;
      }
    } else if (opp.stage === 'closed_lost' && opp.actualCloseDate) {
      const closeDate = new Date(opp.actualCloseDate).toISOString().split('T')[0];
      if (new Date(opp.actualCloseDate) >= start && new Date(opp.actualCloseDate) <= end) {
        if (!dailyActivity[closeDate]) {
          dailyActivity[closeDate] = {
            date: closeDate,
            totalCalls: 0,
            dmReached: 0,
            callbacks: 0,
            businesses: new Set(),
            opportunitiesCreated: 0,
            opportunitiesWon: 0,
            opportunitiesLost: 0,
            wonValue: 0,
            lostValue: 0,
            lostReasons: [] as string[],
          };
        }
        dailyActivity[closeDate].opportunitiesLost++;
        const value = parseFloat(opp.dealValue?.replace(/[^0-9.]/g, '') || '0');
        dailyActivity[closeDate].lostValue += value;
        if (opp.lossReason) dailyActivity[closeDate].lostReasons.push(opp.lossReason);
      }
    }
  });

  const report = Object.values(dailyActivity).map((day: any) => ({
    ...day,
    businessesContacted: Array.from(day.businesses),
    businessCount: day.businesses.size,
  })).sort((a, b) => a.date.localeCompare(b.date));

  return report;
}

export async function getWeeklyReport(userId?: number, role?: string, startDate?: Date, endDate?: Date) {
  const dailyReport = await getActivityReport(userId, role, startDate, endDate);
  if (!dailyReport) return null;

  const weeklyActivity: Record<string, any> = {};
  
  dailyReport.forEach((day: any) => {
    const date = new Date(day.date);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    const weekKey = weekStart.toISOString().split('T')[0];
    
    if (!weeklyActivity[weekKey]) {
      weeklyActivity[weekKey] = {
        weekStart: weekKey,
        totalCalls: 0,
        dmReached: 0,
        callbacks: 0,
        businesses: new Set(),
        opportunitiesCreated: 0,
        opportunitiesWon: 0,
        opportunitiesLost: 0,
        wonValue: 0,
        lostValue: 0,
        lostReasons: [] as string[],
        days: [],
      };
    }
    
    weeklyActivity[weekKey].totalCalls += day.totalCalls;
    weeklyActivity[weekKey].dmReached += day.dmReached;
    weeklyActivity[weekKey].callbacks += day.callbacks;
    weeklyActivity[weekKey].opportunitiesCreated += day.opportunitiesCreated || 0;
    weeklyActivity[weekKey].opportunitiesWon += day.opportunitiesWon || 0;
    weeklyActivity[weekKey].opportunitiesLost += day.opportunitiesLost || 0;
    weeklyActivity[weekKey].wonValue += day.wonValue || 0;
    weeklyActivity[weekKey].lostValue += day.lostValue || 0;
    if (day.lostReasons) weeklyActivity[weekKey].lostReasons.push(...day.lostReasons);
    day.businessesContacted.forEach((b: string) => weeklyActivity[weekKey].businesses.add(b));
    weeklyActivity[weekKey].days.push(day);
  });

  const report = Object.values(weeklyActivity).map((week: any) => ({
    ...week,
    businessesContacted: Array.from(week.businesses),
    businessCount: week.businesses.size,
  })).sort((a, b) => a.weekStart.localeCompare(b.weekStart));

  return report;
}

export async function getLossReasonBreakdown(userId: number, startDate?: string, endDate?: string) {
  let conditions = [
    eq(opportunities.ownerId, userId),
    eq(opportunities.stage, 'closed_lost'),
    isNotNull(opportunities.lossReason)
  ];

  if (startDate) {
    conditions.push(gte(opportunities.createdAt, new Date(startDate)));
  }
  if (endDate) {
    conditions.push(lte(opportunities.createdAt, new Date(endDate)));
  }

  const results = await db
    .select({
      reason: opportunities.lossReason,
      count: sql<number>`count(*)`.as('count'),
    })
    .from(opportunities)
    .where(and(...conditions))
    .groupBy(opportunities.lossReason);
  
  return results.map((r: any) => ({
    reason: r.reason || 'Unknown',
    count: Number(r.count),
  }));
}

// ============ AUDIT LOG FUNCTIONS ============

export async function createAuditLog(data: {
  entityType: 'lead' | 'opportunity';
  entityId: number;
  entityName: string;
  deletedBy: number;
  deletedByName: string;
  additionalInfo?: string;
}) {
  await db.insert(auditLogs).values({
    entityType: data.entityType,
    entityId: data.entityId,
    entityName: data.entityName,
    deletedBy: data.deletedBy,
    deletedByName: data.deletedByName,
    additionalInfo: data.additionalInfo,
    deletedAt: new Date(),
  });
}

export async function getAuditLogs() {
  return await db.select().from(auditLogs).orderBy(desc(auditLogs.deletedAt));
}

// ============ BULK DELETE FUNCTIONS ============

export async function bulkDeleteLeads(leadIds: number[], userId: number, userName: string, role?: string) {
  const leadsToDelete = await db.select().from(leads).where(inArray(leads.id, leadIds));
  
  if (role === "admin") {
    await db.delete(leads).where(inArray(leads.id, leadIds));
  } else {
    await db.delete(leads).where(and(inArray(leads.id, leadIds), eq(leads.ownerId, userId)));
  }
  
  for (const lead of leadsToDelete) {
    await createAuditLog({
      entityType: 'lead',
      entityId: lead.id,
      entityName: lead.companyName,
      deletedBy: userId,
      deletedByName: userName,
      additionalInfo: JSON.stringify({
        contactName: lead.contactName,
        phone: lead.phone,
        email: lead.email,
        stage: lead.stage,
      }),
    });
  }
  
  return leadsToDelete.length;
}

// ============ NOTE FUNCTIONS ============

export async function createNote(data: InsertNote) {
  await db.insert(notes).values(data);
}

export async function getLeadNotes(leadId: number) {
  return await db.select().from(notes).where(eq(notes.leadId, leadId)).orderBy(desc(notes.createdAt));
}

export async function getOpportunityNotes(opportunityId: number) {
  const opp = await db.select().from(opportunities).where(eq(opportunities.id, opportunityId)).limit(1);
  
  if (opp.length === 0) return [];
  
  const leadId = opp[0].leadId;
  
  return await db.select().from(notes)
    .where(or(
      eq(notes.opportunityId, opportunityId),
      eq(notes.leadId, leadId)
    ))
    .orderBy(desc(notes.createdAt));
}

export async function getOpportunityCallLogs(opportunityId: number) {
  const opp = await db.select().from(opportunities).where(eq(opportunities.id, opportunityId)).limit(1);
  
  if (opp.length === 0) return [];
  
  const leadId = opp[0].leadId;
  
  return await db.select().from(callLogs)
    .where(or(
      eq(callLogs.opportunityId, opportunityId),
      eq(callLogs.leadId, leadId)
    ))
    .orderBy(desc(callLogs.callDate));
}

// ============ USER MANAGEMENT FUNCTIONS ============

export async function getAllUsers() {
  return await db.select().from(users);
}

export async function updateUserRole(userId: number, role: "admin" | "user") {
  await db.update(users).set({ role }).where(eq(users.id, userId));
}
