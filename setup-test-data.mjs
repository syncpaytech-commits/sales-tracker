import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { users, leads, callLogs, opportunities } from "./drizzle/schema.js";

const DATABASE_URL = process.env.DATABASE_URL;

async function setupTestData() {
  const connection = await mysql.createConnection(DATABASE_URL);
  const db = drizzle(connection);

  console.log("Creating test users...");

  // Create Agent 1
  const [agent1] = await db.insert(users).values({
    openId: `agent1-${Date.now()}`,
    name: "Sarah Johnson",
    email: "sarah@salesteam.com",
    role: "user",
  });
  const agent1Id = agent1.insertId;
  console.log(`✓ Created Agent 1: Sarah Johnson (ID: ${agent1Id})`);

  // Create Agent 2
  const [agent2] = await db.insert(users).values({
    openId: `agent2-${Date.now()}`,
    name: "Mike Chen",
    email: "mike@salesteam.com",
    role: "user",
  });
  const agent2Id = agent2.insertId;
  console.log(`✓ Created Agent 2: Mike Chen (ID: ${agent2Id})`);

  console.log("\nCreating leads for Agent 1...");
  
  // Agent 1 leads
  const [lead1] = await db.insert(leads).values({
    companyName: "TechCorp Solutions",
    contactName: "John Smith",
    phone: "555-0101",
    email: "john@techcorp.com",
    ownerId: agent1Id,
    stage: "dm_engaged",
  });
  console.log(`✓ Created lead: TechCorp Solutions`);

  const [lead2] = await db.insert(leads).values({
    companyName: "Global Industries",
    contactName: "Jane Doe",
    phone: "555-0102",
    email: "jane@global.com",
    ownerId: agent1Id,
    stage: "statement_received",
  });
  console.log(`✓ Created lead: Global Industries`);

  const [lead3] = await db.insert(leads).values({
    companyName: "Innovate Inc",
    contactName: "Bob Wilson",
    phone: "555-0103",
    email: "bob@innovate.com",
    ownerId: agent1Id,
    stage: "quoted",
  });
  console.log(`✓ Created lead: Innovate Inc`);

  console.log("\nCreating call logs for Agent 1...");
  
  // Call logs for Agent 1's leads
  await db.insert(callLogs).values([
    {
      leadId: lead1.insertId,
      callDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      callOutcome: "No Answer",
      notes: "Left voicemail",
      agentId: agent1Id,
    },
    {
      leadId: lead1.insertId,
      callDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      callOutcome: "DM Reached",
      notes: "Spoke with decision maker, interested",
      agentId: agent1Id,
    },
    {
      leadId: lead2.insertId,
      callDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      callOutcome: "DM Reached",
      notes: "Initial contact",
      agentId: agent1Id,
    },
    {
      leadId: lead2.insertId,
      callDate: new Date(),
      callOutcome: "Statement Agreed",
      notes: "Agreed to problem statement",
      agentId: agent1Id,
    },
    {
      leadId: lead3.insertId,
      callDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      callOutcome: "DM Reached",
      notes: "Sent quote",
      agentId: agent1Id,
    },
  ]);
  console.log(`✓ Created 5 call logs for Agent 1`);

  console.log("\nCreating leads for Agent 2...");
  
  // Agent 2 leads
  const [lead4] = await db.insert(leads).values({
    companyName: "Acme Corporation",
    contactName: "Alice Brown",
    phone: "555-0201",
    email: "alice@acme.com",
    ownerId: agent2Id,
    stage: "attempting",
  });
  console.log(`✓ Created lead: Acme Corporation`);

  const [lead5] = await db.insert(leads).values({
    companyName: "Future Tech",
    contactName: "Charlie Davis",
    phone: "555-0202",
    email: "charlie@futuretech.com",
    ownerId: agent2Id,
    stage: "dm_engaged",
  });
  console.log(`✓ Created lead: Future Tech`);

  console.log("\nCreating call logs for Agent 2...");
  
  // Call logs for Agent 2's leads
  await db.insert(callLogs).values([
    {
      leadId: lead4.insertId,
      callDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      callOutcome: "No Answer",
      notes: "No answer",
      agentId: agent2Id,
    },
    {
      leadId: lead4.insertId,
      callDate: new Date(),
      callOutcome: "Gatekeeper",
      notes: "Spoke with receptionist",
      agentId: agent2Id,
    },
    {
      leadId: lead5.insertId,
      callDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      callOutcome: "DM Reached",
      notes: "Good conversation",
      agentId: agent2Id,
    },
  ]);
  console.log(`✓ Created 3 call logs for Agent 2`);

  console.log("\nCreating an opportunity (converted from lead)...");
  
  // Create opportunity and mark lead as converted
  const [opp1] = await db.insert(opportunities).values({
    name: "TechCorp - Enterprise Deal",
    companyName: "TechCorp Solutions",
    contactName: "John Smith",
    phone: "555-0101",
    email: "john@techcorp.com",
    dealValue: "50000",
    stage: "qualified",
    probability: 50,
    expectedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    ownerId: agent1Id,
  });
  
  // Mark lead as converted
  await db.update(leads)
    .set({ opportunityId: opp1.insertId })
    .where({ id: lead1.insertId });
  
  console.log(`✓ Created opportunity and marked lead as converted`);

  console.log("\n✅ Test data setup complete!");
  console.log("\nSummary:");
  console.log(`- Agent 1 (Sarah): 3 leads, 5 calls, 1 opportunity`);
  console.log(`- Agent 2 (Mike): 2 leads, 3 calls, 0 opportunities`);
  console.log(`- Total: 5 leads, 8 calls, 1 opportunity`);

  await connection.end();
}

setupTestData().catch(console.error);
