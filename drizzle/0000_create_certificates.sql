CREATE TABLE `certificates` (
	`id` text PRIMARY KEY NOT NULL,
	`student_name` text NOT NULL,
	`course_id` text NOT NULL,
	`course_title` text NOT NULL,
	`hours` integer NOT NULL,
	`issued_at` text NOT NULL,
	`issuer` text DEFAULT 'Vulcan Defense' NOT NULL,
	`status` text DEFAULT 'valid' NOT NULL
);
