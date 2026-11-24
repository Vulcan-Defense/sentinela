# Rulesets para repositórios públicos

Modelos prontos para importar no GitHub e padronizar a colaboração em projetos open source. Cada arquivo é um ruleset independente e pode ser aplicado a quantos repositórios públicos você administrar.

## Arquivos

| Arquivo | O que protege |
| --- | --- |
| `ruleset-branch-public-oss.json` | Branch principal: exige pull request, 1 aprovação, conversas resolvidas, histórico linear e bloqueia force push e exclusão. |
| `ruleset-branch-public-oss-ci.json` | Mesma proteção da branch principal, mais verificações automáticas `build` e `test`. |
| `ruleset-tags-public-oss.json` | Tags de release: bloqueia exclusão e reescrita. |

## Como importar pela interface

1. No repositório, abra **Settings → Rules → Rulesets**.
2. Clique em **New ruleset → Import a ruleset**.
3. Selecione um dos arquivos JSON desta pasta.
4. Revise o nome, o escopo e as regras.
5. Clique em **Create**.

Repita o processo nos outros repositórios públicos. A condição `~DEFAULT_BRANCH` funciona tanto para `main` quanto para `master`.

## Como aplicar via linha de comando

Com o GitHub CLI autenticado e com permissão de administrador no repositório:

```bash
gh api -X POST repos/OWNER/REPO/rulesets \
  -H "Accept: application/vnd.github+json" \
  --input github/ruleset-branch-public-oss.json

gh api -X POST repos/OWNER/REPO/rulesets \
  -H "Accept: application/vnd.github+json" \
  --input github/ruleset-tags-public-oss.json
```

Substitua `OWNER/REPO` pelo repositório desejado. Para atualizar um ruleset existente, use `PUT /repos/OWNER/REPO/rulesets/ID`.

## Ajustes recomendados

- **Verificações automáticas:** no arquivo com CI, troque `build` e `test` pelos nomes reais dos jobs dos seus workflows. Se o nome estiver errado, os pull requests ficarão bloqueados.
- **Aprovações:** o padrão é 1 aprovação. Em projetos com mais mantenedores, aumente `required_approving_review_count`.
- **Bypass:** os arquivos não definem atores de bypass. Se precisar de uma exceção de emergência, adicione o usuário ou a equipe na tela do ruleset após a importação.
- **CODEOWNERS:** se o repositório tiver um arquivo `CODEOWNERS`, mude `require_code_owner_review` para `true`.

## Comportamento das regras

- Toda alteração na branch principal passa por pull request.
- A aprovação é descartada quando chega um novo commit relevante.
- Comentários de revisão precisam ser resolvidos.
- Não é possível fazer force push, deletar a branch principal ou criar commits de merge diretos na branch.
- As tags de release não podem ser apagadas nem reescritas.
