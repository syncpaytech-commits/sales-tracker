ALTER TABLE `users` MODIFY COLUMN `openId` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `username` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `password` varchar(255);