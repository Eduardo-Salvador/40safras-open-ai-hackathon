# Pendências — receita de implementação do Quarenta Safras

Este arquivo é o checklist operacional do projeto. Nada deve ser marcado como concluído
sem evidência de comando, teste ou demonstração manual. As tarefas estão na ordem em que
podem ser executadas. Blocos marcados como paralelos possuem dependências satisfeitas e
conjuntos de arquivos diferentes.

Este é o registro canônico das pendências. Quando alguém perguntar “o que falta?” ou
“quais são as próximas tarefas?”, ler os itens ainda não marcados, respeitar as
dependências e apresentar primeiro o próximo gate e as trilhas paralelas já liberadas.
Marcar `[x]` somente depois de registrar a evidência em `HACKATHON_PLAN.md`.

## Visão da entrega final

```text
orientação do que informar
→ escolha entre voz, texto natural ou formulário
→ rascunho estruturado e editável
→ município resolvido
→ confirmação por voz ou botão
→ 41 safras carregadas ou recuperadas do cache
→ geração de baseline e candidatos
→ candidatos × 41 safras
→ ranking e plano recomendado
→ evento de campo por voz ou texto
→ confirmação do evento
→ replano e diff
→ confirmação de envio
→ WhatsApp/Telegram/Web Share
```

## Tecnologias definidas

- [x] Node.js LTS instalado e versão registrada em `.nvmrc`.
- [x] npm usado como gerenciador; `package-lock.json` versionado.
- [x] Next.js com App Router para frontend e rotas de servidor.
- [x] React e TypeScript com `strict: true`.
- [x] Zod v4 como schema executável comum a UI, APIs, IA e motor.
- [x] SDK oficial `openai` para Responses API e Structured Outputs.
- [x] `@openai/agents` para `RealtimeAgent` e `RealtimeSession` no navegador.
- [x] WebRTC para áudio em tempo real.
- [x] Vitest para testes unitários e de contrato.
- [x] Testing Library + jsdom instalados para componentes críticos.
- [x] CSS Modules/tokens globais; não instalar biblioteca visual sem critério do MVP.
- [x] Open-Meteo Geocoding API para município, UF, coordenadas, elevação e timezone.
- [x] Open-Meteo Historical Weather API, modelo ERA5, para as 41 safras.
- [x] Web Share API, `wa.me` e `t.me/share/url` para compartilhamento sem credencial.
- [x] `node:crypto` para hashes determinísticos do plano e replano.
- [ ] Telegram Bot API somente como extensão gratuita se o core estiver verde.
- [ ] Vercel somente depois do caminho local e offline estar verificado.

## Variáveis de ambiente e credenciais

### Obrigatórias para o caminho ao vivo com IA

- [ ] Obter `OPENAI_API_KEY` no projeto correto.
- [x] Fornecer `.env.example`; confirmar que `.env.local` e `.env*` estão no `.gitignore`.
- [x] Definir `OPENAI_API_KEY` somente no servidor.
- [ ] Definir `OPENAI_MODEL=gpt-5.6-terra` ou o modelo liberado no evento.
- [ ] Definir `OPENAI_REALTIME_MODEL=gpt-realtime-2.1-mini` ou o modelo liberado.
- [ ] Confirmar no início do evento que ambos os modelos estão acessíveis à conta.
- [x] Nunca criar variável `NEXT_PUBLIC_OPENAI_API_KEY`.

### Open-Meteo

- [ ] Confirmar que o uso do hackathon está coberto pelo acesso sem chave.
- [x] Registrar atribuição a Open-Meteo e ERA5 na UI e no README.
- [ ] Se uma chave comercial for necessária, guardar como `OPEN_METEO_API_KEY` no servidor.
- [x] Não tornar a chave do Open-Meteo obrigatória para os três municípios preparados.

### Telegram Bot API — opcional, não necessária para compartilhar

- [x] Manter WhatsApp e Telegram por links sem chave no core.
- [ ] Se houver tempo para envio automático, criar bot com BotFather.
- [ ] Guardar `TELEGRAM_BOT_TOKEN` somente no servidor.
- [ ] Definir `TELEGRAM_CHAT_ID` apenas para o destinatário de demonstração autorizado.
- [x] Se token ou chat não estiverem prontos, cortar o bot sem afetar os links.

### Deploy — opcional até o core funcionar

- [ ] Criar projeto Vercel e associar o repositório somente após o caminho offline passar.
- [ ] Configurar as mesmas variáveis no ambiente de preview/produção.
- [ ] Definir `APP_BASE_URL` para o link compartilhável do resultado.
- [ ] Não gravar cache indispensável apenas no filesystem efêmero da Vercel.

## Fase 0 — decisões humanas antes de começar o código

### K0.1 — Escopo e ativos

Dependências: nenhuma. Responsável: product owner/orquestrador.

- [ ] Confirmar que o caminho validado é somente soja → milho safrinha.
- [ ] Confirmar que o mockup pode ou não ser usado como referência visual.
- [ ] Registrar o que foi reutilizado, reconstruído, gerado ou obtido de terceiros.
- [ ] Confirmar que nenhum código do HTML de referência será copiado.
- [ ] Escolher um município canônico para a apresentação.
- [ ] Escolher dois municípios de contingência em estados diferentes.
- [ ] Fixar o período histórico em `1985-07-01` a `2026-06-30`.
- [ ] Confirmar que a apresentação chamará isso de 41 safras completas.
- [ ] Confirmar limite de quatro talhões no fluxo canônico.
- [ ] Confirmar que o produto é protótipo e não substitui ZARC ou agrônomo.

Concluído quando: decisões registradas em
`docs/exec-plans/active/HACKATHON_PLAN.md`.

### K0.2 — Dados obrigatórios da operação

Dependências: K0.1. Responsável: produto + motor.

- [ ] Município e UF.
- [ ] Data pretendida de início.
- [ ] Área total.
- [ ] Talhões, áreas e elegibilidade para safrinha.
- [ ] Ordem usual dos talhões para formar o baseline.
- [ ] Capacidade de plantio em ha/dia.
- [ ] Lotes/cultivares de soja, ciclo e área disponível.
- [ ] Definir se o milho usa lotes informados ou um perfil fixo do MVP.
- [ ] Se usar lotes de milho, exigir ciclo e área disponível.
- [ ] Meta de área de milho safrinha.
- [ ] Margem de soja por ha, margem de milho por ha e custo diário opcional.
- [ ] Definir quais campos podem ficar ausentes no primeiro relato e gerar pergunta.
- [ ] Definir quais ambiguidades sempre exigem confirmação.

Concluído quando: existe uma lista fechada de campos obrigatórios e opcionais.

### K0.3 — Premissas determinísticas do motor

Dependências: K0.2. Responsável: produto + motor + especialista de domínio, se disponível.

- [ ] Confirmar baseline: ordem e lotes informados pelo produtor.
- [ ] Confirmar geração de todas as permutações de até quatro talhões.
- [ ] Confirmar limite de 100 candidatos depois de remover equivalentes.
- [ ] Definir se um talhão pode ser dividido entre dois lotes; recomendação do MVP: não.
- [ ] Definir duração e variáveis do perfil climático de soja.
- [ ] Definir duração e variáveis do perfil climático de milho.
- [ ] Fixar `establishmentWindowDays`.
- [ ] Fixar `minEstablishmentRainMm`.
- [ ] Fixar `maxDrySpellDays`.
- [ ] Fixar `minCyclePrecipitationToEt0Ratio`.
- [ ] Registrar fonte/validação de cada limiar.
- [ ] Se não houver validação, rotular como “premissas climáticas do protótipo”.
- [ ] Confirmar método P20 nearest-rank: nono menor valor entre 41.
- [ ] Confirmar ranking: área P20 → meta atingida → safras viáveis → financeiro P20 → término → chave estável.
- [ ] Confirmar fórmula financeira em centavos inteiros.
- [ ] Confirmar timezone usado em todas as datas.

Concluído quando: duas implementações independentes produziriam o mesmo resultado.

### K0.4 — Voz, confirmação e evento crítico

Dependências: K0.2. Responsável: produto + IA.

- [ ] Confirmar push-to-talk como padrão.
- [ ] Confirmar que voz, texto natural e formulário aparecem juntos na primeira tela.
- [ ] Confirmar que nenhum modo depende da falha de outro para ficar disponível.
- [ ] Definir resumo falado obrigatório antes da confirmação.
- [ ] Definir frases afirmativas e negativas aceitas no roteiro canônico.
- [ ] Confirmar que o agente pode pedir campos ausentes, mas nunca inventá-los.
- [ ] Confirmar que qualquer edição invalida a confirmação anterior.
- [ ] Confirmar que voz, texto natural e formulário produzem o mesmo draft e contrato confirmado.
- [ ] Definir tipos de evento: bloqueio, excesso de chuva, perda de semente, falha de máquina e outro.
- [ ] Definir severidade `operational` versus `critical`.
- [ ] Confirmar que evento crítico não envia mensagem automaticamente.
- [ ] Exigir três passos separados: confirmar evento → calcular replano → autorizar envio.
- [ ] Definir destinatário de demonstração que não cause impacto real indevido.

Concluído quando: o roteiro de confirmação normal, correção, negação e desastre está escrito.

## Fase 1 — repositório e scaffold, serial

### K1 — Inicializar o projeto

Dependências: K0.1 a K0.4. Escrita exclusiva: manifests, configs e estrutura base.

- [ ] Executar `git init` se o repositório ainda não estiver inicializado.
- [ ] Definir branch principal `main`.
- [ ] Conectar o remoto público autorizado.
- [ ] Criar commit baseline antes do código do evento.
- [ ] Não fazer push sem autorização humana explícita.
- [ ] Executar `npm init -y` na raiz existente.
- [ ] Instalar e fixar `next`, `react`, `react-dom`, `typescript` e tipos.
- [ ] Instalar e fixar `zod`, `openai` e `@openai/agents`.
- [ ] Instalar e fixar `vitest`, `jsdom` e Testing Library.
- [ ] Criar `src/app/layout.tsx`, `src/app/page.tsx` e `src/app/globals.css` mínimos.
- [ ] Criar `tsconfig.json` com `strict: true`.
- [ ] Criar configuração de lint e Vitest.
- [ ] Criar scripts `dev`, `build`, `typecheck`, `lint`, `test` e `check`.
- [ ] Fazer `check` executar typecheck, lint e testes.
- [ ] Confirmar que `npm run check` funciona mesmo sem testes reais ainda.
- [ ] Confirmar que `.env.local` e segredos estão ignorados.

Comandos previstos:

```powershell
npm install next react react-dom zod openai @openai/agents
npm install -D typescript @types/node @types/react @types/react-dom eslint eslint-config-next vitest jsdom @testing-library/react @testing-library/jest-dom
npm run check
```

Concluído quando: servidor local abre, página mínima renderiza e `npm run check` fica verde.

## Fase 2 — contratos e fixtures mínimas, serial

### S1 — Congelar schemas compartilhados

Dependências: K1. Escrita exclusiva:
`src/domain/schemas.ts`, `data/crops/`, `tests/contracts.test.ts`.

- [ ] Criar `MunicipalitySchema`.
- [ ] Criar `OperationDraftSchema` com ausências e ambiguidades explícitas.
- [ ] Criar `ConfirmationSchema` com método, versão, token e horário.
- [ ] Criar `FarmOperationInputSchema` somente com dados completos.
- [ ] Criar `HistoricalDaySchema`, `HistoricalSeasonSchema` e `HistoricalDatasetSchema`.
- [ ] Criar `CropClimateProfileSchema`.
- [ ] Criar `PlanCandidateSchema`.
- [ ] Criar `HistoricalOutcomeSchema`.
- [ ] Criar `PlanResultSchema` com baseline e recomendado.
- [ ] Criar `FieldEventDraftSchema` e `ConfirmedFieldEventSchema`.
- [ ] Criar `ReplanResultSchema` e códigos de diff.
- [ ] Criar `OutboundAlertSchema` e `NotificationResultSchema`.
- [ ] Validar soma da área dos talhões.
- [ ] Validar IDs únicos.
- [ ] Validar capacidade, ciclos e áreas positivas.
- [ ] Validar disponibilidade de sementes.
- [ ] Validar meta menor ou igual à área elegível.
- [ ] Validar exatamente 41 safras.
- [ ] Validar que confirmação antiga não serve para draft novo.
- [ ] Criar testes de payload válido, ausente, ambíguo e inválido.
- [ ] Gerar ou registrar versão/hash do contrato congelado.

Concluído quando: contratos válidos e inválidos passam e todos os responsáveis recebem o mesmo hash.

### S2 — Criar fixtures de contrato

Dependências: S1. Escrita exclusiva: `data/fixtures/contracts/`.

- [ ] Relato completo canônico em português.
- [ ] Relato incompleto, sem capacidade e ciclo.
- [ ] Município ambíguo.
- [ ] Operação confirmada válida.
- [ ] Operação com áreas inconsistentes.
- [ ] Evento operacional de bloqueio.
- [ ] Evento crítico por excesso de chuva.
- [ ] Confirmação por voz válida.
- [ ] Confirmação obsoleta depois de uma edição.
- [ ] Preview de alerta sem números inventados.

Concluído quando: fixtures passam pelos schemas sem depender de OpenAI ou rede.

## Fase 3 — Onda 1 paralela

Começar A1, B1 e C1 juntos somente depois de S1 e S2. Não compartilhar arquivos. Alteração
de schema exige parar as três frentes e voltar para S1.

### Trilha A — D1 + E1: dados e motor

Responsável: engine/data. Escrita exclusiva: `src/data/`, `src/domain/` exceto
`schemas.ts`, `data/fixtures/municipalities/`, `tests/data/`, `tests/engine/`.

#### A1.1 — Geocoding

- [ ] Criar `src/data/geocoding.ts`.
- [ ] Consultar Open-Meteo com `countryCode=BR`, `language=pt`, `count=5`.
- [ ] Normalizar nome, UF, latitude, longitude, elevação e timezone.
- [ ] Nunca selecionar silenciosamente quando houver mais de uma opção.
- [ ] Tratar vazio, timeout, rate limit e resposta inválida.
- [ ] Criar testes com fetch mockado.

#### A1.2 — Clima e 41 safras

- [ ] Criar `src/data/climate.ts` e `src/data/normalize.ts`.
- [ ] Consultar `archive-api.open-meteo.com/v1/archive`.
- [x] Fixar `models=era5`, conforme decisão técnica registrada; ERA5-Land foi rejeitado por séries incompletas/`null`.
- [ ] Fixar início `1985-07-01` e fim `2026-06-30`.
- [x] Pedir precipitação, ET0 e temperatura mínima/máxima. Umidade superficial permanece indisponível e fora do contrato, sem substituição sintética.
- [ ] Separar os dias em exatamente 41 anos agrícolas.
- [ ] Rejeitar dia ausente, unidade inesperada ou safra incompleta.
- [ ] Registrar fonte, período, grid, variáveis, unidades e data de recuperação.
- [ ] Calcular `datasetHash` depois da normalização.

#### A1.3 — Cache e caminho offline

- [ ] Criar interface `ClimateCache`.
- [ ] Implementar cache em memória para execução local.
- [ ] Implementar leitura de fixtures preparadas.
- [ ] Definir chave por coordenada/grid, modelo, período e variáveis.
- [ ] Salvar fixtures reais dos três municípios com proveniência.
- [ ] Identificar na resposta `live`, `cached` ou `fixture`.
- [ ] Confirmar que falha ao vivo retorna fixture apenas para município preparado.
- [ ] Nunca misturar parte ao vivo com parte sintética sem rótulo.

#### A1.4 — Gerador de candidatos

- [ ] Criar `src/domain/candidates.ts`.
- [ ] Materializar baseline na ordem informada.
- [ ] Gerar até 24 permutações de quatro talhões.
- [ ] Gerar atribuições válidas de lotes.
- [ ] Rejeitar estoque insuficiente.
- [ ] Rejeitar milho em talhão inelegível.
- [ ] Criar chave canônica para remover equivalentes.
- [ ] Ordenar de forma estável.
- [ ] Limitar a 100 candidatos.
- [ ] Garantir que baseline continue no conjunto.

#### A1.5 — Cronograma e simulador

- [ ] Criar `src/domain/planner.ts`.
- [ ] Calcular dias por `ceil(areaHa / planterCapacityHaPerDay)`.
- [ ] Criar datas ISO na timezone municipal.
- [ ] Aplicar ciclo do lote de soja por talhão.
- [ ] Obter primeira data possível do milho.
- [ ] Criar `src/domain/simulator.ts` para uma safra.
- [ ] Avaliar chuva no estabelecimento.
- [ ] Avaliar maior sequência seca.
- [ ] Avaliar precipitação/ET0 durante o ciclo.
- [ ] Retornar área de milho viável e meta atingida.
- [ ] Repetir para exatamente 41 safras.

#### A1.6 — Métricas, financeiro e ranking

- [ ] Criar `src/domain/metrics.ts`.
- [ ] Implementar nearest-rank P20 com teste de 41 valores.
- [ ] Calcular safras viáveis e frequência de atingimento da meta.
- [ ] Criar `src/domain/finance.ts` usando centavos inteiros.
- [ ] Calcular mediana, P20 e pior observado.
- [ ] Calcular diferença contra baseline.
- [ ] Implementar ranking lexicográfico congelado.
- [ ] Testar desempate por chave estável.
- [ ] Testar repetição idêntica da mesma entrada.
- [ ] Confirmar execução abaixo de um segundo no fixture canônico.

Trilha A concluída quando: fixture confirmado produz baseline, candidatos, 41 resultados
por candidato e vencedor reproduzível sem rede, relógio ou IA.

### Trilha B — A1: IA textual, sessão de voz e confirmação

Responsável: AI integration. Escrita exclusiva: `src/lib/openai.ts`,
`src/lib/realtime.ts`, `src/prompts/`, rotas de IA, `tests/ai/`.

#### B1.1 — Extração textual

- [ ] Criar cliente OpenAI somente server-side.
- [ ] Criar prompt pequeno para extrair `OperationDraft`, sem calcular.
- [ ] Usar Responses API com Structured Outputs/Zod.
- [ ] Criar `POST /api/parse-brief`.
- [ ] Preservar campos ausentes e ambiguidades.
- [ ] Validar localmente mesmo depois do Structured Output.
- [ ] Tentar novamente apenas uma vez em saída inválida.
- [ ] Depois da segunda falha, devolver formulário editável com texto original.
- [ ] Criar `POST /api/parse-event` com o mesmo padrão.
- [ ] Proibir modelo de inventar data, coordenada, score, viabilidade ou dinheiro.

#### B1.2 — Sessão Realtime

- [ ] Criar `POST /api/realtime-session`.
- [ ] Gerar client secret efêmero usando a chave no servidor.
- [ ] Configurar idioma português e push-to-talk.
- [ ] Criar `RealtimeAgent` e `RealtimeSession`.
- [ ] Conectar navegador por WebRTC.
- [ ] Não enviar a chave permanente ao cliente.
- [ ] Não persistir áudio bruto.
- [ ] Registrar somente eventos, latência, ferramenta, validação e IDs.

#### B1.3 — Ferramentas de draft e confirmação

- [ ] Criar tool `update_operation_draft`.
- [ ] Criar tool `request_operation_confirmation`.
- [ ] Congelar `draftVersion` e emitir token curto.
- [ ] Fazer o agente ler município, área, talhões, lotes, ciclos, capacidade e meta.
- [ ] Criar tool `confirm_operation`.
- [ ] Aceitar confirmação somente depois do resumo da mesma versão.
- [ ] Rejeitar token expirado, versão antiga e dados inválidos.
- [ ] Tratar “não”, correção e interrupção sem calcular.
- [ ] Criar tools equivalentes para confirmação de evento.
- [ ] Criar confirmação separada para autorização de envio.

#### B1.4 — Testes da fronteira de IA

- [ ] Extração válida passa Zod.
- [ ] Campo ausente gera pergunta, não valor inventado.
- [ ] Município ambíguo permanece ambíguo.
- [ ] Uma falha gera retry; duas falhas geram recuperação editável.
- [ ] Tool não calcula antes da confirmação.
- [ ] Editar draft invalida token.
- [ ] Fala negativa não confirma.
- [ ] Chave não aparece em bundle, resposta ou log.
- [ ] Números falados são subconjunto do payload determinístico.

Trilha B concluída quando: texto e voz conseguem produzir contratos validados e a voz não
consegue ultrapassar o guard de confirmação.

### Trilha C — F1: frontend com payloads mockados

Responsável: frontend/demo. Escrita exclusiva: `src/app/page.tsx`, `src/components/`,
`src/app/globals.css`, testes de componentes.

#### C1.1 — Máquina de estados da jornada

- [ ] Definir estados: `collecting`, `resolving_location`, `reviewing`, `confirmed`,
  `loading_climate`, `planning`, `planned`, `event_review`, `replanning`, `alert_preview`.
- [ ] Bloquear transições inválidas.
- [ ] Preservar texto e draft quando voz ou rede falhar.
- [ ] Mostrar claramente live, cache e fixture.

#### C1.2 — Coleta e confirmação

- [ ] Mostrar antes da entrada a lista: município/UF, data inicial, área, talhões, sementes/ciclos, capacidade, meta e premissas financeiras.
- [ ] Criar três ações igualmente visíveis: `Falar`, `Escrever livremente` e `Preencher formulário`.
- [ ] Criar entrada de texto natural.
- [ ] Criar formulário campo a campo que não chama IA.
- [ ] Criar botão push-to-talk e estados de permissão/conexão.
- [ ] Mostrar transcrição sincronizada.
- [ ] Criar formulário editável do draft.
- [ ] Permitir trocar de voz para texto/formulário e voltar sem perder valores.
- [ ] Criar seletor de município com nome e UF.
- [ ] Mostrar campos ausentes e ambiguidades.
- [ ] Criar card de resumo idêntico ao resumo falado.
- [ ] Criar botão de confirmação equivalente à confirmação falada.
- [ ] Invalidar visualmente confirmação após qualquer edição.

#### C1.3 — Resultado e prova

- [ ] Mostrar baseline versus recomendado.
- [ ] Mostrar ordem dos talhões e lotes.
- [ ] Mostrar área de milho P20.
- [ ] Mostrar meta atingida em X de 41 safras.
- [ ] Mostrar safras viáveis.
- [ ] Mostrar financeiro com “usando as premissas fornecidas”.
- [ ] Mostrar fonte, período, cache e hash do resultado.
- [ ] Não recalcular nenhum número no componente.
- [ ] Evitar transformar a experiência em dashboard.

#### C1.4 — Estados de falha

- [ ] Microfone negado → texto visível e funcional.
- [ ] Realtime desconectado → preservar draft e continuar por texto.
- [ ] OpenAI indisponível → formulário/fixture rotulado.
- [ ] Clima indisponível → cache/fixture ou erro recuperável.
- [ ] Resultado inválido → não renderizar números parciais.

Trilha C concluída quando: payloads mockados percorrem coleta, confirmação e plano em tela
desktop e mobile sem erro crítico no console.

## Fase 4 — Integração vertical 1, serial

### I1 — Texto e voz até plano real

Dependências: trilhas A, B e C concluídas. Responsável: orquestrador. Escrita exclusiva
temporária: rotas de integração e `src/app/page.tsx`.

- [ ] Criar `GET /api/locations` usando o adaptador real.
- [ ] Criar `GET /api/climate` usando live/cache/fixture.
- [ ] Criar `POST /api/plan` com schema confirmado.
- [ ] Conectar relato textual ao draft real.
- [ ] Conectar seleção de município ao contrato confirmado.
- [ ] Conectar botão de confirmação ao mesmo guard da voz.
- [ ] Conectar tool da sessão de voz ao endpoint de plano.
- [ ] Confirmar que voz, texto natural e formulário produzem o mesmo `inputHash`.
- [ ] Confirmar que o planner recebe exatamente 41 safras.
- [ ] Renderizar resultado real sem cálculos duplicados na UI.
- [ ] Fazer o agente falar somente valores do `PlanResult`.
- [ ] Executar caminho canônico completo por texto.
- [ ] Executar caminho canônico completo por voz.

Concluído quando: voz, texto natural e formulário chegam ao mesmo plano determinístico e a evidência é
registrada no plano ativo.

## Fase 5 — Onda 2 paralela

Começar D2, N1 e O1 depois de I1. Os conjuntos de escrita abaixo são separados.

### Trilha D — E2: replano e diff

Escrita exclusiva: `src/domain/replan.ts`, `src/domain/diff.ts`, `tests/engine/replan*`.

- [ ] Determinar tarefas concluídas antes da data efetiva.
- [ ] Representar tarefa em andamento explicitamente.
- [ ] Congelar o que já foi executado.
- [ ] Aplicar talhões bloqueados e `blockedUntil`.
- [ ] Aplicar alteração de sementes por lote.
- [ ] Aplicar alteração de capacidade de máquina, se confirmada no contrato.
- [ ] Gerar candidatos somente para o trabalho restante.
- [ ] Reusar as mesmas 41 safras e premissas.
- [ ] Produzir `before`, `after` e lista de mudanças.
- [ ] Usar códigos de razão determinísticos.
- [ ] Testar bloqueio, perda de semente, falha de máquina e evento sem efeito.
- [ ] Garantir que o plano original permaneça imutável.

### Trilha N — N1: notificações e compartilhamento

Escrita exclusiva: `src/lib/notifications/`, `src/lib/whatsapp.ts`, `src/lib/telegram.ts`,
`src/app/api/notifications/`, `tests/notifications/`.

- [ ] Criar interface `NotificationGateway`.
- [ ] Criar formatter determinístico a partir de `ReplanResult`.
- [ ] Criar `POST /api/notifications/preview`.
- [ ] Incluir sequência, mudança crítica, ID/hash e disclaimer.
- [ ] Criar link `wa.me` com encode correto.
- [ ] Criar link `https://t.me/share/url` com texto e URL codificados.
- [ ] Criar payload para Web Share API.
- [ ] Não exigir conta Business nem serviço intermediário para o caminho principal.
- [ ] Se o core estiver verde, criar adapter opcional da Telegram Bot API.
- [ ] No bot, criar `idempotencyKey` por replano, chat e mensagem.
- [ ] No bot, exigir confirmação de envio e destinatário explícito.
- [ ] Testar encode dos dois links e disponibilidade do Web Share fallback.
- [ ] Se houver bot, testar timeout, erro e não duplicação.

### Trilha O — O1: fallbacks de IA e explicação segura

Escrita exclusiva: `data/fixtures/ai/`, `src/prompts/fallback*`, `tests/ai/fallback*`.

- [ ] Criar draft preparado e claramente rotulado.
- [ ] Criar evento preparado e claramente rotulado.
- [ ] Criar texto determinístico de resultado sem modelo.
- [ ] Implementar verificador de números da explicação opcional.
- [ ] Rejeitar qualquer número que não exista no payload.
- [ ] Testar falha de Responses e Realtime sem perder o caminho textual.

Onda 2 concluída quando: motor replaneja, notificações geram preview seguro e falha de IA
continua permitindo a demonstração.

## Fase 6 — Integração vertical 2, serial

### I2 — Evento crítico até envio

Dependências: D2, N1 e O1. Escrita exclusiva temporária: página, componentes de evento e
rotas integradas.

- [ ] Conectar evento digitado a `FieldEventDraft`.
- [ ] Conectar evento falado ao mesmo draft.
- [ ] Fazer agente ler talhões, datas, alterações e severidade.
- [ ] Confirmar evento por voz.
- [ ] Confirmar evento por botão como fallback.
- [ ] Rejeitar replano antes da confirmação.
- [ ] Chamar `/api/replan` e exibir antes/depois.
- [ ] Explicar cada mudança com código de razão.
- [ ] Criar preview do alerta a partir do resultado.
- [ ] Mostrar os canais WhatsApp, Telegram e Web Share.
- [ ] Exigir autorização separada antes de abrir/usar o canal.
- [ ] Testar `wa.me` real.
- [ ] Testar link de compartilhamento do Telegram.
- [ ] Testar Telegram Bot apenas se a extensão tiver sido implementada.
- [ ] Confirmar que falha de envio não apaga o replano.
- [ ] Repetir o caminho sem rede com fixture rotulada.

Concluído quando: evento por voz → confirmação → replano → diff → autorização →
compartilhamento funciona e não duplica mensagens.

## Fase 7 — envio automático pelo Telegram, opcional após core verde

### XT — Telegram Bot API

Dependências: I2, `TELEGRAM_BOT_TOKEN` e `TELEGRAM_CHAT_ID`. Não começar se houver P0/P1.

- [ ] Criar `TelegramNotificationGateway` server-side.
- [ ] Enviar somente texto produzido de forma determinística a partir do replano.
- [ ] Exigir confirmação explícita do chat e do conteúdo.
- [ ] Nunca expor o token no navegador.
- [ ] Implementar timeout e idempotência.
- [ ] Registrar somente status e message ID, sem token.
- [ ] Testar sucesso, erro, timeout e repetição.
- [ ] Cortar toda esta fase se comprometer revisão, offline ou ensaio.

## Fase 8 — qualidade e segurança

### R1 — Gate automatizado

- [x] `npm ci` funciona com o lockfile atual.
- [x] `npm run typecheck` verde.
- [x] `npm run lint` verde.
- [x] `npm run test` verde.
- [x] `npm run check` verde e abaixo de 60 segundos.
- [x] Testes do motor não usam rede, relógio nem modelo.
- [ ] Testes de contrato cobrem válidos e inválidos.
- [x] Testes de dados cobrem 41 safras, unidades, séries `null`/incompletas e fallback.
- [ ] Testes de notificações cobrem encode, HMAC e idempotência.
- [x] Nenhum teste foi enfraquecido para ficar verde.

### R2 — Segredos e fronteiras

- [x] Procurar `OPENAI_API_KEY`, tokens e segredos no Git e fontes do cliente.
- [x] Confirmar que client secret Realtime é curto e efêmero.
- [ ] Confirmar que logs não contêm chave, áudio bruto ou token.
- [ ] Confirmar que tool arguments da voz passam por Zod.
- [x] Confirmar que IA não produz datas derivadas, scores, viabilidade ou dinheiro.
- [x] Confirmar que alerta usa números do payload determinístico.
- [x] Confirmar autorização humana antes de abrir canal externo do replano.
- [ ] Se o bot existir, confirmar que token não aparece no cliente e repetição não duplica envio.

### R3 — Caminhos manuais

- [ ] Texto natural online: relato → confirmação → plano sem tentar voz.
- [x] Formulário offline: preenchimento → confirmação → plano sem chamar IA.
- [ ] Voz online: relato → resumo → confirmação falada → plano.
- [ ] Correção por voz depois do resumo invalida confirmação.
- [ ] Permissão de microfone negada termina pelo texto.
- [ ] Realtime desconectado preserva o draft.
- [x] OpenAI indisponível usa recuperação rotulada.
- [x] Open-Meteo indisponível usa fixture rotulada.
- [ ] Cada um dos três municípios funciona offline.
- [x] Evento digitado produz replano.
- [ ] Evento falado exige confirmação e produz o mesmo contrato.
- [x] Envio exige autorização separada.
- [ ] WhatsApp abre com mensagem codificada corretamente.
- [ ] Telegram abre com mensagem e link codificados corretamente.
- [ ] Se o bot existir, repetir idempotency key não duplica envio.
- [ ] Console do navegador sem erro crítico.
- [ ] Layout principal utilizável em tela de celular.

### R4 — Claims e proveniência

- [x] UI diz “protótipo” e “não substitui ZARC ou orientação agronômica”.
- [x] Resolução regional não é apresentada como precisão do talhão.
- [x] Dados reais, cache e fixtures aparecem com rótulos diferentes.
- [ ] Fonte, período, variáveis e hash aparecem no resultado.
- [ ] Financeiro diz “usando as premissas fornecidas”.
- [x] Nenhuma copy promete lucro ou prevê produtividade exata.
- [x] Atribuições e licenças aparecem no README.
- [x] Ativos reaproveitados e de terceiros estão listados.

Concluído quando: revisor independente não encontra P0 ou P1.

## Fase 9 — deploy, documentação e apresentação

### P1 — README e operação

- [x] Explicar promessa e limite do produto.
- [x] Listar requisitos e versões.
- [x] Documentar `.env.example` sem valores reais.
- [x] Documentar `npm ci`, `npm run dev` e `npm run check`.
- [x] Documentar APIs externas e fallback.
- [x] Documentar período fixo das 41 safras.
- [x] Documentar função objetivo e P20.
- [x] Documentar canais de envio e quais são opcionais.
- [x] Documentar origem dos ativos e dados.

### P2 — Deploy

- [x] Executar build de produção local.
- [ ] Configurar variáveis server-only na Vercel.
- [ ] Publicar preview.
- [ ] Executar caminho textual no preview.
- [ ] Executar voz em HTTPS no preview.
- [ ] Confirmar URL pública do resultado compartilhável.
- [ ] Manter demonstração local preparada caso o deploy falhe.

### P3 — Roteiro de três minutos

- [x] 0:00–0:35 — relato por voz.
- [x] 0:35–0:55 — resumo e confirmação por voz.
- [x] 0:55–1:30 — plano, baseline e evidência das 41 safras.
- [x] 1:30–1:55 — explicar candidatos × 41 sem abrir detalhes demais.
- [x] 1:55–2:20 — evento crítico por voz e confirmação.
- [x] 2:20–2:40 — replano e diff.
- [x] 2:40–2:52 — compartilhar alerta.
- [x] 2:52–3:00 — mostrar fronteira IA versus código e disclaimer.
- [ ] Fazer dois ensaios cronometrados.
- [ ] Gravar vídeo curto com caminho funcional.
- [ ] Conferir links do repositório, demo e vídeo.
- [ ] Criar tag da demonstração somente com gate verde.

## Ordem de execução resumida

```text
K0 decisões humanas
→ K1 scaffold
→ S1 schemas
→ S2 fixtures de contrato
→ paralelo:
    A1 dados + motor
    B1 IA + voz + confirmação
    C1 frontend com mocks
→ I1 integração até plano real
→ paralelo:
    D2 replano + diff
    N1 notificações
    O1 fallbacks
→ I2 evento até envio
→ opcional: XT Telegram Bot API
→ R1/R2/R3/R4 revisão
→ P1/P2/P3 documentação, deploy e demo
```

## Regra de corte se o tempo acabar

- [ ] Cortar primeiro envio automático pelo Telegram Bot.
- [ ] Cortar explicação gerada pela IA.
- [ ] Cortar histórico interativo.
- [ ] Não cortar confirmação por voz ou botão.
- [ ] Não cortar texto natural nem formulário como entradas independentes.
- [ ] Não cortar dataset de 41 safras/cache preparado.
- [ ] Não cortar baseline versus candidatos.
- [ ] Não cortar motor determinístico.
- [ ] Não cortar replano e diff.
- [ ] Não cortar compartilhamento sem credencial.
- [ ] Não cortar caminho offline claramente rotulado.

## Produto final — definição de pronto

- [ ] Tela inicial mostra claramente tudo que o produtor precisa informar.
- [ ] Produtor completa a operação por voz em português.
- [ ] O mesmo fluxo funciona por texto natural e por formulário desde o primeiro acesso.
- [ ] Sistema mostra o que entendeu e permite editar.
- [ ] Município/UF são resolvidos antes do cálculo.
- [ ] Produtor confirma por voz ou botão.
- [ ] Edição posterior exige nova confirmação.
- [ ] Sistema usa exatamente 41 safras completas.
- [ ] Motor gera baseline e múltiplos candidatos válidos.
- [ ] Cada candidato possui 41 resultados históricos.
- [ ] Recomendação segue ranking documentado e reproduzível.
- [ ] Todos os números são rastreáveis ao payload.
- [ ] Evento por voz/texto exige confirmação.
- [ ] Replano preserva o original e mostra diff auditável.
- [ ] Evento crítico não envia alerta sem autorização separada.
- [ ] `wa.me`/Web Share funcionam sem credencial.
- [ ] WhatsApp, Telegram e Web Share funcionam sem credencial.
- [ ] Telegram Bot funciona somente se a extensão e suas credenciais estiverem prontas.
- [ ] Três municípios funcionam sem rede.
- [ ] `npm run check` está verde com saída fresca.
- [ ] Não existem segredos no cliente ou no repositório.
- [ ] Não existem P0/P1 abertos.
- [ ] Dois ensaios de três minutos foram concluídos.
- [ ] README, vídeo, repositório e demo estão acessíveis.
