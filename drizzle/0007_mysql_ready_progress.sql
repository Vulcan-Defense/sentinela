-- D1/SQLite mirror of the MySQL academic tables. Apply locally if needed.
ALTER TABLE accounts ADD COLUMN goal TEXT NOT NULL DEFAULT 'AppSec Specialist';
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  price_cents INTEGER NOT NULL DEFAULT 0,
  description TEXT NOT NULL,
  features_json TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY NOT NULL,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  hours INTEGER NOT NULL,
  level TEXT NOT NULL,
  icon TEXT NOT NULL,
  tone TEXT NOT NULL,
  access_plan TEXT NOT NULL,
  premium INTEGER NOT NULL DEFAULT 0,
  price_cents INTEGER NOT NULL DEFAULT 0,
  published INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS course_modules (
  id TEXT PRIMARY KEY NOT NULL,
  course_id TEXT NOT NULL,
  title TEXT NOT NULL,
  short_title TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  lessons INTEGER NOT NULL,
  xp INTEGER NOT NULL,
  tone TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_course_modules_course ON course_modules(course_id);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS enrollments (
  user_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'self',
  stripe_session_id TEXT,
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, course_id),
  FOREIGN KEY (user_id) REFERENCES accounts(user_id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS module_completions (
  user_id TEXT NOT NULL,
  module_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  xp INTEGER NOT NULL,
  completed_at TEXT NOT NULL,
  PRIMARY KEY (user_id, module_id),
  FOREIGN KEY (user_id) REFERENCES accounts(user_id) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS quiz_passes (
  user_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  passed_at TEXT NOT NULL,
  PRIMARY KEY (user_id, course_id),
  FOREIGN KEY (user_id) REFERENCES accounts(user_id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS lesson_steps (
  user_id TEXT NOT NULL,
  module_id TEXT NOT NULL,
  step_index INTEGER NOT NULL,
  studied_at TEXT NOT NULL,
  PRIMARY KEY (user_id, module_id, step_index),
  FOREIGN KEY (user_id) REFERENCES accounts(user_id) ON DELETE CASCADE
);
