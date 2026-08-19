# Quarenta Safras — contrato de API v1

Status: implementado na branch `Eduarco`. O schema executável em
`src/domain/schemas.ts` é a fonte da verdade. Este documento explica transporte e
sequência; não autoriza frontend, dados ou motor a recalcular ou alterar contratos.

## Regras comuns

- Base local: `http://localhost:3000/api`.
- JSON em todas as requisições e respostas, salvo `GET` sem corpo.
- Datas: `YYYY-MM-DD`; horários: ISO 8601.
- Campos e IDs são sensíveis a maiúsculas/minúsculas.
- `draftVersion` muda após qualquer edição. Token de versão anterior deixa de valer.
- Voz, texto e formulário devem produzir o mesmo `FarmOperationInput`.
- O frontend nunca calcula P20, datas, finanças, ranking, hash ou replano.
- `clientSecret` Realtime é efêmero e não deve ser salvo ou registrado.
- `OPENAI_API_KEY`, senha e `SESSION_SECRET` nunca vão para o navegador.
- Para cookies de login, usar `credentials: "include"` no `fetch` quando frontend e API
  não estiverem implicitamente no mesmo contexto.

## Fluxo recomendado

```text
login
-> município
-> clima (41 safras)
-> voz | texto | formulário
-> draft editável
-> confirmação da operação
-> plano determinístico
-> salvar análise
-> evento por voz | texto
-> confirmação do evento
-> reanálise salva
-> diff
```

## Contratos canônicos resumidos

### `FarmOperationInput`

```json
{
  "municipality": {
    "name": "Sorriso",
    "state": "MT",
    "countryCode": "BR",
    "latitude": -12.5453,
    "longitude": -55.7217,
    "timezone": "America/Cuiaba",
    "ibgeCode": "5107925"
  },
  "totalAreaHa": 200,
  "planterCapacityHaPerDay": 50,
  "startDate": "2025-09-15",
  "firstCrop": "soybean",
  "secondCrop": "corn",
  "fields": [
    { "id": "A", "areaHa": 100, "priority": "soy_only" },
    { "id": "B", "areaHa": 100, "priority": "second_crop" }
  ],
  "seedLots": [
    { "id": "S90", "crop": "soybean", "cycleDays": 90, "availableAreaHa": 100 },
    { "id": "S120", "crop": "soybean", "cycleDays": 120, "availableAreaHa": 100 }
  ],
  "secondCropTargetAreaHa": 100,
  "finance": { "soybeanMarginPerHa": 1000, "cornMarginPerHa": 800 }
}
```

Invariantes: soma dos talhões igual à área total; IDs únicos; semente cobre a área;
meta de segunda safra não excede talhões elegíveis; somente soja para milho no MVP.

### `HistoricalDataset`

```json
{
  "location": "Municipality",
  "source": "provedor/modelo/variáveis",
  "seasons": 41,
  "cached": false,
  "real": true,
  "retrievedAt": "2026-08-19T15:00:00.000Z",
  "variables": ["precipitation_sum"],
  "records": [
    { "season": "1985/86", "rainWindowDaysFromStart": 202 }
  ]
}
```

`records` deve conter exatamente 41 itens. O contrato v1 do motor consome o resumo por
safra. Séries diárias completas podem existir no adapter/cache de dados, mas não podem
ser acrescentadas ao contrato compartilhado sem decisão de freeze e testes das quatro
frentes.

### `FieldEvent`

```json
{
  "effectiveDate": "2025-10-01",
  "blockedFieldIds": ["B"],
  "blockedUntil": "2025-10-05",
  "seedDeltaAreaHaByCycle": { "120": -50 },
  "notes": ["chuva forte no talhão B"]
}
```

O evento precisa ter uma mudança efetiva. IDs bloqueados são únicos e
`blockedUntil >= effectiveDate`.

## Autenticação

### `POST /api/auth/login`

```json
{ "username": "demo", "password": "senha-configurada-no-servidor" }
```

Sucesso `200`: define cookie `quarenta_safras_session`, `HttpOnly`, `SameSite=Lax`, por
oito horas.

```json
{ "authenticated": true, "username": "demo" }
```

Erro: `401 { "error": "invalid credentials" }`.

### `GET /api/auth/session`

Sucesso `200`: `{ "authenticated": true, "username": "demo" }`.
Sem sessão: `401 { "authenticated": false }`.

### `POST /api/auth/logout`

Apaga o cookie. Resposta: `{ "authenticated": false }`.

## Município e clima

### `GET /api/locations?q=Sorriso%20MT`

Resposta `200`: `{ "municipality": Municipality }`.

Erros: `400` sem busca; `502` para falha/ambiguidade do adapter. A UI não deve escolher
silenciosamente entre municípios ambíguos.

### `POST /api/climate`

```json
{ "municipality": "Municipality" }
```

Resposta `200`: `{ "dataset": HistoricalDataset }`. O dataset indica `cached`, `real`,
fonte e variáveis. Erros: `400` contrato inválido; `502` falha sem cache/fixture válido.

## IA textual e voz

### `POST /api/parse-brief`

Entrada: `{ "text": "relato do produtor" }`.

```json
{
  "draft": "OperationDraft",
  "source": "openai | fixture | recovery",
  "attempts": 1,
  "warning": "presente quando aplicável",
  "originalText": "presente no recovery"
}
```

`fixture` só aparece para o relato preparado exato e deve ser rotulado na UI.
`recovery` permanece editável e não inventa campos.

### `POST /api/parse-event`

Mesmo contrato de `/parse-brief`, retornando `event: FieldEventDraft`.

### `POST /api/realtime-session`

Entrada: `{ "sessionId": "uuid-ou-id-local" }`.

```json
{
  "clientSecret": "segredo-efemero",
  "expiresAt": 1800000000,
  "model": "gpt-realtime-2.1-mini"
}
```

O frontend deve usar `connectRealtimeVoiceSession` de `src/lib/realtime-client.ts`.
Push-to-talk começa mutado. Falha de microfone/Realtime preserva draft e oferece texto e
formulário.

## Confirmação, plano e replano

### `POST /api/confirmations`

```json
{
  "sessionId": "session-1",
  "subject": "operation | field_event",
  "draftVersion": "operation-v3"
}
```

Resposta `200`:

```json
{
  "draftVersion": "operation-v3",
  "confirmationToken": "token-curto",
  "issuedAt": "ISO-8601",
  "expiresAt": "ISO-8601"
}
```

Solicitar novo token depois de qualquer edição. Nunca persistir o token.

### `POST /api/plan`

```json
{
  "sessionId": "session-1",
  "draftVersion": "operation-v3",
  "confirmationToken": "token-curto",
  "affirmative": true,
  "method": "voice | button",
  "operation": "FarmOperationInput",
  "dataset": "HistoricalDataset"
}
```

Resposta `200`: `{ "draftVersion": "operation-v3", "plan": PlanResult }`.
O token consumido não aparece na resposta. Erros: `400` payload; `409` confirmação;
`500` cálculo/contrato interno.

### `POST /api/replan`

Mesmo envelope de confirmação, acrescido de `event: FieldEvent`. Retorna:

```json
{ "draftVersion": "event-v1", "replan": "ReplanResult" }
```

`ReplanResult` contém `before`, `after`, `event` e `changes[]` com motivo.

### `POST /api/explain-plan`

Entrada: `{ "plan": PlanResult }`.

```json
{
  "explanation": "texto curto",
  "source": "openai | deterministic",
  "warning": "presente quando o verificador rejeitou a resposta da IA"
}
```

Todo número da explicação precisa existir no `PlanResult`.

## Análises salvas — exige login

Persistência local: `.data/analyses.json`. É adequada para demo local/offline, mas não é
durável no filesystem efêmero da Vercel. Para produção/preview persistente, substituir o
adapter por banco sem alterar as rotas.

### `POST /api/analyses`

```json
{
  "title": "Sorriso - plano inicial",
  "operation": "FarmOperationInput",
  "dataset": "HistoricalDataset"
}
```

O servidor recalcula o plano; não aceita números calculados pela UI. Resposta `201`:
`{ "analysis": AnalysisRecord }`.

### `GET /api/analyses`

Resposta `200`: `{ "analyses": AnalysisRecord[] }`.

### `GET /api/analyses/:id`

Resposta `200`: `{ "analysis": AnalysisRecord }`; `404` se não existir.

### `POST /api/analyses/:id/replan`

```json
{
  "sessionId": "session-1",
  "draftVersion": "event-v2",
  "confirmationToken": "token-curto",
  "affirmative": true,
  "method": "voice | button",
  "event": "FieldEvent"
}
```

Usa operação e dataset salvos. Resposta `200`:
`{ "analysis": AnalysisRecord, "replan": ReplanResult }`.

## Códigos de confirmação

- `INVALID_ARGUMENTS`
- `NEGATIVE_CONFIRMATION`
- `TOKEN_NOT_FOUND`
- `TOKEN_MISMATCH`
- `STALE_DRAFT`
- `TOKEN_EXPIRED`

## Checklist do cliente

1. Autenticar e confirmar `/auth/session`.
2. Manter `sessionId` por jornada e incrementar `draftVersion` após edição.
3. Nunca chamar `/plan` ou `/replan` antes de `/confirmations`.
4. Exibir `source`, `cached`, `real` e warnings.
5. Salvar análise somente depois de plano bem-sucedido.
6. Carregar análise por ID para reanálise; não reconstruir números na UI.
7. Em `401`, voltar ao login; em `409`, resumir novamente e pedir confirmação.
8. Em falha de voz, manter texto/formulário funcionais.

## Evidência atual

- Voz, texto e formulário produzem o mesmo `inputHash` quando entregam a mesma operação.
- Confirmação obsoleta, negativa, expirada e reutilizada é rejeitada.
- Plano e replano preservam exatamente 41 outcomes.
- OpenAI indisponível possui recuperação editável/fixture rotulada.
- Explicação com número inventado é descartada.
- Realtime client secret foi validado ao vivo; Responses depende de billing ativo.
