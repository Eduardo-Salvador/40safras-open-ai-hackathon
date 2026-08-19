# Plano de execução em quatro áreas

As quatro branches seguem as habilidades definidas pelo time. Cada caminho possui um
único dono. Integrações acontecem por contratos e APIs, nunca por duas pessoas editando o
mesmo arquivo.

## Áreas e responsáveis

| Branch | Área | Responsabilidade principal | Nós do grafo |
|---|---|---|---|
| `Murilo` | Frontend e demo | experiência, acessibilidade, estados, plano/replano e compartilhamento | F1, F2 e integração visual de I1/I2 |
| `Eduarco` | Backend e IA | contratos, dependências, APIs, OpenAI/Realtime, segurança e integração server-side | K0, K1, S1, S2, A1, O1 e integração backend de I1/I2 |
| `Vitor` | Dados externos | geocoding, clima, normalização, proveniência, cache e fixtures municipais | D1 |
| `Pedro` | Dados analíticos | candidatos, simulação, métricas, finanças, ranking, replano e diff | E1, E2 |

O nome remoto `Eduarco` é mantido exatamente como já existe no GitHub.

## Base comum

Depois de este plano entrar na `main`, cada máquina executa:

```bash
git fetch origin
git switch NOME_DA_BRANCH
git merge --ff-only origin/main
npm ci
npm run check
```

Se o fast-forward falhar, parar e enviar `git log --oneline --graph --all -20`. Não usar
force-push ou rebase em branch compartilhada.

## Matriz de escrita exclusiva

| Área | Único dono | Caminhos |
|---|---|---|
| frontend e assets | `Murilo` | `app/page.tsx`, `app/layout.tsx`, `app/globals.css`, `src/components/**`, `src/lib/sharing/**`, `tests/ui/**`, `tests/sharing.test.ts`, `public/**` |
| backend, contratos, IA e plataforma | `Eduarco` | `app/api/**`, `app/chatgpt-auth.ts`, `src/domain/schemas.ts`, `src/lib/openai.ts`, `src/lib/realtime.ts`, `src/prompts/**`, `data/fixtures/contracts/**`, `data/fixtures/ai/**`, `tests/contracts.test.ts`, `tests/ai/**`, `pendencia.md`, `docs/exec-plans/**`, `docs/product-specs/MVP.md`, manifests/configs da raiz, `worker/**`, `.openai/**` |
| ingestão de dados | `Vitor` | `src/data/**`, `data/fixtures/municipalities/**`, `tests/data/**` |
| motor analítico | `Pedro` | `src/domain/planner.ts`, `src/domain/simulator.ts`, `src/domain/metrics.ts`, `src/domain/finance.ts`, `src/domain/diff.ts`, `data/crops/**`, `tests/engine/**`, `tests/planner.test.ts` |

Regras absolutas:

- Apenas `Eduarco` altera schemas, manifests, lockfile, configurações e rotas de API.
- Apenas `Murilo` altera a página, componentes, estilos globais e assets.
- `Vitor` entrega `HistoricalDataset` normalizado; não implementa ranking ou finanças.
- `Pedro` recebe `HistoricalDataset`; não chama rede, filesystem, relógio ou OpenAI no domínio.
- Dependência nova é solicitada a `Eduarco` com o critério que ela desbloqueia.
- Mudança de contrato pausa todos os consumidores até novo teste e hash.

## Ondas

1. **Contrato — serial:** `Eduarco` fecha K0/K1/S1/S2 e registra na `main` o SHA/hash do
   contrato. Os demais apenas revisam casos e preparam critérios.
2. **Onda 1 — paralela:**
   - `Vitor` implementa D1 contra os schemas congelados.
   - `Pedro` implementa o núcleo puro de E1 contra a fixture histórica congelada.
   - `Murilo` implementa F1 contra os mesmos payloads congelados.
   - `Eduarco` implementa A1 e as rotas backend.
3. **Integração I1:** `Vitor` e `Pedro` entregam módulos, `Eduarco` conecta APIs sem editar
   domínio, e `Murilo` conecta a UI sem editar backend. Cada metade fica em sua branch.
4. **Onda 2 — paralela:** `Pedro` executa E2, `Murilo` executa F2 e `Eduarco` executa O1;
   `Vitor` reforça cache, proveniência e fixtures de contingência de D1.
5. **Freeze:** os quatro enviam handoff; `Eduarco` registra evidências e `Murilo` conduz o
   walkthrough visual com o owner. Extensões só começam depois da revisão do core.

E1 pode ser desenvolvido em paralelo a D1 porque recebe o dataset por injeção e usa a
fixture de contrato. I1 continua bloqueado até D1 provar 41 safras completas e E1 passar
com o dataset normalizado real ou cacheado.

## Protocolo de PR

- Uma PR por nó do grafo, limitada ao write set da branch.
- Antes da PR: `git fetch origin`, `git merge origin/main` e verificação do brief.
- A descrição segue `docs/templates/HANDOFF.md`.
- PR é bloqueada se tocar arquivo de outro dono, mudar contrato sem autorização, alterar
  número determinístico sem teste ou marcar checkbox sem evidência.
- Depois de cada merge, todas as máquinas sincronizam `origin/main` antes de continuar.

## Preview existente

O preview é apenas base visual e prova de conceito. `Murilo` assume os arquivos de UI;
`Pedro` assume o planner. A fixture climática continua sintética e a voz continua
preparada/offline até D1 e A1 cumprirem os gates formais.
