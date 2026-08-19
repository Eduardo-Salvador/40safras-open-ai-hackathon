# Quarenta Safras

Quarenta Safras é um protótipo de apoio à decisão para ordenar o plantio de soja e a
segunda safra de milho. O produtor informa a operação por voz, texto livre ou formulário,
confirma o rascunho estruturado e recebe uma comparação reproduzível entre a ordem usual
e a recomendada. Um evento de campo pode gerar um replano com diff auditável.

O produto **não substitui ZARC nem orientação agronômica, financeira, de crédito ou de
seguro**. Os dados climáticos têm resolução regional; não são medições do talhão.

## O que funciona

- entrada por voz em português via OpenAI Realtime/WebRTC, com texto e formulário como
  caminhos independentes e fallback;
- Structured Outputs na Responses API para estruturar operação e evento, sem delegar
  datas derivadas, viabilidade ou dinheiro ao modelo;
- geocodificação de municípios brasileiros e recuperação climática ao vivo;
- três fixtures offline preparadas: Sorriso/MT, Rio Verde/GO e Luís Eduardo Magalhães/BA;
- exatamente 41 safras, de `1985-07-01` a `2026-06-30`;
- baseline, candidatos determinísticos, ranking, P20 nearest-rank, finanças e hashes;
- evento de campo, replano e diff antes/depois;
- compartilhamento por `wa.me`, Telegram Share e Web Share/cópia, sempre após ação humana.

## Execução local

Requisitos: Node.js 24 LTS (registrado em `.nvmrc`) e npm.

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Abra `http://localhost:3000`. Sem `OPENAI_API_KEY`, o fluxo textual usa rascunhos
preparados e rotulados; clima e planejamento continuam funcionando com fixtures offline.

Verificação completa:

```bash
npm run check
npm run build
```

## Variáveis de ambiente

```dotenv
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.6-terra
OPENAI_REALTIME_MODEL=gpt-realtime-2.1-mini
APP_BASE_URL=http://localhost:3000
```

`OPENAI_API_KEY` é lida somente em rotas de servidor. A sessão Realtime entrega ao
navegador apenas um client secret efêmero. Nunca use uma variável
`NEXT_PUBLIC_OPENAI_API_KEY`. Os modelos são configuráveis porque o acesso depende do
projeto OpenAI usado no evento.

## Fronteira IA × código

A IA interpreta linguagem natural e devolve JSON validado por Zod. O código
determinístico resolve município, gera datas, simula candidatos, calcula viabilidade,
percentis, valores financeiros e o diff. Uma saída inválida da IA recebe no máximo uma
nova tentativa; depois disso a interface conserva o texto e oferece um fallback editável.

O P20 usa nearest-rank: com 41 observações, é o nono menor resultado. O ranking compara,
nesta ordem, área P20, frequência de meta atingida, safras viáveis, financeiro P20,
término operacional e chave canônica estável. Valores financeiros usam as margens e o
custo opcional informados pelo usuário; não são promessa de lucro.

## Clima, cache e proveniência

O caminho ao vivo usa Open-Meteo Geocoding e Historical Weather Archive. O modelo é
explicitamente **ERA5**, não ERA5-Land. Na consulta validada em 2026-08-19, ERA5-Land
devolveu séries obrigatórias incompletas ou com `null`; ERA5 forneceu as 41 safras
completas. Normalização e testes rejeitam séries ausentes, incompletas ou com `null`.

A umidade superficial do solo não é consumida pelo contrato atual. Ela não foi
substituída nem sintetizada: permanece indisponível no caminho ERA5 aprovado e exigirá
uma decisão separada de fonte/modelo, schema e tratamento antes de entrar no motor.

Cada resultado identifica fonte, período, modo ao vivo/cache/fixture e hashes. Uma falha
de rede só usa fixture para municípios preparados e nunca mistura dados ao vivo com
valores sintéticos.

Fontes e bibliotecas de terceiros:

- [Open-Meteo](https://open-meteo.com/) para geocodificação e acesso ao arquivo ERA5;
- [OpenAI API](https://developers.openai.com/api/docs/) para Responses/Structured Outputs
  e Realtime;
- [MapLibre GL JS](https://maplibre.org/maplibre-gl-js/docs/) e
  [Turf](https://turfjs.org/) na experiência experimental de território;
- links nativos do WhatsApp e Telegram e Web Share API para compartilhamento.

A interface e o comportamento foram reconstruídos para este projeto. Mockups e documentos
de referência foram usados apenas como insumos; nenhum HTML de referência foi copiado.
Não há imagens ou ilustrações de terceiros apresentadas como criação da equipe.

## Estrutura e documentação

- `src/domain/`: motor, schemas, ranking, finanças e replano;
- `src/data/`: geocodificação, ERA5, normalização, cache e fixtures;
- `src/app/api/`: fronteiras de clima, linguagem e sessão Realtime;
- `tests/`: contratos, dados, motor, IA, APIs e compartilhamento;
- [`docs/product-specs/MVP.md`](docs/product-specs/MVP.md): escopo canônico;
- [`docs/product-specs/PROJECT_WALKTHROUGH.md`](docs/product-specs/PROJECT_WALKTHROUGH.md):
  explicação ponta a ponta;
- [`docs/exec-plans/active/HACKATHON_PLAN.md`](docs/exec-plans/active/HACKATHON_PLAN.md):
  decisões e evidências;
- [`pendencia.md`](pendencia.md): checklist operacional.

`/territorio` é uma experiência geoespacial complementar. O caminho canônico e verificável
da demonstração continua sendo `/`.
