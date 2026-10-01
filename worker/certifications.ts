import { resolveAuthIdentity } from "./manual-auth";
import { mysqlConfigured, withMysql, type MysqlDb, type MysqlEnv } from "./mysql";

interface CertificationEnv extends MysqlEnv {
  AUTH_SECRET?: string;
  CF_EMAIL_ACCOUNT_ID?: string;
  CF_EMAIL_API_TOKEN?: string;
  CF_EMAIL_FROM?: string;
}

type Question = { id:number; category:string; prompt:string; options:[string,string,string,string]; answer:number };

const CERTIFICATION_ID = "vcws";
const questions: Question[] = [
  {id:1,category:"Governança",prompt:"Qual princípio reduz o impacto de uma conta comprometida?",options:["Privilégio mínimo","Senha compartilhada","Acesso permanente","Rede sem segmentação"],answer:0},
  {id:2,category:"APIs",prompt:"Em uma API, qual controle previne BOLA?",options:["Ocultar o identificador","Validar a propriedade do objeto no servidor","Usar apenas UUID","Bloquear o navegador"],answer:1},
  {id:3,category:"Aplicações",prompt:"Qual é a defesa principal contra SQL Injection?",options:["Codificar a URL","Consultas parametrizadas","Aumentar o timeout","Renomear tabelas"],answer:1},
  {id:4,category:"Identidade",prompt:"Como senhas devem ser armazenadas?",options:["Texto cifrado reversível","Base64","Hash adaptativo com salt","Texto puro em cofre"],answer:2},
  {id:5,category:"Aplicações",prompt:"Qual medida ajuda a prevenir XSS refletido?",options:["Escape contextual de saída","Desabilitar logs","Aumentar cookies","Usar HTTP"],answer:0},
  {id:6,category:"Aplicações",prompt:"Qual controle é adequado contra CSRF?",options:["Token anti-CSRF e SameSite","Comprimir respostas","Trocar o DNS","Usar IDs sequenciais"],answer:0},
  {id:7,category:"Aplicações",prompt:"Para mitigar SSRF, o servidor deve principalmente:",options:["Aceitar qualquer URL HTTPS","Aplicar allowlist de destinos e bloquear redes internas","Seguir todos os redirecionamentos","Retornar o corpo completo"],answer:1},
  {id:8,category:"Navegador",prompt:"Qual cabeçalho restringe as origens de scripts no navegador?",options:["ETag","Content-Security-Policy","Accept-Language","Server"],answer:1},
  {id:9,category:"Criptografia",prompt:"Qual configuração protege dados em trânsito na web?",options:["TLS moderno com certificado válido","HTTP com Base64","FTP anônimo","Cookie sem Secure"],answer:0},
  {id:10,category:"Identidade",prompt:"Quais atributos fortalecem um cookie de sessão?",options:["Public e Global","HttpOnly, Secure e SameSite","Cache e ETag","Domain=* e Path=*"],answer:1},
  {id:11,category:"APIs",prompt:"O rate limiting reduz principalmente:",options:["Abuso automatizado e exaustão de recursos","Erros de compilação","Duplicação de CSS","Latência de DNS"],answer:0},
  {id:12,category:"DevSecOps",prompt:"Onde segredos de produção devem ser armazenados?",options:["No repositório Git","Em comentários do pipeline","Em um gerenciador de segredos","No pacote do frontend"],answer:2},
  {id:13,category:"Supply Chain",prompt:"Qual ação reduz risco de componentes vulneráveis?",options:["Ignorar versões transitivas","Inventariar, monitorar e atualizar dependências","Desabilitar testes","Fixar versões para sempre"],answer:1},
  {id:14,category:"Monitoramento",prompt:"Um log de segurança útil deve registrar:",options:["Senhas completas","Eventos de autenticação e contexto necessário","Tokens de sessão íntegros","Chaves privadas"],answer:1},
  {id:15,category:"Resposta a Incidentes",prompt:"Ao confirmar um incidente, qual é uma ação inicial adequada?",options:["Apagar todas as evidências","Conter o impacto e preservar evidências","Publicar os dados afetados","Desligar os logs"],answer:1},
  {id:16,category:"Cloud",prompt:"Em IAM de nuvem, a melhor prática é:",options:["Uma conta para toda a equipe","Papéis específicos e temporários","Chaves sem expiração","Administrador para serviços"],answer:1},
  {id:17,category:"Cloud",prompt:"Como evitar exposição acidental de storage?",options:["Acesso público por padrão","Política privada, revisão e bloqueio de acesso público","Nome de bucket secreto","Somente arquivos compactados"],answer:1},
  {id:18,category:"Cloud",prompt:"A segmentação de rede ajuda a:",options:["Limitar movimento lateral","Eliminar autenticação","Substituir criptografia","Tornar tudo público"],answer:0},
  {id:19,category:"Resiliência",prompt:"Qual estratégia melhora recuperação contra ransomware?",options:["Backup conectado e gravável","Backups testados, isolados e versionados","Uma única cópia local","Sem exercícios de restauração"],answer:1},
  {id:20,category:"Arquitetura",prompt:"Threat modeling deve ocorrer preferencialmente:",options:["Somente após um incidente","Durante o desenho e ao longo das mudanças","Apenas antes da auditoria","Depois de descontinuar o sistema"],answer:1},
  {id:21,category:"DevSecOps",prompt:"SAST analisa principalmente:",options:["Código e fluxos sem executar a aplicação","Tráfego de produção apenas","Configuração de DNS","Desempenho da rede"],answer:0},
  {id:22,category:"DevSecOps",prompt:"DAST avalia a aplicação:",options:["Somente pelo repositório","Em execução, por suas interfaces expostas","Apenas pela documentação","Sem enviar requisições"],answer:1},
  {id:23,category:"Supply Chain",prompt:"Uma SBOM serve para:",options:["Listar componentes de software","Armazenar senhas","Substituir testes","Criar certificados TLS"],answer:0},
  {id:24,category:"DevSecOps",prompt:"Se um segredo aparecer no histórico Git, deve-se:",options:["Apenas apagar a linha atual","Revogar/rotacionar o segredo e tratar o histórico","Renomear o arquivo","Fechar o pull request"],answer:1},
  {id:25,category:"APIs",prompt:"Ao validar um JWT, é essencial verificar:",options:["Apenas o tamanho","Assinatura, emissor, audiência e expiração","Somente o payload","A cor do header"],answer:1},
  {id:26,category:"APIs",prompt:"Em GraphQL, qual controle reduz consultas abusivas?",options:["Profundidade/complexidade e limites de custo","Introspection pública irrestrita","Aliases ilimitados","Timeout infinito"],answer:0},
  {id:27,category:"APIs",prompt:"Mass assignment ocorre quando:",options:["O servidor aceita campos não autorizados diretamente no modelo","Há muitos usuários","A resposta é compactada","O banco usa índices"],answer:0},
  {id:28,category:"Navegador",prompt:"Uma política CORS segura deve:",options:["Refletir qualquer Origin com credenciais","Permitir somente origens necessárias","Usar * com cookies","Substituir autorização"],answer:1},
  {id:29,category:"Aplicações",prompt:"No upload de arquivos, qual conjunto é mais seguro?",options:["Confiar na extensão","Validar tipo e conteúdo, renomear e armazenar fora da raiz web","Executar após upload","Permitir qualquer tamanho"],answer:1},
  {id:30,category:"Aplicações",prompt:"Qual defesa evita path traversal?",options:["Concatenar o caminho informado","Resolver e validar o caminho dentro de uma raiz permitida","Aceitar ../ codificado","Executar como administrador"],answer:1},
  {id:31,category:"Aplicações",prompt:"Para reduzir desserialização insegura, deve-se:",options:["Desserializar qualquer classe","Usar formatos simples, schema estrito e tipos permitidos","Confiar em dados internos","Desabilitar validação"],answer:1},
  {id:32,category:"Criptografia",prompt:"Uma boa gestão de chaves inclui:",options:["Chaves no código","Rotação, controle de acesso e auditoria","Compartilhamento por chat","Mesma chave em todos os ambientes"],answer:1},
  {id:33,category:"Identidade",prompt:"MFA é mais eficaz porque:",options:["Elimina autorização","Adiciona um fator independente além da senha","Permite senhas menores","Substitui monitoramento"],answer:1},
  {id:34,category:"Identidade",prompt:"Um fluxo seguro de recuperação de senha deve:",options:["Confirmar se o e-mail existe publicamente","Usar token curto, único e expirável","Enviar a senha atual","Manter o token após uso"],answer:1},
  {id:35,category:"IA",prompt:"Prompt injection em LLMs deve ser tratado como:",options:["Instrução sempre confiável","Entrada não confiável sujeita a políticas e isolamento","Falha exclusiva do usuário","Problema resolvido por temperatura"],answer:1},
  {id:36,category:"IA",prompt:"Em um sistema RAG, documentos recuperados devem:",options:["Conceder novas permissões","Ser tratados como conteúdo não confiável","Executar ferramentas diretamente","Substituir políticas do sistema"],answer:1},
  {id:37,category:"IA",prompt:"Para agentes com ferramentas, uma defesa importante é:",options:["Permissões amplas por conveniência","Escopo mínimo e confirmação humana para ações sensíveis","Memória sem validação","Execução automática irrestrita"],answer:1},
  {id:38,category:"Privacidade",prompt:"Minimização de dados significa:",options:["Coletar tudo para uso futuro","Coletar apenas o necessário para a finalidade","Publicar dados anonimizados sem revisão","Reter indefinidamente"],answer:1},
  {id:39,category:"Gestão de Vulnerabilidades",prompt:"Antes de classificar um achado crítico, é importante:",options:["Validar evidência, impacto e contexto","Usar apenas a ferramenta automática","Ignorar controles compensatórios","Publicar imediatamente"],answer:0},
  {id:40,category:"Risco",prompt:"Qual critério deve orientar a priorização de correções?",options:["Ordem alfabética","Risco: probabilidade, impacto e exposição","Tamanho do arquivo","Preferência do desenvolvedor"],answer:1},
];

async function ensureTables(db:MysqlDb){
  const now=new Date().toISOString();
  await db.execute(`INSERT IGNORE INTO certifications (id,code,title,description,published,passing_percentage,question_count,duration_minutes,created_at,updated_at) VALUES (?,?,?,?,1,85,40,90,?,?)`,
    [CERTIFICATION_ID,"VCWS","Vulcan Certified Web Security","Certificação profissional em segurança de aplicações, APIs, cloud, DevSecOps e fundamentos de IA segura.",now,now]);
}

function json(data:unknown,status=200,headers?:HeadersInit){return Response.json(data,{status,headers})}
function sameOrigin(request:Request){const origin=request.headers.get("origin");return !origin||origin===new URL(request.url).origin}

async function requireAccount(request:Request,env:CertificationEnv){
  const identity=await resolveAuthIdentity(request,env);
  if(!identity)return null;
  if(!mysqlConfigured(env))return null;
  const account=await withMysql(env,async db=>(await db.query<{userId:string;email:string;name:string;systemRole:string}>("SELECT user_id AS userId,email,name,system_role AS systemRole FROM accounts WHERE user_id=? AND status='active'",[identity.userId]))[0]);
  return account||null;
}

export async function handleCertificationApi(request:Request,env:CertificationEnv):Promise<Response|null>{
  const url=new URL(request.url);
  if(!url.pathname.startsWith("/api/certifications/")&&!url.pathname.startsWith("/api/admin/certifications"))return null;
  if(!mysqlConfigured(env))return json({error:"MySQL indisponível."},503);
  await withMysql(env,ensureTables);

  if(url.pathname==="/api/admin/certifications"){
    const account=await requireAccount(request,env);
    if(!account)return json({error:"Autenticação obrigatória."},401);
    if(account.systemRole!=="admin")return json({error:"Apenas administradores podem gerenciar certificações."},403);
    if(request.method==="GET"){
      const result=await withMysql(env,db=>db.query("SELECT id,code,title,description,published,passing_percentage AS passingPercentage,question_count AS questionCount,duration_minutes AS durationMinutes,updated_at AS updatedAt FROM certifications ORDER BY created_at"));
      const metrics=await withMysql(env,db=>db.query("SELECT certification_id AS certificationId,COUNT(*) AS attempts,SUM(passed) AS approved FROM certification_attempts GROUP BY certification_id"));
      return json({certifications:result,metrics});
    }
    if(request.method==="PATCH"){
      if(!sameOrigin(request))return json({error:"Origem inválida."},403);
      const body=await request.json() as {id?:string;title?:string;description?:string;published?:boolean;passingPercentage?:number;durationMinutes?:number};
      const title=body.title?.trim().slice(0,120);const description=body.description?.trim().slice(0,500);
      if(body.id!==CERTIFICATION_ID||!title||!description||!Number.isInteger(body.passingPercentage)||body.passingPercentage!<70||body.passingPercentage!>100||!Number.isInteger(body.durationMinutes)||body.durationMinutes!<30||body.durationMinutes!>240)return json({error:"Configuração inválida."},400);
      const now=new Date().toISOString();
      await withMysql(env,db=>db.execute("UPDATE certifications SET title=?,description=?,published=?,passing_percentage=?,duration_minutes=?,updated_at=? WHERE id=?",[title,description,body.published?1:0,body.passingPercentage,body.durationMinutes,now,CERTIFICATION_ID]));
      const certification=await withMysql(env,async db=>(await db.query("SELECT id,code,title,description,published,passing_percentage AS passingPercentage,question_count AS questionCount,duration_minutes AS durationMinutes,updated_at AS updatedAt FROM certifications WHERE id=?",[CERTIFICATION_ID]))[0]);
      return json({certification});
    }
    return json({error:"Método não permitido."},405);
  }

  const certification=await withMysql(env,async db=>(await db.query<{id:string;code:string;title:string;description:string;published:number;passingPercentage:number;questionCount:number;durationMinutes:number}>("SELECT id,code,title,description,published,passing_percentage AS passingPercentage,question_count AS questionCount,duration_minutes AS durationMinutes FROM certifications WHERE id=?",[CERTIFICATION_ID]))[0]);
  if(!certification||!certification.published)return json({error:"Certificação indisponível."},404);

  if(url.pathname===`/api/certifications/${CERTIFICATION_ID}/exam`&&request.method==="GET"){
    return json({certification:{...certification,published:Boolean(certification.published)},questions:questions.map(({answer,...question})=>question)},200,{"cache-control":"no-store"});
  }

  const account=await requireAccount(request,env);
  if(!account)return json({error:"Faça login para acessar a certificação."},401);
  const certificateCourseKey=`cert-${CERTIFICATION_ID}:${account.userId}`;

  if(url.pathname===`/api/certifications/${CERTIFICATION_ID}/exam`&&request.method==="POST"){
    if(!sameOrigin(request))return json({error:"Origem inválida."},403);
    const body=await request.json() as {answers?:number[]};
    if(!Array.isArray(body.answers)||body.answers.length!==questions.length||body.answers.some(answer=>!Number.isInteger(answer)||answer<0||answer>3))return json({error:"Responda todas as 40 questões antes de enviar."},400);
    const score=questions.reduce((total,question,index)=>total+(body.answers![index]===question.answer?1:0),0);
    const percentage=Math.round(score/questions.length*100);const passed=percentage>=certification.passingPercentage;const attemptedAt=new Date().toISOString();const attemptId=`ATT-${crypto.randomUUID()}`;
    await withMysql(env,db=>db.execute("INSERT INTO certification_attempts (id,user_id,certification_id,score,total,percentage,passed,attempted_at) VALUES (?,?,?,?,?,?,?,?)",[attemptId,account.userId,CERTIFICATION_ID,score,questions.length,percentage,passed?1:0,attemptedAt]));
    return json({attemptId,score,total:questions.length,percentage,passed,passingPercentage:certification.passingPercentage,attemptedAt});
  }

  if(url.pathname===`/api/certifications/${CERTIFICATION_ID}/status`&&request.method==="GET"){
    const bestAttempt=await withMysql(env,async db=>(await db.query("SELECT id,score,total,percentage,passed,attempted_at AS attemptedAt FROM certification_attempts WHERE user_id=? AND certification_id=? ORDER BY percentage DESC,attempted_at DESC LIMIT 1",[account.userId,CERTIFICATION_ID]))[0]);
    const certificate=await withMysql(env,async db=>(await db.query<{id:string;issuedAt:string}>("SELECT id,issued_at AS issuedAt FROM certificates WHERE user_id=? AND course_id=? AND status='valid' ORDER BY issued_at DESC LIMIT 1",[account.userId,certificateCourseKey]))[0]);
    return json({bestAttempt,certificate:certificate?{...certificate,verifyUrl:`https://verify.vulcandefense.com.br/?id=${encodeURIComponent(certificate.id)}`}:null});
  }

  if(url.pathname===`/api/certifications/${CERTIFICATION_ID}/certificate`&&request.method==="POST"){
    if(!sameOrigin(request))return json({error:"Origem inválida."},403);
    const approved=await withMysql(env,async db=>(await db.query<{score:number;total:number;percentage:number;attemptedAt:string}>("SELECT score,total,percentage,attempted_at AS attemptedAt FROM certification_attempts WHERE user_id=? AND certification_id=? AND passed=1 ORDER BY percentage DESC,attempted_at DESC LIMIT 1",[account.userId,CERTIFICATION_ID]))[0]);
    if(!approved)return json({error:"A aprovação na prova é obrigatória para emitir o certificado."},403);
    const existing=await withMysql(env,async db=>(await db.query<{id:string;issuedAt:string}>("SELECT id,issued_at AS issuedAt FROM certificates WHERE user_id=? AND course_id=? AND status='valid' ORDER BY issued_at DESC LIMIT 1",[account.userId,certificateCourseKey]))[0]);
    if(existing)return json({...existing,score:approved.score,total:approved.total,percentage:approved.percentage,verifyUrl:`https://verify.vulcandefense.com.br/?id=${encodeURIComponent(existing.id)}`});
    const issuedAt=new Date().toISOString();const id=`VDC-${new Date().getUTCFullYear()}-${crypto.randomUUID().replaceAll("-","").slice(0,12).toUpperCase()}`;
    await withMysql(env,db=>db.execute("INSERT INTO certificates (id,user_id,student_name,course_id,course_title,hours,issued_at,issuer,status) VALUES (?,?,?,?,?,?,?,?,?)",[id,account.userId,account.name,certificateCourseKey,certification.title,0,issuedAt,"Vulcan Defense","valid"]));
    return json({id,issuedAt,score:approved.score,total:approved.total,percentage:approved.percentage,verifyUrl:`https://verify.vulcandefense.com.br/?id=${encodeURIComponent(id)}`},201);
  }

  return json({error:"Rota não encontrada."},404);
}
