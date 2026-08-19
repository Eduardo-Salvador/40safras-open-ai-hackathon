# Branch `Eduarco` — máquina 1

- ID: `K0-K1-S1-S2 / ORCHESTRATION`
- Objective: fechar decisões humanas, estabilizar o scaffold e congelar contratos e
  fixtures para liberar três trilhas independentes; depois integrar e revisar os handoffs.
- Acceptance criterion unlocked: todas as branches consomem o mesmo contrato testado e
  nenhum checkbox é marcado sem evidência.
- Depends on: confirmação do owner para K0; I1/I2 dependem dos handoffs especialistas.
- Read only: `AGENTS.md`, `pendencia.md`, MVP, arquitetura, event constraints e briefs das branches.
- Exclusive write set: documentação de execução, `docs/product-specs/MVP.md`,
  `src/domain/schemas.ts`, `data/crops/**`, `data/fixtures/contracts/**`,
  `tests/contracts.test.ts`, manifests e configs da raiz.
- Must not change: implementações de motor/dados, OpenAI/Realtime ou UI durante as ondas.
- Inputs/contracts: decisões K0 e invariantes do MVP.
- Deliverables: K0 registrado; K1 reconciliado; schemas Zod; fixtures positivas/negativas;
  hash/versão do contrato; handoff e evidência na `main`.
- Verification command/path: `npm run check` e testes de contrato válidos, ausentes,
  ambíguos, inválidos e confirmação obsoleta.
- Stop and report if: uma decisão K0 estiver indefinida, consumidor exigir mudança de
  contrato depois do freeze, ou uma PR tocar write set alheio.

## Ordem de execução

1. Revisar K0.1-K0.4 com o owner e registrar respostas no plano ativo.
2. Reconciliar K1 com o preview existente; instalar dependências solicitadas apenas quando
   ligadas a um critério do MVP.
3. Implementar S1/S2 sem algoritmos de motor ou componentes de UI.
4. Registrar SHA/hash do contrato e fazer merge na `main`.
5. Liberar D1/E1, A1 e F1 por mensagem com o SHA exato.
6. Revisar PRs por caminho e evidência. Integrar I1/I2 somente após liberação formal do
   arquivo compartilhado pelo especialista.
