-- VulcanAcademy · schema MySQL (Locaweb DBaaS)
-- Timestamps em ISO-8601 (VARCHAR) para espelhar o D1 atual e facilitar a cutover.
-- Charset utf8mb4. Motor InnoDB.

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS accounts (
  user_id VARCHAR(128) NOT NULL,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(160) NOT NULL,
  role VARCHAR(120) NOT NULL DEFAULT 'Estudante de Segurança',
  system_role VARCHAR(32) NOT NULL DEFAULT 'aluno',
  plan VARCHAR(32) NOT NULL DEFAULT 'gratuito',
  plan_started_at VARCHAR(40) NULL,
  plan_expires_at VARCHAR(40) NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  goal VARCHAR(160) NOT NULL DEFAULT 'AppSec Specialist',
  phone VARCHAR(32) NOT NULL DEFAULT '',
  postal_code VARCHAR(16) NOT NULL DEFAULT '',
  address_line VARCHAR(255) NOT NULL DEFAULT '',
  address_number VARCHAR(32) NOT NULL DEFAULT '',
  address_complement VARCHAR(120) NOT NULL DEFAULT '',
  neighborhood VARCHAR(120) NOT NULL DEFAULT '',
  city VARCHAR(120) NOT NULL DEFAULT '',
  state VARCHAR(2) NOT NULL DEFAULT '',
  receive_printed_certificate TINYINT(1) NOT NULL DEFAULT 0,
  address_confirmed TINYINT(1) NOT NULL DEFAULT 0,
  profile_photo_key VARCHAR(255) NULL,
  community_member TINYINT(1) NOT NULL DEFAULT 0,
  email_verified_at VARCHAR(40) NOT NULL DEFAULT '',
  created_at VARCHAR(40) NOT NULL,
  updated_at VARCHAR(40) NOT NULL,
  PRIMARY KEY (user_id),
  UNIQUE KEY accounts_email_unique (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS manual_credentials (
  user_id VARCHAR(128) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  password_salt VARCHAR(255) NOT NULL,
  password_iterations INT NOT NULL,
  created_at VARCHAR(40) NOT NULL,
  updated_at VARCHAR(40) NOT NULL,
  PRIMARY KEY (user_id),
  CONSTRAINT fk_manual_credentials_account FOREIGN KEY (user_id) REFERENCES accounts (user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS auth_challenges (
  id VARCHAR(64) NOT NULL,
  user_id VARCHAR(128) NOT NULL,
  purpose VARCHAR(32) NOT NULL,
  code_hash VARCHAR(128) NOT NULL,
  expires_at VARCHAR(40) NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  consumed_at VARCHAR(40) NULL,
  created_at VARCHAR(40) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_auth_challenges_user (user_id),
  CONSTRAINT fk_auth_challenges_account FOREIGN KEY (user_id) REFERENCES accounts (user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS auth_sessions (
  id VARCHAR(128) NOT NULL,
  user_id VARCHAR(128) NOT NULL,
  expires_at VARCHAR(40) NOT NULL,
  created_at VARCHAR(40) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_auth_sessions_user (user_id),
  CONSTRAINT fk_auth_sessions_account FOREIGN KEY (user_id) REFERENCES accounts (user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS auth_rate_limits (
  rate_key VARCHAR(128) NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  window_started_at VARCHAR(40) NOT NULL,
  PRIMARY KEY (rate_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS meeting_audit_meetings (
  meeting_id VARCHAR(128) NOT NULL,
  room_name VARCHAR(180) NOT NULL,
  room_jid VARCHAR(255) NOT NULL,
  started_at VARCHAR(40) NOT NULL,
  ended_at VARCHAR(40) NULL,
  duration_seconds INT NULL,
  last_event_at VARCHAR(40) NOT NULL,
  is_breakout TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (meeting_id),
  KEY idx_meeting_audit_room_started (room_name, started_at),
  KEY idx_meeting_audit_ended (ended_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS meeting_audit_participants (
  meeting_id VARCHAR(128) NOT NULL,
  occupant_jid VARCHAR(255) NOT NULL,
  joined_at VARCHAR(40) NOT NULL,
  left_at VARCHAR(40) NULL,
  duration_seconds INT NULL,
  participant_name VARCHAR(160) NULL,
  participant_email VARCHAR(254) NULL,
  participant_external_id VARCHAR(128) NULL,
  PRIMARY KEY (meeting_id, occupant_jid, joined_at),
  KEY idx_meeting_audit_participant (meeting_id, participant_email),
  CONSTRAINT fk_meeting_audit_participants_meeting FOREIGN KEY (meeting_id) REFERENCES meeting_audit_meetings (meeting_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS access_codes (
  id VARCHAR(64) NOT NULL PRIMARY KEY, code VARCHAR(80) NOT NULL UNIQUE, active TINYINT(1) NOT NULL DEFAULT 1,
  max_uses INT NULL, uses_count INT NOT NULL DEFAULT 0, expires_at VARCHAR(40) NULL, created_at VARCHAR(40) NOT NULL, created_by VARCHAR(128) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS coupons (
  id VARCHAR(64) NOT NULL PRIMARY KEY, code VARCHAR(80) NOT NULL UNIQUE, discount_percent INT NOT NULL, active TINYINT(1) NOT NULL DEFAULT 1,
  max_uses INT NULL, uses_count INT NOT NULL DEFAULT 0, expires_at VARCHAR(40) NULL, created_at VARCHAR(40) NOT NULL, created_by VARCHAR(128) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS plans (
  id VARCHAR(32) NOT NULL,
  name VARCHAR(64) NOT NULL,
  price_cents INT NOT NULL DEFAULT 0,
  description VARCHAR(255) NOT NULL,
  features_json TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS courses (
  id VARCHAR(64) NOT NULL,
  code VARCHAR(64) NOT NULL,
  title VARCHAR(180) NOT NULL,
  description TEXT NOT NULL,
  hours INT NOT NULL,
  level VARCHAR(80) NOT NULL,
  icon VARCHAR(32) NOT NULL,
  tone VARCHAR(32) NOT NULL,
  access_plan VARCHAR(32) NOT NULL,
  premium TINYINT(1) NOT NULL DEFAULT 0,
  price_cents INT NOT NULL DEFAULT 0,
  published TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_courses_access (access_plan)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS course_modules (
  id VARCHAR(32) NOT NULL,
  course_id VARCHAR(64) NOT NULL,
  title VARCHAR(180) NOT NULL,
  short_title VARCHAR(120) NOT NULL,
  difficulty VARCHAR(32) NOT NULL,
  lessons INT NOT NULL,
  xp INT NOT NULL,
  tone VARCHAR(32) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_course_modules_course (course_id),
  CONSTRAINT fk_course_modules_course FOREIGN KEY (course_id) REFERENCES courses (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS enrollments (
  user_id VARCHAR(128) NOT NULL,
  course_id VARCHAR(64) NOT NULL,
  source VARCHAR(32) NOT NULL DEFAULT 'self',
  stripe_session_id VARCHAR(128) NULL,
  created_at VARCHAR(40) NOT NULL,
  PRIMARY KEY (user_id, course_id),
  KEY idx_enrollments_course (course_id),
  CONSTRAINT fk_enrollments_account FOREIGN KEY (user_id) REFERENCES accounts (user_id) ON DELETE CASCADE,
  CONSTRAINT fk_enrollments_course FOREIGN KEY (course_id) REFERENCES courses (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS module_completions (
  user_id VARCHAR(128) NOT NULL,
  module_id VARCHAR(32) NOT NULL,
  course_id VARCHAR(64) NOT NULL,
  xp INT NOT NULL,
  completed_at VARCHAR(40) NOT NULL,
  PRIMARY KEY (user_id, module_id),
  KEY idx_module_completions_course (course_id),
  CONSTRAINT fk_module_completions_account FOREIGN KEY (user_id) REFERENCES accounts (user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS quiz_passes (
  user_id VARCHAR(128) NOT NULL,
  course_id VARCHAR(64) NOT NULL,
  passed_at VARCHAR(40) NOT NULL,
  PRIMARY KEY (user_id, course_id),
  CONSTRAINT fk_quiz_passes_account FOREIGN KEY (user_id) REFERENCES accounts (user_id) ON DELETE CASCADE,
  CONSTRAINT fk_quiz_passes_course FOREIGN KEY (course_id) REFERENCES courses (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS lesson_steps (
  user_id VARCHAR(128) NOT NULL,
  module_id VARCHAR(32) NOT NULL,
  step_index INT NOT NULL,
  studied_at VARCHAR(40) NOT NULL,
  PRIMARY KEY (user_id, module_id, step_index),
  CONSTRAINT fk_lesson_steps_account FOREIGN KEY (user_id) REFERENCES accounts (user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_activity_days (
  user_id VARCHAR(128) NOT NULL,
  day CHAR(10) NOT NULL,
  source VARCHAR(32) NOT NULL,
  created_at VARCHAR(40) NOT NULL,
  PRIMARY KEY (user_id, day),
  KEY idx_user_activity_days_user (user_id),
  CONSTRAINT fk_user_activity_days_account FOREIGN KEY (user_id) REFERENCES accounts (user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_offensive (
  user_id VARCHAR(128) NOT NULL,
  bonus_xp INT NOT NULL DEFAULT 0,
  prize_claimed_at VARCHAR(40) NULL,
  PRIMARY KEY (user_id),
  CONSTRAINT fk_user_offensive_account FOREIGN KEY (user_id) REFERENCES accounts (user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS certificates (
  id VARCHAR(64) NOT NULL,
  user_id VARCHAR(128) NULL,
  student_name VARCHAR(160) NOT NULL,
  course_id VARCHAR(128) NOT NULL,
  course_title VARCHAR(180) NOT NULL,
  hours INT NOT NULL,
  issued_at VARCHAR(40) NOT NULL,
  issuer VARCHAR(80) NOT NULL DEFAULT 'Vulcan Defense',
  status VARCHAR(32) NOT NULL DEFAULT 'valid',
  PRIMARY KEY (id),
  KEY idx_certificates_user (user_id),
  KEY idx_certificates_course (course_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS certifications (
  id VARCHAR(64) NOT NULL,
  code VARCHAR(32) NOT NULL,
  title VARCHAR(180) NOT NULL,
  description TEXT NOT NULL,
  published TINYINT(1) NOT NULL DEFAULT 1,
  passing_percentage INT NOT NULL DEFAULT 85,
  question_count INT NOT NULL DEFAULT 40,
  duration_minutes INT NOT NULL DEFAULT 90,
  created_at VARCHAR(40) NOT NULL,
  updated_at VARCHAR(40) NOT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS certification_attempts (
  id VARCHAR(64) NOT NULL,
  user_id VARCHAR(128) NOT NULL,
  certification_id VARCHAR(64) NOT NULL,
  score INT NOT NULL,
  total INT NOT NULL,
  percentage INT NOT NULL,
  passed TINYINT(1) NOT NULL,
  attempted_at VARCHAR(40) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_certification_attempts_user_cert (user_id, certification_id),
  CONSTRAINT fk_cert_attempts_account FOREIGN KEY (user_id) REFERENCES accounts (user_id) ON DELETE CASCADE,
  CONSTRAINT fk_cert_attempts_cert FOREIGN KEY (certification_id) REFERENCES certifications (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS platform_settings (
  setting_key VARCHAR(80) NOT NULL,
  setting_value VARCHAR(255) NOT NULL,
  updated_at VARCHAR(40) NOT NULL,
  updated_by VARCHAR(128) NULL,
  PRIMARY KEY (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS printed_certificate_requests (
  id VARCHAR(64) NOT NULL,
  user_id VARCHAR(128) NOT NULL,
  certificate_id VARCHAR(64) NOT NULL,
  course_id VARCHAR(128) NOT NULL,
  student_name VARCHAR(160) NOT NULL,
  phone VARCHAR(32) NOT NULL,
  delivery_address VARCHAR(600) NOT NULL,
  amount_cents INT NOT NULL,
  currency VARCHAR(8) NOT NULL DEFAULT 'brl',
  status VARCHAR(32) NOT NULL DEFAULT 'paid',
  stripe_session_id VARCHAR(128) NOT NULL,
  created_at VARCHAR(40) NOT NULL,
  paid_at VARCHAR(40) NULL,
  updated_at VARCHAR(40) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY printed_certificate_request_session (stripe_session_id),
  UNIQUE KEY printed_certificate_request_user_certificate (user_id, certificate_id),
  KEY idx_printed_certificate_status (status, created_at),
  CONSTRAINT fk_printed_certificate_account FOREIGN KEY (user_id) REFERENCES accounts (user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS profile_photos (
  user_id VARCHAR(128) NOT NULL,
  content_type VARCHAR(64) NOT NULL,
  photo MEDIUMBLOB NOT NULL,
  updated_at VARCHAR(40) NOT NULL,
  PRIMARY KEY (user_id),
  CONSTRAINT fk_profile_photos_account FOREIGN KEY (user_id) REFERENCES accounts (user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS community_feedback (
  id VARCHAR(40) NOT NULL,
  user_id VARCHAR(128) NOT NULL,
  kind VARCHAR(16) NOT NULL,
  title VARCHAR(160) NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'open',
  admin_note TEXT NULL,
  created_at VARCHAR(40) NOT NULL,
  updated_at VARCHAR(40) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_community_feedback_user (user_id, created_at),
  KEY idx_community_feedback_status (status, created_at),
  CONSTRAINT fk_community_feedback_account FOREIGN KEY (user_id) REFERENCES accounts (user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
