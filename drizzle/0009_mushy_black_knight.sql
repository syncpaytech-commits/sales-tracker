ALTER TABLE `leads` ADD `convertedToOpportunity` enum('Yes','No') DEFAULT 'No' NOT NULL;--> statement-breakpoint
ALTER TABLE `leads` ADD `opportunityId` int;--> statement-breakpoint
ALTER TABLE `leads` ADD `conversionDate` timestamp;