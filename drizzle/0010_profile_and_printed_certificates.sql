ALTER TABLE accounts ADD COLUMN phone TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE accounts ADD COLUMN postal_code TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE accounts ADD COLUMN address_line TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE accounts ADD COLUMN address_number TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE accounts ADD COLUMN address_complement TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE accounts ADD COLUMN neighborhood TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE accounts ADD COLUMN city TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE accounts ADD COLUMN state TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE accounts ADD COLUMN receive_printed_certificate INTEGER NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE accounts ADD COLUMN address_confirmed INTEGER NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE accounts ADD COLUMN profile_photo_key TEXT;
--> statement-breakpoint
CREATE TABLE platform_settings (key TEXT PRIMARY KEY NOT NULL,value TEXT NOT NULL,updated_at TEXT NOT NULL,updated_by TEXT);
--> statement-breakpoint
INSERT OR IGNORE INTO platform_settings (key,value,updated_at) VALUES ('printed_certificate_fee_cents','18990',datetime('now'));
--> statement-breakpoint
CREATE TABLE printed_certificate_requests (
  id TEXT PRIMARY KEY NOT NULL,user_id TEXT NOT NULL,certificate_id TEXT NOT NULL,course_id TEXT NOT NULL,student_name TEXT NOT NULL,
  phone TEXT NOT NULL,delivery_address TEXT NOT NULL,amount_cents INTEGER NOT NULL,currency TEXT NOT NULL DEFAULT 'brl',status TEXT NOT NULL DEFAULT 'paid',
  stripe_session_id TEXT NOT NULL UNIQUE,created_at TEXT NOT NULL,paid_at TEXT,updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES accounts(user_id) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE UNIQUE INDEX idx_printed_certificate_user_certificate ON printed_certificate_requests(user_id,certificate_id);
--> statement-breakpoint
CREATE INDEX idx_printed_certificate_status_created ON printed_certificate_requests(status,created_at);
