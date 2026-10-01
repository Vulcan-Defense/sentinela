import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const certificates = sqliteTable("certificates", {
  id: text("id").primaryKey(),
  userId: text("user_id"),
  studentName: text("student_name").notNull(),
  courseId: text("course_id").notNull(),
  courseTitle: text("course_title").notNull(),
  hours: integer("hours").notNull(),
  issuedAt: text("issued_at").notNull(),
  issuer: text("issuer").notNull().default("Vulcan Defense"),
  status: text("status").notNull().default("valid"),
});

export const accounts = sqliteTable("accounts", {
  userId: text("user_id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  role: text("role").notNull().default("Estudante de Segurança"),
  systemRole: text("system_role").notNull().default("aluno"),
  plan: text("plan").notNull().default("gratuito"),
  planStartedAt: text("plan_started_at"),
  planExpiresAt: text("plan_expires_at"),
  status: text("status").notNull().default("active"),
  goal: text("goal").notNull().default("AppSec Specialist"),
  phone: text("phone").notNull().default(""),
  postalCode: text("postal_code").notNull().default(""),
  addressLine: text("address_line").notNull().default(""),
  addressNumber: text("address_number").notNull().default(""),
  addressComplement: text("address_complement").notNull().default(""),
  neighborhood: text("neighborhood").notNull().default(""),
  city: text("city").notNull().default(""),
  state: text("state").notNull().default(""),
  receivePrintedCertificate: integer("receive_printed_certificate").notNull().default(0),
  addressConfirmed: integer("address_confirmed").notNull().default(0),
  profilePhotoKey: text("profile_photo_key"),
  emailVerifiedAt: text("email_verified_at").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const platformSettings = sqliteTable("platform_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: text("updated_at").notNull(),
  updatedBy: text("updated_by"),
});

export const printedCertificateRequests = sqliteTable("printed_certificate_requests", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => accounts.userId, { onDelete: "cascade" }),
  certificateId: text("certificate_id").notNull(),
  courseId: text("course_id").notNull(),
  studentName: text("student_name").notNull(),
  phone: text("phone").notNull(),
  deliveryAddress: text("delivery_address").notNull(),
  amountCents: integer("amount_cents").notNull(),
  currency: text("currency").notNull().default("brl"),
  status: text("status").notNull().default("paid"),
  stripeSessionId: text("stripe_session_id").notNull().unique(),
  createdAt: text("created_at").notNull(),
  paidAt: text("paid_at"),
  updatedAt: text("updated_at").notNull(),
});

export const manualCredentials = sqliteTable("manual_credentials", {
  userId: text("user_id").primaryKey().references(() => accounts.userId, { onDelete: "cascade" }),
  passwordHash: text("password_hash").notNull(),
  passwordSalt: text("password_salt").notNull(),
  passwordIterations: integer("password_iterations").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const authChallenges = sqliteTable("auth_challenges", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => accounts.userId, { onDelete: "cascade" }),
  purpose: text("purpose").notNull(),
  codeHash: text("code_hash").notNull(),
  expiresAt: text("expires_at").notNull(),
  attempts: integer("attempts").notNull().default(0),
  consumedAt: text("consumed_at"),
  createdAt: text("created_at").notNull(),
});

export const authSessions = sqliteTable("auth_sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => accounts.userId, { onDelete: "cascade" }),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull(),
});

export const userActivityDays = sqliteTable("user_activity_days", {
  userId: text("user_id").notNull().references(() => accounts.userId, { onDelete: "cascade" }),
  day: text("day").notNull(),
  source: text("source").notNull(),
  createdAt: text("created_at").notNull(),
}, table => [
  primaryKey({ columns: [table.userId, table.day] }),
  index("idx_user_activity_days_user").on(table.userId),
]);

export const userOffensive = sqliteTable("user_offensive", {
  userId: text("user_id").primaryKey().references(() => accounts.userId, { onDelete: "cascade" }),
  bonusXp: integer("bonus_xp").notNull().default(0),
  prizeClaimedAt: text("prize_claimed_at"),
});

export const authRateLimits = sqliteTable("auth_rate_limits", {
  key: text("key").primaryKey(),
  attempts: integer("attempts").notNull().default(0),
  windowStartedAt: text("window_started_at").notNull(),
});

export const certifications = sqliteTable("certifications", {
  id: text("id").primaryKey(),
  code: text("code").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  published: integer("published").notNull().default(1),
  passingPercentage: integer("passing_percentage").notNull().default(85),
  questionCount: integer("question_count").notNull().default(40),
  durationMinutes: integer("duration_minutes").notNull().default(90),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const certificationAttempts = sqliteTable("certification_attempts", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => accounts.userId, { onDelete: "cascade" }),
  certificationId: text("certification_id").notNull().references(() => certifications.id, { onDelete: "cascade" }),
  score: integer("score").notNull(),
  total: integer("total").notNull(),
  percentage: integer("percentage").notNull(),
  passed: integer("passed").notNull(),
  attemptedAt: text("attempted_at").notNull(),
}, table => [index("idx_certification_attempts_user_certification").on(table.userId, table.certificationId)]);

export const plans = sqliteTable("plans", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  priceCents: integer("price_cents").notNull().default(0),
  description: text("description").notNull(),
  featuresJson: text("features_json").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const catalogCourses = sqliteTable("courses", {
  id: text("id").primaryKey(),
  code: text("code").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  hours: integer("hours").notNull(),
  level: text("level").notNull(),
  icon: text("icon").notNull(),
  tone: text("tone").notNull(),
  accessPlan: text("access_plan").notNull(),
  premium: integer("premium").notNull().default(0),
  priceCents: integer("price_cents").notNull().default(0),
  published: integer("published").notNull().default(1),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const courseModules = sqliteTable("course_modules", {
  id: text("id").primaryKey(),
  courseId: text("course_id").notNull().references(() => catalogCourses.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  shortTitle: text("short_title").notNull(),
  difficulty: text("difficulty").notNull(),
  lessons: integer("lessons").notNull(),
  xp: integer("xp").notNull(),
  tone: text("tone").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
}, table => [index("idx_course_modules_course").on(table.courseId)]);

export const enrollments = sqliteTable("enrollments", {
  userId: text("user_id").notNull().references(() => accounts.userId, { onDelete: "cascade" }),
  courseId: text("course_id").notNull().references(() => catalogCourses.id, { onDelete: "cascade" }),
  source: text("source").notNull().default("self"),
  stripeSessionId: text("stripe_session_id"),
  createdAt: text("created_at").notNull(),
}, table => [
  primaryKey({ columns: [table.userId, table.courseId] }),
  index("idx_enrollments_course").on(table.courseId),
]);

export const moduleCompletions = sqliteTable("module_completions", {
  userId: text("user_id").notNull().references(() => accounts.userId, { onDelete: "cascade" }),
  moduleId: text("module_id").notNull(),
  courseId: text("course_id").notNull(),
  xp: integer("xp").notNull(),
  completedAt: text("completed_at").notNull(),
}, table => [primaryKey({ columns: [table.userId, table.moduleId] })]);

export const quizPasses = sqliteTable("quiz_passes", {
  userId: text("user_id").notNull().references(() => accounts.userId, { onDelete: "cascade" }),
  courseId: text("course_id").notNull().references(() => catalogCourses.id, { onDelete: "cascade" }),
  passedAt: text("passed_at").notNull(),
}, table => [primaryKey({ columns: [table.userId, table.courseId] })]);

export const lessonSteps = sqliteTable("lesson_steps", {
  userId: text("user_id").notNull().references(() => accounts.userId, { onDelete: "cascade" }),
  moduleId: text("module_id").notNull(),
  stepIndex: integer("step_index").notNull(),
  studiedAt: text("studied_at").notNull(),
}, table => [primaryKey({ columns: [table.userId, table.moduleId, table.stepIndex] })]);
