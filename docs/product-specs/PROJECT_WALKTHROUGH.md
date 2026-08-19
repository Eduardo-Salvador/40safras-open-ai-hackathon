# Quarenta Safras — explicação canônica do projeto

Este documento explica, em linguagem direta, o que o produto faz e como será construído.
Ele complementa o `MVP.md`, mas não o substitui como contrato de escopo. Quando surgir
uma explicação ambígua em outro documento, prevalecem o MVP para requisitos, a arquitetura
para fronteiras técnicas e este walkthrough para o entendimento ponta a ponta.

## O produto em uma frase

O Quarenta Safras transforma as restrições reais de uma fazenda em um plano de plantio
auditável, testa esse plano contra 41 safras históricas e o refaz quando a realidade do
campo muda.

## A jornada do produtor

### 1. A tela explica o que precisa ser informado

Antes de pedir áudio ou texto, a aplicação mostra a lista necessária:

- município e UF;
- data prevista de início;
- área total;
- talhões e respectivas áreas;
- quais talhões são elegíveis para safrinha;
- sementes/lotes disponíveis e seus ciclos;
- capacidade de plantio em hectares por dia;
- meta de milho safrinha;
- premissas financeiras, quando usadas.

O produtor escolhe entre três entradas igualmente importantes:

```text
Falar
Escrever livremente
Preencher formulário
```

Todos os modos atualizam o mesmo rascunho. É possível começar falando, corrigir no
formulário e complementar por texto sem perder dados. O formulário escreve diretamente
nos schemas; ele não precisa chamar IA.

### 2. A IA organiza voz e texto natural

Ao receber voz ou texto natural, a IA identifica os valores informados, campos ausentes e
ambiguidades. Ela pode perguntar o que falta, mas não pode inventar coordenadas, datas,
scores, viabilidade ou dinheiro.

O resultado é um `OperationDraft` visível e editável. Ele ainda não pode entrar no motor.

### 3. O município é resolvido

A IA pode entender “Sorriso, Mato Grosso”, mas as coordenadas vêm do adaptador de
geocoding. Se houver mais de uma opção, a aplicação mostra as alternativas e o produtor
escolhe. Nenhuma seleção ambígua é feita silenciosamente.

### 4. O produtor confirma

A tela mostra o resumo. Na voz, o agente também lê município, área, talhões, sementes,
ciclos, capacidade e meta. O produtor confirma falando ou usando o botão.

A confirmação pertence a uma versão específica do rascunho. Qualquer edição posterior
invalida a confirmação e exige uma nova. Voz, texto e formulário chegam ao mesmo
`ConfirmedFarmOperation`.

### 5. A aplicação carrega 41 safras

Depois da confirmação, a aplicação consulta o histórico regional do município e normaliza
o período fixo de 1º de julho de 1985 a 30 de junho de 2026:

```text
1985/86 até 2025/26 = exatamente 41 safras
```

O dataset usa precipitação, ET0, temperaturas e umidade superficial do solo. Uma resposta
parcial é rejeitada. Para a demonstração, três municípios têm fixtures com fonte e
proveniência, permitindo o caminho offline.

### 6. O motor gera planos candidatos

Um candidato não é uma safra. É uma decisão operacional completa:

- ordem dos talhões;
- lote de soja atribuído a cada talhão;
- datas derivadas da capacidade diária;
- talhões que seguem para milho;
- perfil de milho utilizado.

O baseline usa a ordem normal informada pelo produtor. Com até quatro talhões, o motor
gera as permutações, combina lotes válidos, remove equivalentes e limita o conjunto a 100
candidatos.

Exemplo:

```text
baseline: T1/S105 → T2/S90 → T3/S90
candidato A: T1/S90 → T2/S90 → T3/S105
candidato B: T2/S90 → T1/S90 → T3/S105
```

Combinações que excedem sementes, usam milho em talhão inelegível ou violam bloqueios são
eliminadas antes da simulação.

### 7. Cada candidato enfrenta as mesmas 41 safras

```text
até 100 candidatos × 41 safras = até 4.100 simulações
```

Para cada candidato e safra, o motor:

1. transporta mês/dia do plano para o ano histórico;
2. calcula os dias de plantio pela capacidade em ha/dia;
3. aplica o ciclo da cultivar de soja;
4. calcula a liberação de cada talhão;
5. encontra a primeira data possível para o milho;
6. avalia chuva no estabelecimento;
7. avalia a maior sequência de dias secos;
8. avalia a relação entre precipitação e ET0 durante o ciclo;
9. calcula a área de milho viável;
10. registra se a meta foi atingida.

Os limites climáticos ficam em perfis configurados e testados, não escondidos no código.
Sem validação agronômica, aparecem como premissas do protótipo e não como ZARC.

### 8. O motor escolhe o vencedor

Cada candidato produz 41 resultados. O ranking é determinístico:

1. maior área de milho P20;
2. mais safras atingindo a meta;
3. mais safras viáveis;
4. melhor resultado financeiro P20 usando as premissas fornecidas;
5. menor término operacional;
6. chave estável para desempate.

Com 41 resultados, o P20 nearest-rank é o nono menor valor. A IA não participa do
ranking e a interface não recalcula os números.

### 9. A aplicação mostra a recomendação e sua prova

A tela mostra baseline versus recomendado, sequência, datas, sementes, área de milho P20,
meta atingida em X de 41 safras, financeiro declarado, fonte, período, cache e hashes. O
agente pode falar uma conclusão curta, mas todo número falado precisa existir no payload.

### 10. Um evento de campo provoca replano

O produtor informa por voz, texto ou formulário algo como:

> Choveu muito e os talhões 2 e 3 estão bloqueados até sexta-feira.

Isso cria um `FieldEventDraft`. A aplicação mostra e, na voz, lê o evento estruturado.
Somente depois da confirmação o motor:

1. congela o que já foi executado;
2. representa o que está em andamento;
3. aplica bloqueios, sementes e capacidade alterada;
4. gera candidatos para o trabalho restante;
5. simula novamente nas mesmas 41 safras;
6. produz o novo plano e um diff auditável.

O original permanece visível. Cada mudança tem motivo, antes, depois e impacto.

### 11. O produtor compartilha o resultado

Depois de confirmar separadamente que deseja compartilhar, a aplicação cria uma mensagem
determinística a partir do replano. O caminho principal usa opções sem credencial:

- Web Share API;
- link `wa.me` do WhatsApp;
- link `t.me/share/url` do Telegram;
- copiar texto.

Envio automático pelo Telegram Bot é apenas uma extensão e nunca bloqueia o core.

## Como será construído

### Fase 0 — decisões

Congelar municípios, contratos de entrada, perfis de cultura, limites climáticos, baseline,
geração de candidatos, ranking, financeiro, confirmação e tipos de evento.

### Fase 1 — scaffold

Criar uma aplicação Next.js/TypeScript, instalar Zod, SDKs OpenAI e Vitest, configurar
scripts e fazer `npm run check` funcionar.

### Fase 2 — schemas e fixtures

Criar os schemas executáveis e fixtures válidas/inválidas. Essa é a barreira de
sincronização; nenhuma frente paralela começa antes do contrato congelar.

### Fase 3 — primeira onda paralela

Três trilhas usam arquivos separados:

```text
dados + motor
IA + voz + confirmação
frontend com payloads mockados
```

### Fase 4 — primeira integração

Conectar voz, texto e formulário ao mesmo draft confirmado, carregar 41 safras e chegar a
um plano real.

### Fase 5 — segunda onda paralela

```text
replano + diff
compartilhamento
fallbacks de IA/offline
```

### Fase 6 — integração final

Conectar evento confirmado, replano, diff e compartilhamento. Executar os mesmos caminhos
online e offline.

### Fase 7 — revisão e entrega

Rodar contratos, motor, dados, IA e compartilhamento; auditar segredos e claims; ensaiar
duas vezes; preparar README, vídeo, deploy e demonstração local.

O checklist granular, a ordem, as dependências e os critérios de conclusão ficam em
`pendencia.md` na raiz.

## OpenAI SDK versus OpenAI Agents SDK

Os dois pacotes têm responsabilidades diferentes.

### `openai`

É o cliente oficial direto das APIs da OpenAI. No Quarenta Safras ele roda no servidor e
é usado para:

- chamar a Responses API para estruturar texto;
- pedir explicação opcional de um payload pronto;
- criar o client secret efêmero da sessão Realtime.

Ele envia uma requisição, recebe uma resposta e deixa a aplicação controlar o fluxo.

### `@openai/agents`

É uma camada de execução para agentes. No Quarenta Safras ela é usada especificamente na
experiência de voz no navegador:

- cria `RealtimeAgent` e `RealtimeSession`;
- gerencia WebRTC, microfone e reprodução de áudio;
- mantém turnos e contexto da conversa;
- trata interrupções;
- expõe ferramentas que atualizam/confirmam o draft.

O Agents SDK usa a API da OpenAI por baixo. Ele não substitui o pacote `openai` no
servidor e não calcula nada do domínio.

### Fronteira completa

```text
texto natural → openai/Responses → OperationDraft
voz → @openai/agents/Realtime → OperationDraft
formulário → Zod diretamente → OperationDraft
OperationDraft confirmado → motor TypeScript puro → PlanResult
```

Nenhum SDK OpenAI calcula datas, P20, viabilidade, ranking, financeiro ou diff.

## Resumo final

O Quarenta Safras é um planejador operacional de soja e milho safrinha. O produtor informa
sua operação por voz, texto ou formulário; confirma o entendimento; e um motor
determinístico cria diferentes sequências de talhões e sementes. Cada sequência é testada
nas mesmas 41 safras climáticas históricas. O sistema recomenda a opção mais robusta de
acordo com um ranking documentado. Quando o campo muda, o produtor confirma o evento, o
motor refaz somente o trabalho restante e mostra exatamente o que mudou e por quê.
