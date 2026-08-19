# Branch `Eduarco` — backend e IA

- ID: `BACKEND-S1-A1-O1`
- Objective: congelar contratos e fornecer APIs seguras para município, clima, parsing,
  planejamento, eventos, replano e sessões Realtime.
- Acceptance criterion unlocked: frontend, dados externos e motor analítico se integram
  por contratos testados sem compartilhar implementação.
- Depends on: decisões K0 do owner; APIs de clima/plano dependem dos handoffs de Vitor e Pedro.
- Read only: módulos de UI, ingestão e motor; consumir apenas exports públicos.
- Exclusive write set: contratos, APIs, OpenAI/Realtime, prompts, fixtures/testes de
  contrato e IA, documentação operacional, manifests/configs, worker e hosting.
- Must not change: `src/app/page.tsx`, estilos/componentes, `src/data/**` ou cálculos do domínio.
- Inputs/contracts: MVP, eventos, drafts confirmados e módulos públicos de D1/E1/E2.
- Deliverables: K0/K1; schemas Zod; fixtures; hash de contrato; APIs validadas; Responses;
  segredo curto Realtime/WebRTC; retry único; fallback rotulado; integração server-side.
- Verification command/path: `npm run check`, testes válidos/inválidos/ambíguos, confirmação
  obsoleta, chave ausente, rede falha e argumentos de ferramenta não confiáveis.
- Stop and report if: decisão K0 estiver indefinida, contrato precisar mudar após freeze,
  modelo não estiver acessível ou qualquer solução expuser chave ao cliente.

## Sequência

1. Fechar K0/K1/S1/S2 e publicar o SHA/hash do contrato.
2. Liberar simultaneamente Murilo, Vitor e Pedro.
3. Implementar A1 e rotas com adapters injetados; não duplicar regras de domínio.
4. Integrar os exports de Vitor/Pedro nas APIs após os handoffs.
5. Fazer O1 e registrar evidências de I1/I2/R1; interface permanece com Murilo.
