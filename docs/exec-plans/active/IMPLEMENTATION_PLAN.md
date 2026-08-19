# Plano de implementacao - Quarenta Safras

Status: proposta executavel para congelamento no kickoff.

## 1. Resultado do produto

O fluxo principal e:

```text
produtor ve o que precisa informar e escolhe voz, texto natural ou formulario
-> sistema/IA atualiza um rascunho estruturado comum
-> sistema resolve municipio e campos ausentes
-> agente le o resumo por voz e a tela mostra os mesmos dados
-> produtor confirma por voz ou pelo botao
-> sistema carrega 41 safras climaticas completas
-> motor gera planos candidatos deterministicamente
-> cada candidato e simulado nas mesmas 41 safras
-> motor ranqueia os candidatos e recomenda um plano
-> produtor informa um evento de campo por voz ou texto
-> agente le o evento estruturado e pede nova confirmacao
-> motor recalcula somente o que ainda pode mudar
-> tela mostra o diff e o impacto
-> produtor pode compartilhar o alerta/replano por WhatsApp, Telegram ou Web Share
```

A IA interpreta e comunica. Datas, candidatos, viabilidade, ranking, metricas,
dinheiro, diff e conteudo numerico das notificacoes pertencem ao codigo deterministico.

### Tela inicial e modos de entrada

A primeira tela deve mostrar, antes de qualquer gravacao ou envio, que o produtor precisa
informar: municipio/UF, data inicial, area, talhoes, sementes e ciclos, capacidade de
plantio, meta de safrinha e premissas financeiras. Ao lado dessa lista, deve oferecer tres
acoes igualmente visiveis: `Falar`, `Escrever livremente` e `Preencher formulario`.

Os tres modos atualizam o mesmo `OperationDraft`. O produtor pode comecar falando, corrigir
no formulario e complementar por texto, ou usar apenas um modo. Texto/formulario nao sao
uma recuperacao de falha da voz; funcionam desde o primeiro acesso. A IA e usada para voz
e texto natural. O formulario estruturado escreve diretamente no schema, sem chamada de IA.

## 2. O que significa um plano candidato

Um candidato nao e uma das 41 safras. Um candidato e uma decisao operacional completa:

- ordem em que os talhoes serao plantados;
- lote/cultivar de soja atribuido a cada talhao;
- datas derivadas da capacidade em hectares por dia;
- quais talhoes seguem para milho safrinha;
- perfil de milho usado nos talhoes de safrinha.

As 41 safras sao 41 cenarios climaticos historicos usados para testar a mesma decisao.

```text
                     safra 1  safra 2  ...  safra 41
candidato baseline      R1       R2           R41
candidato A             R1       R2           R41
candidato B             R1       R2           R41
candidato C             R1       R2           R41
```

Cada celula gera area de milho viavel, atingimento da meta e resultado financeiro sob
as premissas declaradas. O ranking usa o resumo das 41 celulas de cada linha.

### Exemplo concreto

Entrada:

```text
T1: 300 ha, prioridade safrinha
T2: 200 ha, prioridade safrinha
T3: 250 ha, somente soja
S90: soja de ciclo 90 dias, disponivel para 500 ha
S105: soja de ciclo 105 dias, disponivel para 250 ha
capacidade: 100 ha/dia
meta: 500 ha de milho
```

Alguns candidatos validos:

```text
baseline: T1/S105 -> T2/S90 -> T3/S90
A:        T1/S90  -> T2/S90 -> T3/S105
B:        T2/S90  -> T1/S90 -> T3/S105
C:        T1/S90  -> T3/S105 -> T2/S90
```

O candidato A pode liberar T1 mais cedo; o B pode liberar primeiro um talhao menor; o C
pode atrasar T2. O motor nao escolhe isso por intuicao: simula A, B, C e o baseline nas
mesmas 41 safras e compara seus resultados.

### Geracao limitada de candidatos no MVP

1. Usar a ordem informada pelo produtor como baseline.
2. Permitir no maximo quatro talhoes no caminho canonico.
3. Gerar todas as permutacoes dos talhoes: no maximo `4! = 24`.
4. Para cada ordem, gerar atribuicoes validas dos lotes de soja.
5. Descartar atribuicoes que excedam a area disponivel de um lote.
6. Descartar candidatos que nao respeitem talhoes bloqueados ou inelegiveis para milho.
7. Remover candidatos equivalentes por uma chave canonica.
8. Limitar o conjunto final a 100 candidatos, usando ordenacao estavel.
9. Simular cada candidato nas 41 safras.

Com 100 candidatos, o motor executa no maximo 4.100 simulacoes de safra. Isso cabe em
funcoes TypeScript simples e nao exige solver ou servico Python.

### Ranking congelado

O melhor plano e escolhido nesta ordem:

1. maior area de milho P20;
2. maior numero de safras em que a meta do produtor foi atingida;
3. maior numero total de safras climaticamente viaveis;
4. maior resultado financeiro P20 usando as premissas fornecidas;
5. menor data final da operacao;
6. chave canonica em ordem alfabetica para desempate estavel.

O P20 usa nearest-rank. Com 41 valores ordenados do pior para o melhor, e o nono valor:

```ts
const index = Math.ceil(0.20 * 41) - 1;
```

## 3. Contratos que devem ser congelados primeiro

Separar o dado falado do dado pronto para calculo:

```ts
type OperationDraft = {
  municipalityQuery?: { name?: string; state?: string };
  totalAreaHa?: number;
  planterCapacityHaPerDay?: number;
  startDate?: string;
  fields: Array<{
    id: string;
    areaHa?: number;
    secondCropEligible?: boolean;
    priority?: number;
  }>;
  seedLots: Array<{
    id: string;
    crop: "soybean" | "corn";
    cycleDays?: number;
    availableAreaHa?: number;
  }>;
  secondCropTargetAreaHa?: number;
  finance?: {
    soybeanMarginPerHa?: number;
    cornMarginPerHa?: number;
    operatingCostPerDay?: number;
  };
  missingFields: string[];
  ambiguities: string[];
};
```

Depois de resolver o municipio e confirmar:

```ts
type ConfirmedFarmOperation = {
  draftVersion: string;
  confirmation: {
    method: "voice" | "button";
    confirmedAt: string;
    confirmationToken: string;
  };
  municipality: Municipality;
  operation: FarmOperationInput;
};
```

Invariantes Zod:

- soma dos talhoes igual a area total;
- IDs de talhoes e lotes unicos;
- capacidade e ciclos maiores que zero;
- disponibilidade de soja suficiente para a area planejada;
- meta de milho nao maior que a soma dos talhoes elegiveis;
- municipio resolvido, com nome, UF, latitude, longitude e timezone;
- nenhuma confirmacao aceita para uma versao antiga do rascunho.

## 4. Confirmacao por voz e por tela

A voz participa da coleta e tambem da validacao. O modelo nao pode criar sozinho o fato
de que houve confirmacao.

### Operacao

1. `update_operation_draft` recebe argumentos da conversa e valida com Zod.
2. O frontend mostra o rascunho sincronizado e permite correcao manual.
3. O municipio e resolvido antes da confirmacao final.
4. `request_operation_confirmation` congela `draftVersion` e emite um token curto.
5. O agente le municipio/UF, area, talhoes, lotes, ciclos, capacidade e meta.
6. O produtor responde por voz, por exemplo: "sim, confirmo esse plano de entrada".
7. O agente chama `confirm_operation` com `draftVersion` e token.
8. O servidor aceita somente se a versao ainda for atual e a fala afirmativa ocorreu
   depois do resumo.
9. O botao "Confirmar dados" executa o mesmo contrato como alternativa.
10. Qualquer edicao posterior invalida o token e exige nova confirmacao.

Registrar apenas metodo, horario, versao e um trecho curto da transcricao. Nao persistir
audio bruto.

### Evento de campo

Aplicar o mesmo protocolo:

```text
fala/texto do evento
-> FieldEventDraft
-> resumo falado + card visual
-> confirmacao por voz ou botao
-> ConfirmedFieldEvent
-> /api/replan
```

O resumo deve dizer quais talhoes foram afetados, desde quando, ate quando, alteracao de
sementes e severidade. Sem confirmacao, nao ha replano nem envio externo.

## 5. Dados climaticos e simulacao

### APIs

- Open-Meteo Geocoding para nome/UF, coordenadas, elevacao e timezone.
- Open-Meteo Historical Weather com ERA5-Land para o periodo fixo.
- OpenAI Responses API para extrair `OperationDraft` e `FieldEventDraft`.
- OpenAI Realtime API com Agents SDK JS e WebRTC para voz.
- `wa.me` para compartilhamento basico sem credencial.
- Link de compartilhamento do Telegram, sem chave.
- Telegram Bot API somente como extensao de envio automatico, se sobrar tempo.

Periodo canonico:

```text
1985-07-01 a 2026-06-30
= 41 safras completas, de 1985/86 a 2025/26
```

Variaveis diarias:

```text
precipitation_sum
et0_fao_evapotranspiration
temperature_2m_min
temperature_2m_max
soil_moisture_0_to_7cm_mean
```

O adaptador deve rejeitar resposta parcial. O planner recebe exatamente 41 safras
normalizadas ou nao executa.

### Regra configuravel de viabilidade

Parametros ficam em `data/crops`, nunca escondidos no algoritmo:

```ts
type CropClimateProfile = {
  cycleDays: number;
  establishmentWindowDays: number;
  minEstablishmentRainMm: number;
  maxDrySpellDays: number;
  minCyclePrecipitationToEt0Ratio: number;
};
```

Para cada candidato e safra:

1. transportar mes/dia do inicio do plano para o ano historico;
2. calcular duracao de plantio por `ceil(areaHa / capacityHaPerDay)`;
3. somar o ciclo da soja para obter a liberacao do talhao;
4. iniciar o milho na primeira data operacional depois da soja;
5. testar chuva na janela de estabelecimento;
6. testar maior sequencia de dias secos;
7. testar a razao entre precipitacao e ET0 durante o ciclo;
8. somar a area de milho dos talhoes que passam em todas as regras.

Sem validacao de especialista, a interface chama esses limites de "premissas climaticas
do prototipo" e nao de recomendacao agronomica ou ZARC.

## 6. Replano e evento critico/desastre

O replano recebe um evento confirmado:

```ts
type FieldEvent = {
  effectiveDate: string;
  severity: "operational" | "critical";
  type: "field_blocked" | "excess_rain" | "seed_loss" | "machine_failure" | "other";
  blockedFieldIds: string[];
  blockedUntil?: string;
  seedDeltaAreaHaByLot: Record<string, number>;
  notes: string[];
};
```

Passos:

1. congelar tarefas concluidas antes de `effectiveDate`;
2. manter tarefas em andamento como estado explicito;
3. aplicar bloqueios, data de liberacao e alteracao de estoque;
4. gerar novos candidatos apenas para o trabalho restante;
5. simular novamente nas mesmas 41 safras;
6. produzir `before`, `after` e diff deterministico;
7. gerar uma notificacao a partir do `ReplanResult`, sem pedir numeros a IA.

Codigos de diff:

```text
FIELD_BLOCKED
FIELD_RELEASE_DELAYED
SEED_STOCK_CHANGED
MACHINE_CAPACITY_CHANGED
FIELD_REORDERED
CORN_AREA_P20_CHANGED
TARGET_PROBABILITY_CHANGED
FINANCIAL_P20_CHANGED
```

## 7. Integracoes de envio em caso critico

Um evento critico nao deve disparar mensagem automaticamente com base apenas na
interpretacao da IA. Primeiro o evento e confirmado, o replano e calculado e o produtor
confirma "Enviar alerta" e os destinatarios.

Contrato unico:

```ts
type OutboundAlert = {
  replanId: string;
  severity: "critical";
  channel: "whatsapp_share" | "telegram_share" | "web_share" | "telegram_bot";
  recipient?: string;
  subject: string;
  message: string;
  resultHash: string;
  disclaimer: string;
};
```

Rotas:

```text
POST /api/notifications/preview
POST /api/notifications/send       # apenas extensao Telegram Bot
```

Prioridade de implementacao:

1. Core: copiar mensagem e usar Web Share API.
2. Core: criar link `wa.me` com texto codificado.
3. Core: criar `https://t.me/share/url` com texto e link codificados.
4. Extensao: Telegram Bot API para envio automatico depois de autorizacao explicita.

Os links de compartilhamento nao exigem servidor, conta Business ou chave. Se o bot for
implementado, ele usa `NotificationGateway`; falha no envio nunca desfaz o replano.

Seguranca:

- canal e destinatario do bot precisam ser mostrados antes do envio;
- repetir a mesma `idempotencyKey` nao envia novamente pelo bot;
- `TELEGRAM_BOT_TOKEN` fica somente no servidor;
- logs nao incluem tokens nem texto de audio;
- o produto nao se apresenta como servico oficial de emergencia.

## 8. Plano de implementacao por tarefas

### Passo 0 - kickoff e proveniencia

- escolher municipio canonico e dois backups;
- confirmar perfis de soja e milho;
- registrar origem dos limites climaticos;
- confirmar quais credenciais de envio existem;
- criar scaffold Next.js/TypeScript e scripts.

### Passo 1 - contratos

Arquivos:

```text
src/domain/schemas.ts
data/crops/
tests/contracts.test.ts
```

Congelar drafts, confirmacoes, dataset, candidatos, resultados, eventos, replano e
alertas. Nenhuma frente paralela comeca antes dos testes validos e invalidos passarem.

### Passo 2 - fixtures

- 41 safras para tres municipios;
- relato completo e relato incompleto;
- confirmacao por voz preparada;
- evento de chuva/bloqueio;
- `PlanResult`, `ReplanResult` e `OutboundAlert` esperados.

### Passo 3 - municipio, clima e cache

Implementar geocoding, selecao sem ambiguidade, ERA5-Land, normalizacao, hashes, cache e
fallback preparado. Testar exatamente 41 safras, unidades e resposta parcial.

### Passo 4 - motor

Implementar nesta ordem:

```text
validacao de perfis
-> geracao de candidatos
-> cronograma operacional
-> simulacao de uma safra
-> simulacao de 41 safras
-> P20 e metricas
-> financeiro
-> ranking
```

Testar capacidade, estoque, ciclos, bloqueios, P20, desempates e repeticao deterministica.

### Passo 5 - tela orientadora e entradas por texto/formulario

Mostrar a lista do que precisa ser informado e as tres opcoes de entrada. Implementar
`/api/parse-brief`, municipio, texto natural, formulario campo a campo, troca de modo sem
perda, confirmacao por botao e `/api/plan`. Texto e formulario funcionam sem tentar voz.

### Passo 6 - voz com validacao

Implementar client secret efemero, `RealtimeAgent`, `RealtimeSession`, push-to-talk,
transcricao, sincronizacao do draft, resumo falado, token de confirmacao e fallback para
texto. Testar confirmacao valida, negacao, correcao depois do resumo e versao obsoleta.

### Passo 7 - replano

Implementar parse do evento, confirmacao por voz/botao, congelamento do executado, nova
geracao de candidatos e diff com codigos de motivo.

### Passo 8 - envio

Implementar preview, Web Share, `wa.me` e link de compartilhamento do Telegram, todos sem
credencial. Ligar Telegram Bot API somente se o core estiver verde e houver tempo.

### Passo 9 - integracao e prova

Demonstrar:

```text
voz -> draft -> confirmacao por voz -> plano real
texto/formulario -> o mesmo draft -> confirmacao -> o mesmo plano real
-> evento critico por voz -> confirmacao por voz -> replano
-> diff -> preview -> envio/compartilhamento
```

Repetir o mesmo caminho por texto e sem rede usando fixtures identificadas.

## 9. Onde o tempo sera gasto

| Frente | Esforco estimado | Principal entrega |
|---|---:|---|
| Motor e testes | 2,5-3 h/pessoa | candidatos x 41 safras, ranking e numeros corretos |
| Clima/cache/fixtures | 1,5-2 h/pessoa | dataset completo e caminho offline |
| Voz e confirmacao | 1,5-2 h/pessoa | estado conversacional, token e fallback |
| UI/integracao | 1,5-2 h/pessoa | jornada unica sem duplicar calculos |
| Replano/diff | 1-1,5 h/pessoa | antes/depois auditavel |
| Compartilhamento | 30-45 min | preview, WhatsApp, Telegram e Web Share sem chave |
| Revisao e ensaio | 45-60 min | caminho online/offline e falhas |

As partes mais arriscadas sao o motor e a confirmacao por voz. Integracao de envio real
fica atras do caminho sem credencial para nao se tornar ponto unico de falha.

## 10. Criterios de conclusao

- `npm run check` passa em menos de 60 segundos;
- voz, texto natural e formulario produzem o mesmo contrato confirmado;
- editar o draft invalida a confirmacao anterior;
- cada candidato tem exatamente 41 resultados;
- baseline e recomendado usam o mesmo dataset;
- o ranking e reproduzivel e explica o desempate;
- evento por voz exige confirmacao antes do replano;
- alerta exige confirmacao separada antes de sair da aplicacao;
- se o bot for implementado, repetir idempotency key nao duplica o envio;
- tres municipios completam plano e replano offline;
- nenhum numero exibido ou enviado existe apenas em prosa gerada pela IA;
- fonte, periodo, premissas e limitacoes aparecem na tela.

## 11. Cortes se o tempo acabar

1. envio automatico pelo Telegram Bot;
2. financeiro detalhado;
3. explicacao gerada pela IA;
4. historico interativo.

Nao cortar: voz, texto natural, formulario, confirmacao, 41 safras, motor deterministico,
baseline versus candidatos, replano, diff, compartilhamento sem credencial e caminho offline.
