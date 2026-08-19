# Branch `Murilo` — máquina 2

- ID: `D1-E1-E2 / ENGINE-DATA`
- Objective: transformar contratos congelados e dados climáticos normalizados em plano e
  replano determinísticos, rápidos, rastreáveis e disponíveis offline.
- Acceptance criterion unlocked: município preparado carrega exatamente 41 safras; plano,
  P20, finanças e diff são reproduzíveis sem OpenAI.
- Depends on: SHA de S1/S2 presente na `main`; E1 depende de D1; E2 depende de I1.
- Read only: task brief, schemas congelados, perfis de cultura, regras determinísticas e
  notas de domínio necessárias.
- Exclusive write set: `src/data/**`, arquivos de motor listados na matriz, fixtures de
  municípios, testes de dados/motor e APIs determinísticas listadas na matriz.
- Must not change: schemas, manifests, prompts, OpenAI, `app/page.tsx` ou estilos globais.
- Inputs/contracts: `FarmOperationInput`, `HistoricalDataset`, `PlanResult`, eventos e
  `ReplanResult` congelados.
- Deliverables: geocoding; normalização ERA5-Land; cache/proveniência; baseline e até 100
  candidatos; simulação 41 safras; P20 nearest-rank; finanças em centavos; replano/diff.
- Verification command/path: testes em `tests/data/**` e `tests/engine/**`, repetibilidade,
  exatamente 41 safras, limites de candidato, seed/capacidade/área e caminho offline.
- Stop and report if: contrato não representar um caso necessário, dados tiverem safra
  incompleta/unidade inesperada, ou premissa agronômica não estiver aprovada.

## Handoffs

1. Entregar D1 antes de começar E1 e registrar fonte, período, unidades e hash do dataset.
2. Entregar E1 com todos os números rastreáveis ao input e dataset.
3. Só começar E2 após I1 aceito; não antecipar IBGE ou outra cultura.

