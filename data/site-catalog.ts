export type PlanId = "gratuito" | "basico" | "medio" | "avancado";

export const owaspModules = [
  { id: "A01", title: "Quebra de controle de acesso", short: "Controle de acesso", difficulty: "Intermediário", lessons: 8, xp: 350, tone: "coral" },
  { id: "A02", title: "Falhas criptográficas", short: "Criptografia", difficulty: "Intermediário", lessons: 6, xp: 300, tone: "violet" },
  { id: "A03", title: "Injeção", short: "SQL Injection", difficulty: "Avançado", lessons: 10, xp: 450, tone: "blue" },
  { id: "A04", title: "Design inseguro", short: "Design inseguro", difficulty: "Intermediário", lessons: 7, xp: 320, tone: "amber" },
  { id: "A05", title: "Configuração incorreta", short: "Configurações", difficulty: "Iniciante", lessons: 5, xp: 250, tone: "mint" },
  { id: "A06", title: "Componentes vulneráveis", short: "Componentes", difficulty: "Intermediário", lessons: 7, xp: 300, tone: "pink" },
  { id: "A07", title: "Falhas de autenticação", short: "Autenticação", difficulty: "Intermediário", lessons: 9, xp: 380, tone: "indigo" },
  { id: "A08", title: "Falhas de integridade", short: "Integridade", difficulty: "Avançado", lessons: 6, xp: 360, tone: "orange" },
  { id: "A09", title: "Falhas de monitoramento", short: "Monitoramento", difficulty: "Iniciante", lessons: 5, xp: 240, tone: "cyan" },
  { id: "A10", title: "SSRF", short: "SSRF", difficulty: "Avançado", lessons: 8, xp: 420, tone: "red" },
];

export type Module = typeof owaspModules[number];
export type Course = {
  id: string;
  code: string;
  title: string;
  description: string;
  hours: number;
  level: string;
  icon: string;
  tone: string;
  access: PlanId;
  premium?: boolean;
  price?: number;
  modules: Module[];
};

export function buildModules(prefix: string, titles: string[], tone: string): Module[] {
  return titles.map((title, index) => ({
    id: `${prefix}${String(index + 1).padStart(2, "0")}`,
    title,
    short: title,
    difficulty: index < 2 ? "Iniciante" : index < 5 ? "Intermediário" : "Avançado",
    lessons: 4 + (index % 4),
    xp: 220 + index * 35,
    tone,
  }));
}

export const courses: Course[] = [
  { id: "owasp", code: "OWASP 10", title: "Fundamentos de Segurança Web", description: "Identifique, explore em ambiente seguro e corrija as vulnerabilidades mais críticas da web.", hours: 32, level: "Iniciante ao avançado", icon: "⌘", tone: "ember", access: "gratuito", modules: owaspModules },
  { id: "api", code: "API SEC", title: "Segurança de APIs", description: "Proteja APIs REST e GraphQL contra autorização quebrada, abuso de recursos e falhas de autenticação.", hours: 24, level: "Intermediário", icon: "{ }", tone: "violet", access: "basico", modules: buildModules("API", ["Fundamentos de APIs", "BOLA e autorização por objeto", "Autenticação quebrada", "Consumo irrestrito de recursos", "SSRF em integrações", "Inventário e versionamento", "GraphQL seguro", "Pentest final de API"], "violet") },
  { id: "pentest", code: "RED TEAM", title: "Pentest Web na Prática", description: "Conduza um teste de invasão autorizado do reconhecimento ao relatório executivo.", hours: 40, level: "Intermediário", icon: "◎", tone: "coral", access: "avancado", modules: buildModules("PT", ["Escopo e regras de engajamento", "Reconhecimento passivo", "Mapeamento de superfície", "Enumeração de serviços", "Exploração web controlada", "Pós-exploração segura", "Evidências e severidade", "Relatório de pentest"], "coral") },
  { id: "cloud", code: "CLOUD", title: "Cloud Security Essentials", description: "Aprenda IAM, redes, segredos, storage e monitoramento seguro em ambientes de nuvem.", hours: 28, level: "Intermediário", icon: "☁", tone: "blue", access: "medio", modules: buildModules("CL", ["Responsabilidade compartilhada", "IAM e menor privilégio", "Redes e segmentação", "Storage sem exposição", "Gestão de segredos", "Logs e detecção", "Resposta a incidentes cloud"], "blue") },
  { id: "secure-code", code: "BLUE TEAM", title: "Secure Coding", description: "Escreva aplicações resilientes com validação, autenticação, criptografia e tratamento seguro de erros.", hours: 30, level: "Todos os níveis", icon: "</>", tone: "mint", access: "gratuito", modules: buildModules("SC", ["Modelagem de ameaças", "Validação de entradas", "Autenticação segura", "Autorização no código", "Criptografia aplicada", "Gestão de erros", "Testes de segurança", "Code review final"], "mint") },
  { id: "devsecops", code: "DEVSECOPS", title: "DevSecOps & CI/CD", description: "Integre SAST, DAST, análise de dependências e políticas de segurança ao fluxo de entrega.", hours: 22, level: "Intermediário", icon: "∞", tone: "amber", access: "medio", modules: buildModules("DS", ["Cultura DevSecOps", "SAST no pipeline", "Dependências e SBOM", "DAST automatizado", "Segredos no CI/CD", "Policies as Code", "Pipeline seguro final"], "amber") },
  { id: "ai-governance", code: "AI GOVERNANCE", title: "Introdução à Gestão de Políticas de IA Corporativas", description: "Estruture princípios, responsabilidades, controles e um ciclo de revisão para o uso seguro e responsável de IA nas organizações.", hours: 18, level: "Introdutório", icon: "⚖AI", tone: "indigo", access: "gratuito", modules: buildModules("AIG", ["Fundamentos de governança de IA", "Inventário de sistemas e casos de uso", "Papéis e responsabilidades", "Política corporativa de IA", "Classificação de riscos", "Controles, exceções e aprovações", "Monitoramento e revisão contínua"], "indigo") },
  { id: "ai-redteam", code: "AI RED TEAM", title: "Red Team para Inteligência Artificial", description: "Teste sistemas generativos contra prompt injection, vazamento de dados, jailbreaks e abuso de ferramentas.", hours: 42, level: "Especialização avançada", icon: "AI", tone: "coral", access: "avancado", premium: true, price: 500, modules: buildModules("AIR", ["Threat modeling para IA", "Prompt injection avançado", "Jailbreaks e evasões", "Vazamento de dados", "Ataques a RAG", "Abuso de ferramentas", "Automação de red team", "Avaliação final adversarial"], "coral") },
  { id: "llm-security", code: "LLM SEC", title: "Segurança de LLMs e RAG", description: "Projete arquiteturas seguras para modelos, pipelines RAG, agentes e aplicações com dados sensíveis.", hours: 38, level: "Especialização avançada", icon: "LLM", tone: "violet", access: "avancado", premium: true, price: 500, modules: buildModules("LLM", ["Arquitetura segura de LLMs", "OWASP Top 10 para LLM", "Guardrails em profundidade", "RAG com menor privilégio", "Isolamento de contexto", "Avaliações de segurança", "Monitoramento de modelos", "Projeto final seguro"], "violet") },
  { id: "agentic-defense", code: "AGENT SEC", title: "Defesa de Agentes Autônomos", description: "Controle identidade, memória, permissões e ações de agentes autônomos em ambientes corporativos.", hours: 34, level: "Especialização avançada", icon: "∞AI", tone: "blue", access: "avancado", premium: true, price: 500, modules: buildModules("AGA", ["Riscos de sistemas agênticos", "Identidade e delegação", "Memória não confiável", "Ferramentas e permissões", "Confirmação humana", "Detecção de comportamento", "Resposta a incidentes com agentes"], "blue") },
  { id: "git-ops", code: "GIT OPS", title: "Git, GitHub e colaboração segura", description: "Versionamento, pull requests, proteção de branch e prevenção de vazamento de segredos — o ponto de partida da trilha DevOps.", hours: 18, level: "Iniciante", icon: "⎇", tone: "cyan", access: "gratuito", modules: buildModules("GT", ["Histórico, commits e branches", "Pull requests e revisão", "Proteção de branch e CODEOWNERS", "Segredos, .gitignore e vazamentos", "Tags, releases e provenance", "Hooks, templates e automação"], "cyan") },
  { id: "linux-hardening", code: "LINUX OPS", title: "Linux para operações seguras", description: "Domine terminal, permissões, processos, logs e scripts para administrar servidores com menor privilégio.", hours: 28, level: "Iniciante", icon: ">_", tone: "mint", access: "gratuito", modules: buildModules("LX", ["Fundamentos do Linux e da CLI", "Usuários, grupos e permissões", "Sistema de arquivos e processos", "Logs, journal e evidências", "Shell script para operações", "Rede local, SSH e serviços", "Hardening básico do sistema", "Monitoramento com scripts seguros"], "mint") },
  { id: "network-ops", code: "NET OPS", title: "Redes, TLS e perímetro operacional", description: "Construa VLANs, DNS, roteamento e TLS com políticas de acesso — o caminho de redes da trilha DevOps.", hours: 30, level: "Intermediário", icon: "⌬", tone: "blue", access: "basico", modules: buildModules("NT", ["Modelo de redes e endereçamento", "Switching, VLANs e segmentação", "Roteamento, NAT e IPv6", "DNS, DHCP e resolução segura", "TLS, certificados e HTTPS", "Proxy reverso e NGINX", "Wi-Fi e acesso sem fio seguro", "Projeto de perímetro e evidências"], "blue") },
  { id: "container-sec", code: "K8S SEC", title: "Containers, Docker e Kubernetes seguro", description: "Empacote, isole e orquestre aplicações com imagens mínimas, scans, probes, Helm e controles de runtime.", hours: 32, level: "Intermediário", icon: "▣", tone: "violet", access: "medio", modules: buildModules("CK", ["Imagens e isolamento com Docker", "Build de produção e usuário não root", "Scan de imagens com Trivy", "Pods, Services e ConfigMaps", "Deployments, volumes e probes", "Helm, charts e valores seguros", "RBAC, NetworkPolicy e secrets", "Service mesh e política de tráfego"], "violet") },
  { id: "iac-ops", code: "IAC OPS", title: "Infraestrutura como código segura", description: "Provisione ambientes com Terraform e Ansible, separe estágios e aplique política antes do apply.", hours: 26, level: "Intermediário", icon: "⧉", tone: "amber", access: "medio", modules: buildModules("TF", ["Princípios de IaC e idempotência", "Terraform: estado e módulos", "Ansible: inventário e playbooks", "Separação de ambientes", "Segredos, backends e locking", "Análise de plano e policy as code", "Kubernetes e Terraform", "Pipeline de apply com aprovação"], "amber") },
  { id: "sre-reliability", code: "SRE OPS", title: "SRE, observabilidade e confiabilidade", description: "Defina SLIs, SLOs e error budget; correlacione métricas, logs e traces com Prometheus, Grafana e OpenTelemetry.", hours: 30, level: "Avançado", icon: "📡", tone: "cyan", access: "avancado", modules: buildModules("SR", ["Confiabilidade e error budget", "SLI, SLO e alertas acionáveis", "Métricas com Prometheus", "Dashboards e Grafana", "Logs centralizados", "Tracing com OpenTelemetry", "Resposta a incidentes e postmortem", "Observabilidade em Kubernetes"], "cyan") },
  { id: "platform-eng", code: "PLATFORM", title: "Arquitetura, microsserviços e plataforma", description: "Desenhe plataformas internas com DORA, self-service, padrões de microsserviços e requisitos não funcionais.", hours: 28, level: "Avançado", icon: "⬡", tone: "indigo", access: "avancado", modules: buildModules("PE", ["Ciclo de vida da aplicação", "Microsserviços e fronteiras", "Requisitos não funcionais", "Padrões de resiliência", "Golden paths e self-service", "Métricas DORA e DevEx", "Times de plataforma", "Documentação e valor da plataforma"], "indigo") },
  { id: "finops-sec", code: "FINOPS", title: "FinOps e custo consciente na nuvem", description: "Meça, atribua e reduza custo de cloud sem abrir mão de controles de segurança e observabilidade.", hours: 22, level: "Intermediário", icon: "₪", tone: "orange", access: "medio", modules: buildModules("FO", ["Modelo FinOps e papéis", "Visibilidade e alocação de custo", "Unidades ociosas e right-sizing", "Storage, tráfego e waste", "Kubernetes e custo de cluster", "Contratos, reservas e compromisso", "Guardrails de custo no pipeline", "Relatórios executivos e rotina"], "orange") },
];

export const learningTrails = [
  { id: "devops", label: "DevOps, SRE e plataforma", description: "Do Git ao FinOps: a trilha operacional da academia.", courseIds: ["git-ops", "linux-hardening", "network-ops", "container-sec", "devsecops", "iac-ops", "sre-reliability", "platform-eng", "finops-sec"] },
];

export const plans = [
  { id: "gratuito" as PlanId, name: "Gratuito", price: 0, description: "Para conhecer a VulcanAcademy sem mensalidade.", features: ["Cursos identificados como gratuitos", "Laboratórios dos cursos gratuitos", "Score e progresso", "Certificados dos cursos concluídos"] },
  { id: "basico" as PlanId, name: "Básico", price: 29.90, description: "Para começar com fundamentos sólidos.", features: ["Cursos de nível básico", "Laboratórios introdutórios", "Score e badges", "Certificados por curso"] },
  { id: "medio" as PlanId, name: "Médio", price: 59.90, description: "Para acelerar a prática profissional.", features: ["Tudo do plano Básico", "Cursos intermediários", "APIs, Cloud e DevSecOps", "Novos módulos mensais"] },
  { id: "avancado" as PlanId, name: "Avançado", price: 100, description: "Acesso completo à VulcanAcademy.", features: ["Todos os cursos regulares", "Pentest e laboratórios avançados", "Trilhas completas e certificados", "Prioridade em novos conteúdos"] },
];

export const planRank: Record<PlanId, number> = { gratuito: 0, basico: 1, medio: 2, avancado: 3 };

export function findModule(moduleId: string) {
  for (const course of courses) {
    const module = course.modules.find(item => item.id === moduleId);
    if (module) return { course, module };
  }
  return null;
}
