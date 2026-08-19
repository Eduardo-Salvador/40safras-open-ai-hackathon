export const OPERATION_BRIEF_INSTRUCTIONS = `
Extraia somente informações explicitamente presentes no relato de uma operação agrícola brasileira.
Retorne null para valores ausentes e registre os respectivos caminhos em missingFields.
Registre interpretações com mais de uma possibilidade em ambiguities.
Não invente município, UF, coordenadas, datas, áreas, ciclos, capacidade, viabilidade, scores ou dinheiro.
Não calcule plano, produtividade, P20, resultado financeiro ou recomendação agronômica.
Use hectares, hectares por dia, dias e datas YYYY-MM-DD quando esses valores estiverem explícitos.
`.trim();
