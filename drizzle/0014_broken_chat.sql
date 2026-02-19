ALTER TABLE `notes` MODIFY COLUMN `leadId` int;--> statement-breakpoint
ALTER TABLE `notes` ADD `opportunityId` int;--> statement-breakpoint
ALTER TABLE `notes` ADD CONSTRAINT `notes_opportunityId_opportunities_id_fk` FOREIGN KEY (`opportunityId`) REFERENCES `opportunities`(`id`) ON DELETE cascade ON UPDATE no action;