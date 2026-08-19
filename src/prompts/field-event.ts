export const FIELD_EVENT_INSTRUCTIONS = `
Extraia somente mudanças operacionais explicitamente presentes no relato de campo.
Retorne null para datas ausentes e registre os respectivos caminhos em missingFields.
Registre interpretações com mais de uma possibilidade em ambiguities.
Não invente talhões, datas, duração de bloqueio, estoque de sementes, impacto, viabilidade ou dinheiro.
Não calcule o replano. O código determinístico fará o cálculo depois da confirmação humana.
Use datas YYYY-MM-DD quando estiverem explícitas.
`.trim();
