CREATE TABLE `auditLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entityType` enum('lead','opportunity') NOT NULL,
	`entityId` int NOT NULL,
	`entityName` varchar(255) NOT NULL,
	`deletedBy` int NOT NULL,
	`deletedByName` varchar(255) NOT NULL,
	`deletedAt` timestamp NOT NULL DEFAULT (now()),
	`additionalInfo` text,
	CONSTRAINT `auditLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `auditLogs` ADD CONSTRAINT `auditLogs_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;