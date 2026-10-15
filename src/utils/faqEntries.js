import { SUPPORTED_LANGUAGES } from '../i18n/languages.js';
import { getLocalizedRaw, resolveLocalizedText } from './localizedContent.js';

const FALLBACK_LANGUAGE = 'fr';

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export const createFaqEntry = () => ({
  id: `faq_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
  question: {},
  answer: {},
  category: {},
  isPublished: true
});

export const normalizeFaqEntries = (value) =>
  (Array.isArray(value) ? value : [])
    .filter((entry) => entry && typeof entry === 'object' && typeof entry.id === 'string' && entry.id !== '')
    .map((entry) => ({
      id: entry.id,
      question: entry.question && typeof entry.question === 'object' ? entry.question : {},
      answer: entry.answer && typeof entry.answer === 'object' ? entry.answer : {},
      category: entry.category && typeof entry.category === 'object' ? entry.category : {},
      isPublished: entry.isPublished !== false,
      updatedBy: entry.updatedBy || '',
      updatedAt: entry.updatedAt || ''
    }));

// Langue demandée, sinon français (langue d'origine du contenu), sinon n'importe quelle langue
// renseignée : une question traduite dans une seule langue reste visible partout plutôt que de
// disparaître pour les lecteurs des trois autres.
export const resolveFaqText = (localized, language) => {
  const preferred = getLocalizedRaw(localized, language).trim();
  if (preferred) {
    return preferred;
  }
  const fallbackOrder = [FALLBACK_LANGUAGE, ...SUPPORTED_LANGUAGES];
  for (const code of fallbackOrder) {
    const candidate = getLocalizedRaw(localized, code).trim();
    if (candidate) {
      return candidate;
    }
  }
  return resolveLocalizedText(localized, language).trim();
};

const hasVisibleText = (html) => html.replace(/<[^>]+>/g, '').replace(/&nbsp;/gi, ' ').trim() !== '';

// `sanitize` est injecté (sanitizeRichText) : richText.js est du JSX, que les tests Node n'importent pas.
export const getPublishedFaqItems = (entries, language, sanitize) =>
  normalizeFaqEntries(entries)
    .filter((entry) => entry.isPublished)
    .map((entry) => ({
      id: entry.id,
      category: resolveFaqText(entry.category, language),
      question: resolveFaqText(entry.question, language),
      answer: sanitize(resolveFaqText(entry.answer, language))
    }))
    .filter((item) => item.question !== '' && hasVisibleText(item.answer));

// Groupes dans l'ordre de première apparition (donc dans l'ordre choisi par l'administrateur) ;
// deux questions sont dans la même catégorie quand leur libellé est identique, à la casse près,
// dans la langue du lecteur. Les questions sans catégorie forment un groupe sans intitulé.
export const groupFaqItemsByCategory = (items) => {
  const groups = [];
  const byKey = new Map();
  items.forEach((item) => {
    const key = (item.category || '').trim().toLowerCase();
    if (!byKey.has(key)) {
      const group = { category: (item.category || '').trim(), items: [] };
      byKey.set(key, group);
      groups.push(group);
    }
    byKey.get(key).items.push(item);
  });
  return groups;
};

const PAGE_STYLE = `
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: 'Inter','Segoe UI',Roboto,-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif; background: linear-gradient(180deg,#f4f7fb 0%,#ffffff 60%); color: #1f2937; line-height: 1.6; }
  a { color: #2563eb; font-weight: 500; text-decoration: none; }
  a:hover { text-decoration: underline; }
  header { background: rgba(255,255,255,0.95); border-bottom: 1px solid #e5e7eb; }
  .header-inner { max-width: 960px; margin: 0 auto; padding: 2.25rem 1.5rem 1.75rem; text-align: center; }
  .header-badge { display: inline-flex; background: #eef2ff; color: #4338ca; padding: 0.35rem 0.9rem; border-radius: 999px; font-weight: 600; letter-spacing: 0.02em; text-transform: uppercase; font-size: 0.75rem; }
  header h1 { margin: 1.15rem 0 0.6rem; font-size: clamp(1.85rem,2.4vw,2.2rem); color: #0f172a; }
  header p { margin: 0 auto; max-width: 560px; color: #6b7280; font-size: 0.95rem; }
  h2 { margin: 2rem 0 0.25rem; font-size: 1.05rem; color: #0f172a; }
  h2:first-child { margin-top: 0; }
  main { max-width: 960px; margin: -2.5rem auto 4rem; padding: 0 1.5rem; }
  .faq-card { background: #fff; border-radius: 1.25rem; box-shadow: 0 25px 60px rgba(15,23,42,0.08); border: 1px solid #eef2f7; padding: clamp(1.25rem,2.4vw,2rem); }
  details { border-bottom: 1px solid #f1f5f9; padding: 0.25rem 0; }
  details:last-child { border-bottom: none; }
  summary { cursor: pointer; font-weight: 600; color: #0f172a; padding: 0.85rem 0; list-style-position: outside; }
  [data-faq-answer] { padding: 0 0 1rem 0; color: #374151; font-size: 0.95rem; }
  [data-faq-answer] ul, [data-faq-answer] ol { padding-left: 1.4rem; }
  @media (max-width: 640px) { .header-inner { padding: 2rem 1.25rem 1.5rem; } main { margin-top: 1.25rem; } }
`;

export const buildFaqPageHtml = (entries, language, labels, sanitize) => {
  const items = getPublishedFaqItems(entries, language, sanitize);
  if (items.length === 0) {
    return null;
  }
  const blocks = groupFaqItemsByCategory(items)
    .map(
      (group) =>
        (group.category ? `<h2>${escapeHtml(group.category)}</h2>` : '') +
        group.items
          .map(
            (item) =>
              `<details><summary>${escapeHtml(item.question)}</summary><div data-faq-answer>${item.answer}</div></details>`
          )
          .join('')
    )
    .join('');
  return `<!DOCTYPE html><html lang="${escapeHtml(language)}"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>${escapeHtml(labels.heading)}</title><base target="_blank" /><style>${PAGE_STYLE}</style></head><body><header><div class="header-inner"><span class="header-badge">FAQ</span><h1>${escapeHtml(labels.heading)}</h1><p>${escapeHtml(labels.intro)}</p></div></header><main><article class="faq-card">${blocks}</article></main></body></html>`;
};

// La catégorie est facultative : elle n'est exigée dans une langue que si elle est renseignée dans une autre.
export const getFaqTranslationGaps = (entry) => {
  const hasCategory = SUPPORTED_LANGUAGES.some((code) => getLocalizedRaw(entry.category, code).trim() !== '');
  return SUPPORTED_LANGUAGES.filter(
    (code) =>
      getLocalizedRaw(entry.question, code).trim() === '' ||
      !hasVisibleText(getLocalizedRaw(entry.answer, code)) ||
      (hasCategory && getLocalizedRaw(entry.category, code).trim() === '')
  );
};
