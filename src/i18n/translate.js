import { DEFAULT_LANGUAGE } from './languages.js';

const getByPath = (dictionary, path) => {
  if (!dictionary) {
    return undefined;
  }
  return path
    .split('.')
    .reduce((value, segment) => (value && typeof value === 'object' ? value[segment] : undefined), dictionary);
};

const pluralRulesCache = new Map();

const getPluralCategory = (language, value) => {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return 'other';
  }
  try {
    if (!pluralRulesCache.has(language)) {
      pluralRulesCache.set(language, new Intl.PluralRules(language));
    }
    return pluralRulesCache.get(language).select(number);
  } catch {
    return Math.abs(number) < 2 ? 'one' : 'other';
  }
};

// `[[count|point|points]]` : le mot qui suit la quantité, accordé selon les règles de la
// langue (en français 0 et 1 sont au singulier). Plusieurs quantités peuvent cohabiter
// dans un même libellé, chacune nommant son paramètre. Remplace les « point(s) ».
const PLURAL_PATTERN = /\[\[\s*(\w+)\s*\|([^|\]]*)\|([^\]]*)\]\]/g;

const applyPlurals = (template, params, language) => template.replace(
  PLURAL_PATTERN,
  (match, name, singular, plural) => {
    if (!params || !Object.prototype.hasOwnProperty.call(params, name)) {
      return plural;
    }
    return getPluralCategory(language, params[name]) === 'one' ? singular : plural;
  }
);

export const interpolate = (template, params, language = DEFAULT_LANGUAGE) => {
  const withPlurals = template.includes('[[') ? applyPlurals(template, params, language) : template;
  if (!params) {
    return withPlurals;
  }
  return withPlurals.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, name) =>
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match
  );
};

export const translate = (dictionaries, language, key, params) => {
  const fromActive = getByPath(dictionaries[language], key);
  if (typeof fromActive === 'string') {
    return interpolate(fromActive, params, language);
  }

  const fromFallback = getByPath(dictionaries[DEFAULT_LANGUAGE], key);
  if (typeof fromFallback === 'string') {
    return interpolate(fromFallback, params, DEFAULT_LANGUAGE);
  }

  return key;
};
