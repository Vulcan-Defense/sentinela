# Como adicionar um projeto à lista da comunidade

A página [Projetos](https://sentinelacibernetica.com.br/projetos.html) lê o
arquivo `data/projetos.json`. Para cadastrar um projeto, edite esse arquivo:
não é preciso alterar o JavaScript da página.

## Antes de começar

- O projeto precisa ter um repositório público no GitHub.
- Verifique se o repositório já está na lista: busque por `fullName` em
  `data/projetos.json`.
- Use `hacking-table` ou `Vulcan-Defense` como `owner` para que o projeto
  apareça nos filtros atuais da página. Para um owner novo, é necessário
  adicionar também um botão de filtro em `projetos.html`.

## Passo a passo

1. Abra `data/projetos.json`.
2. Adicione um objeto dentro do array `projects`, mantendo a vírgula entre os
   itens.
3. Preencha os campos da tabela abaixo com os dados reais do repositório.
4. Atualize `generatedAt` com a data e a hora atuais no formato ISO (por
   exemplo, `2026-11-24T12:00:00Z`).
5. Valide o JSON e confira a página antes de abrir o pull request:

```bash
node -e "JSON.parse(require('node:fs').readFileSync('data/projetos.json','utf8')); console.log('JSON válido')"
npx http-server . -p 8080
```

Acesse `http://localhost:8080/projetos.html` e confirme que o projeto aparece
na busca, nos filtros e na ordenação. O botão **Atualizar do GitHub** consulta
métricas ao vivo, mas não salva as mudanças no arquivo.

## Campos do projeto

| Campo | Uso | Descrição |
| --- | --- | --- |
| `slug` | Recomendado | Identificador curto e único, no mesmo padrão dos demais itens. |
| `name` | Obrigatório | Nome exibido no card. |
| `fullName` | Obrigatório | `OWNER/REPO` exato do GitHub; é usado pelo botão de atualização. |
| `owner` | Obrigatório | Dono do repositório. Use um dos owners já filtrados na página. |
| `url` | Obrigatório | Link para o repositório no GitHub. |
| `description` | Recomendado | Frase curta sobre o projeto. Sem descrição, aparece um texto padrão. |
| `homepage` | Opcional | Link para o site ou demo do projeto. |
| `language` | Recomendado | Linguagem principal exibida no card. |
| `stars`, `forks`, `collaborators`, `issues` | Recomendado | Números do GitHub. Estrelas, forks e colaboradores aparecem no card. |
| `pushedAt` | Obrigatório | Data do último push em formato ISO; usada na ordenação por atividade. |
| `license` | Opcional | Licença do repositório. |
| `isFork` | Opcional | `true` para forks; mostra o selo "fork" no card. |
| `tags` | Recomendado | Lista de palavras usadas na busca, por exemplo `["Ferramenta", "Open source"]`. |
| `featured` | Opcional | `true` destaca o projeto e o inclui no filtro "Em destaque". Use com critério. |
| `accent` | Opcional | Cor do card: `lime` (padrão), `violet`, `cyan` ou `orange`. |

## Exemplo

```json
{
  "slug": "meu-projeto",
  "name": "Meu Projeto",
  "owner": "hacking-table",
  "fullName": "hacking-table/meu-projeto",
  "description": "Ferramenta open source para apoio às práticas de cibersegurança.",
  "url": "https://github.com/hacking-table/meu-projeto",
  "homepage": "https://meu-projeto.example.com",
  "language": "TypeScript",
  "stars": 0,
  "forks": 0,
  "collaborators": 1,
  "issues": 0,
  "pushedAt": "2026-11-24T12:00:00Z",
  "license": "MIT",
  "isFork": false,
  "tags": ["Ferramenta", "Open source"],
  "featured": false,
  "accent": "lime"
}
```

> Os números acima são apenas ilustrativos. Use os valores atuais do
> repositório ou deixe que o botão **Atualizar do GitHub** os mostre ao vivo.

## Pull request

Envie o pull request alterando somente `data/projetos.json` (e, se necessário,
os botões de filtro em `projetos.html`). No texto do PR, informe o nome do
projeto, o link do repositório e por que ele é relevante para a comunidade.
