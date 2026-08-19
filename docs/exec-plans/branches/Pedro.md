# Branch `Pedro` — dados analíticos e motor

- ID: `ANALYTICS-E1-E2`
- Objective: transformar operação confirmada e dataset histórico em plano e replano
  determinísticos, rápidos, auditáveis e independentes de rede/IA.
- Acceptance criterion unlocked: baseline, recomendação, P20, finanças e diff são
  reproduzíveis e rastreáveis aos inputs.
- Depends on: SHA de S1/S2 na `main`; integração I1 exige dataset D1 de Vitor; E2 exige I1.
- Read only: schemas congelados, fixture histórica, regras determinísticas e handoff D1.
- Exclusive write set: planner, simulator, metrics, finance, diff, perfis de cultura e
  testes do motor.
- Must not change: `src/data/**`, APIs, UI, schemas, manifests, prompts ou OpenAI.
- Inputs/contracts: `FarmOperationInput`, `HistoricalDataset`, eventos e resultados congelados.
- Deliverables: baseline; permutações de até quatro talhões; limite 100; agenda; simulação
  41 safras; P20 nearest-rank; finanças em centavos; ranking estável; replano/diff.
- Verification command/path: repetibilidade, exatamente 41 outcomes, seed/capacidade/área,
  limites de candidato, tie-break, P20, evento bloqueado e imutabilidade do resultado anterior.
- Stop and report if: contrato não representar caso necessário, premissa não estiver
  aprovada ou dado de Vitor violar unidade/completude esperada.

## Limite com Vitor

Pedro consome o dataset por parâmetro e pode começar com fixture congelada. Não chama
Open-Meteo, geocoding, cache, filesystem, relógio ou rede dentro do domínio.

