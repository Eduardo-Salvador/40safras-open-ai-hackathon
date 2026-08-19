# Branch `Pedro` — máquina 3

- ID: `A1-O1 / AI-INTEGRATION`
- Objective: implementar a fronteira de linguagem e voz sobre contratos congelados, sem
  calcular números nem expor credenciais.
- Acceptance criterion unlocked: voz e texto produzem draft validado, exigem confirmação
  explícita e caem para formulário/fixture rotulado quando a rede falha.
- Depends on: SHA de S1/S2 presente na `main`; O1 depende de I1.
- Read only: task brief, schemas congelados, limite OpenAI da arquitetura e um par de
  payloads representativos.
- Exclusive write set: arquivos OpenAI/Realtime, prompts, fixtures/testes de IA e rotas de
  parsing/sessão listadas na matriz.
- Must not change: motor, schemas, manifests, componentes de microfone, página ou estilos.
- Inputs/contracts: draft de operação, confirmação, evento, plano/replano completos.
- Deliverables: Responses + Structured Outputs no servidor; sessão Realtime/WebRTC com
  segredo curto; ferramenta única validada; retry único; fallback editável e rotulado.
- Verification command/path: testes de output válido/malformado, argumentos não confiáveis,
  confirmação obrigatória, chave ausente, rede falha e ausência de números inventados.
- Stop and report if: modelos/credenciais não estiverem disponíveis, schema precisar mudar,
  ou qualquer proposta enviar `OPENAI_API_KEY` ao cliente.

## Handoffs

1. A1 entrega interfaces consumíveis pela UI, latência observada e comportamento sem
   permissão de microfone.
2. O1 começa somente após I1 e mantém o cálculo totalmente determinístico fora do modelo.

