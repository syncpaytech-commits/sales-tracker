CREATE TABLE `opportunities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`leadId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`companyName` varchar(255) NOT NULL,
	`contactName` varchar(255) NOT NULL,
	`phone` varchar(50),
	`email` varchar(320),
	`stage` enum('qualified','proposal','negotiation','closed_won','closed_lost') NOT NULL DEFAULT 'qualified',
	`dealValue` varchar(100),
	`probability` int DEFAULT 50,
	`expectedCloseDate` timestamp,
	`actualCloseDate` timestamp,
	`ownerId` int NOT NULL,
	`notes` text,
	`lossReason` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `opportunities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
DROP TABLE `invitations`;--> statement-breakpoint
ALTER TABLE `opportunities` ADD CONSTRAINT `opportunities_leadId_leads_id_fk` FOREIGN KEY (`leadId`) REFERENCES `leads`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `opportunities` ADD CONSTRAINT `opportunities_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;