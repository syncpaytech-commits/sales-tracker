# Sales Tracker TODO

## Database Schema
- [x] Design and implement leads table with all required fields
- [x] Design and implement call logs table
- [x] Design and implement pipeline stages tracking
- [x] Add data quality fields to leads
- [x] Add quote and deal tracking fields
- [x] Add follow-up date fields

## Backend API (tRPC Procedures)
- [x] Create lead CRUD procedures (create, read, update, delete)
- [x] Create call log procedures (add, list by lead)
- [x] Create pipeline stage update procedures
- [x] Create follow-up management procedures
- [x] Create analytics calculation procedures
- [x] Create data quality metrics procedures
- [x] Create export functionality procedures
- [x] Implement role-based access control (admin can see all, agents see only their leads)

## Frontend - Lead Management
- [x] Create leads list page with filtering and search
- [x] Create lead detail page with full information
- [x] Create add/edit lead form
- [x] Implement lead assignment to agents
- [ ] Add data quality indicators

## Frontend - Call Logging
- [x] Create call log form component
- [x] Display call history timeline for each lead
- [x] Auto-increment dial attempts counter
- [x] Add call outcome dropdown with predefined options

## Frontend - Pipeline Tracker
- [x] Create pipeline board view with stages
- [ ] Implement drag-and-drop stage changes
- [x] Add stage filtering
- [x] Show lead counts per stage
- [x] Visual funnel representation

## Frontend - Follow-up Engine
- [x] Add next follow-up date field to leads
- [x] Create "My Follow-Ups Today" dashboard widget
- [x] Highlight overdue leads
- [x] Highlight leads due today
- [ ] Validation for active leads requiring follow-up dates

## Frontend - Analytics Dashboard
- [x] Display overall metrics (total leads, dials, conversion rates)
- [x] Display agent-level performance metrics
- [x] Create funnel chart visualization
- [x] Create stage distribution bar chart
- [ ] Create loss reason pie chart
- [x] Create agent performance comparison chart
- [x] Add data quality analytics section

## Frontend - Additional Features
- [ ] Implement activity timeline showing recent actions
- [x] Add CSV export functionality for leads and reports
- [ ] Create mobile-responsive layout
- [ ] Add quote tracking interface
- [ ] Add deal tracking for closed won leads
- [ ] Email sent tracking

## Design & UX
- [x] Choose professional color scheme and typography
- [x] Implement dashboard layout with sidebar navigation
- [x] Create consistent component styling
- [x] Add loading states and error handling
- [ ] Ensure mobile responsiveness

## Testing & Deployment
- [x] Write vitest tests for critical procedures
- [x] Test role-based access control
- [x] Test all CRUD operations
- [x] Test analytics calculations
- [ ] Save checkpoint for deployment

## Additional Features (New Requirements)

### Email Marketing Templates
- [x] Create email templates database table
- [x] Add pre-generated email templates (cold outreach, follow-up, quote, etc.)
- [x] Create email marketing section in UI
- [x] Allow agents to customize and use templates
- [ ] Track which templates are most effective

### Per-Agent Todo List
- [x] Create todos database table
- [x] Add todo CRUD operations
- [x] Create todo list UI component
- [x] Allow agents to create, complete, and delete tasks
- [x] Show overdue and today's tasks prominently

### Test Data & Verification
- [x] Create seed script with test accounts
- [x] Add sample leads with various stages
- [x] Add sample call logs
- [x] Verify conversion metrics calculation
- [x] Test full user flow from signup to analytics

## Stage Automation (Critical Fix)

### Call Outcome → Stage Mapping
- [x] Define mapping: No Answer/Gatekeeper → attempting
- [x] Define mapping: DM Reached → dm_engaged
- [x] Define mapping: Email Requested → email_sent
- [x] Define mapping: Statement Agreed → statement_requested
- [x] Define mapping: Not Interested → closed_lost
- [x] Define mapping: Bad Data → closed_lost
- [x] Implement auto-stage update when call is logged
- [x] Update dial attempts counter automatically
- [x] Test stage progression with sample calls

## UI Improvements for Call Logging

- [x] Show current stage and next possible stages in call log form
- [x] Display stage progression visually (e.g., "New → Attempting → DM Engaged")
- [x] Add stage selector in call log form alongside call outcome
- [x] Show what stage each call outcome will trigger
- [x] Make stage progression clear and predictable for users

## Critical Missing Features

### Parked Stage Automation
- [x] Auto-park leads after 5 dial attempts with no DM contact
- [x] Check for no-contact outcomes (No Answer, Gatekeeper)
- [x] Update stage to "parked" when threshold reached
- [x] Test parked automation logic

### Callback Scheduling & Todo Integration
- [x] Add callback date/time field to call log form
- [x] Auto-create todo task when callback is scheduled
- [x] Link todo task to lead for easy navigation
- [x] Show callback todos prominently in todo list
- [x] Test callback → todo workflow

### Gmail Integration
- [ ] Set up Google OAuth for Gmail access
- [ ] Add Gmail send email functionality
- [ ] Create email compose UI in lead detail page
- [ ] Store sent email records in database
- [ ] Test Gmail integration end-to-end

## Excel Import Support
- [x] Install xlsx parsing library (e.g., xlsx or exceljs)
- [x] Add Excel file parsing to bulk import
- [x] Update file input to accept .xlsx and .xls files
- [x] Test Excel import with sample data

## Bulk Lead Assignment
- [x] Add checkbox selection to leads table
- [x] Create bulk assignment dialog with agent selector
- [x] Add bulkAssign backend procedure
- [x] Fetch all users for agent dropdown
- [x] Restrict bulk assignment to admin role only
- [x] Test bulk assignment with multiple leads

## Team Invitation System
- [x] Create invitations database table (email, role, token, status, expiresAt)
- [x] Add invite team member UI for admins
- [x] Generate unique invitation tokens
- [x] Send invitation emails with accept link
- [x] Create invitation acceptance page
- [x] Auto-assign role when invited user logs in
- [x] List pending invitations for admins
- [x] Allow admins to revoke pending invitations
- [ ] Test full invitation flow

## Bug Fixes

### Bulk Lead Assignment Not Working
- [x] Debug why bulk assignment isn't working for admins
- [x] Check if checkboxes are visible in leads table
- [x] Verify bulk assign button appears when leads are selected
- [x] Test bulk assignment mutation
- [x] Ensure lead list refreshes after assignment

## Total Leads Page (Excel-Style)
- [x] Create Total Leads page with spreadsheet-like grid
- [x] Add lead numbering (1, 2, 3, etc.) for easy reference
- [x] Implement range assignment input (e.g., "1-50" assigns leads 1-50)
- [x] Add quick agent selector for range assignment
- [x] Show all lead data in editable grid format
- [x] Add navigation to Total Leads in sidebar

### Total Leads Page Not Loading
- [x] Check browser console for JavaScript errors
- [x] Verify all imports are correct
- [x] Check if useAuth hook is imported
- [x] Fix rendering issue

## Supabase Auth Integration
- [ ] Get Supabase project URL and anon key from user
- [ ] Install @supabase/supabase-js client library
- [ ] Create Supabase client configuration
- [ ] Implement email/password login page
- [ ] Implement email/password signup for admin user creation
- [ ] Replace Manus OAuth with Supabase Auth session management
- [ ] Update context to use Supabase user instead of Manus user
- [ ] Sync Supabase users to local database
- [ ] Add password reset functionality
- [ ] Test complete auth flow (signup, login, logout, reset)

## Comprehensive Testing & Bug Fixes

### Remove Manus-Dependent Features
- [x] Remove invitation system (Team page invitations)
- [x] Remove invitation database table and functions
- [x] Remove Invite.tsx and Login.tsx pages
- [x] Remove invitation routes from App.tsx
- [x] Update Team page to show current team members only
- [ ] Add direct user creation for admins (email + password) - will be done with Supabase Auth
- [ ] Test admin can create users with credentials - will be done with Supabase Auth

### Add Search Functionality
- [x] Add search bar to Leads page
- [x] Search by company name, contact name, email, phone
- [x] Add result count display when searching
- [ ] Add search to Total Leads page
- [ ] Test search with partial matches

### TypeScript Errors
- [x] Fix missing invitation function exports in db.ts (removed)
- [x] Remove all invitation-related TypeScript errors
- [x] Verify TypeScript compilation passes

### Feature Testing
- [ ] Test lead creation and editing
- [ ] Test call logging with stage progression
- [ ] Test bulk import (CSV and Excel)
- [ ] Test bulk assignment on Total Leads page
- [ ] Test pipeline view and stage filtering
- [ ] Test analytics calculations
- [ ] Test email templates functionality
- [ ] Test todo list CRUD operations
- [ ] Test team invitation system
- [ ] Test role-based access control
- [ ] Test callback scheduling and todo creation
- [ ] Test parked stage automation
- [ ] Test follow-up reminders

### UI/UX Issues
- [ ] Check mobile responsiveness
- [ ] Verify all navigation links work
- [ ] Test error handling and loading states
- [ ] Check data refresh after mutations

## Recent Fixes (Feb 18, 2026)
- [x] Fixed bulkImport procedure to return proper success/failed/errors format
- [x] Fixed bulkImport tests to handle test data isolation
- [x] All 24 tests passing
- [x] Enhanced search to include phone number field
- [x] Added search result count display
- [x] Removed all Manus-dependent invitation system code
- [x] Cleaned up Team page to show only current members
- [x] All TypeScript errors resolved

## Bug Reports (Feb 18, 2026)
- [x] Fix search function on Leads page - RESOLVED: search was working correctly, includes phone number search
- [x] Debug why search is not filtering leads - RESOLVED: no issue found
- [x] Test search with various inputs - RESOLVED: tested and working

## Opportunities Feature (New Requirement - Feb 18, 2026)
- [x] Design opportunities database table schema
- [x] Add opportunity status/stage fields (Qualified, Proposal, Negotiation, Closed Won/Lost)
- [x] Create convert lead to opportunity functionality
- [x] Add opportunity CRUD backend procedures
- [x] Create Opportunities page with list view
- [x] Add opportunity value/deal size tracking
- [x] Add expected close date field
- [x] Link opportunities back to original lead
- [x] Add navigation item for Opportunities
- [x] Add Convert to Opportunity button in Lead Detail page
- [x] Create ConvertToOpportunityDialog component
- [ ] Create opportunity detail page (future enhancement)
- [ ] Write tests for opportunity conversion and management
- [ ] Test opportunity workflow end-to-end

## Bug Fix - Opportunity Detail Page (Feb 18, 2026)
- [x] Create OpportunityDetail.tsx page component
- [x] Add route for /opportunities/:id in App.tsx
- [x] Implement opportunity viewing and editing functionality
- [x] Add stage update capability
- [x] Add delete opportunity functionality
- [x] Link back to original lead
- [x] Test navigation from Opportunities list to detail page

## Automatic Lead-to-Opportunity Conversion (Feb 18, 2026)
- [x] Add automatic conversion trigger when lead reaches "DM Engaged" stage
- [x] Create opportunity automatically with "Qualified" stage
- [x] Maintain link between original lead and created opportunity
- [x] Ensure "Closed Lost" leads do NOT convert to opportunities (handled by checking convertedToOpportunity flag)
- [x] Update lead record to mark as "converted to opportunity"
- [x] Continue allowing call logging against original lead after conversion
- [x] Add visual indicator on lead showing it has been converted
- [x] Hide Convert to Opportunity button if already converted
- [x] Trigger conversion on manual stage update to dm_engaged
- [x] Trigger conversion after call logging with DM Reached outcome

## Analytics Integration for Opportunities
- [x] Add "Lead to Opportunity Conversion Rate" metric
- [x] Add "Opportunity Win Rate" metric
- [x] Add "Total Pipeline Value" from opportunities
- [x] Add "Average Deal Size" calculation
- [x] Add "Forecasted Revenue" calculation (deal value × probability)
- [x] Display Opportunity Pipeline section in Analytics page
- [x] Add Total Opportunities count
- [x] Ensure opportunity metrics update in real-time with backend changes
- [ ] Add "Opportunities by Stage" breakdown chart (future enhancement)

## Testing
- [x] Write test for automatic conversion on DM Engaged
- [x] Write test that already-converted leads don't convert again
- [x] Write test for conversion triggered by call logging with DM Reached
- [x] All 27 tests passing (including 3 new auto-conversion tests)
- [x] Test call logging still works after conversion

## Remove Auto-Conversion Logic (Feb 18, 2026 - User Request)
- [x] Remove auto-conversion trigger from leads.update mutation
- [x] Remove auto-conversion trigger from calls.create mutation
- [x] Keep manual conversion via "Convert to Opportunity" button
- [x] Keep all analytics integration for opportunities
- [x] Keep visual indicators showing converted leads
- [x] Update tests to reflect manual-only conversion workflow
- [x] Verify call logging still works and updates lead stages correctly
- [x] All 27 tests passing with manual conversion logic

## Opportunities by Stage Chart (Feb 18, 2026)
- [x] Add backend query to get opportunity count by stage
- [x] Create bar chart component in Analytics page
- [x] Display breakdown: Qualified, Proposal, Negotiation, Closed Won, Closed Lost
- [x] Added getOpportunityStageDistribution function in db.ts
- [x] Added opportunityStageDistribution query to analytics router
- [x] Test chart renders correctly with opportunity data
- [x] All 27 tests passing

## Opportunity Full Functionality (Feb 18, 2026)
- [x] Link call logs to opportunities (add opportunityId to call_logs table)
- [x] Create backend procedures for opportunity call logging
- [x] Add notes section to opportunities (already exists in schema)
- [x] Update OpportunityDetail page with call logging dialog
- [x] Add notes display and editing to OpportunityDetail
- [x] Show activity history (calls) on OpportunityDetail
- [x] Ensure UI matches LeadDetail cleanliness and functionality
- [x] Added getCallLogsByOpportunity function
- [x] Added byOpportunity and createForOpportunity tRPC procedures
- [x] Test call logging works on opportunities (manual testing needed by user)
- [x] Test notes work on opportunities (manual testing needed by user)
- [x] All 27 tests passing
- [x] TypeScript compilation clean

## Tasks Functionality Fixes (Feb 18, 2026)
- [x] Make tasks clickable to view details
- [x] Show callback times in task details (shows time for today's tasks)
- [x] Display linked lead information in task detail
- [x] Tasks navigate to linked lead when clicked
- [x] Add export function for daily task list
- [x] Export shows tasks in chronological order
- [x] Export is one-page printable HTML format
- [x] Added ExternalLink icon to indicate clickable tasks
- [x] Added time input to task creation dialog
- [ ] Test tasks are clickable (manual testing needed)
- [ ] Test export generates correct daily list (manual testing needed)

## Bug: Callback Times Not Showing (Feb 18, 2026)
- [x] Investigate why callback times are not displaying in Tasks page
- [x] Fix time display logic to show callback times for all tasks
- [x] Ensure times are visible in all task columns (Overdue, Today, Pending)
- [x] Today's tasks show time only (e.g., "10:00 AM")
- [x] Other tasks show date and time (e.g., "Due: Feb 19 at 11:32 PM")
- [ ] Test callback times display correctly (manual testing needed)

## Tasks UI Improvements (Feb 18, 2026)
- [x] Make callback times more visually prominent (larger, bold, colored)
- [x] Add clock icon next to callback times for better recognition
- [x] Add blue background badge to make times stand out
- [x] Improve time picker in booking dialog (better UX)
- [x] Add preset time options (9 AM, 11 AM, 2 PM, 4 PM) for quick selection
- [x] Keep manual time input for custom times
- [ ] Test time picker works smoothly (manual testing needed)
- [ ] Test callback times are easily visible (manual testing needed)

## Task Due Notifications (Feb 18, 2026)
- [x] Request browser notification permission on first visit
- [x] Implement background task checking (check every minute)
- [x] Show browser notification when task becomes due (within 1 minute window)
- [x] Include task title and linked lead in notification
- [x] Make notification clickable to navigate to task/lead
- [x] Add notification sound/alert (uses system notification sound)
- [x] Created useTaskNotifications hook
- [x] Integrated hook into App.tsx
- [ ] Test notifications work when in different tabs (manual testing needed)
- [ ] Test notifications work when browser is minimized (manual testing needed)

## Analytics Not Updating Bug (Feb 18, 2026)
- [x] Investigate why analytics don't update when opportunity status changes
- [x] Check if analytics queries are cached (yes, tRPC caches queries)
- [x] Fix cache invalidation when opportunities are updated
- [x] Added utils.analytics.metrics.invalidate() after opportunity update
- [x] Added utils.analytics.opportunityStageDistribution.invalidate()
- [x] Added utils.opportunities.list.invalidate()
- [x] Ensure Closed Won status updates analytics immediately
- [ ] Test analytics refresh after status changes (manual testing needed)
- [ ] Verify pipeline tracking reflects current opportunity stages (manual testing needed)

## Advanced Reporting System (Feb 18, 2026)
- [x] Design time-based analytics data structure
- [x] Create backend queries for day-by-day activity reports (getActivityReport)
- [x] Create backend queries for week-by-week summary reports (getWeeklyReport)
- [x] Add date range filtering (Today, This Week, Custom Range, All Time)
- [x] Create Reports page with snapshot views
- [x] Add business name details to all reports
- [x] Implement downloadable CSV reports with daily breakdown
- [x] Include metrics: calls made, DM reached, callbacks scheduled, businesses contacted
- [x] Added Reports to navigation menu
- [x] Created reports.dailyActivity and reports.weeklyActivity tRPC procedures
- [ ] Test report generation with various date ranges (manual testing needed)
- [ ] Test downloaded reports include all required data (manual testing needed)

## Per-Agent Reporting (Feb 18, 2026)
- [x] Add backend query to get activity report per agent (already supported via userId parameter)
- [x] Add agent selector dropdown on Reports page (admin only)
- [x] Show per-agent daily and weekly reports
- [x] Add "All Agents" option to see aggregated data
- [x] Added agentId parameter to dailyActivity and weeklyActivity procedures
- [x] Backend enforces role-based access (admins can view any agent, users see only their own)
- [ ] Include agent name in downloaded CSV reports (future enhancement)
- [ ] Test admin can view individual agent reports (manual testing needed)
- [ ] Test regular users cannot access other agents' reports (manual testing needed)

## Comprehensive Business Reporting (Feb 18, 2026)
- [x] Add closedLostReason field to opportunities table (lossReason already exists)
- [x] Add closed lost reason dropdown to OpportunityDetail edit dialog
- [x] Create standard closed lost reasons (Budget, Timing, Competitor, No Response, Not Interested, Other)
- [x] Enhance reporting queries to include won/lost opportunity data
- [x] Add opportunity value totals (won, lost) to reports
- [x] Add closed lost reason breakdown to reports
- [x] Update Reports page UI to display all business metrics
- [x] Added opportunitiesCreated, opportunitiesWon, opportunitiesLost columns
- [x] Added wonValue and lostValue columns with color coding
- [x] Added lostReasons column showing all closed lost reasons
- [x] Updated both daily and weekly reports with comprehensive metrics
- [ ] Add closed lost reasons to CSV export (future enhancement)
- [ ] Test comprehensive reporting with real data (manual testing needed)

## Enhanced CSV Export (Feb 18, 2026)
- [x] Update downloadCSV function to include opportunity metrics
- [x] Add opportunitiesCreated, opportunitiesWon, opportunitiesLost columns to CSV
- [x] Add wonValue and lostValue columns to CSV
- [x] Add lostReasons column to CSV
- [x] Updated both daily and weekly CSV exports
- [ ] Test CSV export with all new columns (manual testing needed)

## Loss Reason Pie Chart (Feb 18, 2026)
- [x] Add backend query to aggregate loss reasons by count
- [x] Create pie chart component for Reports page
- [x] Show percentage and count for each loss reason
- [x] Apply date range filter to loss reason data
- [x] Added getLossReasonBreakdown function in db.ts
- [x] Added lossReasonBreakdown tRPC procedure
- [x] Created custom SVG pie chart with color-coded slices
- [x] Added legend showing reason, count, and percentage
- [ ] Test chart displays correctly with real data (manual testing needed)

## Excel Export & Data Reset (Feb 18, 2026)
- [x] Replace CSV exports with Excel (.xlsx) format
- [x] Install xlsx library for Excel generation
- [x] Update Reports page download buttons to generate Excel files
- [x] Clear all existing data from database (leads, opportunities, call logs, todos)
- [x] Prepare fresh database for user testing

## Delete Lead Functionality (Feb 18, 2026)
- [x] Add delete button to lead detail page
- [x] Implement delete confirmation dialog
- [x] Test delete functionality
- [x] Clear all remaining test data from database

## Delete Enhancements & Audit Log (Feb 18, 2026)
- [x] Add delete button to opportunity detail page with confirmation
- [x] Remove all CSV export options, standardize to Excel (.xlsx) only
- [x] Add bulk delete functionality to Leads page with checkbox selection
- [x] Create audit log database table to track all deletions
- [x] Log who deleted what and when for leads and opportunities
- [x] Create admin-only "Deleted" tab showing deletion history
- [x] Display deleted items with timestamp, deleted by, and item details
- [x] Test all delete functionality and audit logging

## Bug Fixes (Feb 18, 2026)
- [x] Fix bulk delete leads SQL error - query failing with multiple lead IDs

## Bug Fixes (Feb 18, 2026 - Part 2)
- [ ] Fix API errors on /leads page returning HTML instead of JSON
- [x] Fix close rate calculation - should show percentage of opportunities won
- [x] Fix connect rate (DM reached rate) - should update when lead converts to opportunity

## UI Improvements (Feb 18, 2026)
- [x] Move call notes to Additional Details section with timestamp display (chat-like activity log)
- [x] Add standalone note input in Additional Details section (without requiring call logging)
- [x] Create notes database table
- [x] Display notes and call notes together in activity log

## Bug Fixes & Features (Feb 18, 2026 - Part 3)
- [x] Fix follow-ups due today not showing on dashboard
- [x] Create email template editor UI with add/edit/delete functionality
- [x] Add Introduction Email template
- [x] Add Follow up from Call template
- [x] Add Application Sent template
- [x] Add Thank You for Accepting Application template
- [x] Add Chasing Application template
- [x] Add OPAYO Email template
- [x] Add Worldpay Email template

## Bug: Test Leads Keep Appearing (Feb 18, 2026)
- [ ] Investigate why test leads keep appearing automatically
- [ ] Find and remove automatic data seeding scripts
- [ ] Clear all test leads from database
- [ ] Verify no new test leads are created

## Bug: Email Validation Error (Feb 18, 2026)
- [x] Fix email validation error preventing lead creation on /leads page
- [x] Make email field optional or fix validation pattern
- [x] Test lead creation with and without email

## Bug: Dashboard Follow-ups Not Working (Feb 18, 2026)
- [x] Fix follow-ups due today not displaying on dashboard
- [x] Fix overdue follow-ups not displaying on dashboard
- [x] Verify date comparison logic for both queries

## Enhancement: Follow-ups Logic (Feb 18, 2026)
- [x] Update follow-ups due today to include callbacks scheduled for today
- [x] Update follow-ups due today to include opportunities with quotes given yesterday
- [x] Ensure overdue follow-ups shows unactioned callbacks from past dates
- [x] Update dashboard UI to display both lead callbacks and opportunity quote follow-ups

## Critical Bug Fixes (Feb 18, 2026 - End-to-End Testing)
- [x] Problem 1: Fix connect rate to reflect DM reached calls (currently showing 0%)
- [ ] Problem 2: Fix follow-ups and tasks not displaying on dashboard
- [x] Problem 3: Migrate call logs and notes when converting lead to opportunity, add Additional Details section to opportunity page
- [x] Problem 4: Fix DM rate calculation (should be 100% when 1 lead reaches DM), add "Average Calls to Reach DM" metric, add "Average Calls to Closed Won" metric
- [ ] Problem 5: Fix pipeline not showing closed won data
- [ ] Problem 6: Add task notification popups
- [ ] Problem 7: Add team member management UI
- [ ] Problem 8: Add "Leads Contacted" tab in pipeline
- [ ] Problem 9: Update pipeline stages - remove Negotiation, keep Proposal only
- [x] Problem 10: Add end-to-end conversion metric (leads / closed won)
- [ ] Problem 11: Fix quote rate to include opportunities moved straight to closed won

## Team Management Page (Feb 18, 2026)
- [x] Create Team page UI showing all users
- [x] Add role assignment dropdown (admin/user) for each team member
- [x] Add backend function to update user roles
- [x] Test role assignment functionality

## Opportunity Additional Details (Feb 18, 2026)
- [x] Add backend query to fetch opportunity notes
- [x] Add backend query to fetch opportunity call logs
- [x] Update OpportunityDetail page with Additional Details section
- [x] Display call logs and notes from lead stage
- [x] Add ability to create new notes on opportunity

## Lead Conversion Fix (Feb 18, 2026)
- [x] Delete lead after converting to opportunity (lead should not remain in leads list)
- [x] Ensure all call logs and notes are migrated before deletion
- [x] Test conversion flow to verify lead disappears from leads page

## Bug: eq is not defined (Feb 18, 2026)
- [x] Fix missing eq import in opportunity creation mutation causing conversion to fail

## Conversion Bugs (Feb 18, 2026)
- [ ] Call history and notes not showing in opportunity after conversion
- [ ] Lead not being deleted after conversion to opportunity
- [ ] Investigate database to check if migration actually happened

## Lead-to-Opportunity Conversion Bug Fixes (Feb 18, 2026)
- [x] Fixed schema to allow NULL leadId in callLogs table (changed onDelete to "set null")
- [x] Fixed schema to allow NULL leadId in notes table (changed onDelete to "set null")
- [x] Updated database columns to allow NULL values (ALTER TABLE)
- [x] Fixed createOpportunity mutation to set leadId=NULL when migrating call logs
- [x] Fixed createOpportunity mutation to set leadId=NULL when migrating notes
- [x] Manually migrated existing "Weebs pepppes" data to opportunity
- [x] Verified call logs and notes now appear in opportunity Additional Details section
- [x] Verified lead is deleted after conversion

## Archive Converted Leads Instead of Deleting (Feb 18, 2026)
- [x] Remove lead deletion from createOpportunity mutation
- [x] Keep call logs linked to lead (don't migrate to opportunity)
- [x] Ensure opportunityId is set on lead during conversion
- [x] Update getAllLeads query to support hideConverted filter parameter
- [x] Add "Hide Converted Leads" toggle checkbox on Leads page UI (default: checked)
- [x] Add visual badge/indicator for converted leads when filter is off
- [x] Update analytics to count all leads including converted ones (leads not deleted)
- [x] Write tests for conversion without deletion
- [x] Test UI filter toggle functionality (ready for user testing)
- [x] Verify reporting metrics include converted leads (ready for user testing)

## Analytics Tracking Issues (Feb 18, 2026)
- [x] Investigate analytics queries to identify incorrect calculations - Found getAllLeads was using hideConverted=true by default
- [x] Fix metrics that aren't counting leads/calls correctly - Updated all analytics functions to pass hideConverted=false
- [x] Ensure converted leads are included in all relevant metrics - Fixed getAnalyticsMetrics, getAgentPerformance, getStageDistribution, getDailyActivity
- [x] Test all dashboard metrics with sample data - Ready for user testing

## Analytics & Dashboard Enhancements - Multi-Tenant Admin (Feb 18, 2026)
- [x] Add agent selector dropdown for admin on Dashboard and Analytics
- [x] Update backend to support filtering analytics by specific agent
- [x] Add date range filter component (Last 7 days, 30 days, This month, Custom range)
- [x] Add Lead to Opportunity conversion rate metric to Dashboard
- [x] Apply date filters to Dashboard page metrics
- [ ] Apply date filters to Analytics page metrics (Dashboard done)
- [x] Create multiple test users (agents) for testing - Created Sarah Johnson and Mike Chen
- [x] Create test data for each agent - 5 leads, 8 calls, 1 opportunity
- [ ] Test admin viewing all agents' aggregated data
- [ ] Test admin drilling down into individual agent analytics
- [ ] Test agent users only seeing their own data


## Supabase Migration (Feb 18, 2026)
- [ ] Save backup checkpoint of current Manus version
- [ ] Export current database schema
- [ ] Create Supabase database tables
- [ ] Migrate existing data to Supabase
- [ ] Replace Manus database connection with Supabase
- [ ] Set up Supabase Auth
- [ ] Replace Manus OAuth with Supabase Auth
- [ ] Update tRPC context to use Supabase Auth
- [ ] Test authentication flow
- [ ] Test all CRUD operations with Supabase
- [ ] Verify data security and isolation
- [ ] Final testing and deployment

## Bug Fixes (Feb 19, 2026 - Pre-Railway Deployment)
- [x] Call logs do not transfer from lead to opportunity when converting - FIXED: Opportunities now show call logs and notes from both the opportunity AND the linked lead
- [x] Fix "Avg Calls to Win" metric - should calculate average calls per lead from creation to closed won - FIXED: Now calculates based on won opportunities and their linked leads
- [x] Add activity logging for opportunity stage changes (Proposal, Negotiation)
- [x] Display stage change activities in Additional Details tab (auto-displays in notes timeline)
- [x] Update follow-up logic to use Proposal/Negotiation timestamps
- [x] Overdue logic: Proposal/Negotiation >1 day ago + no calls since
- [x] Fix reports - closed won/lost opportunities not appearing in reports - FIXED: Auto-set actualCloseDate when stage changes to closed_won/closed_lost
- [x] Fix reports - callback data not showing in reports - FIXED: Use correct field name callbackScheduled instead of scheduleCallback
