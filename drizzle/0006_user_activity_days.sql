CREATE TABLE `user_activity_days` (
	`user_id` text NOT NULL,
	`day` text NOT NULL,
	`source` text NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`user_id`, `day`),
	FOREIGN KEY (`user_id`) REFERENCES `accounts`(`user_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_user_activity_days_user` ON `user_activity_days` (`user_id`);
--> statement-breakpoint
CREATE TABLE `user_offensive` (
	`user_id` text PRIMARY KEY NOT NULL,
	`bonus_xp` integer DEFAULT 0 NOT NULL,
	`prize_claimed_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `accounts`(`user_id`) ON UPDATE no action ON DELETE cascade
);
