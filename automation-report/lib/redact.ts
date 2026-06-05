const SECRET_PATTERNS = [
  /(token|secret|password|authorization|cookie|client[_-]?certificate)(["':= ]+)([^\\s"',}]+)/gi,
  /(Bearer\\s+)[A-Za-z0-9._~+/=-]+/gi,
  /([A-Za-z0-9_]{20,}\\.[A-Za-z0-9._-]{20,}\\.[A-Za-z0-9._-]{20,})/g
];

export function redactSecrets<T>(value: T): T {
  if (typeof value === 'string') {
    let text: string = value;
    for (const pattern of SECRET_PATTERNS) {
      text = text.replace(pattern, (_match, a = '', b = '') => `${a}${b}[REDACTED]`);
    }
    return text as T;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => redactSecrets(entry)) as T;
  }
  if (value && typeof value === 'object') {
    const next: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      if (/token|secret|password|authorization|cookie|certificate/i.test(key)) {
        next[key] = '[REDACTED]';
      } else {
        next[key] = redactSecrets(entry);
      }
    }
    return next as T;
  }
  return value;
}
