ALTER TABLE `callLogs` ADD `callbackScheduled` enum('Yes','No') DEFAULT 'No';--> statement-breakpoint
ALTER TABLE `callLogs` ADD `callbackDate` timestamp;--> statement-breakpoint
ALTER TABLE `todos` ADD `status` enum('pending','completed') DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `todos` ADD `linkedLeadId` int;