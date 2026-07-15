/** Lowercases and strips diacritics so search is accent-insensitive. */
export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/** Splits `text` into segments so the caller can highlight matches of `term`. */
export interface TextSegment {
  text: string;
  matched: boolean;
}

export function splitByTerm(text: string, term: string): TextSegment[] {
  const trimmed = term.trim();
  if (!trimmed) return [{ text, matched: false }];

  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  let regex: RegExp;
  try {
    regex = new RegExp(`(${escaped})`, 'gi');
  } catch {
    return [{ text, matched: false }];
  }

  const parts = text.split(regex);
  if (parts.length === 1) return [{ text, matched: false }];

  return parts.map((part) => ({
    text: part,
    matched: part.length > 0 && normalizeText(part) === normalizeText(trimmed),
  }));
}
