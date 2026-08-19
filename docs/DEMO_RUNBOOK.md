# Ensaio de demonstracao — 3 minutos

Objetivo: provar uma jornada funcional, deterministica e recuperavel. A narracao deve
explicar o valor enquanto a tela mostra evidencia; nao gastar tempo descrevendo stack.

## Antes de abrir a sala

1. Rodar `npm run demo:check` e exigir resultado verde.
2. Rodar `npm run build` depois da ultima integracao.
3. Abrir o app, autenticar e permitir o microfone.
4. Manter texto e formulario preparados como contingencia da voz.
5. Confirmar que a fixture offline de 41 safras esta disponivel.
6. Deixar uma analise pronta apenas como contingencia; a demo principal cria uma nova.

## Roteiro cronometrado

### 0:00–0:25 — problema e promessa

"O produtor precisa decidir a ordem de plantio com estoque, capacidade e risco de chuva,
e precisa recalcular rapidamente quando o campo muda. O Quarenta Safras transforma esse
relato em um plano auditavel e replanejavel."

### 0:25–1:05 — entrada e confirmacao

1. Informar a operacao por voz.
2. Mostrar o rascunho estruturado, campos ausentes e correcoes.
3. Confirmar explicitamente o resumo.
4. Se a voz falhar, trocar para o texto preparado sem reiniciar a jornada.

Evidencia verbal: voz, texto e formulario geram o mesmo contrato e o mesmo `inputHash`.

### 1:05–1:45 — plano e evidencia historica

1. Gerar o plano.
2. Mostrar sequencia, datas, P20, margem e as 41 safras.
3. Mostrar fonte, modelo, cache/fixture e aviso quando houver fallback.
4. Salvar a analise autenticada.

Evidencia verbal: a IA interpreta e explica; os numeros sao calculados pelo motor
deterministico e verificados contra o payload.

### 1:45–2:30 — evento e replano

1. Dizer: "O talhao B ficou bloqueado por alagamento".
2. Confirmar o evento.
3. Mostrar antes, depois e os codigos de motivo.
4. Destacar que o executado permanece congelado.

### 2:30–3:00 — fechamento

1. Abrir o preview de compartilhamento.
2. Resumir: entrada natural, confirmacao segura, 41 safras, plano deterministico e replano.
3. Encerrar com o valor: decisao explicavel em minutos, inclusive com contingencia offline.

## Contingencias

| Falha | Acao imediata | Evidencia preservada |
|---|---|---|
| microfone negado ou Realtime indisponivel | usar texto preparado | mesmo draft e `inputHash` |
| OpenAI Responses indisponivel | usar fixture/recovery rotulado | motor e confirmacao continuam |
| clima ao vivo indisponivel | usar cache/fixture de 41 safras | fonte e `real` ficam visiveis |
| compartilhamento nativo indisponivel | abrir preview/WhatsApp | plano permanece salvo |
| rede da apresentacao cair | executar toda a jornada local | versao funcional continua |

## Perguntas provaveis dos jurados

- **A IA calcula as datas e margens?** Nao. Ela interpreta e explica; o motor puro calcula.
- **Como impedem uma acao errada por voz?** Resumo, versao do draft e token curto de
  confirmacao; edicao invalida o token anterior.
- **Por que 41 safras?** Para expor distribuicao historica e P20, sem fingir certeza por
  uma unica media.
- **O que acontece offline?** Entradas manuais, motor, fixture climatica, plano e replano
  continuam; a interface rotula a proveniencia.
- **O modelo pode inventar numeros?** A explicacao e verificada; numero ausente do plano
  faz a resposta ser descartada em favor da explicacao deterministica.
