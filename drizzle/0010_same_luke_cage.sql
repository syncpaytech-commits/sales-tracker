ALTER TABLE `callLogs` MODIFY COLUMN `leadId` int;--> statement-breakpoint
ALTER TABLE `callLogs` ADD `opportunityId` int;--> statement-breakpoint
ALTER TABLE `callLogs` ADD CONSTRAINT `callLogs_opportunityId_opportunities_id_fk` FOREIGN KEY (`opportunityId`) REFERENCES `opportunities`(`id`) ON DELETE cascade ON UPDATE no action;