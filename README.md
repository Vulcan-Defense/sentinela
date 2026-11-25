# Comunidade cibersec

[Conecte-se. Compartilhe. Defenda melhor.](https://sentinelacibernetica.com.br/)

Uma comunidade para acompanhar o cenário, trocar conhecimento e desenvolver
práticas de segurança que funcionam no mundo real.

Site: https://sentinelacibernetica.com.br/

## Stack

### Site da comunidade

- **Páginas**: HTML e CSS próprios em `css/`, JavaScript em `js/` e Chart.js local em `vendor/`
- **Hospedagem**: Cloudflare, com rota para `sentinelacibernetica.com.br` em `wrangler.toml`; headers de segurança em `cloudflare-worker.js` e `_headers`
- **Conteúdo versionado**: `posts.json` (blog), `js/ferramentas-catalog.js` (ferramentas) e `data/projetos.json` (projetos da comunidade)
- **APIs do site**: proxy do GitHub, cadastro e feedback dos testes mobile em `cloudflare-worker.js`

### Vulcan Academy

- **Runtime web**: React 19 com Server Components via **vinext** (compatível com Next.js) sobre **Vite 8**
- **Edge**: Cloudflare Workers — entry point em `worker/index.ts`, config em `wrangler.jsonc`
- **Linguagem**: TypeScript 5.9, Node.js `>=22.13.0`
- **Banco de dados**: MySQL (`mysql2`) como armazenamento principal; Drizzle com dialeto SQLite para o schema em `db/schema.ts` e as migrações em `drizzle/`
- **Estilo**: Tailwind CSS 4 + PostCSS + CSS próprio em `app/`
- **Pagamentos**: Stripe (planos de assinatura mensal, cursos avulsos e certificado impresso)
- **Autenticação**: Google OAuth, login manual com e-mail/senha e Sign in with ChatGPT (SIWC)
- **Mídia**: fotos de perfil em R2 (`PROFILE_IMAGES`)
- **Deploy**: `wrangler deploy --keep-vars` para `academy.vulcandefense.com.br` e `verify.vulcandefense.com.br`

## Estrutura

```
app/                UI e rotas React (Server Components)
worker/             APIs e integrações executadas no Cloudflare Worker
data/               Cursos, quizzes, guias, projetos e destaques de patch notes
css/ js/            Estilos e scripts das páginas estáticas
vendor/             Bibliotecas locais (Chart.js)
posts.json          Posts do blog exibidos na home
cloudflare-worker.js  Worker do site da comunidade
wrangler.toml       Rota e worker do site da comunidade
wrangler.jsonc      Configuração do Worker da academia
scripts/            Utilitários (migrações MySQL, geração de patch notes)
drizzle/            Migrações geradas pelo drizzle-kit
tests/              Testes do build renderizado (node --test)
```

## Páginas

| Rota | Arquivo | Conteúdo |
| --- | --- | --- |
| `/` | `index.html` | Início: boletim, podcast, CriptoChat em destaque e posts do blog (`posts.json`) |
| `/ferramentas.html` | `ferramentas.html` | Catálogo pesquisável de ferramentas open source (`js/ferramentas-catalog.js`) |
| `/projetos.html` | `projetos.html` | Radar de projetos da comunidade, com busca, filtros e métricas do GitHub (`data/projetos.json`) |
| `/crptochat.html` | `crptochat.html` | Pulso do CriptoChat: métricas, commits e contribuições recentes |
| `/certificacoes.html` | `certificacoes.html` | Guia de certificações com mapa interativo por área |
| `/certificacoes-gratuitas.html` | `certificacoes-gratuitas.html` | Treinamentos e provas gratuitos, separados por fonte e área |
| `/mercado-trabalho.html` | `mercado-trabalho.html` | Portais de vagas, empresas, salários e tendências |
| `/perfis-profissionais.html` | `perfis-profissionais.html` | Perfis e cargos para gestores e recrutadores |
| `/testes-mobile/` | `testes-mobile/index.html` | Cadastro de participantes para testes Android e iOS |
| `/testes-mobile/feedback/` | `testes-mobile/feedback/index.html` | Feedback dos participantes dos testes |
| `/dashboard-ferramentas.html` | `dashboard-ferramentas.html` | Gráficos de adoção e maturidade das ferramentas |
| `/404.html` | `404.html` | Página para rotas não encontradas |

A aplicação React da academia fica em `app/page.tsx` e é servida em
`academy.vulcandefense.com.br`; a validação de certificados fica em
`app/verify/page.tsx` e é servida em `verify.vulcandefense.com.br`.

## Pré-requisitos

- Node.js `>=22.13.0`

## Comandos

```bash
npm install        # instala dependências
npm run dev        # desenvolvimento local (vinext dev)
npm run build      # gera patch notes e valida o build (vinext build)
npm test           # build + teste do HTML renderizado
npm run lint       # ESLint
npm run deploy     # publica no Cloudflare (wrangler deploy --keep-vars)
```

Para conferir as páginas estáticas sem o build, sirva a raiz do repositório com
um servidor de arquivos, por exemplo `npx http-server .`.

### Banco de dados

```bash
npm run db:generate          # gera migrações Drizzle após mudanças no schema
npm run db:mysql             # aplica migrações no MySQL da academia
npm run db:mysql:users       # migração específica de usuários
npm run db:mysql:import-d1   # importa dados JSON do D1 para o MySQL
```

As variáveis de ambiente e segredos do Worker são gerenciados via
`wrangler.jsonc`, `.dev.vars` (local) e os comandos `wrangler secret`. Os
arquivos `.env*` e `.dev.vars` não devem ser versionados.


## Patch notes

Após cada implementação visível ao usuário, atualize
`data/patch-notes-highlights.json` com uma nota concisa em português, em
fraseado de benefício e acessível a leigos, sem segredos ou detalhes de
segurança. O arquivo `public/patch-notes.json` é regenerado pelo `prebuild` a
partir dos commits recentes — não edite esse arquivo manualmente.


## Como contribuir

1. Abra uma issue descrevendo o problema ou a melhoria e alinhe o escopo antes de começar.
2. Crie uma branch a partir da principal com um nome curto e descritivo.
3. Faça a alteração seguindo o padrão das páginas e do código existente. Para mudanças visíveis, atualize `data/patch-notes-highlights.json` com uma nota em português, focada no benefício e sem detalhes sensíveis.
4. Rode `npm run lint`, `npm run build` e, se possível, `npm test` antes de abrir o pull request.
5. Descreva no pull request o que mudou e como validar; inclua capturas quando a mudança for visual.
6. Não versione `.env`, `.dev.vars`, tokens, dados pessoais ou endpoints internos.

Para adicionar um projeto ao radar da comunidade, siga o
[guia passo a passo](docs/adicionar-projeto.md).

## Saiba mais

- [vinext](https://github.com/cloudflare/vinext)
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [Drizzle](https://orm.drizzle.team/docs/get-started/sqlite)
