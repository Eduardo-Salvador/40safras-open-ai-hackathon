# Branch `Vitor` — máquina 4

- ID: `F1-F2 / FRONTEND-DEMO`
- Objective: transformar fixtures e contratos congelados na jornada demonstrável de três
  minutos, responsiva, acessível e honesta sobre estados ao vivo/offline.
- Acceptance criterion unlocked: voz, texto e formulário aparecem juntos, chegam ao mesmo
  draft editável, confirmação, prova do plano, evento, replano e compartilhamento.
- Depends on: SHA de S1/S2 presente na `main`; F2 depende de I1.
- Read only: task brief, MVP/demo story, fixtures congeladas e direção visual autorizada.
- Exclusive write set: página, layout, estilos, componentes, sharing, testes UI e assets
  listados na matriz.
- Must not change: schemas, manifests, motor, adapters, prompts ou rotas OpenAI.
- Inputs/contracts: fixtures de draft, município, plano, evento, replano e falhas externas.
- Deliverables: guia de informações; entradas iguais; estados de voz; draft/confirmacão;
  plano e proveniência; diff; WhatsApp/Telegram/Web Share; offline e erros.
- Verification command/path: testes críticos de componente/compartilhamento e caminho
  manual em 1366x768 e mobile, incluindo teclado, permissão negada e modo offline.
- Stop and report if: a UI precisar recalcular número, contrato for ambíguo, ou integração
  exigir edição fora do write set.

## Handoffs

1. F1 usa fixtures congeladas, não respostas ad hoc do motor ou IA.
2. Ao terminar F1/F2, liberar explicitamente `app/page.tsx` antes de I1/I2.

