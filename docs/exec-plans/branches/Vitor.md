# Branch `Vitor` — dados externos

- ID: `DATA-D1`
- Objective: obter, normalizar, validar e cachear município e clima histórico com
  proveniência completa e fallback preparado.
- Acceptance criterion unlocked: qualquer município válido ou fixture preparada produz
  exatamente 41 safras completas no contrato congelado.
- Depends on: SHA de S1/S2 na `main`.
- Read only: schemas congelados, arquitetura determinística e documentação Open-Meteo.
- Exclusive write set: `src/data/**`, fixtures municipais e `tests/data/**`.
- Must not change: planner/métricas, APIs, UI, schemas, manifests ou OpenAI.
- Inputs/contracts: `Municipality` e `HistoricalDataset` congelados.
- Deliverables: geocoding; ERA5-Land; período 1985-07-01 a 2026-06-30; normalização;
  divisão em 41 anos agrícolas; unidades/proveniência; hash; cache e três municípios.
- Verification command/path: fetch mockado, ambiguidade, vazio, timeout/rate limit, unidade
  inesperada, dia/safra ausente, hash estável e caminho offline.
- Stop and report if: uso/licença não estiver confirmado, API não fornecer variável
  necessária ou schema precisar mudar.

## Limite com Pedro

Vitor entrega dados normalizados. Não calcula candidatos, P20, finanças, ranking ou diff.
O handoff para Pedro contém fixture, hash, unidades, timezone e proveniência.

