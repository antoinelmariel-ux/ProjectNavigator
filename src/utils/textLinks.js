// Découpe un texte libre en segments texte / lien http(s), sans jamais produire de HTML : l'appelant
// échappe ou rend lui-même chaque segment. La ponctuation finale (« voir https://x.fr/a. ») reste
// hors du lien.
const URL_PATTERN = /https?:\/\/[^\s<>"']+/gi;
const TRAILING_PUNCTUATION = /[.,;:!?)\]}»]+$/;

export const splitTextWithLinks = (value) => {
  const text = String(value ?? '');
  const segments = [];
  let cursor = 0;

  for (const match of text.matchAll(URL_PATTERN)) {
    const raw = match[0];
    const trimmed = raw.replace(TRAILING_PUNCTUATION, '');
    if (!/^https?:\/\/[^/\s]+/i.test(trimmed)) {
      continue;
    }
    if (match.index > cursor) {
      segments.push({ type: 'text', value: text.slice(cursor, match.index) });
    }
    segments.push({ type: 'link', value: trimmed });
    cursor = match.index + trimmed.length;
  }

  if (cursor < text.length) {
    segments.push({ type: 'text', value: text.slice(cursor) });
  }
  return segments;
};
