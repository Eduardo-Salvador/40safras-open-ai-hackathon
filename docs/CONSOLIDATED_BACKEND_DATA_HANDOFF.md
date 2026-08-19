# Handoff consolidado — backend e dados

Branch de entrega: `consolidado-back-dados`.

Objetivo: oferecer ao Murilo uma única base de backend, IA, motor analítico e dados para
integração visual na `main`, sem trazer ou sobrescrever os arquivos de frontend das
branches experimentais.

## Conteúdo consolidado

- contratos Zod congelados e fixtures compartilhadas;
- autenticação de usuário único e análises salvas;
- confirmação versionada, plano e replano;
- OpenAI Responses com retry/fallback e Realtime com segredo efêmero;
- motor determinístico do Pedro, integrado pelo merge `f524ed2`;
- ERA5, IBGE, cache e três fixtures municipais do Vitor, integrados em `873fd4d`;
- correção de seleção municipal em `680918a`;
- busca territorial por Nominatim;
- previsão de sete dias por Open-Meteo Forecast;
- normalização WMO, chuva, probabilidade, temperatura, ET0 e rajadas;
- sinais meteorológicos determinísticos e disclaimer de proveniência.

Fonte da verdade de transporte: `docs/API_CONTRACT.md`.
Fonte da verdade de domínio: `src/domain/schemas.ts`.

## Rotas para o frontend

```text
POST /api/auth/login
GET  /api/auth/session
POST /api/auth/logout
GET  /api/locations
POST /api/climate
GET  /api/territory-search
GET  /api/weather
POST /api/parse-brief
POST /api/parse-event
POST /api/realtime-session
POST /api/confirmations
POST /api/plan
POST /api/replan
POST /api/explain-plan
GET|POST /api/analyses
GET /api/analyses/:id
POST /api/analyses/:id/replan
```

## Regras que o Murilo deve preservar

1. Voz, texto e formulário convergem para o mesmo `FarmOperationInput`.
2. Nenhum plano ou replano acontece sem confirmação válida da versão atual.
3. A UI não recalcula datas, P20, finanças, ranking, hash ou diff.
4. `/api/climate` contém as 41 safras históricas usadas pelo motor.
5. `/api/weather` é previsão operacional de sete dias e não alimenta o planner.
6. Busca territorial sempre mostra opções e exige seleção; nunca usa silenciosamente o
   primeiro resultado do Nominatim.
7. Fonte, `real`, `cached`, fallback e disclaimers permanecem visíveis.
8. Falha de voz preserva draft e oferece texto/formulário.
9. A chave longa da OpenAI nunca chega ao navegador; somente o segredo efêmero.

## Ambiente e segredos

O arquivo `.env.local` não faz parte do Git e será entregue ao Murilo por canal externo.
O frontend não deve copiar seus valores para variáveis `NEXT_PUBLIC_*`.

Nomes esperados, sem valores:

```text
OPENAI_API_KEY
OPENAI_MODEL
OPENAI_REALTIME_MODEL
APP_LOGIN_USER
APP_LOGIN_PASSWORD
SESSION_SECRET
```

## Fora desta branch

- páginas, componentes e estilos do editor territorial experimental;
- dependências MapLibre/Turf e assets de mapa;
- alterações visuais da branch do Murilo;
- qualquer arquivo `.env` real;
- merge ou push na `main`.

O Murilo decide a composição visual e realiza a integração final na `main`.

## Evidências antes do handoff

- `npm run check` verde;
- `npm run build` verde;
- Nominatim ao vivo retornando município explícito;
- Open-Meteo Forecast ao vivo retornando sete dias e timezone;
- ERA5 ao vivo retornando 41 safras e as quatro séries;
- Responses retornando `source: openai` após ativação de billing;
- Realtime criando segredo efêmero para `gpt-realtime-2.1-mini`.
