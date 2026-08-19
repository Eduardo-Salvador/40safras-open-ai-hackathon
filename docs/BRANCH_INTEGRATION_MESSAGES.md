# Mensagens de integração por branch

Regra comum: não avisar apenas “subi”. Enviar `READY + SHA do commit + npm run check +
exports/payload final + limitações`. Eduarco integra somente um SHA explicitamente pronto.

## Pedro — motor analítico

```text
Pedro, para eu integrar seu motor no backend sem quebrar contrato, confirma por favor:

1. Qual SHA está READY para integração? A branch ainda tem trabalho em andamento ou esse SHA é estável?
2. As assinaturas públicas finais são buildPlan(FarmOperationInput, HistoricalDataset) -> PlanResult e buildReplan(FarmOperationInput, HistoricalDataset, FieldEvent) -> ReplanResult?
3. O motor valida exatamente 41 safras e gera exatamente 41 historicalOutcomes por plano/candidato?
4. inputHash e datasetHash são determinísticos e independentes de relógio, rede e IA?
5. IDs de talhões e lotes de semente são preservados; lote sem id é rejeitado?
6. Baseline, candidatos, limite de 100, P20 nearest-rank, desempate e financeiro estão cobertos por testes?
7. O PlanResult atual já expõe toda evidência que o front precisa para comparar baseline x recomendado, ou falta campo no schema congelado?
8. Replan mantém before intacto, produz after e reasons determinísticos para cada mudança?
9. Alguma premissa ainda está provisória? Se sim, liste para o backend/UI rotular.
10. Envie saída do npm run check e tempo do caso canônico.

Não altere APIs, schemas, dados externos ou UI. Se precisar mudar contrato, avise antes de commitar para congelarmos juntos.
```

## Vitor — dados externos

```text
Vitor, preciso deste handoff para ligar dados ao backend sem adaptar no escuro:

1. Qual SHA está READY para integração?
2. Confirma a decisão ERA5 no lugar de ERA5-Land e qual source/proveniência exata será retornada?
3. A saída pública final continua sendo HistoricalDatasetSchema? Qual função/export o backend chama?
4. O contrato compartilhado atual tem 41 records {season, rainWindowDaysFromStart}; as quatro séries diárias completas ficam internas ao adapter/cache ou você precisa propor mudança de schema?
5. Existem exatamente 41 safras únicas/completas, sem null, com timezone e unidades validadas?
6. Quais variáveis são exigidas: precipitation_sum, et0_fao_evapotranspiration, temperature_2m_min e temperature_2m_max? Como cada uma entra no resumo consumido pelo Pedro?
7. Live, cache e fixture são rotulados sem misturar dado real e sintético?
8. Quais são os três municípios offline, seus ibgeCode e hashes/proveniência?
9. Geocoding retorna ambiguidade para escolha ou seleciona automaticamente? Não pode escolher silenciosamente.
10. Falha/timeout/rate limit retorna fixture somente para município preparado?
11. Envie npm run check, lista de fixtures reais e exemplo JSON final.

Não altere planner, API, UI ou schema sozinho. Qualquer incompatibilidade com HistoricalDataset deve parar e voltar para freeze.
```

## Murilo — frontend e demo

```text
Murilo, o backend v1 está documentado em docs/API_CONTRACT.md. Para sua integração, confirma:

1. Qual SHA/estado do front está pronto para conectar às APIs?
2. Você consegue adicionar login simples usando POST /api/auth/login e cookie HttpOnly (fetch com credentials: include)?
3. Voz, texto e formulário convergem para o mesmo FarmOperationInput sem cálculo duplicado na UI?
4. Toda edição incrementa draftVersion e solicita novo token em POST /api/confirmations?
5. Botão e voz chamam o mesmo POST /api/plan; a UI nunca calcula datas, P20, finanças ou hashes?
6. Realtime usa connectRealtimeVoiceSession, inicia mutado e preserva draft quando microfone/rede falhar?
7. A tela mostra source=openai|fixture|recovery e dataset live/cache/fixture/real sem esconder fallback?
8. Depois do plano, a UI chama POST /api/analyses e lista GET /api/analyses?
9. Reanálise salva usa POST /api/analyses/:id/replan depois de confirmação do evento?
10. O diff mostra before/after/reason e mantém o plano anterior visível?
11. Compartilhamento usa somente payload determinístico; nenhum número é criado no componente?
12. Quais estados ainda faltam: 401, 409 token obsoleto, OpenAI offline, Realtime offline, clima offline e resultado inválido?
13. Envie evidência desktop 1366x768, mobile, teclado/foco e caminho de três minutos.

Não altere APIs, schemas, motor, dados ou credenciais. Se o contrato estiver ambíguo, me chama antes de criar adaptação no componente.
```
