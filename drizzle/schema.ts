import { pgTable, serial, varchar, text, timestamp, integer, pgEnum, boolean } from "drizzle-orm/pg-core";

/**
 * Enums for PostgreSQL
 */
export const roleEnum = pgEnum("role", ["user", "admin"]);
export const categoryEnum = pgEnum("category", ["cold_outreach", "follow_up", "quote", "closing", "nurture"]);
export const priorityEnum = pgEnum("priority", ["low", "medium", "high"]);
export const statusEnum = pgEnum("status", ["pending", "completed"]);
export const yesNoEnum = pgEnum("yes_no", ["Yes", "No"]);
export const leadStageEnum = pgEnum("lead_stage", [
  "new",
  "attempting",
  "dm_engaged",
  "email_sent",
  "statement_requested",
  "statement_received",
  "quoted",
  "negotiation",
  "closed_won",
  "closed_lost",
  "parked"
]);
export const callOutcomeEnum = pgEnum("call_outcome", [
  "No Answer",
  "Gatekeeper",
  "DM Reached",
  "Callback Requested",
  "Email Requested",
  "Statement Agreed",
  "Not Interested",
  "Bad Data"
]);
export const opportunityStageEnum = pgEnum("opportunity_stage", [
  "qualified",
  "proposal",
  "negotiation",
  "closed_won",
  "closed_lost"
]);
export const entityTypeEnum = pgEnum("entity_type", ["lead", "opportunity"]);

/**
 * Core user table backing auth flow.
 * For Supabase Auth: auth_id links to Supabase user.id
 */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  auth_id: varchar("auth_id", { length: 255 }).unique(), // Supabase user ID
  username: varchar("username", { length: 255 }),
  password: varchar("password", { length: 255 }),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Email templates for marketing and outreach
 */
export const emailTemplates = pgTable("emailTemplates", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  category: categoryEnum("category").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type InsertEmailTemplate = typeof emailTemplates.$inferInsert;

/**
 * Per-agent todo list
 */
export const todos = pgTable("todos", {
  id: serial("id").primaryKey(),
  ownerId: integer("ownerId").notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  completed: boolean("completed").default(false).notNull(),
  dueDate: timestamp("dueDate"),
  priority: priorityEnum("priority").default("medium").notNull(),
  status: statusEnum("status").default("pending").notNull(),
  linkedLeadId: integer("linkedLeadId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Todo = typeof todos.$inferSelect;
export type InsertTodo = typeof todos.$inferInsert;

/**
 * Leads table containing all lead information including contact details,
 * data quality fields, pipeline stage, and follow-up tracking
 */
export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  // Identity fields
  companyName: varchar("companyName", { length: 255 }).notNull(),
  contactName: varchar("contactName", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 320 }),
  provider: varchar("provider", { length: 255 }),
  processingVolume: varchar("processingVolume", { length: 100 }),
  effectiveRate: varchar("effectiveRate", { length: 100 }),
  dataSource: varchar("dataSource", { length: 255 }),
  dataCohort: varchar("dataCohort", { length: 100 }),
  
  // Assignment
  ownerId: integer("ownerId").notNull().references(() => users.id),
  
  // Data quality fields
  dataVerified: yesNoEnum("dataVerified").default("No"),
  phoneValid: yesNoEnum("phoneValid").default("No"),
  emailValid: yesNoEnum("emailValid").default("No"),
  correctDecisionMaker: yesNoEnum("correctDecisionMaker").default("No"),
  
  // Pipeline stage
  stage: leadStageEnum("stage").default("new").notNull(),
  
  // Follow-up tracking
  lastContactDate: timestamp("lastContactDate"),
  nextFollowUpDate: timestamp("nextFollowUpDate"),
  followUpTime: varchar("followUpTime", { length: 20 }),
  
  // Quote tracking (for Quoted stage)
  quoteDate: timestamp("quoteDate"),
  quotedRate: varchar("quotedRate", { length: 100 }),
  expectedResidual: varchar("expectedResidual", { length: 100 }),
  
  // Deal tracking (for Closed Won)
  signedDate: timestamp("signedDate"),
  actualResidual: varchar("actualResidual", { length: 100 }),
  onboardingStatus: varchar("onboardingStatus", { length: 100 }),
  
  // Loss tracking (for Closed Lost)
  lossReason: varchar("lossReason", { length: 255 }),
  closedDate: timestamp("closedDate"),
  
  // Email tracking
  emailSent: yesNoEnum("emailSent").default("No"),
  emailSentDate: timestamp("emailSentDate"),
  quoteEmailTemplate: text("quoteEmailTemplate"),
  
  // Dial attempts counter
  dialAttempts: integer("dialAttempts").default(0).notNull(),
  
  // Opportunity conversion tracking
  convertedToOpportunity: yesNoEnum("convertedToOpportunity").default("No").notNull(),
  opportunityId: integer("opportunityId"),
  conversionDate: timestamp("conversionDate"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;

/**
 * Call logs table - stores all call activity for each lead
 */
export const callLogs = pgTable("callLogs", {
  id: serial("id").primaryKey(),
  leadId: integer("leadId").references(() => leads.id, { onDelete: "set null" }),
  opportunityId: integer("opportunityId").references(() => opportunities.id, { onDelete: "set null" }),
  
  callDate: timestamp("callDate").notNull(),
  callOutcome: callOutcomeEnum("callOutcome").notNull(),
  callDuration: integer("callDuration"), // in seconds
  notes: text("notes"),
  
  // Track who made the call
  agentId: integer("agentId").notNull().references(() => users.id),
  
  // Callback scheduling
  callbackScheduled: yesNoEnum("callbackScheduled").default("No"),
  callbackDate: timestamp("callbackDate"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CallLog = typeof callLogs.$inferSelect;
export type InsertCallLog = typeof callLogs.$inferInsert;

/**
 * Opportunities table - converted leads that are qualified and actively being pursued
 */
export const opportunities = pgTable("opportunities", {
  id: serial("id").primaryKey(),
  
  // Link to original lead (nullable because lead can be deleted)
  leadId: integer("leadId").references(() => leads.id, { onDelete: "set null" }),
  
  // Opportunity details
  name: varchar("name", { length: 255 }).notNull(), // Deal name
  companyName: varchar("companyName", { length: 255 }).notNull(),
  contactName: varchar("contactName", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 320 }),
  
  // Opportunity stage
  stage: opportunityStageEnum("stage").default("qualified").notNull(),
  
  // Deal value
  dealValue: varchar("dealValue", { length: 100 }), // Expected deal size
  probability: integer("probability").default(50), // Win probability percentage
  
  // Timeline
  expectedCloseDate: timestamp("expectedCloseDate"),
  actualCloseDate: timestamp("actualCloseDate"),
  
  // Assignment
  ownerId: integer("ownerId").notNull().references(() => users.id),
  
  // Additional tracking
  notes: text("notes"),
  lossReason: varchar("lossReason", { length: 255 }),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Opportunity = typeof opportunities.$inferSelect;
export type InsertOpportunity = typeof opportunities.$inferInsert;

/**
 * Audit log for tracking deletions
 */
export const auditLogs = pgTable("auditLogs", {
  id: serial("id").primaryKey(),
  
  // What was deleted
  entityType: entityTypeEnum("entityType").notNull(),
  entityId: integer("entityId").notNull(),
  entityName: varchar("entityName", { length: 255 }).notNull(), // Company name or opportunity name
  
  // Who deleted it
  deletedBy: integer("deletedBy").notNull().references(() => users.id),
  deletedByName: varchar("deletedByName", { length: 255 }).notNull(),
  
  // When
  deletedAt: timestamp("deletedAt").defaultNow().notNull(),
  
  // Additional context
  additionalInfo: text("additionalInfo"), // JSON string with extra details
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

/**
 * Notes table - standalone notes for leads (not tied to calls)
 */
export const notes = pgTable("notes", {
  id: serial("id").primaryKey(),
  leadId: integer("leadId").references(() => leads.id, { onDelete: "set null" }),
  opportunityId: integer("opportunityId").references(() => opportunities.id, { onDelete: "set null" }),
  
  content: text("content").notNull(),
  
  // Track who created the note
  createdBy: integer("createdBy").notNull().references(() => users.id),
  createdByName: varchar("createdByName", { length: 255 }).notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Note = typeof notes.$inferSelect;
export type InsertNote = typeof notes.$inferInsert;
