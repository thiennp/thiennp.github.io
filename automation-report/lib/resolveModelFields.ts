export type ResolvedModelFields = {
  llm?: string;
  modelToken?: string;
  tokensUsed?: number;
};

function cleanText(value: unknown, maxLength = 120) {
  if (value === null || value === undefined) {
    return undefined;
  }
  const text = String(value).replace(/\s+/g, ' ').trim();
  if (!text) {
    return undefined;
  }
  return text.slice(0, maxLength);
}

function parseTokenCount(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return Math.round(value);
  }
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
    return Number(value.trim());
  }
  return undefined;
}

export function resolveModelFields(input: Record<string, unknown>): ResolvedModelFields {
  const llm = cleanText(input.llm || input.model || input.modelName, 120);
  const explicitToken = cleanText(input.modelToken, 120);
  const rawToken = input.token;
  const tokensUsed = parseTokenCount(input.tokensUsed ?? input.tokenUsed ?? input.tokens);

  let modelToken = explicitToken;
  if (!modelToken && typeof rawToken === 'string' && rawToken.trim() && !/^\d+$/.test(rawToken.trim())) {
    modelToken = cleanText(rawToken, 120);
  }

  const tokenCountFromTokenField = parseTokenCount(rawToken);

  return {
    llm: llm || modelToken,
    modelToken,
    tokensUsed: tokensUsed ?? tokenCountFromTokenField
  };
}
