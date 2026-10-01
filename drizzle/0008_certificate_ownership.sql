ALTER TABLE certificates ADD COLUMN user_id TEXT;
--> statement-breakpoint
UPDATE certificates
SET user_id = (
  SELECT accounts.user_id
  FROM accounts
  WHERE accounts.name = certificates.student_name
  ORDER BY accounts.created_at
  LIMIT 1
)
WHERE user_id IS NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_certificates_user_id ON certificates(user_id);
