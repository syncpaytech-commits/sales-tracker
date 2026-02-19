ALTER TABLE `callLogs` DROP FOREIGN KEY `callLogs_leadId_leads_id_fk`;
--> statement-breakpoint
ALTER TABLE `callLogs` DROP FOREIGN KEY `callLogs_opportunityId_opportunities_id_fk`;
--> statement-breakpoint
ALTER TABLE `notes` DROP FOREIGN KEY `notes_leadId_leads_id_fk`;
--> statement-breakpoint
ALTER TABLE `notes` DROP FOREIGN KEY `notes_opportunityId_opportunities_id_fk`;
--> statement-breakpoint
ALTER TABLE `callLogs` ADD CONSTRAINT `callLogs_leadId_leads_id_fk` FOREIGN KEY (`leadId`) REFERENCES `leads`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `callLogs` ADD CONSTRAINT `callLogs_opportunityId_opportunities_id_fk` FOREIGN KEY (`opportunityId`) REFERENCES `opportunities`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notes` ADD CONSTRAINT `notes_leadId_leads_id_fk` FOREIGN KEY (`leadId`) REFERENCES `leads`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notes` ADD CONSTRAINT `notes_opportunityId_opportunities_id_fk` FOREIGN KEY (`opportunityId`) REFERENCES `opportunities`(`id`) ON DELETE set null ON UPDATE no action;