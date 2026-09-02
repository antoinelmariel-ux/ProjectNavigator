import { DEFAULT_LANGUAGE, isSupportedLanguage } from './languages.js';

export const extractPrimarySubtag = (code) => {
  if (!code || typeof code !== 'string') {
    return '';
  }
  return code.split('-')[0].toLowerCase();
};

export const detectLanguageFromCandidates = (candidates = []) => {
  for (const candidate of candidates) {
    const subtag = extractPrimarySubtag(candidate);
    if (isSupportedLanguage(subtag)) {
      return subtag;
    }
  }
  return DEFAULT_LANGUAGE;
};

export const detectBrowserLanguage = (navigatorLike) => {
  const nav = navigatorLike || (typeof navigator !== 'undefined' ? navigator : null);
  if (!nav) {
    return DEFAULT_LANGUAGE;
  }
  const candidates =
    Array.isArray(nav.languages) && nav.languages.length > 0 ? nav.languages : [nav.language].filter(Boolean);
  return detectLanguageFromCandidates(candidates);
};
