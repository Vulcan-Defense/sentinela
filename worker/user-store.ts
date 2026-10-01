import { courses, findModule, planRank, type Course, type PlanId } from "../data/site-catalog";
import type { MysqlDb } from "./mysql";
import { enforceMysqlPlanExpiry } from "./plan-cycle";

export type MeState = {
  profile: { name:string;email:string;role:string;goal:string;phone:string;postalCode:string;addressLine:string;addressNumber:string;addressComplement:string;neighborhood:string;city:string;state:string;receivePrintedCertificate:boolean;addressConfirmed:boolean;photoUrl:string };
  plan: PlanId;
  communityMember: boolean;
  enrolledCourses: string[];
  completed: string[];
  passedQuizzes: string[];
  lessonSteps: Record<string, number[]>;
};

const allowedPlans = new Set<PlanId>(["gratuito", "basico", "medio", "avancado"]);

export async function upsertAccount(
  db: MysqlDb,
  account: { userId: string; email: string; name: string; role: string; systemRole: string; plan: string; status: string; emailVerifiedAt: string; goal?: string; createdAt?: string; updatedAt?: string; communityMember?: boolean },
) {
  const now = new Date().toISOString();
  const createdAt = account.createdAt || now;
  const updatedAt = account.updatedAt || now;
  await db.execute(
    `INSERT INTO accounts (user_id,email,name,role,system_role,plan,status,goal,email_verified_at,created_at,updated_at,community_member)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
     ON DUPLICATE KEY UPDATE email=VALUES(email), name=VALUES(name), role=VALUES(role), system_role=VALUES(system_role), plan=VALUES(plan), status=VALUES(status), goal=VALUES(goal), email_verified_at=VALUES(email_verified_at), updated_at=VALUES(updated_at)`,
    [account.userId, account.email, account.name, account.role, account.systemRole, account.plan, account.status, account.goal || "AppSec Specialist", account.emailVerifiedAt || "", createdAt, updatedAt, account.communityMember ? 1 : 0],
  );
}

export async function upsertCredentials(
  db: MysqlDb,
  credentials: { userId: string; passwordHash: string; passwordSalt: string; passwordIterations: number; createdAt?: string; updatedAt?: string },
) {
  const now = new Date().toISOString();
  await db.execute(
    `INSERT INTO manual_credentials (user_id,password_hash,password_salt,password_iterations,created_at,updated_at)
     VALUES (?,?,?,?,?,?)
     ON DUPLICATE KEY UPDATE password_hash=VALUES(password_hash), password_salt=VALUES(password_salt), password_iterations=VALUES(password_iterations), updated_at=VALUES(updated_at)`,
    [credentials.userId, credentials.passwordHash, credentials.passwordSalt, credentials.passwordIterations, credentials.createdAt || now, credentials.updatedAt || now],
  );
}

export async function findAccountRecord(db: MysqlDb, email: string) {
  return (await db.query<{
    userId: string; email: string; name: string; role: string; systemRole: string; plan: string; status: string; emailVerifiedAt: string; communityMember: number;
  }>(
    "SELECT user_id AS userId,email,name,role,system_role AS systemRole,plan,status,email_verified_at AS emailVerifiedAt,community_member AS communityMember FROM accounts WHERE email=? LIMIT 1",
    [email],
  ))[0] ?? null;
}

export async function findAccountByEmail(db: MysqlDb, email: string) {
  return (await db.query<{ userId: string; status: string }>(
    "SELECT user_id AS userId, status FROM accounts WHERE email=? LIMIT 1",
    [email],
  ))[0] ?? null;
}

export async function findAccountByUserId(db: MysqlDb, userId: string) {
  const row = (await db.query<{
    email: string; name: string; role: string; systemRole: string; plan: string; status: string; emailVerifiedAt: string; communityMember: number;
  }>(
    "SELECT email,name,role,system_role AS systemRole,plan,status,email_verified_at AS emailVerifiedAt,community_member AS communityMember FROM accounts WHERE user_id=? LIMIT 1",
    [userId],
  ))[0];
  return row ? { ...row, communityMember: Boolean(row.communityMember) } : null;
}

export async function findManualLogin(db: MysqlDb, email: string) {
  const row = (await db.query<{
    userId: string; email: string; name: string; role: string; systemRole: string; plan: string; status: string; emailVerifiedAt: string; communityMember: number; passwordHash: string; passwordSalt: string;
  }>(
    `SELECT a.user_id AS userId,a.email,a.name,a.role,a.system_role AS systemRole,a.plan,a.status,a.email_verified_at AS emailVerifiedAt,a.community_member AS communityMember,
      c.password_hash AS passwordHash,c.password_salt AS passwordSalt
     FROM accounts a JOIN manual_credentials c ON c.user_id=a.user_id WHERE a.email=? LIMIT 1`,
    [email],
  ))[0];
  return row ? { ...row, communityMember: Boolean(row.communityMember) } : null;
}

export async function activateAccount(db: MysqlDb, userId: string, at: string) {
  await db.execute("UPDATE accounts SET status='active', email_verified_at=?, updated_at=? WHERE user_id=?", [at, at, userId]);
}

export async function insertAuthSession(db: MysqlDb, session: { id: string; userId: string; expiresAt: string; createdAt: string }) {
  await db.execute(
    "INSERT IGNORE INTO auth_sessions (id,user_id,expires_at,created_at) VALUES (?,?,?,?)",
    [session.id, session.userId, session.expiresAt, session.createdAt],
  );
}

export async function findSession(db: MysqlDb, sessionId: string, nowIso: string) {
  return (await db.query<{ userId: string; email: string }>(
    "SELECT s.user_id AS userId, a.email FROM auth_sessions s JOIN accounts a ON a.user_id=s.user_id WHERE s.id=? AND s.expires_at>? LIMIT 1",
    [sessionId, nowIso],
  ))[0] ?? null;
}

export async function deleteSession(db: MysqlDb, sessionId: string) {
  await db.execute("DELETE FROM auth_sessions WHERE id=?", [sessionId]);
}

export async function loadMe(db: MysqlDb, userId: string): Promise<MeState | null> {
  await enforceMysqlPlanExpiry(db,userId);
  const account = (await db.query<{name:string;email:string;role:string;goal:string;plan:string;phone:string;postalCode:string;addressLine:string;addressNumber:string;addressComplement:string;neighborhood:string;city:string;state:string;receivePrintedCertificate:number;addressConfirmed:number;profilePhotoKey:string|null;communityMember:number}>(
    `SELECT name,email,role,goal,plan,phone,postal_code AS postalCode,address_line AS addressLine,address_number AS addressNumber,address_complement AS addressComplement,
     neighborhood,city,state,receive_printed_certificate AS receivePrintedCertificate,address_confirmed AS addressConfirmed,profile_photo_key AS profilePhotoKey,community_member AS communityMember FROM accounts WHERE user_id=? LIMIT 1`,
    [userId],
  ))[0];
  if (!account) return null;
  const enrollments = await db.query<{ course_id: string }>("SELECT course_id FROM enrollments WHERE user_id=? ORDER BY created_at", [userId]);
  const completions = await db.query<{ module_id: string }>("SELECT module_id FROM module_completions WHERE user_id=? ORDER BY completed_at", [userId]);
  const quizzes = await db.query<{ course_id: string }>("SELECT course_id FROM quiz_passes WHERE user_id=?", [userId]);
  const steps = await db.query<{ module_id: string; step_index: number }>("SELECT module_id, step_index FROM lesson_steps WHERE user_id=?", [userId]);
  const lessonSteps: Record<string, number[]> = {};
  for (const row of steps) {
    lessonSteps[row.module_id] = [...(lessonSteps[row.module_id] || []), row.step_index].sort((a, b) => a - b);
  }
  return {
    profile: {name:account.name,email:account.email,role:account.role,goal:account.goal||"AppSec Specialist",phone:account.phone||"",postalCode:account.postalCode||"",addressLine:account.addressLine||"",addressNumber:account.addressNumber||"",addressComplement:account.addressComplement||"",neighborhood:account.neighborhood||"",city:account.city||"",state:account.state||"",receivePrintedCertificate:Boolean(account.receivePrintedCertificate),addressConfirmed:Boolean(account.addressConfirmed),photoUrl:account.profilePhotoKey?"/api/profile/photo":""},
    plan: allowedPlans.has(account.plan as PlanId) ? account.plan as PlanId : "gratuito",
    communityMember: Boolean(account.communityMember),
    enrolledCourses: enrollments.map(row => row.course_id),
    completed: completions.map(row => row.module_id),
    passedQuizzes: quizzes.map(row => row.course_id),
    lessonSteps,
  };
}

export async function updateProfile(db: MysqlDb, userId: string, body: {name?:string;role?:string;goal?:string;phone?:string;postalCode?:string;addressLine?:string;addressNumber?:string;addressComplement?:string;neighborhood?:string;city?:string;state?:string;receivePrintedCertificate?:boolean;addressConfirmed?:boolean}) {
  const name = body.name?.trim().slice(0, 160);
  const role = body.role?.trim().slice(0, 120);
  const goal = body.goal?.trim().slice(0, 160);
  if (!name || name.length < 2) throw new Error("Informe um nome válido.");
  const receive=Boolean(body.receivePrintedCertificate);const confirmed=receive&&Boolean(body.addressConfirmed);
  if(confirmed&&(!body.addressLine?.trim()||!body.addressNumber?.trim()||!body.city?.trim()||!body.state?.trim()||!body.postalCode?.trim()))throw new Error("Preencha o endereço completo antes de confirmá-lo.");
  await db.execute(`UPDATE accounts SET name=?,role=?,goal=?,phone=?,postal_code=?,address_line=?,address_number=?,address_complement=?,neighborhood=?,city=?,state=?,receive_printed_certificate=?,address_confirmed=?,updated_at=? WHERE user_id=?`,
    [name,role||"Estudante de Segurança",goal||"AppSec Specialist",body.phone?.trim().slice(0,32)||"",body.postalCode?.trim().slice(0,16)||"",body.addressLine?.trim().slice(0,255)||"",body.addressNumber?.trim().slice(0,32)||"",body.addressComplement?.trim().slice(0,120)||"",body.neighborhood?.trim().slice(0,120)||"",body.city?.trim().slice(0,120)||"",body.state?.trim().toUpperCase().slice(0,2)||"",receive?1:0,confirmed?1:0,new Date().toISOString(),userId]);
  return loadMe(db, userId);
}

async function ensureCatalogCourse(db: MysqlDb, course: Course) {
  await db.execute(
    `INSERT INTO courses (id,code,title,description,hours,level,icon,tone,access_plan,premium,price_cents,published,sort_order)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,1,?)
     ON DUPLICATE KEY UPDATE code=VALUES(code), title=VALUES(title), description=VALUES(description), hours=VALUES(hours), level=VALUES(level), icon=VALUES(icon), tone=VALUES(tone), access_plan=VALUES(access_plan), premium=VALUES(premium), price_cents=VALUES(price_cents)`,
    [course.id, course.code, course.title, course.description, course.hours, course.level, course.icon, course.tone, course.access, course.premium ? 1 : 0, Math.round((course.price || 0) * 100), 0],
  );
  for (const [moduleIndex, module] of course.modules.entries()) {
    await db.execute(
      `INSERT INTO course_modules (id,course_id,title,short_title,difficulty,lessons,xp,tone,sort_order)
       VALUES (?,?,?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE course_id=VALUES(course_id), title=VALUES(title), short_title=VALUES(short_title), difficulty=VALUES(difficulty), lessons=VALUES(lessons), xp=VALUES(xp), tone=VALUES(tone), sort_order=VALUES(sort_order)`,
      [module.id, course.id, module.title, module.short, module.difficulty, module.lessons, module.xp, module.tone, moduleIndex],
    );
  }
}

export async function enrollCourse(db: MysqlDb, userId: string, courseId: string, source = "self") {
  await enforceMysqlPlanExpiry(db,userId);
  const course = courses.find(item => item.id === courseId);
  if (!course) throw new Error("Curso não encontrado.");
  const account = (await db.query<{ plan: string }>("SELECT plan FROM accounts WHERE user_id=? LIMIT 1", [userId]))[0];
  if (!account) throw new Error("Conta não encontrada no MySQL.");
  const plan = allowedPlans.has(account.plan as PlanId) ? account.plan as PlanId : "gratuito";
  if (course.premium) throw new Error("Este curso exige matrícula premium.");
  if (planRank[plan] < planRank[course.access]) throw new Error(`O curso ${course.title} requer o plano correspondente.`);
  await ensureCatalogCourse(db, course);
  await db.execute(
    "INSERT INTO enrollments (user_id, course_id, source, created_at) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE source=VALUES(source)",
    [userId, courseId, source, new Date().toISOString()],
  );
  const saved = (await db.query<{ course_id: string }>("SELECT course_id FROM enrollments WHERE user_id=? AND course_id=? LIMIT 1", [userId, courseId]))[0];
  if (!saved) throw new Error("Não foi possível gravar a matrícula no banco.");
  return loadMe(db, userId);
}

export async function enrollPaidCourse(db: MysqlDb, userId: string, courseId: string, stripeSessionId: string) {
  const course = courses.find(item => item.id === courseId);
  if (course) await ensureCatalogCourse(db, course);
  await db.execute(
    "INSERT INTO enrollments (user_id, course_id, source, stripe_session_id, created_at) VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE stripe_session_id=VALUES(stripe_session_id), source=VALUES(source)",
    [userId, courseId, "stripe", stripeSessionId, new Date().toISOString()],
  );
}

export async function completeModule(db: MysqlDb, userId: string, moduleId: string) {
  const found = findModule(moduleId);
  if (!found) throw new Error("Módulo não encontrado.");
  const enrolled = (await db.query<{ course_id: string }>("SELECT course_id FROM enrollments WHERE user_id=? AND course_id=? LIMIT 1", [userId, found.course.id]))[0];
  if (!enrolled) throw new Error("Matricule-se no curso antes de concluir módulos.");
  await db.execute(
    "INSERT IGNORE INTO module_completions (user_id, module_id, course_id, xp, completed_at) VALUES (?,?,?,?,?)",
    [userId, moduleId, found.course.id, found.module.xp, new Date().toISOString()],
  );
  return loadMe(db, userId);
}

export async function passQuiz(db: MysqlDb, userId: string, courseId: string) {
  if (!courses.some(course => course.id === courseId)) throw new Error("Curso não encontrado.");
  await db.execute(
    "INSERT IGNORE INTO quiz_passes (user_id, course_id, passed_at) VALUES (?,?,?)",
    [userId, courseId, new Date().toISOString()],
  );
  return loadMe(db, userId);
}

export async function recordLessonStep(db: MysqlDb, userId: string, moduleId: string, step: number) {
  if (!Number.isInteger(step) || step < 1 || step > 3) throw new Error("Etapa inválida.");
  if (!findModule(moduleId)) throw new Error("Módulo não encontrado.");
  await db.execute(
    "INSERT IGNORE INTO lesson_steps (user_id, module_id, step_index, studied_at) VALUES (?,?,?,?)",
    [userId, moduleId, step, new Date().toISOString()],
  );
  return loadMe(db, userId);
}

export async function loadRanking(db: MysqlDb) {
  const rows=await db.query<{ userId: string; name: string; xp: number; profilePhotoKey:string|null }>(
    `SELECT a.user_id AS userId, a.name, a.profile_photo_key AS profilePhotoKey,
      COALESCE((SELECT SUM(xp) FROM module_completions WHERE user_id=a.user_id),0)
      + COALESCE((SELECT bonus_xp FROM user_offensive WHERE user_id=a.user_id),0) AS xp
     FROM accounts a
     WHERE a.status='active'
     ORDER BY xp DESC, a.name ASC
     LIMIT 50`,
  );
  return rows.map(row=>({...row,photoUrl:row.profilePhotoKey?`/api/profile/photo/${encodeURIComponent(row.userId)}`:"",profilePhotoKey:undefined}));
}
