export const DEFAULT_LANGUAGE = 'en';

export const SUPPORTED_LANGUAGES = ['en', 'fr', 'de', 'es'];

export const LANGUAGE_LABELS = {
  en: 'English',
  fr: 'Français',
  de: 'Deutsch',
  es: 'Español'
};

export const LOCALE_TAGS = {
  en: 'en-US',
  fr: 'fr-FR',
  de: 'de-DE',
  es: 'es-ES'
};

export const isSupportedLanguage = (code) => SUPPORTED_LANGUAGES.includes(code);

export const getLocaleTag = (language) => LOCALE_TAGS[language] || LOCALE_TAGS[DEFAULT_LANGUAGE];
