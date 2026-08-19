# Plano de execução em quatro branches

Este plano usa as quatro branches remotas existentes e mantém um único dono por arquivo.
O máximo seguro de implementação paralela continua sendo três especialistas depois do
congelamento dos contratos; a quarta máquina atua como orquestradora, integradora e
revisora. Antes desse gate, não há autorização para implementar consumidores do contrato.

## Base comum

Cada máquina começa somente depois de a `main` conter este plano e executa:

```bash
git fetch origin
git switch NOME_DA_BRANCH
git merge --ff-only origin/main
npm ci
npm run check
```

Se o `merge --ff-only` falhar, parar e enviar `git log --oneline --graph --all -20` ao
orquestrador. Não usar force-push, rebase compartilhado ou resolução improvisada.

## Donos e trilhas

| Máquina | Branch | Trilha | Nós | Só começa quando |
|---|---|---|---|---|
| 1 | `Eduarco` | orquestração e contratos | K0, K1, S1, S2, I1, I2, R1 | imediatamente; I1/I2 apenas após handoffs |
| 2 | `Murilo` | dados e motor | D1, E1, E2 | hash de S1/S2 registrado na `main` |
| 3 | `Pedro` | OpenAI e voz | A1, O1 | hash de S1/S2 registrado na `main` |
| 4 | `Vitor` | interface e demo | F1, F2 | hash de S1/S2 registrado na `main` |

Os briefs completos estão nos arquivos com o nome de cada branch nesta pasta.

## Matriz de escrita exclusiva

| Área | Único dono | Caminhos |
|---|---|---|
| coordenação, contratos e dependências | `Eduarco` | `pendencia.md`, `docs/exec-plans/**`, `docs/product-specs/MVP.md`, `src/domain/schemas.ts`, `data/crops/**`, `data/fixtures/contracts/**`, `tests/contracts.test.ts`, manifests e configs da raiz |
| dados, motor e APIs determinísticas | `Murilo` | `src/data/**`, `src/domain/planner.ts`, `src/domain/simulator.ts`, `src/domain/metrics.ts`, `src/domain/finance.ts`, `src/domain/diff.ts`, `data/fixtures/municipalities/**`, `tests/data/**`, `tests/engine/**`, `app/api/locations/**`, `app/api/climate/**`, `app/api/plan/**`, `app/api/replan/**` |
| OpenAI, Realtime e fallbacks de IA | `Pedro` | `src/lib/openai.ts`, `src/lib/realtime.ts`, `src/prompts/**`, `data/fixtures/ai/**`, `tests/ai/**`, `app/api/realtime-session/**`, `app/api/parse-brief/**`, `app/api/parse-event/**` |
| interface, compartilhamento e assets | `Vitor` | `app/page.tsx`, `app/globals.css`, `app/layout.tsx`, `src/components/**`, `src/lib/sharing/**`, `tests/ui/**`, `tests/sharing.test.ts`, `public/**` |

`package.json`, `package-lock.json`, `tsconfig.json`, configurações de build e
`src/domain/schemas.ts` nunca são editados fora de `Eduarco`. Quem precisar de dependência
ou contrato novo abre um pedido com critério de aceite e espera o commit do dono.

## Ondas e checkpoints

1. **Gate de produto e contrato — serial:** `Eduarco` fecha K0/K1/S1/S2, registra os
   testes e o SHA do contrato na `main`. As demais máquinas apenas leem e preparam casos.
2. **Onda 1 — três especialistas:** `Murilo` executa D1/E1, `Pedro` executa A1 e `Vitor`
   executa F1 contra as mesmas fixtures. `Eduarco` revisa handoffs e não invade os arquivos.
3. **Integração I1 — serial:** depois dos três handoffs, cada branch entra na `main`.
   `Vitor` libera `app/page.tsx`; só então `Eduarco` pode fazer uma tarefa de integração
   explicitamente reassigned nesse arquivo.
4. **Onda 2 — paralela:** `Murilo` faz E2, `Pedro` faz O1 e `Vitor` faz F2.
5. **Integração e revisão — serial:** `Eduarco` faz I2/R1, atualiza evidências e apresenta
   o caminho completo ao owner antes de qualquer extensão.

## Protocolo de PR e handoff

- Uma PR por nó do grafo; não agrupar refatoração alheia.
- Antes da PR: `git merge origin/main`, resolver somente arquivos do próprio write set e
  executar a verificação do brief.
- A descrição da PR usa `docs/templates/HANDOFF.md` e inclui arquivos, evidência, impacto
  de contrato e riscos.
- O merge é bloqueado se tocar caminho de outro dono, alterar número determinístico sem
  teste, ou marcar checkbox sem evidência no plano ativo.
- Depois do merge, as outras três máquinas executam `git fetch origin` e
  `git merge origin/main` antes de continuar.

## Estado do preview existente

O preview em `app/` e `src/domain/planner.ts` é evidência de experiência, não conclusão
dos nós canônicos. `Vitor` é dono da interface existente; `Murilo` é dono do planner
existente. Dados climáticos continuam sintéticos e voz continua preparada/offline até os
respectivos nós passarem pelos critérios formais.
