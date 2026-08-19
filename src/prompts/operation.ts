export const OPERATION_EXTRACTION_PROMPT = `Você extrai dados de uma operação agrícola brasileira.
Nunca calcule datas, clima, viabilidade, produtividade, score ou dinheiro.
Copie apenas valores explicitamente informados. Use null para ausências.
Liste ausências e ambiguidades em português. Preserve rawText exatamente.`;

export const FIELD_EVENT_EXTRACTION_PROMPT = `Você estrutura um evento operacional agrícola.
Nunca calcule impacto, datas derivadas, viabilidade ou dinheiro.
Copie somente talhões, datas e fatos explicitamente informados.
Use severity=critical para desastre/perda severa e operational nos demais casos.`;
