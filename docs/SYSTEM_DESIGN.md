# Quarenta Safras — system design

Status: decisão canônica de produto e interação para o MVP.

Este documento registra como o Quarenta Safras transforma o escopo definido no MVP em
uma experiência coerente. Toda proposta ou implementação de tela, estado, transição ou
integração visível ao produtor deve usar este arquivo como referência.

## Hierarquia das referências

Em caso de conflito, use esta ordem:

1. `docs/product-specs/MVP.md` define o que pertence ao produto e os critérios de aceite.
2. Este documento define como a jornada, os estados e as fronteiras aparecem ao usuário.
3. `docs/ARCHITECTURE.md` define contratos e responsabilidades técnicas.
4. `docs/product-specs/PROJECT_WALKTHROUGH.md` explica o fluxo em linguagem comum.
5. Mockups e protótipos exploram possibilidades; não alteram decisões canônicas sozinhos.
6. O código implementa essas decisões e não se torna especificação por acidente.

Uma alteração de escopo exige mudança no MVP. Uma alteração de experiência ou estado
exige atualização deste documento e registro no log de decisões abaixo.

## Objetivo da experiência

O produtor não deve encarar um dashboard nem um formulário extenso. A aplicação conduz
uma decisão por vez, preserva tudo o que já foi informado e mostra claramente quando está
coletando, interpretando, confirmando, calculando ou apresentando um resultado.

Princípios obrigatórios:

- uma tarefa principal por tela;
- uma única etapa expandida por vez; avançar substitui o conteúdo atual;
- linguagem direta, curta e em português;
- progressão visível, com contexto suficiente para o produtor saber onde está;
- voz como ação principal e dominante no primeiro acesso;
- texto livre e formulário disponíveis pelo convite secundário “Prefere digitar?”;
- troca de modo sem perda do rascunho;
- perguntas somente sobre dados ausentes ou ambíguos;
- revisão separada da autorização para calcular;
- nenhum cálculo de domínio na interface ou no modelo de linguagem;
- plano, evidência histórica, origem dos dados e limitações sempre distinguíveis;
- nenhum rascunho de resultado, prova histórica ou número do plano antes do cálculo;
- autenticação progressiva: começar, informar, revisar, confirmar e calcular nunca pedem
  conta; a identificação é solicitada no fim, somente quando o produtor escolhe registrar
  um imprevisto, para guardar o plano que servirá de referência ao replano;
- na demonstração, a identificação é um único acesso com e-mail e senha; o campo visível
  diz “E-mail”, mas envia esse valor como `username` ao contrato já implementado;
- o histórico e o replanejamento partem de plano salvo. Como a demonstração usa uma única
  conta compartilhada, ela não deve prometer separação entre produtores;
- falha de voz ou rede nunca apaga o trabalho nem bloqueia texto e formulário.

## Jornada canônica

### Etapa 1 — Relatar a operação

Antes do microfone, a primeira etapa oferece um contexto breve do que o produtor pode
relatar: local (município/UF), área e talhões, data de início e capacidade diária,
sementes e ciclos, e meta de milho. Esse contexto orienta a fala sem exigir uma ordem,
sem listar campos editáveis e sem transformar a entrada em formulário. As premissas
financeiras só são solicitadas se faltarem na coleta progressiva.

Em seguida, mostra a voz como única ação dominante:

```text
Toque para falar

Prefere digitar? Clique aqui
```

O convite para digitar revela texto livre e formulário como alternativas. Elas não
competem visualmente com o áudio no primeiro contato, mas continuam funcionais mesmo se
o microfone ou a rede falhar. Depois da escolha, somente a superfície do modo selecionado
ocupa o foco principal. O produtor pode trocar de modo a qualquer momento; todos escrevem
no mesmo `OperationDraft`.

### Etapa 2 — Completar e resolver

A aplicação identifica o que foi compreendido e pede apenas o que falta. A interação é
sequencial: uma pergunta ou ambiguidade principal por vez, acompanhada do progresso dos
dados encontrados.

Nesta etapa também ocorre a resolução do município. Nome e UF escolhidos, coordenadas,
origem e condição `live`, `cache` ou `fixture` permanecem explícitos. Nenhuma localização
ambígua é selecionada silenciosamente.

### Etapa 3 — Revisar o rascunho

A aplicação apresenta um resumo curto, escaneável e editável do mesmo draft produzido
pelos três modos de entrada. A versão visual e a versão falada devem conter os mesmos
fatos essenciais.

Campos ausentes, inválidos ou ambíguos impedem o avanço. Editar qualquer valor cria uma
nova versão do rascunho e invalida uma confirmação anterior.

### Etapa 4 — Confirmar e calcular

Revisar e confirmar são ações distintas. A aplicação pede autorização explícita por
botão ou voz e associa essa autorização à versão atual do rascunho.

Somente o `ConfirmedFarmOperation` validado pode atravessar a fronteira determinística.
Depois da confirmação, a interface comunica os estados de carregamento do clima e do
planejamento sem inventar estimativas nem exibir resultados parciais inválidos.

### Etapa 5 — Consultar e executar o plano

O plano prioriza a decisão operacional: ordem dos talhões, lotes, datas e próximo passo.
A prova aparece junto da recomendação, sem transformar a experiência em dashboard:

- baseline versus recomendado;
- área de milho P20 e meta;
- meta atingida em X de 41 safras;
- resultado financeiro com as premissas declaradas;
- fonte, período, estado de cache e hash do resultado;
- limitações do protótipo.

O próximo fluxo disponível é registrar um imprevisto. O evento repete a mesma lógica:
relatar, completar, revisar, confirmar, replanejar e mostrar um diff auditável. O plano
original permanece visível e imutável.

Depois que o cálculo integral termina, a última ação contextual é **“Aconteceu um
imprevisto?”**. Ela explica que, para guardar este plano como referência e refazê-lo após
um problema, a pessoa precisa entrar. Somente esse toque abre a identificação simples.
O campo da tela é **“E-mail”**, para ser familiar, e a senha fica logo abaixo. A integração
envia ambos como `username` e `password`, sem tentar transformar o e-mail em outro dado.
Ao autenticar, a aplicação salva o plano atual e então revela o relato do imprevisto.
Cancelar ou falhar nessa identificação mantém o resultado aberto para consulta e
compartilhamento, mas não o grava nem promete histórico. A aplicação não pede conta ao
iniciar, durante a coleta ou para calcular.

Quando o plano estiver salvo, a mesma superfície confirma qual plano está sendo usado e
abre um novo relato por voz como ação principal. A pessoa grava ou fala o que aconteceu;
texto continua disponível como alternativa se o microfone ou o reconhecimento de voz
falhar. A aplicação mostra o texto entendido, a data e os talhões afetados para correção.
Somente uma confirmação explícita transforma esse rascunho em evento e autoriza o replano.
O plano calculado permanece como referência e cada replano fica ligado a ele. Um plano não
salvo não inicia o fluxo de replano persistido: login e salvamento são concluídos como
parte da intenção de registrar o problema. A copy não chama o histórico de “meus planos”
nem sugere contas individuais enquanto o acesso for single-user. O áudio bruto não é
gravado no histórico do plano.

## Estrutura do layout

Cada etapa usa o mesmo shell para reduzir esforço cognitivo:

1. cabeçalho curto com produto, contexto da operação e estado compreensível do plano
   (“ainda não salvo” ou “plano salvo”);
2. indicador de progresso com nome e posição da etapa;
3. uma superfície principal com uma pergunta, decisão ou resultado dominante;
4. ações consistentes de voltar e continuar;
5. estados secundários e proveniência próximos do dado ao qual pertencem.

O shell funciona como uma única superfície. Quando uma etapa termina, ela não permanece
aberta abaixo da próxima: o conteúdo central é substituído e o indicador de progresso
marca o que foi concluído. O stepper comunica posição, mas não autoriza saltar etapas ou
contornar validação e confirmação.

A etapa `Plano` é a única que pode renderizar recomendação, baseline, histórico de 41
safras, métricas, finanças, replano ou compartilhamento. Antes dela, a interface mostra
somente coleta, dados estruturados, revisão, confirmação e estados de carregamento.

Em telas pequenas, a ordem permanece a mesma e os blocos são empilhados. A implementação
não deve depender de hover. Ações primárias precisam ter alvo de toque confortável,
teclado, foco visível e rótulo textual. Cor nunca é o único indicador de estado.

### Linguagem visual

A referência aprovada é a imagem conceitual gerada para o Quarenta Safras na revisão de
produto de 2026-08-19. Ela é referência visual, não um asset incorporado automaticamente
ao produto. A interface usa:

- papel cru e creme como base clara predominante;
- verde-floresta escuro para marca, títulos e ações principais;
- mostarda e ocre para progresso, colheita e destaques;
- azul-petróleo dessaturado para histórico climático e comparações;
- argila para alertas e situações que pedem atenção.

O tema padrão não deve ser uma interface marrom-escura. Texturas podem inspirar o fundo,
mas áreas de leitura, formulários, resumos e tabelas permanecem limpas, com contraste alto
e separação clara entre rótulo, valor e ação. Cor reforça significado e nunca substitui o
texto.

## Modelo de estados

O layout em etapas não substitui a máquina de estados do produto. A relação canônica é:

| Etapa visível | Estados de produto | Condição de saída |
|---|---|---|
| Relatar | `collecting` | existe um rascunho preservado |
| Completar | `collecting`, `resolving_location` | campos obrigatórios válidos e município resolvido |
| Revisar | `reviewing` | produtor terminou a revisão |
| Confirmar | `confirmed`, `loading_climate`, `planning` | versão confirmada e resultado integral validado |
| Plano | `planned`, `save_requested`, `authenticating`, `saving_plan`, `saved`, `save_failed`, `loading_history` | plano apresentado; salvamento concluído ou recuperável; histórico disponível na sessão única da demonstração |
| Imprevisto | `event_review`, `replanning`, `alert_preview` | evento confirmado, diff validado e compartilhamento preparado |

Transições inválidas devem ser bloqueadas. A interface nunca deve inferir conclusão apenas
porque o usuário navegou visualmente até uma etapa posterior.

## Fronteiras do sistema

```text
voz ou texto natural
→ IA organiza linguagem
→ OperationDraft

formulário
→ validação direta
→ OperationDraft

OperationDraft revisado
→ confirmação explícita vinculada à versão
→ ConfirmedFarmOperation
→ dados climáticos completos e motor determinístico
→ PlanResult
→ interface e explicação falada usam somente o payload recebido
→ escolha voluntária de salvar
→ `POST /api/auth/login` com `{ username, password }`
→ cookie HttpOnly assinado de 8 horas
→ `POST /api/analyses` e arquivo local `.data/analyses.json`
→ consulta/replano do plano salvo pela mesma sessão de demonstração
```

A IA pode interpretar, fazer perguntas e explicar. Ela não calcula datas, P20, scores,
viabilidade, ranking, finanças ou diferenças do replano. Componentes visuais também não
recalculam esses valores.

Autenticação e persistência são uma fronteira separada do cálculo. O navegador pode manter
o resultado recém-calculado apenas para a sessão. Ao salvar, ele usa os contratos de
`origin/Eduarco`: login com `{ username, password }`, consulta de sessão, logout, análises
e replano de análise. O servidor valida a sessão e grava o plano em
`.data/analyses.json`, com operação confirmada, dataset, resultado, hashes, proveniência,
horários e replanos; áudio bruto não faz parte desse registro.

Esta fronteira é suficiente apenas para a demonstração: `APP_LOGIN_USER` e
`APP_LOGIN_PASSWORD` configuram um único acesso, e qualquer pessoa com essas credenciais
enxerga o mesmo arquivo de análises. Não há perfil de produtor, ownership por registro nem
isolamento multi-tenant. O arquivo local não é durável em filesystem efêmero de Vercel.
Retenção, exclusão, migração para banco persistente e contas individuais continuam
pendentes para produção.

## Falhas e recuperação

- Microfone negado: manter o draft e destacar texto e formulário.
- Realtime desconectado: preservar transcrição e permitir continuar sem voz.
- IA indisponível: permitir formulário direto ou fixture claramente identificada.
- Geocoding ambíguo: solicitar escolha de município e UF.
- Clima indisponível: usar cache/fixture identificado ou erro recuperável.
- Resultado inválido ou parcial: não mostrar números incompletos como recomendação.
- Edição após confirmação: invalidar confirmação e cálculo derivados.
- Identificação cancelada ou indisponível ao salvar: manter o plano calculado aberto,
  informar “não foi salvo” e permitir tentar novamente; nunca criar plano anônimo no
  histórico.
- Sessão expirada: manter o resultado aberto, solicitar nova identificação apenas se a
  pessoa voltar a salvar, consultar histórico ou replanejar.
- Em demonstração compartilhada: avisar nos materiais internos que o histórico é comum;
  não prometer sigilo ou separação de planos por produtor.

## Critérios para revisar uma implementação

Uma alteração de frontend só está alinhada quando:

- mostra a voz como ação principal e o caminho “Prefere digitar?” logo abaixo;
- orienta brevemente, antes do microfone, os tópicos úteis para o relato sem exibir um
  formulário ou exigir o preenchimento deles;
- mantém texto livre e formulário independentes de voz e disponíveis em um clique;
- preserva o mesmo draft ao trocar de modo ou enfrentar uma falha;
- apresenta uma tarefa principal por etapa;
- mantém somente a etapa atual expandida, sem acrescentar a próxima abaixo da anterior;
- pergunta apenas o que falta ou precisa ser desambiguado;
- separa revisão, confirmação e cálculo;
- impede transições sem os dados e confirmações necessários;
- não duplica cálculo determinístico na UI;
- não antecipa prova histórica, métricas ou rascunho do plano antes do cálculo confirmado;
- apresenta plano, prova, proveniência e limitações sem formato de dashboard;
- pede identificação somente depois do resultado e do toque em “Aconteceu um imprevisto?”,
  salvando o plano antes de abrir o relato do problema;
- depois do login, faz da voz a ação principal do imprevisto, mostra o que foi entendido,
  permite corrigir e exige confirmação antes de replanejar;
- rotula o campo como “E-mail”, envia-o como `username` e usa somente os contratos já
  implementados de autenticação e análises;
- mostra se o plano está salvo e deixa explícito, quando histórico estiver visível, que a
  demonstração usa uma conta única e arquivo local;
- funciona por teclado, em mobile e sem depender apenas de cor ou áudio.

## Log de decisões

| ID | Data | Decisão | Motivo |
|---|---|---|---|
| SD-001 | 2026-08-19 | Adotar jornada guiada em etapas | Reduzir carga cognitiva e deixar explícita a próxima ação |
| SD-002 | 2026-08-19 | Manter voz, texto e formulário com igual destaque | Substituída por SD-007 após revisão com o product owner |
| SD-003 | 2026-08-19 | Mostrar apenas o modo escolhido após a seleção | Evitar três interfaces concorrendo na mesma tela |
| SD-004 | 2026-08-19 | Fazer perguntas ausentes uma por vez | Substituir formulário extenso por coleta progressiva |
| SD-005 | 2026-08-19 | Separar revisão de confirmação e cálculo | Evitar que interpretação ou navegação autorize o motor |
| SD-006 | 2026-08-19 | Usar uma superfície dominante em vez de dashboard | Priorizar a decisão operacional do produtor |
| SD-007 | 2026-08-19 | Fazer da voz a única ação dominante e colocar “Prefere digitar?” abaixo | Priorizar o comportamento esperado sem remover os caminhos independentes de texto e formulário |
| SD-008 | 2026-08-19 | Contextualizar brevemente o relato antes do microfone | Orientar local, área/talhões, data/capacidade, sementes/ciclos e meta de milho sem competir com a voz nem converter a primeira etapa em formulário |
| SD-009 | 2026-08-19 | Trocar o conteúdo na mesma superfície a cada etapa e revelar resultados somente no Plano | Evitar uma página que cresce para baixo e preservar a sequência relato, dados, revisão, confirmação e cálculo |
| SD-010 | 2026-08-19 | Usar autenticação progressiva apenas ao salvar um plano confirmado | Não bloquear o primeiro cálculo; permitir que plano, histórico e replanejamento persistidos pertençam ao produtor autenticado, com autorização no servidor |
| SD-011 | 2026-08-19 | Adotar a paleta clara da imagem conceitual gerada | Aproximar o produto de papel cru, verde-floresta, ocre, azul-petróleo e argila, com leitura simples e alto contraste |
| SD-012 | 2026-08-19 | Implementar a demonstração com login único por e-mail/senha e arquivo local de análises | Substitui a premissa de provedor/ownership de SD-010: a UI envia e-mail como `username`, reutiliza os contratos de `origin/Eduarco`, mantém login só ao salvar e não alega multi-tenancy ou durabilidade em Vercel |
| SD-013 | 2026-08-19 | Pedir login no fim, quando a pessoa escolhe registrar um imprevisto | Mantém o primeiro plano aberto; autentica e salva esse plano como referência antes de liberar o relato e o replano persistido |
| SD-014 | 2026-08-19 | Repetir voz, revisão e confirmação no fluxo de imprevisto | O produtor explica a mudança do seu jeito, confere o entendimento e só então autoriza o replano e a comparação com o plano anterior |
