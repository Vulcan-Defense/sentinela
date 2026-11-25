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

- [Cloudflare Workers](https://developers.cloudflare.com/workers/)

