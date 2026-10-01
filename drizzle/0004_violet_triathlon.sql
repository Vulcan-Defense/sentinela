CREATE TABLE `certification_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`certification_id` text NOT NULL,
	`score` integer NOT NULL,
	`total` integer NOT NULL,
	`percentage` integer NOT NULL,
	`passed` integer NOT NULL,
	`attempted_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `accounts`(`user_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`certification_id`) REFERENCES `certifications`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `certifications` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`published` integer DEFAULT 1 NOT NULL,
	`passing_percentage` integer DEFAULT 85 NOT NULL,
	`question_count` integer DEFAULT 40 NOT NULL,
	`duration_minutes` integer DEFAULT 90 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
