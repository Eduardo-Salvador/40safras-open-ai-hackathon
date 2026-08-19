# Glossário do produtor para explicar o Quarenta Safras

Este documento ensina apenas o necessário para explicar o produto com segurança. Ele não
substitui conhecimento agronômico e não transforma hipóteses do protótipo em recomendações.

## 1. A explicação do produto em 30 segundos

O Quarenta Safras ajuda um produtor de soja que pretende plantar milho na segunda safra.
O produtor conta por voz como é sua operação: município, área, talhões, sementes,
capacidade das máquinas e objetivo de segunda safra. O agente organiza essas informações
e pede confirmação. Depois, um motor matemático compara ordens de plantio usando cerca de
quatro décadas de histórico climático.

O resultado responde:

- qual talhão plantar primeiro;
- quanto da área de milho segunda safra permanece viável nos cenários históricos;
- o que muda se uma máquina parar, um talhão bloquear ou uma semente faltar;
- qual é o impacto financeiro simples usando valores informados pelo produtor.

A frase mais importante é:

> A inteligência artificial entende e explica. O código determinístico calcula.

## 2. A operação da fazenda

### Hectare (ha)

Unidade de área. Um hectare tem 10.000 m², equivalente a um quadrado de 100 por 100
metros. No produto, hectare mede o tamanho total, o tamanho dos talhões e a área destinada
à segunda safra.

### Talhão

Parte da fazenda administrada como uma unidade operacional. Cada talhão pode ter área,
solo, relevo, cultivar, histórico e prioridade diferentes. O Quarenta Safras devolve uma
sequência de talhões porque a fazenda não é plantada inteira ao mesmo tempo.

### Cultura e cultivar

- **Cultura** é a espécie agrícola, como soja ou milho.
- **Cultivar** é um material genético específico dentro da cultura.

Não chame “soja de 105 dias” de nome de cultivar. O correto é dizer que um lote de
semente usa uma cultivar cujo ciclo esperado, nas premissas do produto, é de
aproximadamente 105 dias.

### Ciclo da cultivar

Tempo aproximado necessário para a planta avançar da semeadura até a maturação ou
colheita, conforme a definição usada no dado de entrada. Não é um relógio exato: cultivar,
fotoperíodo, temperatura, água, região, data de semeadura e manejo alteram a duração real.

O produto usa o ciclo como uma premissa operacional declarada, não como garantia da data
de colheita.

### Plantadeira e capacidade operacional

A plantadeira deposita as sementes no solo. A capacidade em **ha/dia** informa quantos
hectares a operação consegue semear por dia. Ela depende de quantidade e largura das
máquinas, velocidade, jornada, abastecimento, deslocamento, solo e clima.

O motor usa a capacidade informada pelo produtor para estimar quando cada talhão pode
começar e terminar. Não deve tratar a capacidade nominal da máquina como capacidade real
sem confirmação.

### Semeadura e plantio

No uso cotidiano, os dois termos costumam aparecer como sinônimos. Tecnicamente,
semeadura é a colocação da semente no solo. Essa data inicia o calendário operacional do
produto.

### Emergência

Momento em que a plântula aparece acima do solo. Na soja, o estádio **VE** corresponde aos
cotilédones acima da superfície. O intervalo entre semeadura e emergência varia com as
condições do solo e do ambiente; o produto não deve fixá-lo silenciosamente em seis dias.

## 3. Soja seguida por milho segunda safra

### Safra ou ano agrícola

Período produtivo que pode atravessar dois anos civis. “Safra 2025/26”, por exemplo,
começa em 2025 e termina em 2026.

### Segunda safra ou safrinha

Segunda cultura plantada na mesma área depois da primeira cultura, dentro do mesmo ano
agrícola. No caminho validado do Quarenta Safras, a sucessão é:

```text
soja -> milho segunda safra
```

“Safrinha” continua comum na fala, mas “milho segunda safra” é mais preciso. O diminutivo
não significa que a produção seja pequena. Hoje, no Brasil, a segunda safra representa a
maior parte da produção de milho.

### Por que a ordem da soja afeta o milho

O milho só pode ser semeado depois que a soja daquele talhão for colhida. Se a soja entra
ou sai tarde, o milho também entra tarde e pode enfrentar condições hídricas menos
favoráveis. Por isso, talhões destinados à segunda safra podem receber prioridade e
cultivares de soja de ciclo adequado às premissas da operação.

O produto não afirma que um plantio tardio “perde a lavoura inteira”. Ele estima
viabilidade histórica conforme regras declaradas e mostra incerteza.

### Soja sem segunda cultura

Área em que o plano considera apenas a soja, sem milho depois. “Soja solteira” pode ser
entendido no uso informal, mas “soja sem segunda cultura” é mais claro para a banca.

### Sequeiro

Sistema dependente principalmente da chuva, sem irrigação para suprir a necessidade
hídrica da cultura. É a condição assumida pelo núcleo do produto. Uma área irrigada exige
outra configuração e não deve receber automaticamente as mesmas regras.

## 4. Fases da soja e clima

### Estádios vegetativos e reprodutivos

A soja usa uma classificação padronizada:

| Grupo | Estádios | Significado simplificado |
|---|---|---|
| Vegetativo | VE, VC, V1 até Vn | Emergência e desenvolvimento de folhas e nós |
| Florescimento | R1-R2 | Início e pleno florescimento |
| Desenvolvimento da vagem | R3-R4 | Formação e desenvolvimento das vagens |
| Desenvolvimento do grão | R5-R6 | Início do enchimento até grão cheio |
| Maturação | R7-R8 | Início até maturação plena |

Não diga que R3-R5 inteiro é “enchimento de grãos”: R3 e R4 ainda são desenvolvimento de
vagem. Também não trate toda fase vegetativa como pouco sensível. A Embrapa destaca dois
períodos hídricos importantes: germinação-emergência e florescimento-enchimento de grãos.

### DAE

**Dias após a emergência.** Pode ser usado para posicionar eventos depois que a planta
emergiu. As fases não acontecem obrigatoriamente no mesmo DAE em toda cultivar e região.
Qualquer janela fixa de DAE usada no protótipo deve aparecer como premissa de configuração.

### Milímetro de chuva (mm)

Um milímetro de chuva equivale a um litro de água por metro quadrado em uma superfície
horizontal. O total de chuva isolado não explica o resultado: distribuição ao longo do
tempo, solo, evapotranspiração e fase da cultura também importam.

### Veranico

Período de pouca ou nenhuma chuva dentro da estação chuvosa. Pode ser relevante mesmo
quando o acumulado total da safra parece normal, principalmente quando coincide com uma
fase sensível. O produto precisa declarar quantos dias e qual limite de chuva definem um
veranico; não existe uma única definição universal para todo contexto.

### Estresse térmico

Prejuízo potencial causado por temperatura inadequada. Não apresente “acima de 34 °C”
como uma verdade universal. Um limite desse tipo depende de cultura, estádio, duração,
umidade e método e deve ser rotulado como parâmetro do protótipo.

### Graus-dia (GDD)

Medida de calor acumulado acima de uma temperatura-base para acompanhar desenvolvimento.
É mais informativa que contar apenas dias corridos, mas depende da temperatura-base, do
método de cálculo e da cultivar. Graus-dia ajudam a estimar fases; não tornam a data de
colheita certa.

### “Fim das águas”

Não é uma variável oficial nem uma data agronômica universal. Se o time usar esse nome,
deve apresentá-lo assim:

> Indicador operacional experimental do Quarenta Safras, calculado com uma regra de chuva
> declarada para comparar anos históricos.

Não diga que ele representa a data exata em que a chuva “para” ou que sozinho sustenta um
ciclo de milho. A regra precisa ser validada com especialista; até lá, é hipótese de
protótipo.

### Safra climática histórica

Sequência de clima que realmente foi observada em um ano passado, normalizada para a
localização regional escolhida. Não é uma simulação aleatória e não é previsão do próximo
ano.

O MVP exige exatamente 41 safras completas. O nome “Quarenta Safras” comunica cerca de
quatro décadas de histórico; na apresentação, prefira dizer “quatro décadas” para evitar
uma discussão inútil sobre a contagem inclusiva.

## 5. Como explicar P20 sem errar

### Mediana

Valor central depois de ordenar os resultados. Metade fica de um lado e metade do outro.
Ela não é necessariamente igual à média.

### Percentil 20 (P20)

Para um indicador em que **maior é melhor**, como área viável ou margem, P20 é o valor no
qual aproximadamente 20% dos resultados históricos ficaram iguais ou abaixo e 80%
ficaram acima.

Forma curta para a apresentação:

> Um resultado conservador observado no lado ruim do histórico, mas não o pior caso.

Evite dizer simplesmente “é o ano ruim que acontece uma vez a cada cinco”. Isso é uma
intuição útil, mas não significa que os anos sejam independentes nem que o próximo evento
tenha exatamente 20% de probabilidade.

Também preste atenção à direção: para prejuízo, atraso ou risco, menor pode ser melhor e o
percentil relevante pode mudar.

### Cenário histórico não é previsão

O motor pergunta “como este plano teria se comportado nesses anos?”. Ele não afirma
“quanto vai produzir no próximo ano”. Para uma previsão de produtividade seriam
necessários modelo validado, backtest temporal, baseline, erro e intervalo de incerteza.

### Score de 0 a 100

Não faz parte do núcleo atual do MVP. Não use score no pitch e não diga que os indicadores
climáticos recebem pesos “descobertos” automaticamente pelo IBGE. Isso pertencia a uma
direção anterior e pode criar a impressão de um modelo agronômico validado que não existe.

## 6. Dinheiro: o que o produto pode afirmar

### Receita bruta

Quantidade estimada vezes preço declarado. Ainda não desconta custos.

### Custo por hectare

Premissa informada pelo usuário. Pode representar apenas custos selecionados e não toda a
contabilidade da fazenda.

### Margem operacional simples

Receita considerada menos os custos considerados pelo cálculo. Não use “lucro” como
sinônimo automático: lucro contábil depende de quais custos, despesas, impostos,
depreciação, financiamento e riscos foram incluídos.

Sempre diga:

> Margem simples usando as premissas fornecidas pelo produtor.

### Margem P20

Percentil 20 dos resultados financeiros históricos calculados com as premissas do
usuário. Não é promessa de ganho, cotação futura ou recomendação financeira.

### Quebra de safra

Expressão usada para redução relevante de produção ou produtividade. Não é um percentual
único e universal. Na apresentação, prefira dizer exatamente qual indicador caiu.

## 7. IBGE e anos análogos são extensão

### PAM e SIDRA

A **Produção Agrícola Municipal (PAM)** do IBGE oferece estatísticas anuais de área,
quantidade produzida, rendimento médio e valor da produção. A tabela 5457 possui série
histórica municipal desde 1974.

O rendimento médio municipal em kg/ha:

- é estatística oficial do município;
- não mede a fazenda específica do usuário;
- mistura diferenças de solo, manejo, tecnologia, cultivares e clima;
- não deve ser descrito como o que “de fato aconteceu naquela lavoura”.

No projeto atual, IBGE é uma extensão opcional. Se implementado, a tendência tecnológica
precisa ser tratada antes de comparar produtividade e clima, e amostra, anos faltantes e
ausência de sinal precisam ficar visíveis.

### Anos análogos

Anos históricos com indicadores climáticos parecidos segundo uma distância ou regra
declarada. São evidência comparativa, não previsão. O produto pode mostrar a faixa
observada nesses anos, mas não transformar três exemplos em uma previsão pontual.

## 8. ZARC: comparação correta

### ZARC

O **Zoneamento Agrícola de Risco Climático** é a referência oficial do Ministério da
Agricultura para identificar municípios e períodos de semeadura com diferentes níveis de
risco climático, considerando fatores definidos por cultura, como grupo de cultivar,
solo, balanço hídrico e outros critérios.

### Decêndio

Período de dez dias. Os meses são divididos em três decêndios para a apresentação das
janelas de semeadura.

### Níveis de risco de 20%, 30% e 40%

São classes produzidas pela metodologia do ZARC a partir da frequência histórica de
atendimento dos critérios do modelo. A interpretação exata varia com a cultura e a
portaria aplicável.

Não diga:

> “Risco 20% significa 20% de chance de esta fazenda perder 20% da produtividade.”

Isso mistura probabilidade, tamanho da perda e realidade da fazenda. O ZARC também não
garante alta produtividade, pois manejo, genética, fertilidade, sanidade e outros fatores
estão fora ou parcialmente fora do modelo.

### ZARC versus Quarenta Safras

- **ZARC:** em quais períodos e condições gerais o plantio apresenta determinado nível
  oficial de risco climático para o município.
- **Quarenta Safras:** com as máquinas, sementes, talhões e objetivos já informados, qual
  sequência operacional testar e como ela se comportou no histórico usado.

O Quarenta Safras não substitui, reproduz nem “constrói em cima” do ZARC sem integração
oficial. Ele responde uma pergunta operacional diferente e deve respeitar as janelas
oficiais aplicáveis.

## 9. O que o agente de voz precisa perguntar

O agente deve conversar de forma natural, mas precisa confirmar pelo menos:

1. município e estado;
2. área total e divisão dos talhões;
3. capacidade operacional real em ha/dia;
4. data possível de início;
5. lotes de semente, área disponível e ciclo aproximado;
6. quais talhões são prioridade para milho segunda safra;
7. meta de área da segunda safra;
8. bloqueios ou indisponibilidades;
9. premissas financeiras, se o usuário quiser ver dinheiro.

Antes do cálculo, o agente resume os dados e pergunta se pode prosseguir. Ele não completa
silenciosamente um campo agronômico que o produtor não informou.

## 10. Frases seguras para a banca

Use:

- “O sistema testa uma decisão operacional em quatro décadas de clima histórico.”
- “O P20 é um resultado conservador do histórico, não uma previsão.”
- “Os valores financeiros usam premissas fornecidas pelo produtor.”
- “A IA interpreta e comunica; o motor determinístico calcula.”
- “O dado climático é regional, não um sensor dentro do talhão.”
- “IBGE e anos análogos são extensões de evidência, não previsão exata.”
- “O produto não substitui ZARC nem recomendação agronômica.”

Evite:

- “A IA descobriu a melhor data de plantio.”
- “O sistema prevê a produtividade.”
- “O plano garante a safrinha.”
- “A margem é o lucro do produtor.”
- “O IBGE mostra exatamente o que aconteceu nesta fazenda.”
- “Risco ZARC 20% significa perder 20% da lavoura.”
- “O fim das águas é uma data agronômica oficial.”

## 11. Consulta rápida

| Termo | Explicação curta |
|---|---|
| ha | Área de 10.000 m² |
| ha/dia | Capacidade operacional de semeadura por dia |
| Talhão | Unidade operacional dentro da fazenda |
| Cultura | Espécie agrícola, como soja ou milho |
| Cultivar | Material genético específico dentro da cultura |
| Ciclo | Duração aproximada conforme material e ambiente |
| VE | Emergência da soja |
| R1-R2 | Florescimento |
| R3-R4 | Desenvolvimento da vagem |
| R5-R6 | Desenvolvimento do grão |
| R7-R8 | Maturação |
| Segunda safra | Cultura plantada depois da primeira na mesma área e ano agrícola |
| Sequeiro | Cultivo dependente principalmente da chuva |
| Veranico | Período seco dentro da estação chuvosa, conforme regra declarada |
| GDD | Calor acumulado acima de temperatura-base |
| Safra histórica | Clima observado em um ano passado |
| Mediana | Valor central da lista ordenada |
| P20 | Resultado abaixo do qual ficam cerca de 20% dos casos, quando maior é melhor |
| Margem simples | Receita considerada menos custos considerados |
| PAM/SIDRA | Estatísticas agrícolas municipais do IBGE |
| Ano análogo | Ano historicamente parecido segundo regra declarada |
| ZARC | Zoneamento oficial de risco climático do MAPA |
| Decêndio | Período de dez dias |

## Fontes técnicas principais

- IBGE/SIDRA, Produção Agrícola Municipal, tabelas e série histórica:
  https://sidra.ibge.gov.br/pesquisa/pam/tabelas/
- Embrapa Soja, estádios fenológicos:
  https://bioinfo.cnpso.embrapa.br/seca/index.php?Itemid=435&catid=84&id=74%3Aestadios-fenologicos&option=com_content&view=article
- Embrapa Soja, disponibilidade hídrica e períodos críticos:
  https://bioinfo.cnpso.embrapa.br/seca/index.php?Itemid=435&catid=84&id=72%3Azoneamento&option=com_content&view=article
- Ministério da Agricultura, programa ZARC:
  https://www.gov.br/agricultura/pt-br/assuntos/riscos-seguro/programa-nacional-de-zoneamento-agricola-de-risco-climatico
- Conab, levantamentos de safra de grãos:
  https://www.conab.gov.br/info-agro/safras/graos

