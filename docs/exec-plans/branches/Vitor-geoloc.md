# VITOR-GEOLOC-01 — experimento de cadastro territorial

Status: implementado e verificado por Vitor e isolado na branch `cadastro/terrorio`
em 19/08/2026. A branch deriva do trabalho validado em `Vitor`; merge automático na
`main` continua fora do escopo.

## Objetivo e aceite

Validar uma nova vertical em `/territorio` na qual o produtor:

1. pesquisa cidade, bairro ou endereço no mundo;
2. navega e aproxima uma imagem real de satélite;
3. desenha o perímetro informado da propriedade;
4. cria, edita e movimenta talhões internos;
5. cadastra título, cultura, descrição e data por talhão;
6. consulta previsão de sete dias usando o centroide exato da área selecionada;
7. recebe apenas sinais operacionais determinísticos e mantém o cadastro no navegador.

Revisão meteorológica de 19/08/2026:

- a interface deixa explícito que o centroide seleciona uma célula de modelo, não uma
  medição feita dentro do talhão;
- condição WMO, acumulado de chuva, probabilidade, faixa térmica, ET₀ e rajadas aparecem
  em cartões legíveis, mantendo os valores recebidos no payload;
- trocar ou mover a área invalida visualmente a previsão anterior;
- os alertas continuam sendo heurísticas determinísticas do protótipo, sem prescrição
  agronômica.

O experimento não muda `FarmOperationInput`, o planejador ou os contratos congelados.
Antes de integrar na `main`, o time precisa aprovar a mudança do MVP e cortar escopo de
custo equivalente, porque mapas desenhados constam como não objetivo no MVP atual.

## Origem dos ativos e dados

- Construído pelo time: editor territorial, persistência local, normalização da previsão,
  sinais determinísticos, UI e integração das fontes.
- Terceiros: MapLibre GL JS e Turf.js.
- Imagem global: EOX / Copernicus Sentinel-2 Cloudless 2025, CC BY-NC-SA 4.0.
- Imagem aproximada: Esri World Imagery; as fontes e licenças variam por localização.
- Elevação: Mapzen Terrain Tiles no AWS Open Data.
- Busca: OpenStreetMap Nominatim, somente após envio explícito do formulário.
- Previsão: Open-Meteo Forecast API.

O uso demonstrado é não comercial. Produção comercial exige revisão e possível troca das
camadas EOX/Esri. O polígono é informado pelo usuário e não representa CAR, matrícula ou
limite fundiário oficial.

## Verificação

- Automatizada: `npm ci`, `npm run check` (19 arquivos, 90 testes) e `npm run build`, todos verdes em 19/08/2026.
- Manual no build de produção: busca por Sorriso/MT → seleção do resultado → desenho da
  fazenda → desenho e movimentação de talhão → título/cultura/descrição/data → 3D → clima
  pelo centroide → invalidação da previsão após mover → recarregar página.
- Persistência comprovada após recarregar: fazenda, talhão, título, cultura, descrição e
  data `2025-09-20` permaneceram no cadastro local.
- Previsão ao vivo comprovada: sete dias, coordenada, condição WMO, chuva, probabilidade,
  temperatura, ET₀, rajadas, fonte, fuso e disclaimer renderizados.
- Console do navegador: nenhum erro registrado durante o aceite final.

## Handoff

- Task / status: `VITOR-GEOLOC-01` — implemented and verified.
- Changed: cadastro territorial persistente, mapa 2D/3D e previsão auditável por centroide.
- Evidence: comandos e jornada manual acima.
- Contract impact: nenhum; `FarmOperationInput` e o motor permanecem inalterados.
- Remaining risks: licenças EOX/Esri para uso comercial e decisão humana sobre merge na `main`.
- Next ready node: revisão/merge pelo orquestrador, se o experimento for aceito no MVP.
