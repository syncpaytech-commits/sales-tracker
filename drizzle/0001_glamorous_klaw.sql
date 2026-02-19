CREATE TABLE `callLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`leadId` int NOT NULL,
	`callDate` timestamp NOT NULL,
	`callOutcome` enum('No Answer','Gatekeeper','DM Reached','Callback Requested','Email Requested','Statement Agreed','Not Interested','Bad Data') NOT NULL,
	`callDuration` int,
	`notes` text,
	`agentId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `callLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `leads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyName` varchar(255) NOT NULL,
	`contactName` varchar(255) NOT NULL,
	`phone` varchar(50),
	`email` varchar(320),
	`provider` varchar(255),
	`processingVolume` varchar(100),
	`effectiveRate` varchar(100),
	`dataSource` varchar(255),
	`dataCohort` varchar(100),
	`ownerId` int NOT NULL,
	`dataVerified` enum('Yes','No') DEFAULT 'No',
	`phoneValid` enum('Yes','No') DEFAULT 'No',
	`emailValid` enum('Yes','No') DEFAULT 'No',
	`correctDecisionMaker` enum('Yes','No') DEFAULT 'No',
	`stage` enum('Lea') NOT NULL DEFAULT 'Lead (Not Contacted)',
	`lastContactDate` timestamp,
	`nextFollowUpDate` timestamp,
	`followUpTime` varchar(20),
	`quoteDate` timestamp,
	`quotedRate` varchar(100),
	`expectedResidual` varchar(100),
	`signedDate` timestamp,
	`actualResidual` varchar(100),
	`onboardingStatus` varchar(100),
	`lossReason` varchar(255),
	`emailSent` enum('Yes','No') DEFAULT 'No',
	`emailSentDate` timestamp,
	`quoteEmailTemplate` text,
	`dialAttempts` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `leads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `callLogs` ADD CONSTRAINT `callLogs_leadId_leads_id_fk` FOREIGN KEY (`leadId`) REFERENCES `leads`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `callLogs` ADD CONSTRAINT `callLogs_agentId_users_id_fk` FOREIGN KEY (`agentId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `leads` ADD CONSTRAINT `leads_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;