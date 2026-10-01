# VulcanAcademy

Plataforma de ensino de segurança ofensiva e defesa (Vulcan Defense), hospedada
como um site full-stack em Cloudflare Workers.

## Stack

- **Runtime web**: React 19 com Server Components via **vinext** (Next.js-compatible) sobre **Vite 8**
- **Edge**: Cloudflare Workers — entry point em `worker/index.ts`, config em `wrangler.jsonc`
- **Linguagem**: TypeScript 5.9, Node.js `>=22.13.0`
- **Banco de dados**: MySQL (via `mysql2`) com Drizzle ORM para schema/migrações
- **Estilo**: Tailwind CSS 4 + PostCSS + CSS próprio em `app/`
- **Pagamentos**: Stripe (planos de assinatura mensal, cursos avulsos e certificado impresso)
- **Autenticação**: Google OAuth, login manual com e-mail/senha e Sign in with ChatGPT (SIWC)
- **Mídia**: fotos de perfil em R2 (`PROFILE_IMAGES`)
- **Deploy**: `wrangler deploy` para `academy.vulcandefense.com.br` e `verify.vulcandefense.com.br`

## Estrutura

```
app/        UI e rotas React (Server Components)
worker/     APIs e integrações executadas no Cloudflare Worker
db/         Schema Drizzle
data/       Catálogo de cursos, quizzes, guias e destaques de patch notes
scripts/    Utilitários (migrações MySQL, geração de patch notes)
drizzle/    Migrações geradas pelo drizzle-kit
tests/      Testes do build renderizado (node --test)
```

## Pré-requisitos

- Node.js `>=22.13.0`

## Comandos

```bash
npm install        # instala dependências
npm run dev        # desenvolvimento local (vinext dev)
npm run build      # gera patch notes e valida o build (vinext build)
npm test           # build + teste do HTML renderizado
npm run deploy     # publica no Cloudflare (wrangler deploy)
```

### Banco de dados

```bash
npm run db:generate          # gera migrações Drizzle após mudanças no schema
npm run db:mysql             # aplica migrações no MySQL da academia
npm run db:mysql:users       # migração específica de usuários
npm run db:mysql:import-d1   # importa dados JSON do D1 para o MySQL
```

A variáveis de ambiente e segredos do Worker são gerenciados via
`wrangler.jsonc`, `.dev.vars` (local) e os comandos `wrangler secret`.

### Auditoria do VulcanMeet

O endpoint de auditoria recebe eventos assinados pelo Prosody e grava no MySQL a sala, participantes, horários e duração. Antes de publicar, aplique o schema e cadastre um segredo igual ao configurado no servidor do Meet:

```bash
npm run db:mysql
npx wrangler secret put MEETING_AUDIT_TOKEN
```

Use o valor informado no segredo também como `MEETING_AUDIT_TOKEN` no Docker Compose do Meet. Esse token nunca deve ser colocado em arquivos versionados.

## Patch notes

Após cada implementação visível ao usuário, atualize
`data/patch-notes-highlights.json` com uma nota concisa em português, em
fraseado de benefício e acessível a leigos, sem segredos ou detalhes de
segurança. O arquivo `public/patch-notes.json` é regenerado pelo `prebuild` a
partir dos commits recentes — não edite esse arquivo manualmente.

## Autenticação por identidade (SIWC)

Quando o site é servido pela plataforma de hosting, usuários autenticados
recebem os headers `oai-authenticated-user-id` e
`oai-authenticated-user-email`. O arquivo `app/chatgpt-auth.ts` oferece
helpers para login/logout opcional ou obrigatório com Sign in with ChatGPT
(`getChatGPTUser`, `requireChatGPTUser`, `chatGPTSignInPath`,
`chatGPTSignOutPath`). Não crie rotas próprias para `/signin-with-chatgpt`,
`/signout-with-chatgpt` ou `/callback` — a plataforma é dona desses paths.

## Saiba mais

- [vinext](https://github.com/cloudflare/vinext)
- [Drizzle](https://orm.drizzle.team/docs/get-started/mysql)
