# Branch `Murilo` — frontend e demo

- ID: `FRONTEND-F1-F2`
- Objective: entregar a jornada de três minutos, responsiva, acessível e honesta sobre
  estados ao vivo, preparados e offline.
- Acceptance criterion unlocked: voz, texto e formulário chegam ao mesmo draft editável,
  confirmação, plano, evento, replano, diff e compartilhamento.
- Depends on: SHA de S1/S2 na `main`; integração real depende das APIs de Eduarco.
- Read only: schemas e clients públicos; fixtures congeladas durante desenvolvimento visual.
- Exclusive write set: página, layout, estilos, componentes, sharing, testes UI e assets.
- Must not change: APIs, schemas, manifests, motor, adapters, prompts ou credenciais.
- Inputs/contracts: drafts, município, plano, evento, replano e falhas externas.
- Deliverables: guia de informações; entradas iguais; estados de voz; edição/confirmação;
  proveniência; plano e finanças; diff; WhatsApp/Telegram/Web Share; estados de erro/cache.
- Verification command/path: testes críticos e caminho manual em 1366x768 e mobile,
  teclado, foco, permissão negada, desconexão e offline.
- Stop and report if: UI precisar recalcular número, contrato for ambíguo ou integração
  exigir mudança fora do write set.

## Sequência

1. Assumir e organizar o preview existente sem aumentar o escopo.
2. Fazer F1 contra fixtures congeladas.
3. Conectar clients das APIs sem alterar backend.
4. Fazer F2 e conduzir o walkthrough visual do checkpoint humano.

