ALTER TABLE accounts ADD COLUMN plan_started_at TEXT;
--> statement-breakpoint
ALTER TABLE accounts ADD COLUMN plan_expires_at TEXT;
--> statement-breakpoint
UPDATE accounts SET plan_started_at=COALESCE(updated_at,created_at),plan_expires_at=datetime(COALESCE(updated_at,created_at),'+30 days') WHERE system_role<>'admin' AND plan<>'gratuito' AND plan_expires_at IS NULL;
--> statement-breakpoint
INSERT OR IGNORE INTO accounts (user_id,email,name,role,system_role,plan,status,goal,email_verified_at,created_at,updated_at,plan_started_at,plan_expires_at) VALUES
('demo-marina','marina@exemplo.com','Marina Costa','Estudante de Segurança','aluno','avancado','active','AppSec Specialist',datetime('now'),datetime('now'),datetime('now'),datetime('now'),datetime('now','+30 days')),
('demo-joao','joao@exemplo.com','João Vieira','Analista de Segurança','aluno','medio','active','Cloud Security',datetime('now'),datetime('now'),datetime('now'),datetime('now'),datetime('now','+30 days')),
('demo-beatriz','beatriz@exemplo.com','Beatriz Lima','Professora de AppSec','professor','avancado','active','Ensino de Segurança',datetime('now'),datetime('now'),datetime('now'),datetime('now'),datetime('now','+30 days')),
('demo-lucas','lucas@exemplo.com','Lucas Martins','Desenvolvedor','aluno','basico','active','Secure Coding',datetime('now'),datetime('now'),datetime('now'),datetime('now'),datetime('now','+30 days')),
('demo-ana','ana@exemplo.com','Ana Ribeiro','Professora de Segurança','professor','medio','active','Segurança de APIs',datetime('now'),datetime('now'),datetime('now'),datetime('now'),datetime('now','+30 days')),
('demo-diego','diego@exemplo.com','Diego Santos','Estudante de Segurança','aluno','gratuito','active','Fundamentos de Segurança',datetime('now'),datetime('now'),datetime('now'),NULL,NULL);
--> statement-breakpoint
INSERT OR IGNORE INTO user_offensive (user_id,bonus_xp) VALUES ('demo-marina',2940),('demo-joao',2210),('demo-beatriz',1980),('demo-lucas',1320),('demo-ana',960),('demo-diego',420);
