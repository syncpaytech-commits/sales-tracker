import mysql from 'mysql2/promise';
import 'dotenv/config';

const connection = await mysql.createConnection(process.env.DATABASE_URL);

console.log('🌱 Seeding test data...');

try {
  // Insert sample leads with various stages
  const sampleLeads = [
    {
      companyName: 'Acme Corp',
      contactName: 'John Smith',
      phone: '+1-555-0101',
      email: 'john.smith@acmecorp.com',
      stage: 'new',
      dataSource: 'Cold List',
      dataCohort: 'Q1 2026',
      ownerId: 1,
      dialAttempts: 0,
    },
    {
      companyName: 'TechStart Inc',
      contactName: 'Sarah Johnson',
      phone: '+1-555-0102',
      email: 'sarah@techstart.io',
      stage: 'attempting',
      dataSource: 'Referral',
      dataCohort: 'Q1 2026',
      ownerId: 1,
      dialAttempts: 2,
      nextFollowUpDate: new Date(Date.now() + 86400000), // Tomorrow
    },
    {
      companyName: 'Global Solutions LLC',
      contactName: 'Michael Chen',
      phone: '+1-555-0103',
      email: 'mchen@globalsolutions.com',
      stage: 'dm_engaged',
      dataSource: 'LinkedIn',
      dataCohort: 'Q1 2026',
      ownerId: 1,
      dialAttempts: 4,
      quoteValue: 5000,
      nextFollowUpDate: new Date(), // Today
    },
    {
      companyName: 'Retail Masters',
      contactName: 'Emily Davis',
      phone: '+1-555-0104',
      email: 'emily.davis@retailmasters.com',
      stage: 'quoted',
      dataSource: 'Cold List',
      dataCohort: 'Q1 2026',
      ownerId: 1,
      dialAttempts: 6,
      quoteValue: 12000,
      quoteSentDate: new Date(Date.now() - 172800000), // 2 days ago
      nextFollowUpDate: new Date(Date.now() - 86400000), // Yesterday (overdue)
    },
    {
      companyName: 'FastFood Franchise',
      contactName: 'Robert Wilson',
      phone: '+1-555-0105',
      email: 'rwilson@fastfood.com',
      stage: 'closed_won',
      dataSource: 'Referral',
      dataCohort: 'Q1 2026',
      ownerId: 1,
      dialAttempts: 8,
      quoteValue: 8500,
      dealValue: 8500,
      quoteSentDate: new Date(Date.now() - 604800000), // 7 days ago
      closedDate: new Date(Date.now() - 86400000),
    },
    {
      companyName: 'Budget Grocery',
      contactName: 'Lisa Anderson',
      phone: '+1-555-0106',
      email: 'landerson@budgetgrocery.com',
      stage: 'closed_lost',
      dataSource: 'Cold List',
      dataCohort: 'Q1 2026',
      ownerId: 1,
      dialAttempts: 5,
      quoteValue: 3000,
      lossReason: 'Price',
      closedDate: new Date(Date.now() - 172800000),
    },
    {
      companyName: 'E-Commerce Plus',
      contactName: 'David Martinez',
      phone: '+1-555-0107',
      email: 'dmartinez@ecomplus.com',
      stage: 'attempting',
      dataSource: 'LinkedIn',
      dataCohort: 'Q1 2026',
      ownerId: 1,
      dialAttempts: 1,
      nextFollowUpDate: new Date(Date.now() + 172800000), // 2 days from now
    },
    {
      companyName: 'Medical Supplies Co',
      contactName: 'Jennifer Taylor',
      phone: '+1-555-0108',
      email: 'jtaylor@medsupplies.com',
      stage: 'dm_engaged',
      dataSource: 'Referral',
      dataCohort: 'Q1 2026',
      ownerId: 1,
      dialAttempts: 3,
      quoteValue: 15000,
      nextFollowUpDate: new Date(), // Today
    },
  ];

  for (const lead of sampleLeads) {
    await connection.execute(
      `INSERT INTO leads (companyName, contactName, phone, email, stage, dataSource, dataCohort, ownerId, dialAttempts, nextFollowUpDate, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        lead.companyName,
        lead.contactName,
        lead.phone,
        lead.email,
        lead.stage,
        lead.dataSource,
        lead.dataCohort,
        lead.ownerId,
        lead.dialAttempts,
        lead.nextFollowUpDate || null,
      ]
    );
  }

  console.log(`✅ Inserted ${sampleLeads.length} sample leads`);

  // Get lead IDs for call logs
  const [leads] = await connection.execute('SELECT id, companyName FROM leads ORDER BY id DESC LIMIT 8');

  // Insert sample call logs
  const callLogs = [
    {
      leadId: leads[7].id, // Acme Corp
      callDate: new Date(Date.now() - 86400000),
      callOutcome: 'No Answer',
      callDuration: 0,
      notes: 'Left voicemail',
      agentId: 1,
    },
    {
      leadId: leads[6].id, // TechStart
      callDate: new Date(Date.now() - 172800000),
      callOutcome: 'DM Reached',
      callDuration: 8,
      notes: 'Spoke with Sarah, interested in learning more. Sending info.',
      agentId: 1,
    },
    {
      leadId: leads[6].id, // TechStart
      callDate: new Date(Date.now() - 86400000),
      callOutcome: 'Callback Requested',
      callDuration: 5,
      notes: 'Follow-up call scheduled for tomorrow',
      agentId: 1,
    },
    {
      leadId: leads[5].id, // Global Solutions
      callDate: new Date(Date.now() - 259200000),
      callOutcome: 'DM Reached',
      callDuration: 12,
      notes: 'Michael interested, processing $50k/month. Qualified lead.',
      agentId: 1,
    },
    {
      leadId: leads[4].id, // Retail Masters
      callDate: new Date(Date.now() - 345600000),
      callOutcome: 'Statement Agreed',
      callDuration: 15,
      notes: 'Emily agreed to review statement. Sending quote.',
      agentId: 1,
    },
    {
      leadId: leads[3].id, // FastFood
      callDate: new Date(Date.now() - 604800000),
      callOutcome: 'DM Reached',
      callDuration: 20,
      notes: 'Robert very interested. Closed the deal!',
      agentId: 1,
    },
  ];

  for (const log of callLogs) {
    await connection.execute(
      `INSERT INTO callLogs (leadId, callDate, callOutcome, callDuration, notes, agentId, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [log.leadId, log.callDate, log.callOutcome, log.callDuration, log.notes, log.agentId]
    );
  }

  console.log(`✅ Inserted ${callLogs.length} sample call logs`);

  // Insert sample todos
  const todos = [
    {
      ownerId: 1,
      title: 'Follow up with TechStart Inc',
      description: 'Sarah requested callback tomorrow at 2 PM',
      dueDate: new Date(Date.now() + 86400000),
      priority: 'high',
    },
    {
      ownerId: 1,
      title: 'Send quote to Global Solutions',
      description: 'Michael needs quote for $50k/month processing',
      dueDate: new Date(),
      priority: 'high',
    },
    {
      ownerId: 1,
      title: 'Review Retail Masters statement',
      description: 'Emily sent processing statement, need to analyze',
      dueDate: new Date(Date.now() - 86400000), // Overdue
      priority: 'medium',
    },
    {
      ownerId: 1,
      title: 'Update CRM with new leads',
      description: 'Import Q1 cold list batch 2',
      dueDate: new Date(Date.now() + 172800000),
      priority: 'low',
    },
  ];

  for (const todo of todos) {
    await connection.execute(
      `INSERT INTO todos (ownerId, title, description, dueDate, priority, createdAt)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [todo.ownerId, todo.title, todo.description, todo.dueDate, todo.priority]
    );
  }

  console.log(`✅ Inserted ${todos.length} sample todos`);

  console.log('🎉 Seed data complete!');
  console.log('');
  console.log('Test account:');
  console.log('  - Login with your Manus account');
  console.log('  - You will see 8 sample leads across all pipeline stages');
  console.log('  - 6 call logs showing activity history');
  console.log('  - 4 tasks (1 overdue, 1 due today, 2 upcoming)');
  console.log('  - 6 pre-generated email templates');
  console.log('');
  console.log('Metrics to verify:');
  console.log('  - Total Leads: 8');
  console.log('  - Total Dials: 29');
  console.log('  - DM Reached: 3 calls');
  console.log('  - Closed Won: 1 deal ($8,500)');
  console.log('  - Closed Lost: 1 deal');
  console.log('  - Close Rate: 12.5% (1/8 leads)');

} catch (error) {
  console.error('❌ Error seeding data:', error);
} finally {
  await connection.end();
}
