ALTER TABLE `opportunities` DROP FOREIGN KEY `opportunities_leadId_leads_id_fk`;
--> statement-breakpoint
ALTER TABLE `opportunities` MODIFY COLUMN `leadId` int;--> statement-breakpoint
ALTER TABLE `opportunities` ADD CONSTRAINT `opportunities_leadId_leads_id_fk` FOREIGN KEY (`leadId`) REFERENCES `leads`(`id`) ON DELETE set null ON UPDATE no action;