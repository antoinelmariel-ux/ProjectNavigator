import { DEFAULT_LANGUAGE } from '../i18n/languages.js';

// Tout le contenu métier existant (avant la traduction de la Phase 2) est en français brut.
const LEGACY_CONTENT_LANGUAGE = 'fr';

export const resolveLocalizedText = (value, language) => {
  if (typeof value === 'string') {
    return value;
  }

  if (value && typeof value === 'object') {
    const resolved = value[language];
    if (typeof resolved === 'string') {
      return resolved;
    }

    const fallback = value[DEFAULT_LANGUAGE];
    if (typeof fallback === 'string') {
      return fallback;
    }
  }

  return '';
};

// Comme resolveLocalizedText, mais sans repli sur l'anglais : utilisé pour l'édition,
// où on veut voir exactement ce qui est enregistré pour la langue choisie (vide si rien).
export const getLocalizedRaw = (value, language) => {
  if (typeof value === 'string') {
    return language === LEGACY_CONTENT_LANGUAGE ? value : '';
  }

  if (value && typeof value === 'object' && typeof value[language] === 'string') {
    return value[language];
  }

  return '';
};

// Renvoie un objet {en, fr, de, es} avec la valeur de `language` mise à jour,
// en conservant les autres langues déjà renseignées (et le français existant si `value` était une simple chaîne).
export const setLocalizedText = (value, language, newText) => {
  const base = value && typeof value === 'object'
    ? { ...value }
    : (typeof value === 'string' && value !== '' ? { [LEGACY_CONTENT_LANGUAGE]: value } : {});

  base[language] = newText;
  return base;
};

export const hasLocalizedContent = (value, language) => getLocalizedRaw(value, language).trim() !== '';

// Nettoie les espaces superflus, que la valeur soit une simple chaîne ou un objet {en, fr, de, es}.
export const trimLocalizedValue = (value) => {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (value && typeof value === 'object') {
    const trimmed = {};
    Object.entries(value).forEach(([code, text]) => {
      if (typeof text === 'string') {
        const trimmedText = text.trim();
        if (trimmedText !== '') {
          trimmed[code] = trimmedText;
        }
      }
    });
    return trimmed;
  }

  return '';
};

export const isLocalizedValueEmpty = (value) => {
  const trimmed = trimLocalizedValue(value);
  if (typeof trimmed === 'string') {
    return trimmed === '';
  }
  return Object.keys(trimmed).length === 0;
};
